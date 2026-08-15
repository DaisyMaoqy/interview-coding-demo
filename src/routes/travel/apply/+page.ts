import { redirect } from '@sveltejs/kit';
import { resolve } from '$app/paths';
import { firstStep } from '$lib/domain/wizard';

/** 兼容旧链接：原「发起申请」入口重定向到统一向导的差旅首步 */
export function load() {
	redirect(307, resolve('/apply/[type]/[step]', { type: 'travel', step: firstStep('travel') }));
}
