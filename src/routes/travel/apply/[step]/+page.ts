import { redirect } from '@sveltejs/kit';
import { isWizardSlug, stepBySlug, stepHref, FIRST_STEP } from '$lib/domain/wizard';
import type { PageLoad } from './$types';

/**
 * 把 URL 里的任意字符串收窄成合法的向导步骤。
 *
 * 校验放在 load 而非组件里：非法 slug 不再渲染空白向导外壳，
 * 而是直接送回「发起申请」向导首步，让用户从正确的入口继续。
 */
export const load: PageLoad = ({ params }) => {
	if (!isWizardSlug(params.step)) {
		redirect(307, stepHref(FIRST_STEP));
	}

	return { step: stepBySlug(params.step) };
};
