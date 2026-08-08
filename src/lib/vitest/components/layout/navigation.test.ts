import { resolve } from '$app/paths';
import { describe, it, expect } from 'vitest';
import { isActive, visibleSections } from '../../../components/layout/navigation';

describe('visibleSections', () => {
	it('员工看不到「待我审批」', () => {
		const labels = visibleSections('employee').flatMap((s) => s.items.map((i) => i.label));

		expect(labels).not.toContain('待我审批');
	});

	it('主管能看到全部菜单项', () => {
		const employeeCount = visibleSections('employee').flatMap((s) => s.items).length;
		const managerCount = visibleSections('manager').flatMap((s) => s.items).length;

		expect(managerCount).toBeGreaterThan(employeeCount);
	});

	it('两种角色都保留「差旅申请」与「统计」两个入口', () => {
		for (const role of ['employee', 'manager'] as const) {
			expect(visibleSections(role).map((s) => s.title)).toEqual(['差旅申请', '统计']);
		}
	});
});

describe('isActive', () => {
	const requests = resolve('/travel/requests');

	it('路径完全相同时选中', () => {
		expect(isActive(requests, requests)).toBe(true);
	});

	it('详情页让所属列表项保持选中', () => {
		expect(isActive(requests, resolve('/travel/requests/[id]', { id: 'TR-0001' }))).toBe(true);
	});

	it('不会误匹配前缀相同的兄弟路径', () => {
		// 若用裸 startsWith，'/travel/requests-archive' 会错误地点亮「我的申请」
		expect(isActive(requests, `${requests}-archive`)).toBe(false);
	});

	it('不同入口互不选中', () => {
		expect(isActive(requests, resolve('/reports'))).toBe(false);
	});

	describe('申请详情的入口归属', () => {
		const detail = resolve('/travel/requests/[id]', { id: 'TR-0001' });
		const approvals = resolve('/travel/approvals');

		it('不带 from 时详情归属「我的申请」', () => {
			expect(isActive(requests, detail)).toBe(true);
			expect(isActive(approvals, detail)).toBe(false);
		});

		it('带 ?from=approvals 时详情点亮「待我审批」而非「我的申请」', () => {
			expect(isActive(approvals, detail, '?from=approvals')).toBe(true);
			expect(isActive(requests, detail, '?from=approvals')).toBe(false);
		});

		it('带 ?from=requests 时详情点亮「我的申请」而非「待我审批」', () => {
			// 提交后由向导跳回详情即带此参数，应归属「我的申请」
			expect(isActive(requests, detail, '?from=requests')).toBe(true);
			expect(isActive(approvals, detail, '?from=requests')).toBe(false);
		});
	});
});
