/**
 * ISO 时间字符串 → YYYY-MM-DD（仅取日期部分）。
 *
 * 列表卡片与申请详情都只展示日期，统一在此格式化，避免「日期该怎么切」的逻辑散落多处、
 * 时区/格式一旦要调整得改好几处。
 */
export function formatDate(iso: string): string {
	return iso.slice(0, 10);
}

/**
 * ISO 时间字符串 → `YYYY-MM-DD HH:mm`（按字面量取 UTC 分量）。
 *
 * 全站时间戳都按「字面量」处理：seed / Mock / 接口数据本就是 UTC 字面量带 Z，这里直接
 * 取 UTC 分量还原出来即可，不引入时区换算，保证与存储值完全一致。
 */
export function formatDateTime(iso: string): string {
	const d = new Date(iso);
	const pad = (n: number) => String(n).padStart(2, '0');
	return `${d.getUTCFullYear()}-${pad(d.getUTCMonth() + 1)}-${pad(d.getUTCDate())} ${pad(
		d.getUTCHours()
	)}:${pad(d.getUTCMinutes())}`;
}

/**
 * Date → 本地墙钟 ISO 字面量（带 Z 占位），如 `2026-08-09T16:25:53.296Z`。
 *
 * **为什么不用 `toISOString()`**：后者给出的是 UTC 墙钟，比用户所在时区早若干小时
 * （UTC+8 下早 8 小时），直接存会让「提交时间」显示成 08:25 而非真实的 16:25。
 *
 * **为什么是 Z 占位而不是真正的本地偏移**：展示层 {@link formatDateTime} 等按字面量
 * 取 `getUTC*`，把本地墙钟各分量拼成 `…Z` 后，`getUTC*` 读回的正是本地墙钟，与 seed
 * 数据（同样是 `…Z` 字面量）口径统一；若带 `+08:00` 真实偏移，`getUTC*` 反倒会读回
 * UTC 值（早 8 小时）。
 *
 * 用于用户主动产生的时刻（新建 / 提交 / 审批 / 撤回等），seed / Mock / 接口数据不调用。
 */
export function toLocalISO(now: Date = new Date()): string {
	const pad = (n: number, len = 2) => String(n).padStart(len, '0');
	return (
		`${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}` +
		`T${pad(now.getHours())}:${pad(now.getMinutes())}:${pad(now.getSeconds())}.` +
		`${pad(now.getMilliseconds(), 3)}Z`
	);
}
