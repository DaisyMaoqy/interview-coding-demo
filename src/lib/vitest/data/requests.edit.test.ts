import { describe, it, expect } from 'vitest';
import { get } from 'svelte/store';
import { addRequest, getRequestById, updateRequestFromDraft } from '$lib/data/requests';
import { loadDraftForEdit, draft, resetDraft } from '$lib/state/wizardDraft';
import { EMPLOYEE_ID, requireUser } from '$lib/domain/org';
import type { TravelFormInput } from '$lib/domain/schema';
import type { TravelRequest } from '$lib/domain/types';

function makeRequest(id: string, status: TravelRequest['status']): TravelRequest {
	return {
		id,
		applicantId: EMPLOYEE_ID,
		applicantName: '张三',
		department: '研发部',
		reason: '旧事由',
		urgency: 'urgent',
		legs: [],
		budget: { transport: 100, hotel: 200, allowance: 0, other: 0 },
		budgetNote: '旧说明',
		status,
		createdAt: '2024-01-01T00:00:00.000Z',
		updatedAt: '2024-01-01T00:00:00.000Z',
		audit: []
	};
}

describe('loadDraftForEdit', () => {
	it('把被驳回申请的填写部分回填进草稿，且 legs/budget 为浅拷贝', () => {
		const req = makeRequest('TR-EDIT-1', 'rejected');
		loadDraftForEdit(req);

		const d = get(draft);
		expect(d.reason).toBe('旧事由');
		expect(d.urgency).toBe('urgent');
		expect(d.budget).toEqual({ transport: 100, hotel: 200, allowance: 0, other: 0 });
		expect(d.budgetNote).toBe('旧说明');
		// 浅拷贝：不应与原对象共享引用，避免编辑时误改原单
		expect(d.legs).not.toBe(req.legs);
		expect(d.budget).not.toBe(req.budget);

		resetDraft();
	});
});

describe('updateRequestFromDraft', () => {
	it('在原单上套用新数据并重新提交，保留单号与身份信息', () => {
		const actor = requireUser(EMPLOYEE_ID);
		addRequest(makeRequest('TR-EDIT-2', 'draft'));

		const input: TravelFormInput = {
			reason: '新事由',
			urgency: 'normal',
			legs: [],
			budget: { transport: 50, hotel: 0, allowance: 0, other: 0 },
			budgetNote: ''
		};

		const updated = updateRequestFromDraft('TR-EDIT-2', input, actor);

		expect(updated.id).toBe('TR-EDIT-2'); // 不生成新单号
		expect(updated.applicantId).toBe(EMPLOYEE_ID); // 身份信息不变
		expect(updated.reason).toBe('新事由'); // 套用了新数据
		expect(updated.status).toBe('pending_manager'); // 重新提交后回到待主管审批
		expect(updated.audit.length).toBe(1); // 追加一条 submit 审计

		// 落库后 store 中同一 id 已是更新后的内容
		const stored = getRequestById('TR-EDIT-2');
		expect(stored?.reason).toBe('新事由');
	});
});
