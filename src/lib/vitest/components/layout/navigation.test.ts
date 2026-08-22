import { resolve } from '$app/paths';
import { describe, it, expect } from 'vitest';
import { firstStep } from '$lib/domain/wizard';
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

	it('主管能看到「差旅申请」与「统计」两个入口', () => {
		expect(visibleSections('manager').map((s) => s.title)).toEqual(['差旅申请', '统计']);
	});

	it('统计报表仅对领导（主管）角色可见', () => {
		for (const role of ['employee', 'finance'] as const) {
			const labels = visibleSections(role).flatMap((s) => s.items.map((i) => i.label));
			expect(labels).not.toContain('统计报表');
		}
		expect(
			visibleSections('manager')
				.flatMap((s) => s.items.map((i) => i.label))
				.includes('统计报表')
		).toBe(true);
	});
});

describe('isActive', () => {
	const requests = resolve('/requests');

	it('路径完全相同时选中', () => {
		expect(isActive(requests, requests)).toBe(true);
	});

	it('详情页让所属列表项保持选中', () => {
		expect(isActive(requests, resolve('/requests/[id]', { id: 'TR-0001' }))).toBe(true);
	});

	it('不会误匹配前缀相同的兄弟路径', () => {
		// 若用裸 startsWith，'/requests-archive' 会错误地点亮「我的申请」
		expect(isActive(requests, `${requests}-archive`)).toBe(false);
	});

	it('不同入口互不选中', () => {
		expect(isActive(requests, resolve('/reports'))).toBe(false);
	});

	describe('申请详情的入口归属', () => {
		const detail = resolve('/requests/[id]', { id: 'TR-0001' });
		const approvals = resolve('/approvals');
		const reports = resolve('/reports');

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

		it('带 ?from=reports 时详情点亮「统计报表」而非「我的申请」', () => {
			expect(isActive(reports, detail, '?from=reports')).toBe(true);
			expect(isActive(requests, detail, '?from=reports')).toBe(false);
		});
	});

	describe('编辑态的入口归属', () => {
		const apply = resolve('/apply/[type]/[step]', { type: 'travel', step: firstStep('travel') });

		it('?edit=ID 时点亮「我的申请」并熄掉「发起申请」', () => {
			const search = '?edit=TR-0034';
			expect(isActive(requests, `${apply}/basic`, search)).toBe(true);
			expect(isActive(apply, `${apply}/basic`, search)).toBe(false);
		});

		it('普通发起申请不带 edit 时正常点亮「发起申请」', () => {
			expect(isActive(apply, `${apply}/basic`)).toBe(true);
			expect(isActive(requests, `${apply}/basic`)).toBe(false);
		});
	});
});
