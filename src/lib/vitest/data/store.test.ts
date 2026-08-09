import { describe, expect, it } from 'vitest';
import { get } from 'svelte/store';
import {
	getAllRequests,
	getRequestById,
	requestsStore,
	updateRequest,
	createRequest,
	addRequest,
	createDraft,
	deleteRequest
} from '$lib/data/requests';
import type { TravelRequest, User } from '$lib/domain/types';
import type { TravelFormInput } from '$lib/domain/schema';

describe('getRequestById', () => {
	it('按单号返回匹配的申请', () => {
		const all = getAllRequests();
		const target = all[0];
		expect(getRequestById(target.id)?.id).toBe(target.id);
	});

	it('单号不存在时返回 undefined', () => {
		expect(getRequestById('TR-9999')).toBeUndefined();
	});
});

describe('updateRequest', () => {
	it('替换同 id 的记录并写回 localStorage 缓存', () => {
		const original = getRequestById('TR-0040') as TravelRequest;
		// 用一份改了状态的新对象模拟一次流转结果
		const updated: TravelRequest = { ...original, status: 'approved' };

		updateRequest(updated);

		// store 里已是新状态
		expect(getRequestById('TR-0040')?.status).toBe('approved');
		// 从 store 直接读也应一致
		expect(get(requestsStore).find((r) => r.id === 'TR-0040')?.status).toBe('approved');
		// localStorage 缓存被刷新：重开一个“会话”读到的是改后的值
		const cached = JSON.parse(localStorage.getItem('travel-requests') ?? '[]') as TravelRequest[];
		expect(cached.find((r) => r.id === 'TR-0040')?.status).toBe('approved');

		// 还原，避免影响其它用例 / 演示数据
		updateRequest(original);
		expect(getRequestById('TR-0040')?.status).toBe(original.status);
	});
});

describe('deleteRequest', () => {
	it('从工作数据集移除该 id 并同步 localStorage 缓存', () => {
		const victim: TravelRequest = {
			id: 'TR-DELETE-TEST',
			applicantId: 'u-test',
			applicantName: '测试员',
			department: '测试部',
			reason: '待测删除的草稿',
			urgency: 'normal',
			legs: [],
			budget: { transport: 0, hotel: 0, allowance: 0, other: 0 },
			budgetNote: '',
			status: 'draft',
			createdAt: new Date().toISOString(),
			updatedAt: new Date().toISOString(),
			audit: []
		};
		addRequest(victim);
		expect(getRequestById('TR-DELETE-TEST')?.id).toBe('TR-DELETE-TEST');

		deleteRequest('TR-DELETE-TEST');

		// 内存与缓存双重消失，且不污染其它数据
		expect(getRequestById('TR-DELETE-TEST')).toBeUndefined();
		const cached = JSON.parse(localStorage.getItem('travel-requests') ?? '[]') as TravelRequest[];
		expect(cached.find((r) => r.id === 'TR-DELETE-TEST')).toBeUndefined();
	});
});

describe('createRequest', () => {
	it('生成待主管审批的单据并写入首条 submit 审计', () => {
		const applicant: User = {
			id: 'u-test',
			employeeId: 'EMP99999',
			name: '测试员',
			title: '工程师',
			department: '测试部',
			role: 'employee',
			managerId: null
		};
		const input: TravelFormInput = {
			reason: '去北京参加技术大会并拜访重点客户',
			urgency: 'normal',
			legs: [
				{
					id: 'leg-1',
					from: '上海',
					to: '北京',
					departDate: '2026-09-01',
					returnDate: '2026-09-05',
					transport: 'flight'
				}
			],
			budget: { transport: 200000, hotel: 150000, allowance: 50000, other: 0 },
			budgetNote: ''
		};

		const created = createRequest(input, applicant);

		expect(created.status).toBe('pending_manager');
		expect(created.applicantId).toBe('u-test');
		expect(created.audit).toHaveLength(1);
		expect(created.audit[0].action).toBe('submit');

		// 进入工作数据集后，我的申请里能查到这张新单
		addRequest(created);
		expect(getRequestById(created.id)?.id).toBe(created.id);
	});

	it('存为草稿生成 draft 状态、无审计、无提交时间', () => {
		const applicant: User = {
			id: 'u-test',
			employeeId: 'EMP99999',
			name: '测试员',
			title: '工程师',
			department: '测试部',
			role: 'employee',
			managerId: null
		};
		const input: TravelFormInput = {
			reason: '只是先存个草稿',
			urgency: 'normal',
			legs: [],
			budget: { transport: 0, hotel: 0, allowance: 0, other: 0 },
			budgetNote: ''
		};

		const draftReq = createDraft(input, applicant);

		expect(draftReq.status).toBe('draft');
		expect(draftReq.audit).toHaveLength(0);
		expect(draftReq.submittedAt).toBeUndefined();
		expect(draftReq.applicantId).toBe('u-test');

		addRequest(draftReq);
		expect(getRequestById(draftReq.id)?.status).toBe('draft');
	});
});
