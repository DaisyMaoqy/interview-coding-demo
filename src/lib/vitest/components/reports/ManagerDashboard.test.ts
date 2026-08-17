import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render } from '@testing-library/svelte';
import { tick } from 'svelte';
import seed from '$lib/data/seed.json';
import type { Request } from '$lib/domain/types';

// 桩掉 echarts，避免 jsdom 下 canvas 初始化失败；捕获 Chart 收到的 option 与事件
const setOptionSpy = vi.fn();
const onSpy = vi.fn();
vi.mock('echarts', () => ({
	init: () => ({
		setOption: (...args: unknown[]) => setOptionSpy(...args),
		resize: () => {},
		on: (...args: unknown[]) => onSpy(...args),
		off: () => {},
		dispose: () => {}
	})
}));

import ManagerDashboard from '../../../../routes/reports/components/ManagerDashboard.svelte';

// jsdom 未实现 ResizeObserver，图表组件在挂载时会用到
class ResizeObserverStub {
	observe() {}
	unobserve() {}
	disconnect() {}
}
globalThis.ResizeObserver =
	globalThis.ResizeObserver ?? (ResizeObserverStub as unknown as typeof ResizeObserver);

const requests = seed as unknown as Request[];

type Series = { type?: string; data?: Array<{ name?: string }> };

/** 从所有 setOption 调用里，倒序找回指定 series 类型的分类名 */
function namesOfType(type: string): string[] {
	for (let i = setOptionSpy.mock.calls.length - 1; i >= 0; i--) {
		const option = setOptionSpy.mock.calls[i]?.[0] as
			{ series?: Series[]; yAxis?: { data?: string[] } } | undefined;
		const series = option?.series?.[0];
		if (series?.type === type) {
			// 横向条形图的分类名在 yAxis.data（series.data 只放数值）
			if (type === 'bar') return option?.yAxis?.data ?? [];
			return (series.data ?? []).map((d) => d.name ?? '');
		}
	}
	return [];
}
const pieNames = () => namesOfType('pie');
const barNames = () => namesOfType('bar');

const STATUS_NAMES = ['已通过', '待主管审批', '待财务审批', '已驳回', '已撤销', '草稿'];
const LEAVE_TYPE_NAMES = ['年假', '病假', '事假'];

describe('ManagerDashboard 图表形态与交互', () => {
	beforeEach(() => {
		setOptionSpy.mockClear();
		onSpy.mockClear();
	});

	it('差旅视图：状态分布为饼图，不出现横向条形', async () => {
		render(ManagerDashboard, { props: { requests, type: 'travel' as const } });
		await tick();
		await new Promise((r) => setTimeout(r, 90));
		expect(pieNames().some((n) => STATUS_NAMES.includes(n))).toBe(true);
		expect(barNames().length).toBe(0);
		// 交互：饼图与折线都注册了 click
		expect(onSpy).toHaveBeenCalledWith('click', expect.any(Function));
	});

	it('请假视图：请假类型分布为横向条形 + 申请状态为环形图', async () => {
		render(ManagerDashboard, { props: { requests, type: 'leave' as const } });
		await tick();
		await new Promise((r) => setTimeout(r, 90));
		expect(barNames().some((n) => LEAVE_TYPE_NAMES.includes(n))).toBe(true);
		expect(pieNames().some((n) => STATUS_NAMES.includes(n))).toBe(true);
		// 交互：条形、环形、折线三张图都注册了 click
		const clickCalls = onSpy.mock.calls.filter((c) => c[0] === 'click');
		expect(clickCalls.length).toBeGreaterThanOrEqual(3);
	});
});
