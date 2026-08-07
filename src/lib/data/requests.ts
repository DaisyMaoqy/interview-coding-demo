import seed from './seed.json' with { type: 'json' };
import type { RequestStatus, TravelRequest, UserId } from '$lib/domain/types';
import { budgetTotal } from '$lib/domain/money';

/**
 * 列表筛选维度。
 *
 * - `'all'`：不限制状态
 * - `'pending'`：审批中，即 `pending_manager` + `pending_finance` 两个状态的合集
 * - 其余为单一 {@link RequestStatus}
 */
export type StatusFilter = 'all' | RequestStatus | 'pending';

/**
 * 申请单数据源（演示用）。
 *
 * 当前直接读本地 seed.json —— 它是 Apifox Mock 响应的副本。这里集中成一个函数，
 * 是为了把「数据从哪来」这一处变化点收口：将来换成 Apifox HTTP 读取 +
 * localStorage 草稿，页面层不需要改动，只需改这里。
 *
 * 注意返回的是引用共享的数组，调用方若需要不可变语义请自行浅拷贝。
 */

/** 全部申请单（已按更新时间倒序，与 seed.json 内顺序一致） */
export function getAllRequests(): readonly TravelRequest[] {
	return seed as TravelRequest[];
}

/** 某用户发起的全部申请（我的申请 / 待我审批都从这里再按角色筛） */
export function getRequestsByApplicant(applicantId: UserId): TravelRequest[] {
	return (seed as TravelRequest[]).filter((r) => r.applicantId === applicantId);
}

/**
 * 按筛选维度过滤。
 *
 * - `'all'`：全部
 * - `'pending'`：审批中（pending_manager 或 pending_finance）
 * - 其余：精确匹配该状态
 */
export function filterByStatus(
	requests: readonly TravelRequest[],
	filter: StatusFilter | undefined
): TravelRequest[] {
	if (!filter || filter === 'all') return [...requests];
	if (filter === 'pending')
		return requests.filter((r) => r.status === 'pending_manager' || r.status === 'pending_finance');
	return requests.filter((r) => r.status === filter);
}

/**
 * 按事由与目的地（行程任意一段的 from/to）模糊搜索。
 * 大小写不敏感，空串视为不过滤。
 */
export function searchRequests(
	requests: readonly TravelRequest[],
	keyword: string
): TravelRequest[] {
	const kw = keyword.trim().toLowerCase();
	if (kw === '') return [...requests];

	return requests.filter((r) => {
		const inReason = r.reason.toLowerCase().includes(kw);
		const inLeg = r.legs.some(
			(leg) => leg.from.toLowerCase().includes(kw) || leg.to.toLowerCase().includes(kw)
		);
		return inReason || inLeg;
	});
}

/**
 * 按申请创建时间的年/月过滤。
 *
 * 两个维度独立：年份或月份为 `'all'` 表示该维度不限制。
 * 用 UTC 解析，与 seed 生成（Date.UTC）保持一致，避免时区导致跨月错位。
 */
export function filterByDate(
	requests: readonly TravelRequest[],
	year: number | 'all',
	month: number | 'all'
): TravelRequest[] {
	return requests.filter((r) => {
		const d = new Date(r.createdAt);
		if (year !== 'all' && d.getUTCFullYear() !== year) return false;
		if (month !== 'all' && d.getUTCMonth() + 1 !== month) return false;
		return true;
	});
}

/** 数据里出现过的年份（倒序），用于年份下拉框的可选项 */
export function distinctYears(requests: readonly TravelRequest[]): number[] {
	const years = new Set<number>();
	for (const r of requests) years.add(new Date(r.createdAt).getUTCFullYear());
	return [...years].sort((a, b) => b - a);
}

/** 行程摘要，形如「北京 → 上海 → 广州」 */
export function summarizeLegs(request: TravelRequest): string {
	if (request.legs.length === 0) return '无行程';
	const stops = request.legs.flatMap((leg) => [leg.from, leg.to]);
	return [...new Set(stops)].join(' → ');
}

/** 预算合计（分） */
export function requestTotal(request: TravelRequest): number {
	return budgetTotal(request.budget);
}
