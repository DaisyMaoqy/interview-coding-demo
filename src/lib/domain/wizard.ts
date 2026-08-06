import type { z } from 'zod';
import { basicSchema, budgetSchema, tripsSchema } from './schema';

/**
 * 新建向导的步骤定义。
 *
 * 步骤顺序、URL slug、标题、对应 schema 全部集中在 WIZARD_STEPS 一处 ——
 * 增删步骤或调整顺序只改这个数组，步骤条、路由校验、上/下一步导航自动跟随。
 */

export const WIZARD_STEPS = [
	{ slug: 'basic', title: '基本信息', description: '出差事由与紧急程度', schema: basicSchema },
	{ slug: 'trips', title: '行程明细', description: '出发地、目的地与日期', schema: tripsSchema },
	{ slug: 'budget', title: '费用预算', description: '分项预算与说明', schema: budgetSchema },
	// 预览步没有独立 schema，提交时统一跑 travelFormSchema
	{ slug: 'preview', title: '预览确认', description: '核对信息后提交', schema: null }
] as const;

export type WizardStep = (typeof WIZARD_STEPS)[number];
export type WizardSlug = WizardStep['slug'];

export const FIRST_STEP: WizardSlug = WIZARD_STEPS[0].slug;
export const LAST_STEP: WizardSlug = WIZARD_STEPS[WIZARD_STEPS.length - 1].slug;

const SLUGS: readonly string[] = WIZARD_STEPS.map((step) => step.slug);

/** 路由参数守卫：把任意字符串收窄成合法 slug */
export function isWizardSlug(value: string): value is WizardSlug {
	return SLUGS.includes(value);
}

export function stepIndex(slug: WizardSlug): number {
	return WIZARD_STEPS.findIndex((step) => step.slug === slug);
}

export function stepBySlug(slug: WizardSlug): WizardStep {
	return WIZARD_STEPS[stepIndex(slug)];
}

/** 上一步的 slug，首步返回 null */
export function prevStep(slug: WizardSlug): WizardSlug | null {
	const index = stepIndex(slug);
	return index > 0 ? WIZARD_STEPS[index - 1].slug : null;
}

/** 下一步的 slug，末步返回 null */
export function nextStep(slug: WizardSlug): WizardSlug | null {
	const index = stepIndex(slug);
	return index < WIZARD_STEPS.length - 1 ? WIZARD_STEPS[index + 1].slug : null;
}

export function stepHref(slug: WizardSlug): string {
	return `/apply/${slug}`;
}

/**
 * 预览页「修改」按钮的目标地址。
 *
 * `focus` 用于让目标页聚焦并滚动到具体字段，例如
 * `stepHrefWithFocus('trips', 'leg-1')` → `/apply/trips?focus=leg-1`
 */
export function stepHrefWithFocus(slug: WizardSlug, focus: string): string {
	return `${stepHref(slug)}?focus=${encodeURIComponent(focus)}`;
}

/**
 * 计算每一步的完成情况与可达性。
 *
 * 规则：**已完成的步骤 + 第一个未完成的步骤**可点。
 * 不允许直接跳到更后面的步骤 —— 否则用户会在预算页看到空行程，
 * 而跨字段规则（如日期重叠）根本无从校验。
 *
 * @param draft 当前草稿，可能只填了一部分
 */
export function evaluateSteps(draft: unknown): Array<{
	step: WizardStep;
	completed: boolean;
	reachable: boolean;
}> {
	const completions = WIZARD_STEPS.map((step) =>
		step.schema ? isStepComplete(step.schema, draft) : false
	);

	// 第一个未完成步骤的下标；全部完成时为 length
	const firstIncomplete = completions.findIndex((done) => !done);
	const frontier = firstIncomplete === -1 ? WIZARD_STEPS.length : firstIncomplete;

	return WIZARD_STEPS.map((step, index) => ({
		step,
		completed: completions[index],
		reachable: index <= frontier
	}));
}

function isStepComplete(schema: z.ZodType, draft: unknown): boolean {
	return schema.safeParse(draft).success;
}
