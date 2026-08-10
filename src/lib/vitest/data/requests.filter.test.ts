import { describe, it, expect } from 'vitest';
import {
	filterByStatus,
	searchRequests,
	filterByDate,
	distinctYears,
	nextRequestId,
	getRequestsByApplicant,
	summarizeLegs,
	requestTotal
} from '$lib/data/requests';
import { budgetTotal } from '$lib/domain/money';
import type { TravelRequest } from '$lib/domain/types';

/**
 * 这 8 个纯函数撑起了「我的申请」整条筛选链路
 * （requests/+page.svelte 里 `searchRequests(filterByDate(filterByStatus(...)))`），
 * 此前无任何测试守护。统一用自造 fixture，不依赖 seed，保证用例稳定、可读。
 */

function req(id: string, overrides: Partial<TravelRequest> = {}): TravelRequest {
	return {
		id,
		applicantId: 'u-1',
		applicantName: '甲',
		department: '部门',
		reason: '出差',
		urgency: 'normal',
		legs: [],
		budget: { transport: 0, hotel: 0, allowance: 0, other: 0 },
		budgetNote: '',
		status: 'draft',
		createdAt: '2026-03-10T02:00:00.000Z',
		updatedAt: '2026-03-10T02:00:00.000Z',
		audit: [],
		...overrides
	};
}

const fixtures: TravelRequest[] = [
	req('TR-0001', {
		status: 'draft',
		applicantId: 'u-1',
		reason: '上海出差',
		createdAt: '2026-03-10T02:00:00.000Z',
		legs: [
			{
				id: 'l1',
				from: '上海',
				to: '北京',
				departDate: '2026-03-11',
				returnDate: '2026-03-12',
				transport: 'train'
			}
		]
	}),
	req('TR-0002', {
		status: 'pending_manager',
		applicantId: 'u-1',
		reason: '北京会议',
		createdAt: '2026-05-01T02:00:00.000Z',
		legs: [
			{
				id: 'l2',
				from: '北京',
				to: '广州',
				departDate: '2026-05-02',
				returnDate: '2026-05-03',
				transport: 'flight'
			}
		]
	}),
	req('TR-0003', {
		status: 'pending_finance',
		applicantId: 'u-2',
		reason: 'Shenzhen 培训',
		createdAt: '2025-11-20T02:00:00.000Z',
		legs: []
	}),
	req('TR-0004', {
		status: 'approved',
		applicantId: 'u-2',
		reason: '成都考察',
		createdAt: '2026-08-01T02:00:00.000Z',
		budget: { transport: 20000, hotel: 15000, allowance: 5000, other: 0 },
		legs: [
			{
				id: 'l4a',
				from: '成都',
				to: '重庆',
				departDate: '2026-08-02',
				returnDate: '2026-08-03',
				transport: 'train'
			},
			{
				id: 'l4b',
				from: '重庆',
				to: '成都',
				departDate: '2026-08-04',
				returnDate: '2026-08-05',
				transport: 'train'
			}
		]
	}),
	req('TR-EDIT-2', {
		status: 'rejected',
		applicantId: 'u-1',
		reason: '作废',
		createdAt: '2026-01-15T02:00:00.000Z',
		legs: []
	}),
	req('TR-0006', {
		status: 'cancelled',
		applicantId: 'u-2',
		reason: '无',
		createdAt: '2026-02-02T02:00:00.000Z',
		legs: []
	})
];

describe('filterByStatus', () => {
	it("'all' 与 undefined 都返回全部，且是浅拷贝而非原数组引用", () => {
		expect(filterByStatus(fixtures, 'all')).toHaveLength(6);
		expect(filterByStatus(fixtures, undefined)).toHaveLength(6);
		expect(filterByStatus(fixtures, 'all')).not.toBe(fixtures);
	});

	it("'pending' 合并 pending_manager + pending_finance", () => {
		const ids = filterByStatus(fixtures, 'pending')
			.map((r) => r.id)
			.sort();
		expect(ids).toEqual(['TR-0002', 'TR-0003']);
	});

	it('单一状态精确匹配', () => {
		expect(filterByStatus(fixtures, 'draft').map((r) => r.id)).toEqual(['TR-0001']);
		expect(filterByStatus(fixtures, 'approved').map((r) => r.id)).toEqual(['TR-0004']);
		expect(filterByStatus(fixtures, 'rejected').map((r) => r.id)).toEqual(['TR-EDIT-2']);
	});
});

describe('searchRequests', () => {
	it('空串 / 纯空白视为不过滤', () => {
		expect(searchRequests(fixtures, '')).toHaveLength(6);
		expect(searchRequests(fixtures, '   ')).toHaveLength(6);
	});

	it('匹配事由（含大小写不敏感）', () => {
		expect(searchRequests(fixtures, '上海').map((r) => r.id)).toEqual(['TR-0001']);
		// 大小写不敏感针对拉丁文字：Shenzhen 培训 应被 SHENZHEN 命中
		expect(searchRequests(fixtures, 'SHENZHEN').map((r) => r.id)).toEqual(['TR-0003']);
	});

	it('匹配行程的出发地或目的地', () => {
		// 北京：TR-0001 的目的地、TR-0002 的事由与出发地
		const ids = searchRequests(fixtures, '北京')
			.map((r) => r.id)
			.sort();
		expect(ids).toEqual(['TR-0001', 'TR-0002']);
	});

	it('无命中返回空数组', () => {
		expect(searchRequests(fixtures, '不存在的关键词')).toEqual([]);
	});
});

describe('filterByDate', () => {
	it('按年过滤（UTC 解析，与 seed 的 Date.UTC 对齐）', () => {
		// 2026: TR-0001/0002/0004/EDIT-2/0006；2025: TR-0003
		expect(filterByDate(fixtures, 2026, 'all')).toHaveLength(5);
		expect(filterByDate(fixtures, 2025, 'all').map((r) => r.id)).toEqual(['TR-0003']);
	});

	it('按年+月组合过滤', () => {
		expect(filterByDate(fixtures, 'all', 3).map((r) => r.id)).toEqual(['TR-0001']);
		expect(filterByDate(fixtures, 2026, 8).map((r) => r.id)).toEqual(['TR-0004']);
		expect(filterByDate(fixtures, 'all', 'all')).toHaveLength(6);
	});
});

describe('distinctYears', () => {
	it('去重并按倒序返回出现过的年份', () => {
		expect(distinctYears(fixtures)).toEqual([2026, 2025]);
	});
});

describe('nextRequestId', () => {
	it('取 TR-#### 最大值并补零到 4 位', () => {
		expect(nextRequestId(fixtures)).toBe('TR-0007');
	});

	it('跳过非数字单号（如 TR-EDIT-2）', () => {
		expect(nextRequestId([req('TR-EDIT-2'), req('TR-0009')])).toBe('TR-0010');
	});

	it('空数据集从 TR-0001 起', () => {
		expect(nextRequestId([])).toBe('TR-0001');
	});
});

describe('getRequestsByApplicant', () => {
	it('按申请人聚合', () => {
		expect(
			getRequestsByApplicant('u-1', fixtures)
				.map((r) => r.id)
				.sort()
		).toEqual(['TR-0001', 'TR-0002', 'TR-EDIT-2']);
		expect(
			getRequestsByApplicant('u-2', fixtures)
				.map((r) => r.id)
				.sort()
		).toEqual(['TR-0003', 'TR-0004', 'TR-0006']);
		expect(getRequestsByApplicant('u-x', fixtures)).toEqual([]);
	});
});

describe('summarizeLegs', () => {
	it('空行程返回「无行程」', () => {
		expect(summarizeLegs(req('TR-0003'))).toBe('无行程');
	});

	it('多段行程拼接并按站点去重', () => {
		// 成都→重庆→广州：中间重复的「重庆」只保留一处
		const r = req('TR-LEG', {
			legs: [
				{
					id: 'a',
					from: '成都',
					to: '重庆',
					departDate: '2026-08-02',
					returnDate: '2026-08-03',
					transport: 'train'
				},
				{
					id: 'b',
					from: '重庆',
					to: '广州',
					departDate: '2026-08-04',
					returnDate: '2026-08-05',
					transport: 'train'
				}
			]
		});
		expect(summarizeLegs(r)).toBe('成都 → 重庆 → 广州');
	});
});

describe('requestTotal', () => {
	it('等于预算各分项之和（分）', () => {
		expect(requestTotal(fixtures[3])).toBe(budgetTotal(fixtures[3].budget));
		expect(requestTotal(fixtures[3])).toBe(40000);
	});
});
