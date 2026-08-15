import type { RequestStatus, Request } from './types';
import { PENDING_STATUSES } from './types';
import { STATUS_LABELS } from './workflow';
import { LEAVE_TYPE_OPTIONS } from './applicationTypes';

/**
 * 统计报表聚合层（纯函数，与 UI 解耦，便于将来补单测）。
 *
 * 仅面向领导（主管）角色，以「团队申请情况」为核心：状态分布、申请量趋势、
 * 通过率、按部门分布，而非个人费用分析。金额仅在概览卡中作为辅助指标出现。
 */

/** echarts 调色板，与设计令牌（brand/emerald/amber/rose…）观感对齐 */
export const CHART_COLORS = ['#4f46e5', '#059669', '#f59e0b', '#e11d48', '#0ea5e9', '#8b5cf6'];

/** 看板展示的状态顺序（草稿通常不计入统计，置于末尾） */
export const STATUS_ORDER: RequestStatus[] = [
	'pending_manager',
	'pending_finance',
	'approved',
	'rejected',
	'cancelled',
	'draft'
];

export interface MonthlyPoint {
	/** YYYY-MM */
	month: string;
	/** 分 */
	amount: number;
}

/** 请假类型对应的图表配色，请假类型分布饼图按此对齐 */
export const LEAVE_TYPE_COLORS: Record<string, string> = {
	annual: '#4f46e5',
	sick: '#e11d48',
	personal: '#f59e0b'
};

/** 状态对应的图表配色，状态分布饼图按此对齐（与状态机/列表徽章观感一致） */
export const STATUS_COLORS: Record<RequestStatus, string> = {
	pending_manager: '#f59e0b',
	pending_finance: '#0ea5e9',
	approved: '#059669',
	rejected: '#e11d48',
	cancelled: '#94a3b8',
	draft: '#cbd5e1'
};

export interface StatusSlice {
	status: RequestStatus;
	name: string;
	value: number;
}

/** 各状态申请数量分布（按 STATUS_ORDER 排列，只保留出现过的状态） */
export function statusDistribution(requests: readonly Request[]): StatusSlice[] {
	const counts = new Map<RequestStatus, number>();
	for (const r of requests) counts.set(r.status, (counts.get(r.status) ?? 0) + 1);
	return STATUS_ORDER.filter((s) => counts.has(s)).map((s) => ({
		status: s,
		name: STATUS_LABELS[s],
		value: counts.get(s)!
	}));
}

/**
 * 单条申请的请假天数（仅 leave 类型有效，其余返回 0）。
 * 与请求卡片里的「请假天数」口径一致：起止日期按天取整、含首尾两天。
 */
export function leaveDays(request: Request): number {
	if (request.type !== 'leave') return 0;
	const f = request.fields as Record<string, unknown>;
	const start = f.leaveStart as string | undefined;
	const end = f.leaveEnd as string | undefined;
	if (!start || !end) return 0;
	const ms = Date.parse(end) - Date.parse(start);
	return ms >= 0 ? Math.round(ms / 86_400_000) + 1 : 0;
}

export interface CategorySlice {
	/** 离散维度取值（如请假类型 annual/sick/personal） */
	value: string;
	name: string;
	count: number;
}

/** 请假类型分布（年假/病假/事假计数，按 LEAVE_TYPE_OPTIONS 顺序，过滤掉 0 值） */
export function leaveTypeDistribution(requests: readonly Request[]): CategorySlice[] {
	const counts = new Map<string, number>();
	for (const r of requests) {
		if (r.type !== 'leave') continue;
		const t = (r.fields as Record<string, unknown>).leaveType as string | undefined;
		if (t) counts.set(t, (counts.get(t) ?? 0) + 1);
	}
	return LEAVE_TYPE_OPTIONS.map((o) => ({
		value: o.value,
		name: o.label,
		count: counts.get(o.value) ?? 0
	})).filter((s) => s.count > 0);
}

export interface LeaveOverview {
	/** 请假单数量 */
	count: number;
	/** 请假总天数 */
	totalDays: number;
	/** 平均每单天数 */
	avgDays: number;
}

/** 请假概览：单数、总天数、平均每单天数（仅统计 leave 类型） */
export function leaveOverview(requests: readonly Request[]): LeaveOverview {
	const leaves = requests.filter((r) => r.type === 'leave');
	const totalDays = leaves.reduce((sum, r) => sum + leaveDays(r), 0);
	return {
		count: leaves.length,
		totalDays,
		avgDays: leaves.length ? totalDays / leaves.length : 0
	};
}

/** 生成近 months 个月（含当月）的月份桶，缺失月份补 0，供各类月度趋势复用 */
function buildMonthBuckets(months: number): MonthlyPoint[] {
	const now = new Date();
	const buckets: MonthlyPoint[] = [];
	for (let i = months - 1; i >= 0; i--) {
		const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
		buckets.push({
			month: `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`,
			amount: 0
		});
	}
	return buckets;
}

/**
 * 近 `months` 个月（含当月）按月统计申请**量**（按 createdAt 计数，含草稿），缺失月份补 0。
 * 与「费用趋势」不同，这里看的是单量而非金额。
 */
export function monthlyApplicationTrend(requests: readonly Request[], months = 12): MonthlyPoint[] {
	const buckets = buildMonthBuckets(months);
	const indexByMonth = new Map(buckets.map((b, i) => [b.month, i]));
	for (const r of requests) {
		const d = new Date(r.createdAt);
		const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
		const i = indexByMonth.get(key);
		if (i !== undefined) buckets[i].amount += 1;
	}
	return buckets;
}

/**
 * 近 `months` 个月（含当月）按月统计**请假天数**（仅 leave 类型，按 createdAt 归月），
 * 缺失月份补 0。与 monthlyApplicationTrend 同源，但聚合维度是「天数」而非「单量」，
 * 更贴合请假业务的统计诉求。
 */
export function monthlyLeaveDays(requests: readonly Request[], months = 12): MonthlyPoint[] {
	const buckets = buildMonthBuckets(months);
	const indexByMonth = new Map(buckets.map((b, i) => [b.month, i]));
	for (const r of requests) {
		if (r.type !== 'leave') continue;
		const d = new Date(r.createdAt);
		const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
		const i = indexByMonth.get(key);
		if (i !== undefined) buckets[i].amount += leaveDays(r);
	}
	return buckets;
}

export interface ManagerOverview {
	/** 申请总数 */
	total: number;
	/** 待我审批数量（pending_manager + pending_finance） */
	pending: number;
	/** 通过率（已通过 / 已决定），0~1 */
	passRate: number;
}

export function managerOverview(requests: readonly Request[]): ManagerOverview {
	const total = requests.length;
	const pending = requests.filter((r) => PENDING_STATUSES.some((s) => r.status === s)).length;
	const approved = requests.filter((r) => r.status === 'approved').length;
	const rejected = requests.filter((r) => r.status === 'rejected').length;
	const decided = approved + rejected;
	return { total, pending, passRate: decided ? approved / decided : 0 };
}

export type DatePreset = 'all' | 'thisMonth' | 'thisQuarter' | 'thisYear' | 'custom';

export interface DateRange {
	start: Date;
	end: Date;
}

/** 根据预设类型计算日期范围（end 含当天 23:59:59.999） */
export function computeDateRange(
	preset: DatePreset,
	customStart?: Date,
	customEnd?: Date
): DateRange {
	const now = new Date();
	const end = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59, 999);

	switch (preset) {
		case 'all': {
			// 返回足够宽广的范围以包含全部历史数据
			const start = new Date(2000, 0, 1);
			return { start, end };
		}
		case 'thisMonth': {
			const start = new Date(now.getFullYear(), now.getMonth(), 1);
			return { start, end };
		}
		case 'thisQuarter': {
			const q = Math.floor(now.getMonth() / 3) * 3;
			const start = new Date(now.getFullYear(), q, 1);
			return { start, end };
		}
		case 'thisYear': {
			const start = new Date(now.getFullYear(), 0, 1);
			return { start, end };
		}
		case 'custom':
			if (customStart && customEnd) {
				return {
					start: customStart,
					end: new Date(
						customEnd.getFullYear(),
						customEnd.getMonth(),
						customEnd.getDate(),
						23,
						59,
						59,
						999
					)
				};
			}
			// 未选择起止日期时展示全部数据
			return computeDateRange('all');
	}
}

/** 按日期范围筛选申请（createdAt 落在 [start, end] 内） */
export function filterByDateRange(requests: readonly Request[], range: DateRange): Request[] {
	const startTime = range.start.getTime();
	const endTime = range.end.getTime();
	return requests.filter((r) => {
		const t = new Date(r.createdAt).getTime();
		return t >= startTime && t <= endTime;
	});
}
