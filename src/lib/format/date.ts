/**
 * ISO 时间字符串 → YYYY-MM-DD（仅取日期部分）。
 *
 * 列表卡片与申请详情都只展示日期，统一在此格式化，避免「日期该怎么切」的逻辑散落多处、
 * 时区/格式一旦要调整得改好几处。
 */
export function formatDate(iso: string): string {
	return iso.slice(0, 10);
}
