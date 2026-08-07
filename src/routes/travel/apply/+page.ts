import { redirect } from '@sveltejs/kit';
import { FIRST_STEP, stepHref } from '$lib/domain/wizard';

/** 「发起申请」进来先到向导首步，首步是哪一步由 WIZARD_STEPS 决定 */
export function load() {
	redirect(307, stepHref(FIRST_STEP));
}
