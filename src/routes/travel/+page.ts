import { redirect } from '@sveltejs/kit';
import { resolve } from '$app/paths';

/** `/travel` 是业务入口而非页面，裸访问归到「我的申请」 */
export function load() {
	redirect(307, resolve('/requests'));
}
