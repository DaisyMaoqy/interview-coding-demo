import { describe, it, expect, afterEach } from 'vitest';
import { render, screen, fireEvent, cleanup } from '@testing-library/svelte';
import DateFilter from '../../../../routes/reports/components/DateFilter.svelte';

afterEach(cleanup);

/**
 * DateFilter 组件交互测试。
 *
 * 验证：默认隐藏、点击切换显示/折叠、预设按钮选中态、
 * 自定义区间显隐、重置回调、visible 双向绑定。
 */

const FILTER_BTN_LABEL = '时间筛选';

describe('DateFilter', () => {
	it('默认隐藏筛选面板', () => {
		render(DateFilter, {
			props: { preset: 'all', customStart: '', customEnd: '', visible: false }
		});
		expect(screen.queryByText('全部')).toBeNull();
		expect(screen.queryByText('本月')).toBeNull();
	});

	it('visible=true 时显示全部预设按钮', () => {
		render(DateFilter, { props: { preset: 'all', customStart: '', customEnd: '', visible: true } });
		expect(screen.getByText('全部')).toBeTruthy();
		expect(screen.getByText('本月')).toBeTruthy();
		expect(screen.getByText('本季度')).toBeTruthy();
		expect(screen.getByText('本年')).toBeTruthy();
		expect(screen.getByText('自定义')).toBeTruthy();
	});

	it('点击筛选器图标展开面板，再点折叠', async () => {
		render(DateFilter, {
			props: { preset: 'all', customStart: '', customEnd: '', visible: false }
		});
		expect(screen.queryByText('本月')).toBeNull();

		await fireEvent.click(screen.getByLabelText(FILTER_BTN_LABEL));
		expect(screen.getByText('本月')).toBeTruthy();

		await fireEvent.click(screen.getByLabelText(FILTER_BTN_LABEL));
		expect(screen.queryByText('本月')).toBeNull();
	});

	it('选中预设高亮为 active 态', () => {
		render(DateFilter, {
			props: { preset: 'thisMonth', customStart: '', customEnd: '', visible: true }
		});
		const btn = screen.getByText('本月');

		expect(btn.getAttribute('aria-pressed')).toBe('true');
		expect(btn.classList.contains('filter-btn--active')).toBe(true);
	});

	it('自定义时显示起止日期输入框', () => {
		render(DateFilter, {
			props: { preset: 'custom', customStart: '2026-03-01', customEnd: '2026-03-31', visible: true }
		});
		expect(screen.getByLabelText('开始日期')).toBeTruthy();
		expect(screen.getByLabelText('结束日期')).toBeTruthy();
	});

	it('自定义预设下切换为其他预设后日期输入框消失', async () => {
		render(DateFilter, {
			props: { preset: 'custom', customStart: '', customEnd: '', visible: true }
		});
		expect(screen.getByLabelText('开始日期')).toBeTruthy();

		await fireEvent.click(screen.getByText('全部'));
		expect(screen.queryByLabelText('开始日期')).toBeNull();
	});

	it('点击重置按钮触发 onreset 回调', async () => {
		let resetCalled = false;
		render(DateFilter, {
			props: {
				preset: 'thisMonth',
				customStart: '',
				customEnd: '',
				visible: false,
				onreset: () => (resetCalled = true)
			}
		});
		await fireEvent.click(screen.getByLabelText('重置筛选'));

		expect(resetCalled).toBe(true);
	});
});
