import { describe, expect, it } from 'vitest';
import { get } from 'svelte/store';
import { getAllRequests, getRequestById, requestsStore, updateRequest } from '$lib/data/requests';
import type { TravelRequest } from '$lib/domain/types';

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
