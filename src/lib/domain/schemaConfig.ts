import { z } from 'zod';
import { dateStringSchema } from './schema';
import type { ApplicationType } from './types';
import { APPLICATION_TYPES, flattenFields, type FieldDef } from './applicationTypes';

/**
 * 由 `applicationTypes.ts` 的字段配置推导 Zod 校验。
 *
 * 把原先硬编码在 `schema.ts` 的 `basicSchema` / `tripsSchema` / `budgetSchema` /
 * `travelFormSchema` 收敛成「读配置生成」：一份 `FieldDef` 同时驱动 UI 渲染与校验，
 * 两者天然不漂移。旧 schema 在迁移完成前仍保留（见 `schema.ts`），新代码统一走这里。
 */

type RefineFn = (obj: Record<string, unknown>, ctx: z.RefinementCtx) => void;

interface ShapeResult {
	shape: Record<string, z.ZodTypeAny>;
	refines: RefineFn[];
}

/**
 * 把单个字段转成对象里的若干 schema 条目 + 可能的跨字段 refine。
 *
 * 多数字段只贡献一个 key；`dateRange` 贡献 `fromKey`/`toKey` 两个日期并附带
 * 「结束≥开始」refine；`repeatable` 贡献一个数组并可能附带行内/行间 refine。
 */
function fieldToShape(f: FieldDef): ShapeResult {
	switch (f.kind) {
		case 'text':
		case 'textarea': {
			let s = z.string().trim();
			if (f.minLength !== undefined) {
				s = s.min(f.minLength, `${f.label}请不少于 ${f.minLength} 个字`);
			} else if (f.required) {
				s = s.min(1, `请填写${f.label}`);
			}
			if (f.maxLength !== undefined)
				s = s.max(f.maxLength, `${f.label}请控制在 ${f.maxLength} 字以内`);
			// 非必填文本：允许留空或不填（与 schema.ts 旧 `budgetNote: z.string().optional()` 一致）
			const schema: z.ZodTypeAny = f.required ? s : s.optional();
			return { shape: { [f.key]: schema }, refines: [] };
		}
		case 'number': {
			let s = z
				.number({ error: `请填写${f.label}` })
				.int(`${f.label}需为整数`)
				.min(0, `${f.label}不能为负`);
			if (f.max !== undefined) s = s.max(f.max);
			return { shape: { [f.key]: f.required ? s : s.optional() }, refines: [] };
		}
		case 'select':
		case 'radio': {
			const values = (f.enumValues ?? f.options.map((o) => o.value)) as [string, ...string[]];
			const s = z.enum(values, { error: `请选择${f.label}` });
			return { shape: { [f.key]: s }, refines: [] };
		}
		case 'date': {
			return { shape: { [f.key]: dateStringSchema }, refines: [] };
		}
		case 'dateRange': {
			const refines: RefineFn[] = [
				(obj, ctx) => {
					const from = obj[f.fromKey];
					const to = obj[f.toKey];
					// 两端都填了才比较；任一端为空时由 dateStringSchema 报「请选择日期」，
					// 这里不再介入（否则空串会被字典序判成「结束早于开始」而出错提示）
					if (from && to && to < from) {
						ctx.addIssue({
							code: 'custom',
							message: `${f.label}的结束日期不能早于开始日期`,
							path: [f.toKey]
						});
					}
				}
			];
			return {
				shape: { [f.fromKey]: dateStringSchema, [f.toKey]: dateStringSchema },
				refines
			};
		}
		case 'repeatable': {
			const row = buildRowSchema(f);
			let arr: z.ZodTypeAny = z.array(row);
			if (f.min !== undefined)
				arr = (arr as z.ZodArray<z.ZodTypeAny>).min(f.min, `请至少添加 ${f.min} 项${f.label}`);
			if (f.max !== undefined)
				arr = (arr as z.ZodArray<z.ZodTypeAny>).max(f.max, `最多添加 ${f.max} 项${f.label}`);

			const refines: RefineFn[] = [];
			const hasFrom = f.itemFields.some((fld) => fld.key === 'from');
			const hasTo = f.itemFields.some((fld) => fld.key === 'to');
			const hasDepart = f.itemFields.some((fld) => fld.key === 'departDate');
			const hasReturn = f.itemFields.some((fld) => fld.key === 'returnDate');

			// 行程段之间日期不可重叠（差旅 legs 的专用规则，靠字段 key 命中，对其它 repeatable 无影响）
			if (hasDepart && hasReturn) {
				refines.push((obj, ctx) => {
					const rows = obj[f.key];
					if (!Array.isArray(rows) || rows.length < 2) return;
					const sorted = rows
						.map((row, index) => ({ row, index }))
						.sort((a, b) =>
							String(a.row.departDate ?? '').localeCompare(String(b.row.returnDate ?? ''))
						);
					for (let i = 1; i < sorted.length; i++) {
						const prev = sorted[i - 1];
						const curr = sorted[i];
						if (String(curr.row.departDate) <= String(prev.row.returnDate)) {
							ctx.addIssue({
								code: 'custom',
								message: `与第 ${prev.index + 1} 段行程日期重叠`,
								path: [f.key, curr.index, 'departDate']
							});
						}
					}
				});
			}
			void hasFrom;
			void hasTo;
			return { shape: { [f.key]: arr }, refines };
		}
		case 'group': {
			const sub = collectShape(f.fields);
			const s = z.object(sub.shape);
			// group 没有 required 概念：它是固定结构（如分项预算），要么整组都在要么整组不在
			return {
				shape: { [f.key]: s },
				refines: sub.refines
			};
		}
		case 'custom': {
			// 逃生口：校验由其挂载的组件自行负责，此处不贡献 schema
			return { shape: {}, refines: [] };
		}
	}
}

/** 构建 repeatable 单行的 schema：自动加 `itemKey` 字段 + 行内跨字段 refine */
function buildRowSchema(f: Extract<FieldDef, { kind: 'repeatable' }>): z.ZodTypeAny {
	const sub = collectShape(f.itemFields);
	const shape: Record<string, z.ZodTypeAny> = { ...sub.shape, [f.itemKey]: z.string().min(1) };

	const rowRefines: RefineFn[] = [];
	const hasDepart = f.itemFields.some((fld) => fld.key === 'departDate');
	const hasReturn = f.itemFields.some((fld) => fld.key === 'returnDate');
	const hasFrom = f.itemFields.some((fld) => fld.key === 'from');
	const hasTo = f.itemFields.some((fld) => fld.key === 'to');

	if (hasDepart && hasReturn) {
		rowRefines.push((row, ctx) => {
			if (String(row.departDate) > String(row.returnDate)) {
				ctx.addIssue({
					code: 'custom',
					message: '返回日期不能早于出发日期',
					path: ['returnDate']
				});
			}
		});
	}
	if (hasFrom && hasTo) {
		rowRefines.push((row, ctx) => {
			if (row.from === row.to) {
				ctx.addIssue({ code: 'custom', message: '出发地与目的地不能相同', path: ['to'] });
			}
		});
	}

	let row = z.object(shape);
	if (rowRefines.length) {
		row = row.superRefine((obj, ctx) => rowRefines.forEach((r) => r(obj, ctx)));
	}
	return row;
}

function collectShape(fields: FieldDef[]): ShapeResult {
	const shape: Record<string, z.ZodTypeAny> = {};
	const refines: RefineFn[] = [];
	for (const f of fields) {
		const r = fieldToShape(f);
		Object.assign(shape, r.shape);
		refines.push(...r.refines);
	}
	return { shape, refines };
}

function compose(shape: Record<string, z.ZodTypeAny>, refines: RefineFn[]): z.ZodTypeAny {
	let schema = z.object(shape);
	if (refines.length) {
		schema = schema.superRefine((obj, ctx) => refines.forEach((r) => r(obj, ctx)));
	}
	return schema;
}

/** 某类型某步骤的校验 schema（预览步无字段，返回空对象 schema） */
export function buildStepSchema(type: ApplicationType, slug: string): z.ZodTypeAny {
	const def = APPLICATION_TYPES[type];
	const step = def.steps.find((s) => s.slug === slug);
	if (!step || step.kind === 'preview') return z.object({});
	const r = collectShape(step.fields);
	return compose(r.shape, r.refines);
}

/** 某类型的整单校验 schema：合并所有 form 步字段 + 类型级 refine */
export function buildTypeSchema(type: ApplicationType): z.ZodTypeAny {
	const def = APPLICATION_TYPES[type];
	const { shape, refines } = collectShape(flattenFields(type));
	let schema = compose(shape, refines);
	if (def.typeRefine) {
		const typeRefine = def.typeRefine;
		schema = schema.superRefine((obj, ctx) => typeRefine(obj as Record<string, unknown>, ctx));
	}
	return schema;
}
