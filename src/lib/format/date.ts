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
 * ISO 时间字符串 → `YYYY-MM-DD HH:mm`（UTC，与 seed 生成、其它日期处理保持一致）。
 *
 * 用于申请卡片的「提交时间」等需要精确到分钟的展示，避免时区导致与存储值错位。
 */
export function formatDateTime(iso: string): string {
	const d = new Date(iso);
	const pad = (n: number) => String(n).padStart(2, '0');
	return `${d.getUTCFullYear()}-${pad(d.getUTCMonth() + 1)}-${pad(d.getUTCDate())} ${pad(
		d.getUTCHours()
	)}:${pad(d.getUTCMinutes())}`;
}
