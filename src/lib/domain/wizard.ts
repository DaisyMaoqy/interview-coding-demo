import { resolve } from '$app/paths';
import type { z } from 'zod';
import type { ApplicationType } from './types';
import { APPLICATION_TYPES, type StepDef } from './applicationTypes';
import { buildStepSchema } from './schemaConfig';

/**
 * 新建向导的步骤定义，改为由 `applicationTypes.ts` 注册表驱动。
 *
 * 步骤顺序、URL slug、标题全部从 `APPLICATION_TYPES[type].steps` 派生 ——
 * 增删步骤或调整顺序只改注册表，步骤条、路由校验、上/下一步导航自动跟随。
 * 不再有硬编码的 `WIZARD_STEPS` 数组。
 */

/** 某类型的全部步骤定义 */
export function getSteps(type: ApplicationType): StepDef[] {
	return APPLICATION_TYPES[type].steps;
}

export function firstStep(type: ApplicationType): string {
	return getSteps(type)[0].slug;
}

export function lastStep(type: ApplicationType): string {
	const steps = getSteps(type);
	return steps[steps.length - 1].slug;
}

/** 路由参数守卫：把任意字符串收窄成某类型下的合法 slug */
export function isStepSlug(type: ApplicationType, value: string): value is string {
	return getSteps(type).some((step) => step.slug === value);
}

export function stepIndex(type: ApplicationType, slug: string): number {
	return getSteps(type).findIndex((step) => step.slug === slug);
}

export function stepBySlug(type: ApplicationType, slug: string): StepDef {
	return getSteps(type)[stepIndex(type, slug)];
}

/** 上一步的 slug，首步返回 null */
export function prevStep(type: ApplicationType, slug: string): string | null {
	const index = stepIndex(type, slug);
	return index > 0 ? getSteps(type)[index - 1].slug : null;
}

/** 下一步的 slug，末步返回 null */
export function nextStep(type: ApplicationType, slug: string): string | null {
	const steps = getSteps(type);
	const index = stepIndex(type, slug);
	return index < steps.length - 1 ? steps[index + 1].slug : null;
}

/**
 * 编辑态标记：重新编辑进入向导时记下被编辑申请的 id，让向导内所有步骤跳转
 * （上一步/下一步、预览里的「修改」）都带上 `?edit=ID`，保持编辑上下文不丢。
 *
 * 用模块级变量而非响应式 store，是因为步骤跳转是命令式调用；刷新时由向导外壳
 * 读取 URL 上的 `?edit` 重新同步（见 `apply/[type]/[step]/+page.svelte`）。
 */
let activeEditId: string | null = null;

export function setActiveEditId(id: string | null): void {
	activeEditId = id;
}

export function getActiveEditId(): string | null {
	return activeEditId;
}

export function stepHref(
	type: ApplicationType,
	slug: string,
	editId: string | null = activeEditId
): string {
	const base = resolve('/apply/[type]/[step]', { type, step: slug });
	return editId ? `${base}?edit=${editId}` : base;
}

/**
 * 预览页「修改」按钮的目标地址。
 *
 * `focus` 用于让目标页聚焦并滚动到具体字段，例如
 * `stepHrefWithFocus('travel', 'trips', 'leg-1')` → `/apply/travel/trips?focus=leg-1`。
 * 编辑态下自动带上 `?edit=ID`，避免改完一步跳回「新建」上下文。
 */
export function stepHrefWithFocus(
	type: ApplicationType,
	slug: string,
	focus: string,
	editId: string | null = activeEditId
): string {
	const base = stepHref(type, slug, editId);
	return `${base}${base.includes('?') ? '&' : '?'}focus=${encodeURIComponent(focus)}`;
}

/**
 * 计算每一步的完成情况与可达性。
 *
 * 规则：**已完成的步骤 + 第一个未完成的步骤**可点。
 * 不允许直接跳到更后面的步骤 —— 否则用户会在预算页看到空行程，
 * 而跨字段规则（如日期重叠）根本无从校验。
 *
 * @param type 当前申请类型
 * @param draft 当前草稿，可能只填了一部分
 */
export function evaluateSteps(
	type: ApplicationType,
	draft: unknown
): Array<{ step: StepDef; completed: boolean; reachable: boolean }> {
	const steps = getSteps(type);

	// 预览步没有独立 schema：当所有 form 步都完成时视为完成
	const completions = steps.map((step) => {
		if (step.kind === 'preview') {
			return steps
				.filter((s) => s.kind === 'form')
				.every((s) => isStepComplete(type, s.slug, draft));
		}
		return isStepComplete(type, step.slug, draft);
	});

	// 第一个未完成步骤的下标；全部完成时为 length
	const firstIncomplete = completions.findIndex((done) => !done);
	const frontier = firstIncomplete === -1 ? steps.length : firstIncomplete;

	return steps.map((step, index) => ({
		step,
		// 预览步没有独立 schema，完成与否由提交动作决定，永远不算「已完成」，
		// 但它是否可达仍取决于前面所有 form 步是否填完（见上面的 frontier 计算）。
		completed: step.kind === 'preview' ? false : (completions[index] as boolean),
		reachable: index <= frontier
	}));
}

function isStepComplete(type: ApplicationType, slug: string, draft: unknown): boolean {
	const schema = buildStepSchema(type, slug);
	return (schema as z.ZodType).safeParse(draft).success;
}
