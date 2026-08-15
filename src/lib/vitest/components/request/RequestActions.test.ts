import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent, cleanup } from '@testing-library/svelte';
import * as workflow from '$lib/domain/workflow';
import { setActiveEditId, getActiveEditId, stepHref } from '$lib/domain/wizard';
import { goto } from '$app/navigation';
import { updateRequest, deleteRequest } from '$lib/data/requests';
import RequestActions from '../../../../routes/travel/requests/[id]/components/RequestActions.svelte';
import type { Request, TravelRequest, User } from '$lib/domain/types';

// 模块级 mock：把「会改外部状态 / 会跳转」的依赖替换成可观测的替身，
// 从而断言编排层（runAction / onReedit / onDeleteConfirm）的副作用顺序与早退分支。
vi.mock('$app/navigation', () => ({ goto: vi.fn() }));
vi.mock('$lib/domain/workflow', async (importOriginal) => {
	const actual = await importOriginal<typeof import('$lib/domain/workflow')>();
	return { ...actual, transition: vi.fn() };
});
vi.mock('$lib/data/requests', async (importOriginal) => {
	const actual = await importOriginal<typeof import('$lib/data/requests')>();
	return { ...actual, updateRequest: vi.fn(), deleteRequest: vi.fn() };
});

const { transition } = workflow;

// 组件测试只关心编排层，transition 用最小成功的替身即可（提交→pending_manager，
// 重新编辑→draft）；失败用例在各自测试里临时改 mockReturnValue。
function defaultTransition({ request, action }: { request: Request; action: string }): unknown {
	if (action === 'submit')
		return {
			ok: true,
			request: { ...request, status: 'pending_manager', audit: [...request.audit] }
		};
	if (action === 'reedit') return { ok: true, request: { ...request, status: 'draft' } };
	return { ok: false, code: 'invalid_status', message: '不支持的操作' };
}

function makeUser(overrides: Partial<User> = {}): User {
	return {
		id: 'u-self',
		employeeId: 'EMP1',
		name: '本人',
		title: '工程师',
		department: '测试部',
		role: 'employee',
		managerId: null,
		...overrides
	};
}

function makeRequest(overrides: Partial<TravelRequest> = {}): TravelRequest {
	return {
		id: 'TR-0001',
		type: 'travel',
		applicantId: 'u-self',
		applicantName: '本人',
		department: '测试部',
		status: 'draft',
		createdAt: '2026-03-10T02:00:00.000Z',
		updatedAt: '2026-03-10T02:00:00.000Z',
		audit: [],
		fields: {
			reason: '出差',
			urgency: 'normal',
			legs: [],
			budget: { transport: 0, hotel: 0, allowance: 0, other: 0 },
			budgetNote: ''
		},
		...overrides
	};
}

const applicant = makeUser();

beforeEach(() => {
	// 默认成功流转；失败用例在内部临时改写
	vi.mocked(transition).mockImplementation(defaultTransition as unknown as typeof transition);
	vi.mocked(goto).mockClear();
	vi.mocked(updateRequest).mockClear();
	vi.mocked(deleteRequest).mockClear();
	setActiveEditId(null);
});

afterEach(cleanup);

describe('RequestActions — 提交申请', () => {
	it('草稿提交成功：落库、触发 onsubmitted、不跳转', async () => {
		const onsubmitted = vi.fn();
		render(RequestActions, { props: { request: makeRequest(), actor: applicant, onsubmitted } });

		await fireEvent.click(screen.getByText('提交申请'));

		expect(updateRequest).toHaveBeenCalledWith(
			expect.objectContaining({ status: 'pending_manager' })
		);
		expect(onsubmitted).toHaveBeenCalledTimes(1);
		expect(goto).not.toHaveBeenCalled();
	});

	it('流转失败（如非法状态）只提示、不落库、不触发 onsubmitted', async () => {
		vi.mocked(transition).mockReturnValue({
			ok: false,
			code: 'invalid_status',
			message: '当前状态不可提交'
		});
		const onsubmitted = vi.fn();
		render(RequestActions, { props: { request: makeRequest(), actor: applicant, onsubmitted } });

		await fireEvent.click(screen.getByText('提交申请'));

		expect(screen.getByText('当前状态不可提交')).toBeTruthy();
		expect(updateRequest).not.toHaveBeenCalled();
		expect(onsubmitted).not.toHaveBeenCalled();
	});
});

describe('RequestActions — 重新编辑', () => {
	it('被驳回单：走状态机（rejected→draft）、落库、带 ?edit=ID 跳转', async () => {
		render(RequestActions, {
			props: {
				request: makeRequest({ id: 'TR-0009', status: 'rejected' }),
				actor: applicant
			}
		});

		await fireEvent.click(screen.getByText('重新编辑'));

		expect(updateRequest).toHaveBeenCalledWith(expect.objectContaining({ status: 'draft' }));
		// setActiveEditId 必须先于 stepHref 执行，否则 URL 丢掉 ?edit=ID、编辑态退化为新建
		expect(getActiveEditId()).toBe('TR-0009');
		expect(goto).toHaveBeenCalledWith(stepHref('travel', 'basic', 'TR-0009'));
	});

	it('草稿单：跳过状态机、不落库，但仍带 ?edit=ID 跳转', async () => {
		render(RequestActions, {
			props: {
				request: makeRequest({ id: 'TR-0009', status: 'draft' }),
				actor: applicant
			}
		});

		await fireEvent.click(screen.getByText('重新编辑'));

		expect(updateRequest).not.toHaveBeenCalled();
		expect(getActiveEditId()).toBe('TR-0009');
		expect(goto).toHaveBeenCalledWith(stepHref('travel', 'basic', 'TR-0009'));
	});
});

describe('RequestActions — 删除（草稿）', () => {
	it('仅在草稿态渲染删除按钮，确认后调用 deleteRequest 与 ondeleted', async () => {
		const ondeleted = vi.fn();
		render(RequestActions, { props: { request: makeRequest(), actor: applicant, ondeleted } });

		// 非草稿不渲染删除（这里本身就是草稿，按钮存在）
		await fireEvent.click(screen.getByText('删除'));
		// 弹窗确认
		await fireEvent.click(screen.getByText('确认删除'));

		expect(deleteRequest).toHaveBeenCalledWith('TR-0001');
		expect(ondeleted).toHaveBeenCalledTimes(1);
	});

	it('非本人草稿不渲染删除按钮', () => {
		render(RequestActions, {
			props: { request: makeRequest({ applicantId: 'u-other' }), actor: applicant }
		});
		expect(screen.queryByText('删除')).toBeNull();
	});
});
