import { describe, it, expect } from 'vitest';
import { sortBySubmittedAtDesc } from '$lib/data/requests';
import type { TravelRequest } from '$lib/domain/types';

function makeRequest(id: string, submittedAt: string | undefined): TravelRequest {
	return {
		id,
		applicantId: 'u1',
		applicantName: '张三',
		department: '研发部',
		reason: '事由',
		urgency: 'normal',
		legs: [],
		budget: { transport: 0, hotel: 0, allowance: 0, other: 0 },
		status: 'pending_manager',
		createdAt: '2026-01-01T00:00:00.000Z',
		updatedAt: '2026-01-01T00:00:00.000Z',
		submittedAt,
		audit: []
	};
}

describe('sortBySubmittedAtDesc', () => {
	it('按提交时间倒序，最新提交在前', () => {
		const list = [
			makeRequest('A', '2026-01-01T00:00:00.000Z'),
			makeRequest('B', '2026-03-01T00:00:00.000Z'),
			makeRequest('C', '2026-02-01T00:00:00.000Z')
		];
		expect(sortBySubmittedAtDesc(list).map((r) => r.id)).toEqual(['B', 'C', 'A']);
	});

	it('草稿（无 submittedAt）沉到末尾，且不改变有提交时间单据的相对顺序', () => {
		const list = [
			makeRequest('draft', undefined),
			makeRequest('A', '2026-01-01T00:00:00.000Z'),
			makeRequest('B', '2026-03-01T00:00:00.000Z')
		];
		expect(sortBySubmittedAtDesc(list).map((r) => r.id)).toEqual(['B', 'A', 'draft']);
	});

	it('不修改原数组', () => {
		const list = [
			makeRequest('A', '2026-01-01T00:00:00.000Z'),
			makeRequest('B', '2026-03-01T00:00:00.000Z')
		];
		const snapshot = [...list];
		sortBySubmittedAtDesc(list);
		expect(list).toEqual(snapshot);
	});
});
