/** 全站标题前缀，浏览器标签页与书签靠它辨识 */
export const APP_NAME = '差旅申请';

/**
 * 拼接页面标题，统一为「差旅申请 - 子标题」。
 *
 * 集中在一处而非各页面自己拼字符串，避免出现全角/半角连字符混用、
 * 或某个页面漏掉前缀这类不一致。
 *
 * @param subtitle 省略时返回应用名本身
 */
export function pageTitle(subtitle?: string): string {
	return subtitle ? `${APP_NAME} - ${subtitle}` : APP_NAME;
}
