import { describe, it, expect } from 'vitest';
import { buildStepSchema } from '../../domain/schemaConfig';
import { validate } from '../../domain/schema';

/**
 * schemaConfig 由字段配置推导 Zod 校验。
 *
 * 聚焦 dateRange（如请假时间的起止区间）两条规则：
 * - 未选择（空 / undefined）任一端 → 「请选择日期」
 * - 都选了且结束早于开始 → 「…的结束日期不能早于开始日期」
 * 并与单日期字段共用同一 dateStringSchema。
 */

const leaveDetailSchema = buildStepSchema('leave', 'detail');

describe('dateRange 校验', () => {
	it('两端都未选择时，起止都提示「请选择日期」', () => {
		const result = validate(leaveDetailSchema, {});
		expect(result.ok).toBe(false);
		if (!result.ok) {
			expect(result.errors.leaveStart).toBe('请选择日期');
			expect(result.errors.leaveEnd).toBe('请选择日期');
		}
	});

	it('只选了开始、结束为空时，结束提示「请选择日期」而非「结束早于开始」', () => {
		const result = validate(leaveDetailSchema, { leaveStart: '2026-03-10', leaveEnd: '' });
		expect(result.ok).toBe(false);
		if (!result.ok) {
			expect(result.errors.leaveEnd).toBe('请选择日期');
			expect(result.errors.leaveEnd).not.toContain('早于');
		}
	});

	it('结束日期早于开始日期时报错，并定位到结束端', () => {
		const result = validate(leaveDetailSchema, {
			leaveStart: '2026-03-10',
			leaveEnd: '2026-03-05'
		});
		expect(result.ok).toBe(false);
		if (!result.ok) {
			expect(result.errors.leaveEnd).toBe('请假时间的结束日期不能早于开始日期');
		}
	});

	it('结束日期等于开始日期是合法的（当日假）', () => {
		const result = validate(leaveDetailSchema, {
			leaveStart: '2026-03-10',
			leaveEnd: '2026-03-10'
		});
		expect(result.ok).toBe(true);
	});

	it('起止都合法时通过', () => {
		const result = validate(leaveDetailSchema, {
			leaveStart: '2026-03-05',
			leaveEnd: '2026-03-10'
		});
		expect(result.ok).toBe(true);
	});

	it('格式合法但不存在的日期仍报「日期不存在」', () => {
		const result = validate(leaveDetailSchema, {
			leaveStart: '2026-02-30',
			leaveEnd: '2026-03-10'
		});
		expect(result.ok).toBe(false);
		if (!result.ok) {
			expect(result.errors.leaveStart).toBe('日期不存在');
		}
	});
});
