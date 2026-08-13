import { redirect } from '@sveltejs/kit';
import { HOME } from '$lib/core/routes';

/**
 * 站点根路径没有独立内容，直接落到「我的申请」。
 *
 * 用 307 而非 301：落地页归属未来可能调整（例如改为角色相关的首页），
 * 永久重定向会被浏览器长期缓存，届时很难纠正。
 */
export function load() {
	redirect(307, HOME);
}
