import { describe, it, expect } from 'vitest';
import { EMPLOYEE_ID, MANAGER_ID, requireUser, USERS } from '../../domain/org';
import type { AuditAction, RequestStatus, TravelRequest } from '../../domain/types';
import {
	availableActions,
	canViewRequest,
	isDeletable,
	isEditable,
	REJECT_COMMENT_MAX_LENGTH,
	transition
} from '../../domain/workflow';

const zhangsan = requireUser(EMPLOYEE_ID);
const lijingli = requireUser(MANAGER_ID);
const wangfang = USERS.find((u) => u.name === '王芳')!;

const NOW = new Date('2026-03-10T02:00:00.000Z');

function makeRequest(overrides: Partial<TravelRequest> = {}): TravelRequest {
	return {
		id: 'TR-0001',
		applicantId: zhangsan.id,
		applicantName: zhangsan.name,
		department: zhangsan.department,
		reason: '赴上海参加客户现场技术支持',
		urgency: 'normal',
		legs: [
			{
				id: 'leg-1',
				from: '北京',
				to: '上海',
				departDate: '2026-03-15',
				returnDate: '2026-03-17',
				transport: 'train'
			}
		],
		budget: { transport: 120000, hotel: 240000, allowance: 60000, other: 8000 },
		status: 'draft',
		createdAt: '2026-03-01T02:00:00.000Z',
		updatedAt: '2026-03-01T02:00:00.000Z',
		audit: [],
		...overrides
	};
}

describe('transition — 正常流转链路', () => {
	it('草稿由申请人提交后进入待主管审批', () => {
		const result = transition({
			request: makeRequest(),
			action: 'submit',
			actor: zhangsan,
			now: NOW
		});

		expect(result).toMatchObject({ ok: true, request: { status: 'pending_manager' } });
	});

	it('主管通过后流转到待财务审批', () => {
		const result = transition({
			request: makeRequest({ status: 'pending_manager' }),
			action: 'approve',
			actor: lijingli,
			now: NOW
		});

		expect(result).toMatchObject({ ok: true, request: { status: 'pending_finance' } });
	});

	it('财务通过后成为已通过', () => {
		const result = transition({
			request: makeRequest({ status: 'pending_finance' }),
			action: 'approve',
			actor: lijingli,
			now: NOW
		});

		expect(result).toMatchObject({ ok: true, request: { status: 'approved' } });
	});

	it('驳回后申请人可重新编辑回到草稿', () => {
		const result = transition({
			request: makeRequest({ status: 'rejected' }),
			action: 'reedit',
			actor: zhangsan,
			now: NOW
		});

		expect(result).toMatchObject({ ok: true, request: { status: 'draft' } });
	});

	it('申请人可撤销审批中的单', () => {
		const result = transition({
			request: makeRequest({ status: 'pending_manager' }),
			action: 'cancel',
			actor: zhangsan,
			now: NOW
		});

		expect(result).toMatchObject({ ok: true, request: { status: 'cancelled' } });
	});
});

describe('transition — 权限守卫', () => {
	it('不能审批自己提交的申请', () => {
		// 李经理若自己提单，即便有管理角色也不能自审
		const ownRequest = makeRequest({
			applicantId: lijingli.id,
			applicantName: lijingli.name,
			status: 'pending_manager'
		});

		const result = transition({
			request: ownRequest,
			action: 'approve',
			actor: lijingli,
			now: NOW
		});

		expect(result).toMatchObject({ ok: false, code: 'forbidden' });
		if (!result.ok) expect(result.message).toContain('不能审批自己');
	});

	it('普通员工无权审批他人的单', () => {
		const result = transition({
			request: makeRequest({ status: 'pending_manager' }),
			action: 'approve',
			actor: wangfang,
			now: NOW
		});

		expect(result).toMatchObject({ ok: false, code: 'forbidden' });
	});

	it('他人不能撤销别人的申请', () => {
		const result = transition({
			request: makeRequest({ status: 'pending_manager' }),
			action: 'cancel',
			actor: wangfang,
			now: NOW
		});

		expect(result).toMatchObject({ ok: false, code: 'forbidden' });
	});

	it('他人不能替申请人提交草稿', () => {
		const result = transition({
			request: makeRequest(),
			action: 'submit',
			actor: lijingli,
			now: NOW
		});

		expect(result).toMatchObject({ ok: false, code: 'forbidden' });
	});
});

describe('transition — 非法状态', () => {
	it('已通过的单不可撤销', () => {
		const result = transition({
			request: makeRequest({ status: 'approved' }),
			action: 'cancel',
			actor: zhangsan,
			now: NOW
		});

		expect(result).toMatchObject({ ok: false, code: 'invalid_status' });
	});

	it('草稿不能被审批', () => {
		const result = transition({
			request: makeRequest(),
			action: 'approve',
			actor: lijingli,
			now: NOW
		});

		expect(result).toMatchObject({ ok: false, code: 'invalid_status' });
	});

	it('已撤销的单不能再提交', () => {
		const result = transition({
			request: makeRequest({ status: 'cancelled' }),
			action: 'submit',
			actor: zhangsan,
			now: NOW
		});

		expect(result).toMatchObject({ ok: false, code: 'invalid_status' });
	});

	it('三个终态都不接受任何动作', () => {
		const terminals: RequestStatus[] = ['approved', 'cancelled'];
		const actions: AuditAction[] = ['submit', 'approve', 'reject', 'cancel', 'reedit'];

		const outcomes = terminals.flatMap((status) =>
			actions.map((action) =>
				transition({ request: makeRequest({ status }), action, actor: lijingli, now: NOW })
			)
		);

		expect(outcomes.every((r) => !r.ok)).toBe(true);
	});
});

describe('transition — 审批意见', () => {
	it('驳回时必须填写意见', () => {
		const result = transition({
			request: makeRequest({ status: 'pending_manager' }),
			action: 'reject',
			actor: lijingli,
			now: NOW
		});

		expect(result).toMatchObject({ ok: false, code: 'comment_required' });
	});

	it('只有空白字符的意见等同未填写', () => {
		const result = transition({
			request: makeRequest({ status: 'pending_manager' }),
			action: 'reject',
			actor: lijingli,
			comment: '   \n  ',
			now: NOW
		});

		expect(result).toMatchObject({ ok: false, code: 'comment_required' });
	});

	it('填写意见后可以驳回，且意见被去除首尾空白', () => {
		const result = transition({
			request: makeRequest({ status: 'pending_manager' }),
			action: 'reject',
			actor: lijingli,
			comment: '  预算超标，请压缩住宿费  ',
			now: NOW
		});

		expect(result.ok && result.request.audit.at(-1)?.comment).toBe('预算超标，请压缩住宿费');
	});

	it(`意见超过 ${REJECT_COMMENT_MAX_LENGTH} 字被拒绝`, () => {
		const result = transition({
			request: makeRequest({ status: 'pending_manager' }),
			action: 'reject',
			actor: lijingli,
			comment: 'x'.repeat(REJECT_COMMENT_MAX_LENGTH + 1),
			now: NOW
		});

		expect(result).toMatchObject({ ok: false, code: 'comment_too_long' });
	});

	it(`恰为 ${REJECT_COMMENT_MAX_LENGTH} 字的意见可正常驳回`, () => {
		const result = transition({
			request: makeRequest({ status: 'pending_manager' }),
			action: 'reject',
			actor: lijingli,
			comment: 'x'.repeat(REJECT_COMMENT_MAX_LENGTH),
			now: NOW
		});

		expect(result.ok).toBe(true);
	});

	it('通过时不填意见也可以', () => {
		const result = transition({
			request: makeRequest({ status: 'pending_manager' }),
			action: 'approve',
			actor: lijingli,
			now: NOW
		});

		expect(result.ok).toBe(true);
	});
});

describe('transition — 留痕与不可变性', () => {
	it('每次流转追加一条含前后状态的审批记录', () => {
		const result = transition({
			request: makeRequest(),
			action: 'submit',
			actor: zhangsan,
			now: NOW,
			auditId: 'audit-fixed'
		});

		expect(result.ok && result.request.audit).toEqual([
			{
				id: 'audit-fixed',
				at: NOW.toISOString(),
				actorId: zhangsan.id,
				actorName: zhangsan.name,
				action: 'submit',
				from: 'draft',
				to: 'pending_manager'
			}
		]);
	});

	it('不修改传入的原对象', () => {
		const original = makeRequest();

		transition({ request: original, action: 'submit', actor: zhangsan, now: NOW });

		expect(original).toMatchObject({ status: 'draft', audit: [] });
	});

	it('首次提交记录 submittedAt', () => {
		const result = transition({
			request: makeRequest(),
			action: 'submit',
			actor: zhangsan,
			now: NOW
		});

		expect(result.ok && result.request.submittedAt).toBe(NOW.toISOString());
	});

	it('驳回后重新提交不覆盖首次提交时间', () => {
		// 平均审批时长以初次提交为基准，否则反复驳回会把时长算短
		const firstSubmit = '2026-03-01T02:00:00.000Z';
		const result = transition({
			request: makeRequest({ status: 'draft', submittedAt: firstSubmit }),
			action: 'submit',
			actor: zhangsan,
			now: NOW
		});

		expect(result.ok && result.request.submittedAt).toBe(firstSubmit);
	});
});

describe('availableActions', () => {
	it('草稿状态下申请人可提交', () => {
		expect(availableActions(makeRequest(), zhangsan)).toEqual(['submit']);
	});

	it('待主管审批时申请人只能撤销', () => {
		expect(availableActions(makeRequest({ status: 'pending_manager' }), zhangsan)).toEqual([
			'cancel'
		]);
	});

	it('待主管审批时主管可通过或驳回', () => {
		expect(availableActions(makeRequest({ status: 'pending_manager' }), lijingli)).toEqual([
			'approve',
			'reject'
		]);
	});

	it('终态下无任何可用动作', () => {
		expect(availableActions(makeRequest({ status: 'approved' }), zhangsan)).toEqual([]);
		expect(availableActions(makeRequest({ status: 'approved' }), lijingli)).toEqual([]);
	});

	it('无关的员工没有任何可用动作', () => {
		expect(availableActions(makeRequest({ status: 'pending_manager' }), wangfang)).toEqual([]);
	});
});

describe('canViewRequest', () => {
	it('申请人可查看自己的单（含草稿）', () => {
		expect(canViewRequest(makeRequest({ status: 'draft' }), zhangsan)).toBe(true);
	});

	it('员工不能查看领导的单', () => {
		const managerReq = makeRequest({ applicantId: MANAGER_ID, status: 'approved' });
		expect(canViewRequest(managerReq, zhangsan)).toBe(false);
	});

	it('员工之间也不能互看', () => {
		const others = makeRequest({ applicantId: EMPLOYEE_ID, status: 'approved' });
		expect(canViewRequest(others, wangfang)).toBe(false);
	});

	it('经理可查看员工的非草稿单（含已审 / 已驳回）', () => {
		expect(
			canViewRequest(makeRequest({ applicantId: EMPLOYEE_ID, status: 'approved' }), lijingli)
		).toBe(true);
		expect(
			canViewRequest(makeRequest({ applicantId: EMPLOYEE_ID, status: 'rejected' }), lijingli)
		).toBe(true);
	});

	it('经理不能查看员工的草稿单', () => {
		expect(
			canViewRequest(makeRequest({ applicantId: EMPLOYEE_ID, status: 'draft' }), lijingli)
		).toBe(false);
	});
});

describe('isEditable / isDeletable', () => {
	it('本人的草稿可编辑可删除', () => {
		const draft = makeRequest();

		expect(isEditable(draft, zhangsan)).toBe(true);
		expect(isDeletable(draft, zhangsan)).toBe(true);
	});

	it('提交后不可再编辑', () => {
		expect(isEditable(makeRequest({ status: 'pending_manager' }), zhangsan)).toBe(false);
	});

	it('他人的草稿不可编辑', () => {
		expect(isEditable(makeRequest(), wangfang)).toBe(false);
	});
});
