import type { z } from 'zod';
import { TRANSPORT_VALUES, URGENCY_VALUES, type ApplicationType } from './types';
import { TRANSPORT_LABELS, URGENCY_LABELS } from './workflow';
import { budgetTotal } from './money';

// 注意：`APPLICATION_TYPE_VALUES` / `APPLICATION_TYPE_LABELS` / `ApplicationType`
// 定义在 ./types.ts（与 URGENCY_VALUES 等同为领域层字面量元组），此处仅引用。

/**
 * 申请类型的「单一真相源」。
 *
 * 新增一种申请类型**只改这个文件**：在这里声明它的步骤与每步字段，
 * 向导路由、步骤条、字段渲染、校验、列表/详情徽标全部从这份配置派生，
 * 不需要再动向导骨架或新增页面。
 *
 * 这是「表单类型改为通用配置」思路的延伸 —— 把原先硬编码在
 * `WIZARD_STEPS`、各 `*Step.svelte`、Zod schema 里的差旅专属逻辑，
 * 收敛成一份可被任意类型复用的声明式配置。
 */

export type FieldOption = { value: string; label: string };

/**
 * 字段的声明式定义。
 *
 * `kind` 决定渲染控件与校验推导方式：
 * - 基础：`text` / `textarea` / `number` / `select` / `radio` / `date`
 * - `dateRange`：两个日期字段（写入 `fromKey` / `toKey`），并校验返回≥出发
 * - `repeatable`：可增删行的分组（如差旅行程 legs），行内字段由 `itemFields` 描述
 * - `group`：不可增删的分组（如分项预算），子字段由 `fields` 描述
 * - `custom`：仅作为逃生口，挂载一个已实现的组件（极少使用）
 */
export type FieldDef =
	| {
			kind: 'text' | 'textarea';
			key: string;
			label: string;
			required?: boolean;
			hint?: string;
			placeholder?: string;
			minLength?: number;
			maxLength?: number;
	  }
	| {
			kind: 'number';
			key: string;
			label: string;
			required?: boolean;
			hint?: string;
			placeholder?: string;
			unit?: string;
			min?: number;
			max?: number;
			/** 金额类：UI 输入「元」，领域层以「分」存储，见 money.ts */
			money?: boolean;
	  }
	| {
			kind: 'select' | 'radio';
			key: string;
			label: string;
			required?: boolean;
			options: readonly FieldOption[];
			/** 直接复用 domain 里的字面量元组（如 URGENCY_VALUES），避免与 UI 文案各写一份 */
			enumValues?: readonly string[];
	  }
	| { kind: 'date'; key: string; label: string; required?: boolean }
	| {
			kind: 'dateRange';
			key: string;
			label: string;
			required?: boolean;
			fromKey: string;
			toKey: string;
	  }
	| {
			kind: 'repeatable';
			key: string;
			label: string;
			itemKey: string;
			itemFields: FieldDef[];
			min?: number;
			max?: number;
			addLabel?: string;
	  }
	| { kind: 'group'; key: string; label: string; fields: FieldDef[] }
	| {
			kind: 'custom';
			key: string;
			label: string;
			// 逃生口：极少使用，故这里不引入组件类型依赖
			component: unknown;
			propsFrom?: (draft: Record<string, unknown>) => Record<string, unknown>;
	  };

export interface StepDef {
	slug: string;
	title: string;
	description: string;
	/** `form` 由字段配置渲染；`preview` 为只读汇总，字段来自 `type.previewFields` */
	kind: 'form' | 'preview';
	fields: FieldDef[];
}

export interface ApplicationTypeDef {
	type: ApplicationType;
	label: string;
	/** 品牌区标记字符：侧栏品牌方块里显示的单字，随类型切换（差旅→「差」、请假→「请」） */
	mark: string;
	/** 业务单号前缀，travel→'TR'、leave→'LV' */
	idPrefix: string;
	steps: StepDef[];
	/** 预览只读字段；缺省时取所有 `form` 步字段的扁平化结果 */
	previewFields?: FieldDef[];
	/**
	 * 整单级跨字段校验（如差旅「预算合计需大于 0、超阈值须填说明」）。
	 * 这类规则无法用单个 `FieldDef` 表达，故作为类型级钩子挂在这里，
	 * 由 `buildTypeSchema` 在合并所有步骤字段后再叠加。
	 */
	typeRefine?: (fields: Record<string, unknown>, ctx: z.RefinementCtx) => void;
}

/** 单次预算超此值（分，即 10,000 元）须填写说明；与 schema.ts 旧常量同义，过渡期并存 */
export const BUDGET_NOTE_THRESHOLD_CENTS = 1_000_000;

/** 差旅整单级预算规则：合计须大于 0，超阈值须填说明（不拒绝，只要求补充解释） */
function checkBudgetTotal(value: Record<string, unknown>, ctx: z.RefinementCtx): void {
	const budget = value.budget as
		{ transport: number; hotel: number; allowance: number; other: number } | undefined;
	const budgetNote = value.budgetNote as string | undefined;
	if (!budget) return;

	const total = budgetTotal(budget);
	if (total <= 0) {
		ctx.addIssue({ code: 'custom', message: '预算合计需大于 0', path: ['budget', 'transport'] });
		return;
	}
	if (total > BUDGET_NOTE_THRESHOLD_CENTS && !budgetNote) {
		ctx.addIssue({
			code: 'custom',
			message: '预算超过 10,000 元，请填写说明',
			path: ['budgetNote']
		});
	}
}

const URGENCY_OPTIONS: readonly FieldOption[] = URGENCY_VALUES.map((value) => ({
	value,
	label: URGENCY_LABELS[value]
}));

const TRANSPORT_OPTIONS: readonly FieldOption[] = TRANSPORT_VALUES.map((value) => ({
	value,
	label: TRANSPORT_LABELS[value]
}));

export const LEAVE_TYPE_OPTIONS: readonly FieldOption[] = [
	{ value: 'annual', label: '年假' },
	{ value: 'sick', label: '病假' },
	{ value: 'personal', label: '事假' }
];

export const APPLICATION_TYPES: Record<ApplicationType, ApplicationTypeDef> = {
	travel: {
		type: 'travel',
		label: '差旅申请',
		mark: '差',
		idPrefix: 'TR',
		typeRefine: checkBudgetTotal,
		steps: [
			{
				slug: 'basic',
				title: '基本信息',
				description: '出差事由与紧急程度',
				kind: 'form',
				fields: [
					{
						kind: 'textarea',
						key: 'reason',
						label: '出差事由',
						required: true,
						minLength: 10,
						maxLength: 200,
						placeholder: '请说明出差背景、目的与大致安排'
					},
					{
						kind: 'radio',
						key: 'urgency',
						label: '紧急程度',
						required: true,
						enumValues: URGENCY_VALUES,
						options: URGENCY_OPTIONS
					}
				]
			},
			{
				slug: 'trips',
				title: '行程明细',
				description: '出发地、目的地与日期',
				kind: 'form',
				fields: [
					{
						kind: 'repeatable',
						key: 'legs',
						label: '行程明细',
						itemKey: 'id',
						min: 1,
						max: 10,
						addLabel: '添加行程段',
						itemFields: [
							{ kind: 'text', key: 'from', label: '出发地', required: true, maxLength: 30 },
							{ kind: 'text', key: 'to', label: '目的地', required: true, maxLength: 30 },
							{ kind: 'date', key: 'departDate', label: '出发日期', required: true },
							{ kind: 'date', key: 'returnDate', label: '返回日期', required: true },
							{
								kind: 'select',
								key: 'transport',
								label: '交通方式',
								required: true,
								enumValues: TRANSPORT_VALUES,
								options: TRANSPORT_OPTIONS
							}
						]
					}
				]
			},
			{
				slug: 'budget',
				title: '费用预算',
				description: '分项预算与说明',
				kind: 'form',
				fields: [
					{
						kind: 'group',
						key: 'budget',
						label: '分项预算',
						fields: [
							{ kind: 'number', key: 'transport', label: '交通费', required: true, money: true },
							{ kind: 'number', key: 'hotel', label: '住宿费', required: true, money: true },
							{ kind: 'number', key: 'allowance', label: '补贴', required: true, money: true },
							{ kind: 'number', key: 'other', label: '其他', required: true, money: true }
						]
					},
					{
						kind: 'textarea',
						key: 'budgetNote',
						label: '预算说明',
						maxLength: 200,
						hint: '预算超过 10,000 元时需填写说明'
					}
				]
			},
			{
				slug: 'preview',
				title: '预览确认',
				description: '核对信息后提交',
				kind: 'preview',
				fields: []
			}
		]
	},
	leave: {
		type: 'leave',
		label: '请假申请',
		mark: '请',
		idPrefix: 'LV',
		steps: [
			{
				slug: 'basic',
				title: '基本信息',
				description: '请假事由与类型',
				kind: 'form',
				fields: [
					{
						kind: 'textarea',
						key: 'reason',
						label: '请假事由',
						required: true,
						minLength: 5,
						maxLength: 200
					},
					{
						kind: 'select',
						key: 'leaveType',
						label: '请假类型',
						required: true,
						options: LEAVE_TYPE_OPTIONS
					}
				]
			},
			{
				slug: 'detail',
				title: '请假时间',
				description: '起止日期与备注',
				kind: 'form',
				fields: [
					{
						kind: 'dateRange',
						key: 'leaveRange',
						label: '请假时间',
						required: true,
						fromKey: 'leaveStart',
						toKey: 'leaveEnd'
					},
					{ kind: 'textarea', key: 'note', label: '备注', maxLength: 200 }
				]
			},
			{
				slug: 'preview',
				title: '预览确认',
				description: '核对信息后提交',
				kind: 'preview',
				fields: []
			}
		]
	}
};

/** 把某类型所有 `form` 步的字段扁平化为一维列表（供预览与整单 schema 使用） */
export function flattenFields(type: ApplicationType): FieldDef[] {
	const def = APPLICATION_TYPES[type];
	const result: FieldDef[] = [];
	for (const step of def.steps) {
		if (step.kind === 'form') result.push(...step.fields);
	}
	return result;
}
