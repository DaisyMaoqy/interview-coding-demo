import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/svelte';
import StatusBadge from '../../../components/request/StatusBadge.svelte';
import type { RequestStatus } from '../../../domain/types';

/**
 * StatusBadge 组件渲染测试。
 *
 * 验证每种状态渲染正确的文本标签和 CSS 修饰类。
 * 全局样式 (--color-*) 在 jsdom 中不一定可用，故只验证类名而非颜色值。
 */

const ALL_STATUSES: RequestStatus[] = [
	'draft',
	'pending_manager',
	'pending_finance',
	'approved',
	'rejected',
	'cancelled'
];

describe('StatusBadge', () => {
	it('渲染所有状态均不崩溃', () => {
		for (const status of ALL_STATUSES) {
			const { unmount } = render(StatusBadge, { props: { status } });
			unmount();
		}
		expect(ALL_STATUSES.length).toBeGreaterThan(0);
	});

	it('草稿显示「草稿」文本并带 draft 修饰类', () => {
		render(StatusBadge, { props: { status: 'draft' } });
		expect(screen.getByText('草稿')).toBeTruthy();
		expect(screen.getByText('草稿').classList.contains('status-badge--draft')).toBe(true);
	});

	it('待主管审批显示对应文本并带 pending 修饰类', () => {
		render(StatusBadge, { props: { status: 'pending_manager' } });
		expect(screen.getByText('待主管审批')).toBeTruthy();
		expect(screen.getByText('待主管审批').classList.contains('status-badge--pending')).toBe(true);
	});

	it('待财务审批也带 pending 修饰类（两级审批同色系）', () => {
		render(StatusBadge, { props: { status: 'pending_finance' } });
		expect(screen.getByText('待财务审批')).toBeTruthy();
		expect(screen.getByText('待财务审批').classList.contains('status-badge--pending')).toBe(true);
	});

	it('已通过带 approved 修饰类', () => {
		render(StatusBadge, { props: { status: 'approved' } });
		expect(screen.getByText('已通过').classList.contains('status-badge--approved')).toBe(true);
	});

	it('已驳回带 rejected 修饰类', () => {
		render(StatusBadge, { props: { status: 'rejected' } });
		expect(screen.getByText('已驳回').classList.contains('status-badge--rejected')).toBe(true);
	});

	it('已撤销带 cancelled 修饰类', () => {
		render(StatusBadge, { props: { status: 'cancelled' } });
		expect(screen.getByText('已撤销').classList.contains('status-badge--cancelled')).toBe(true);
	});
});
