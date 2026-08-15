import { redirect } from '@sveltejs/kit';
import { resolve } from '$app/paths';

/** 兼容旧链接：原差旅向导步骤重定向到统一向导的对应步骤 */
export function load({ params }: { params: { step: string } }) {
	redirect(307, resolve('/apply/[type]/[step]', { type: 'travel', step: params.step }));
}
