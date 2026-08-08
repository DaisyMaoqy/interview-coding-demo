/**
 * 分页纯函数。
 *
 * 列表本身（筛选/搜索/排序）由页面负责，这里只处理「第几页、每页几条」这类
 * 与业务无关的横切逻辑，便于「我的申请」与「待我审批」两处共用同一套计算。
 */

/** 总页数，至少 1 页（空表也当作 1 页，按钮据此禁用） */
export function pageCount(total: number, pageSize: number): number {
	return Math.max(1, Math.ceil(total / pageSize));
}

/** 把越界的当前页收拢到合法区间，供分页控件与切片共用 */
export function clampPage(page: number, total: number, pageSize: number): number {
	return Math.min(Math.max(1, page), pageCount(total, pageSize));
}

/** 取当前页的切片；越界时自动收拢，避免空表闪烁 */
export function paginate<T>(items: readonly T[], page: number, pageSize: number): T[] {
	const safe = clampPage(page, items.length, pageSize);
	const start = (safe - 1) * pageSize;
	return items.slice(start, start + pageSize);
}
