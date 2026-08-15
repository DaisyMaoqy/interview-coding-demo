import { redirect } from '@sveltejs/kit';
import type { PageLoad } from './$types';
import { firstStep, isStepSlug } from '$lib/domain/wizard';
import { APPLICATION_TYPE_VALUES, type ApplicationType } from '$lib/domain/types';

/**
 * 统一申请向导入口，按 `type` 参数驱动。
 *
 * 非法 type（或不在该类型步骤表里的 slug）一律重定向到该类型的首步，
 * 避免渲染出空壳或越界步骤。步骤定义全部来自 `applicationTypes.ts` 注册表。
 */
export const load: PageLoad = ({ params }) => {
	const { type, step } = params;
	const validType = APPLICATION_TYPE_VALUES.includes(type as ApplicationType);
	if (!validType || !isStepSlug(type as ApplicationType, step)) {
		const safeType: ApplicationType = validType ? (type as ApplicationType) : 'travel';
		redirect(307, `/apply/${safeType}/${firstStep(safeType)}`);
	}
	// 到此 type 已校验为合法 ApplicationType（非法分支已 redirect）
	return { type: type as ApplicationType, step };
};
