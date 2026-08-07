import { error } from '@sveltejs/kit';
import { isWizardSlug, stepBySlug } from '$lib/domain/wizard';
import type { PageLoad } from './$types';

/**
 * 把 URL 里的任意字符串收窄成合法的向导步骤。
 *
 * 校验放在 load 而非组件里：非法 slug 应当是一次 404，
 * 而不是渲染出一个空白的向导外壳再提示出错。
 */
export const load: PageLoad = ({ params }) => {
	if (!isWizardSlug(params.step)) {
		error(404, `未知的申请步骤：${params.step}`);
	}

	return { step: stepBySlug(params.step) };
};
