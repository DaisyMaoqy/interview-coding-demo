import { describe, it, expect } from 'vitest';
import seed from '../../data/seed.json' with { type: 'json' };
import { MANAGER_ID } from '../../domain/org';
import type { TravelRequest } from '../../domain/types';
import {
	computeDateRange,
	filterByDateRange,
	statusDistribution,
	monthlyApplicationTrend,
	managerOverview,
	STATUS_ORDER
} from '../../domain/dashboard';

/**
 * 统计报表聚合层纯函数测试。
 *
 * 覆盖 computeDateRange / filterByDateRange / statusDistribution /
 * monthlyApplicationTrend / managerOverview 的正确性，并用 seed 数据验证
 * 研发部主管（不含自己）的统计口径与页面一致。
 */

const requests = seed as TravelRequest[];

/** 研发部除主管（李经理）以外的员工申请，且排除草稿 === 页面 deptRequests 等价物 */
const deptRequests = requests.filter((r) => r.applicantId !== MANAGER_ID && r.status !== 'draft');

// ─── computeDateRange ────────────────────────────────────────────────

describe('computeDateRange', () => {
	it('全部：起点为 2000 年，覆盖所有历史数据', () => {
		const range = computeDateRange('all');

		expect(range.start).toEqual(new Date(2000, 0, 1));
		// 终点为当天 23:59:59.999
		const now = new Date();
		expect(range.end).toEqual(
			new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59, 999)
		);
	});

	it('本月：起点为当月 1 号 0 点，终点为当天 23:59:59.999', () => {
		const now = new Date();
		const range = computeDateRange('thisMonth');

		expect(range.start).toEqual(new Date(now.getFullYear(), now.getMonth(), 1));
		expect(range.end).toEqual(
			new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59, 999)
		);
	});

	it('本季度：起点为该季度首月 1 号', () => {
		const now = new Date();
		const q = Math.floor(now.getMonth() / 3) * 3;
		const range = computeDateRange('thisQuarter');

		expect(range.start).toEqual(new Date(now.getFullYear(), q, 1));
	});

	it('本年：起点为 1 月 1 号', () => {
		const range = computeDateRange('thisYear');

		expect(range.start).toEqual(new Date(new Date().getFullYear(), 0, 1));
	});

	it('自定义区间：使用传入的起止日期，终点补到 23:59:59.999', () => {
		const start = new Date('2026-03-01');
		const end = new Date('2026-06-15');
		const range = computeDateRange('custom', start, end);

		expect(range.start).toEqual(start);
		expect(range.end).toEqual(new Date(2026, 5, 15, 23, 59, 59, 999));
	});

	it('自定义区间未传日期时展示全部数据', () => {
		expect(computeDateRange('custom')).toEqual(computeDateRange('all'));
	});
});

// ─── filterByDateRange ───────────────────────────────────────────────

describe('filterByDateRange', () => {
	it('限定范围后条数 ≤ 全量', () => {
		// 种子数据跨 2025-09 ~ 2026-08，用 Date.UTC 保证时区一致
		const range = {
			start: new Date(Date.UTC(2026, 0, 1)),
			end: new Date(Date.UTC(2026, 11, 31, 23, 59, 59, 999))
		};
		const filtered = filterByDateRange(deptRequests, range);

		expect(filtered.length).toBeGreaterThan(0);
		expect(filtered.length).toBeLessThanOrEqual(deptRequests.length);
	});

	it('空集（范围外）返回空数组', () => {
		const range = {
			start: new Date('2020-01-01'),
			end: new Date(2020, 11, 31, 23, 59, 59, 999)
		};
		const filtered = filterByDateRange(deptRequests, range);

		expect(filtered).toEqual([]);
	});

	it('全量（覆盖全部数据）返回全部', () => {
		const range = {
			start: new Date(Date.UTC(2025, 0, 1)),
			end: new Date(Date.UTC(2027, 11, 31, 23, 59, 59, 999))
		};
		const filtered = filterByDateRange(deptRequests, range);

		expect(filtered.length).toBe(deptRequests.length);
	});

	it('边界值：恰好落在某条记录的 createdAt 上仍能命中', () => {
		const target = deptRequests[0];
		const d = new Date(target.createdAt);
		const range = {
			start: d,
			end: new Date(d.getTime() + 1000)
		};
		const filtered = filterByDateRange(deptRequests, range);

		expect(filtered.find((r) => r.id === target.id)).toBeTruthy();
	});
});

// ─── statusDistribution ──────────────────────────────────────────────

describe('statusDistribution', () => {
	it('各状态条数之和等于输入总数', () => {
		const result = statusDistribution(deptRequests);
		const total = result.reduce((sum, s) => sum + s.value, 0);

		expect(total).toBe(deptRequests.length);
	});

	it('结果按 STATUS_ORDER 排列', () => {
		const result = statusDistribution(deptRequests);
		const indices = result.map((s) => STATUS_ORDER.indexOf(s.status));

		for (let i = 1; i < indices.length; i++) {
			expect(indices[i]).toBeGreaterThan(indices[i - 1]);
		}
	});

	it('每个元素的 name 不为空', () => {
		const result = statusDistribution(deptRequests);

		for (const s of result) {
			expect(s.name.length).toBeGreaterThan(0);
		}
	});

	it('空输入返回空', () => {
		expect(statusDistribution([])).toEqual([]);
	});

	it('排除主管后待主管审批的单不含主管自己的单', () => {
		const result = statusDistribution(deptRequests);
		const pendingManager = result.find((s) => s.status === 'pending_manager');

		if (pendingManager) {
			// 确保统计中的待审批单都不是主管自己的
			const pendingDept = deptRequests.filter((r) => r.status === 'pending_manager');

			expect(pendingDept.every((r) => r.applicantId !== MANAGER_ID)).toBe(true);
			expect(pendingManager.value).toBe(pendingDept.length);
		}
	});
});

// ─── monthlyApplicationTrend ─────────────────────────────────────────

describe('monthlyApplicationTrend', () => {
	it('默认返回 12 个月', () => {
		expect(monthlyApplicationTrend(deptRequests).length).toBe(12);
	});

	it('指定月数正确', () => {
		expect(monthlyApplicationTrend(deptRequests, 6).length).toBe(6);
		expect(monthlyApplicationTrend(deptRequests, 3).length).toBe(3);
	});

	it('各月条数之和等于输入总数', () => {
		const trend = monthlyApplicationTrend(deptRequests);
		const total = trend.reduce((sum, p) => sum + p.amount, 0);

		expect(total).toBe(deptRequests.length);
	});

	it('月份升序排列', () => {
		const trend = monthlyApplicationTrend(deptRequests);

		for (let i = 1; i < trend.length; i++) {
			expect(trend[i].month > trend[i - 1].month).toBe(true);
		}
	});

	it('欠缺月份补 0', () => {
		// 制造只有 3 月和 6 月的数据；用 months=6 则窗口含 3~8 月
		const sparse: TravelRequest[] = [
			{ ...deptRequests[0], createdAt: '2026-03-15T00:00:00.000Z' },
			{ ...deptRequests[0], createdAt: '2026-03-20T00:00:00.000Z' },
			{ ...deptRequests[0], createdAt: '2026-06-01T00:00:00.000Z' }
		];
		const trend = monthlyApplicationTrend(sparse, 6);

		expect(trend.length).toBe(6);
		// 3 月有 2 条、6 月有 1 条、4 月为 0
		expect(trend.find((p) => p.month.endsWith('-03'))?.amount).toBe(2);
		expect(trend.find((p) => p.month.endsWith('-06'))?.amount).toBe(1);
		expect(trend.find((p) => p.month.endsWith('-04'))?.amount).toBe(0);
	});
});

// ─── managerOverview ─────────────────────────────────────────────────

describe('managerOverview', () => {
	it('total 等于输入条数', () => {
		expect(managerOverview(deptRequests).total).toBe(deptRequests.length);
	});

	it('pending 等于 pending_manager + pending_finance', () => {
		const overview = managerOverview(deptRequests);
		const expected = deptRequests.filter(
			(r) => r.status === 'pending_manager' || r.status === 'pending_finance'
		).length;

		expect(overview.pending).toBe(expected);
	});

	it('passRate 落在 [0, 1] 区间', () => {
		const overview = managerOverview(deptRequests);

		expect(overview.passRate).toBeGreaterThanOrEqual(0);
		expect(overview.passRate).toBeLessThanOrEqual(1);
	});

	it('排除主管后总数减少', () => {
		const allOverview = managerOverview(requests);
		const deptOverview = managerOverview(deptRequests);

		expect(deptOverview.total).toBeLessThan(allOverview.total);
	});

	it('全部拒绝时 passRate 为 0', () => {
		const allRejected = deptRequests
			.slice(0, 3)
			.map((r) => ({ ...r, status: 'rejected' as const }));
		const overview = managerOverview(allRejected);

		expect(overview.passRate).toBe(0);
	});

	it('全部通过时 passRate 为 1', () => {
		const allApproved = deptRequests
			.slice(0, 3)
			.map((r) => ({ ...r, status: 'approved' as const }));
		const overview = managerOverview(allApproved);

		expect(overview.passRate).toBe(1);
	});

	it('空输入返回 0 / 0 / 0', () => {
		const overview = managerOverview([]);

		expect(overview).toEqual({ total: 0, pending: 0, passRate: 0 });
	});
});

// ─── 研发部主管统计口径集成验证 ──────────────────────────────────────

describe('研发部主管统计口径', () => {
	it('排除主管本人和草稿后计数正确（研发部 40 条，主管 4 条，非主管草稿 5 条 → 31 条）', () => {
		// 这个数字由 seed 数据决定；seed.test 已保证数据量稳定
		expect(requests.length).toBe(40);
		expect(deptRequests.length).toBe(31);
	});

	it('排除了主管后 deptRequests 不含主管本人的申请', () => {
		const managerOwn = deptRequests.filter((r) => r.applicantId === MANAGER_ID);

		expect(managerOwn).toEqual([]);
	});

	it('本月日期筛选后统计卡片数值正确', () => {
		const thisMonth = computeDateRange('thisMonth');
		const monthData = filterByDateRange(deptRequests, thisMonth);
		const overview = managerOverview(monthData);

		// 本月数据量应 ≤ 全量，且不为 0（seed 已保证每月有数据）
		expect(monthData.length).toBeGreaterThan(0);
		expect(monthData.length).toBeLessThanOrEqual(deptRequests.length);
		// 卡片数值应与数据一致
		expect(overview.total).toBe(monthData.length);
	});

	it('本月筛选后状态分布各条数之和等于本月总数', () => {
		const thisMonth = computeDateRange('thisMonth');
		const monthData = filterByDateRange(deptRequests, thisMonth);
		const dist = statusDistribution(monthData);
		const totalFromDist = dist.reduce((s, c) => s + c.value, 0);

		expect(totalFromDist).toBe(monthData.length);
	});

	it('按本月筛选后趋势图中本月值 ≥ 本月数据条数', () => {
		const thisMonth = computeDateRange('thisMonth');
		const monthData = filterByDateRange(deptRequests, thisMonth);

		// 趋势图只看月粒度，本月数据应全落在当月 bucket 中
		const trend = monthlyApplicationTrend(monthData, 12);
		const now = new Date();
		const currentMonth = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
		const thisBucket = trend.find((p) => p.month === currentMonth);

		expect(thisBucket).toBeDefined();
		expect(thisBucket!.amount).toBe(monthData.length);
	});

	it('仿真实场景：主管李经理看到 31 条下属申请（不含草稿），再按「待主管审批」筛选后条数正确', () => {
		const pending = deptRequests.filter((r) => r.status === 'pending_manager');
		const overview = managerOverview(pending);

		expect(pending.length).toBeGreaterThan(0);
		expect(overview.total).toBe(pending.length);
		expect(overview.passRate).toBe(0); // 没有已决定的单
	});
});
