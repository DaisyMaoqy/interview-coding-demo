import { describe, it, expect } from 'vitest';
import {
	evaluateSteps,
	firstStep,
	lastStep,
	getSteps,
	isStepSlug,
	nextStep,
	prevStep,
	stepHref,
	stepHrefWithFocus,
	stepIndex,
	stepBySlug
} from '../../domain/wizard';

const TYPE = 'travel' as const;

const validBasic = { reason: '赴上海参加客户现场技术支持', urgency: 'normal' };

const validTrips = {
	legs: [
		{
			id: 'leg-1',
			from: '北京',
			to: '上海',
			departDate: '2026-03-15',
			returnDate: '2026-03-17',
			transport: 'train'
		}
	]
};

const validBudget = { budget: { transport: 120000, hotel: 240000, allowance: 60000, other: 8000 } };

describe('步骤定义（注册表驱动）', () => {
	it('四个步骤按顺序排列', () => {
		expect(getSteps(TYPE).map((s) => s.slug)).toEqual(['basic', 'trips', 'budget', 'preview']);
	});

	it('首步与末步指向数组两端', () => {
		expect([firstStep(TYPE), lastStep(TYPE)]).toEqual(['basic', 'preview']);
	});
});

describe('isStepSlug', () => {
	it('识别合法 slug', () => {
		expect(isStepSlug(TYPE, 'trips')).toBe(true);
	});

	it('拒绝未知 slug', () => {
		expect(isStepSlug(TYPE, 'unknown')).toBe(false);
	});

	it('拒绝数字形式的旧路由', () => {
		expect(isStepSlug(TYPE, '2')).toBe(false);
	});
});

describe('prevStep / nextStep', () => {
	it('中间步骤前后都能走', () => {
		expect([prevStep(TYPE, 'trips'), nextStep(TYPE, 'trips')]).toEqual(['basic', 'budget']);
	});

	it('首步没有上一步', () => {
		expect(prevStep(TYPE, 'basic')).toBeNull();
	});

	it('末步没有下一步', () => {
		expect(nextStep(TYPE, 'preview')).toBeNull();
	});

	it('预算步的前后分别是行程与预览（WizardFooter 实际使用的导航路径）', () => {
		expect([prevStep(TYPE, 'budget'), nextStep(TYPE, 'budget')]).toEqual(['trips', 'preview']);
	});
});

describe('stepIndex / stepBySlug', () => {
	it('stepIndex 返回步骤下标', () => {
		expect(stepIndex(TYPE, 'budget')).toBe(2);
	});

	it('stepBySlug 返回步骤定义', () => {
		expect(stepBySlug(TYPE, 'budget').title).toBe('费用预算');
	});
});

describe('stepHref', () => {
	it('生成统一向导的步骤地址', () => {
		expect(stepHref(TYPE, 'trips')).toBe('/apply/travel/trips');
	});

	it('带 focus 参数用于预览页跳回并定位字段', () => {
		expect(stepHrefWithFocus(TYPE, 'trips', 'leg-1')).toBe('/apply/travel/trips?focus=leg-1');
	});

	it('对 focus 做 URL 编码', () => {
		expect(stepHrefWithFocus(TYPE, 'budget', 'budget.hotel')).toBe(
			'/apply/travel/budget?focus=budget.hotel'
		);
	});
});

describe('evaluateSteps', () => {
	it('空草稿时只有第一步可达', () => {
		const steps = evaluateSteps(TYPE, {});

		expect(steps.map((s) => s.reachable)).toEqual([true, false, false, false]);
		expect(steps.every((s) => !s.completed)).toBe(true);
	});

	it('填完第一步后第二步可达', () => {
		const steps = evaluateSteps(TYPE, validBasic);

		expect(steps.map((s) => s.completed)).toEqual([true, false, false, false]);
		expect(steps.map((s) => s.reachable)).toEqual([true, true, false, false]);
	});

	it('填完前两步后第三步可达', () => {
		const steps = evaluateSteps(TYPE, { ...validBasic, ...validTrips });

		expect(steps.map((s) => s.reachable)).toEqual([true, true, true, false]);
	});

	it('三步都完成后预览步可达', () => {
		const steps = evaluateSteps(TYPE, { ...validBasic, ...validTrips, ...validBudget });

		expect(steps.map((s) => s.completed)).toEqual([true, true, true, false]);
		expect(steps.every((s) => s.reachable)).toBe(true);
	});

	it('跳过中间步骤时后续步骤仍不可达', () => {
		// 只填了基本信息和预算、漏了行程，此时不该允许直接跳到预算页，
		// 否则预算页会在没有行程的前提下展示，跨字段规则也无从校验
		const steps = evaluateSteps(TYPE, { ...validBasic, ...validBudget });

		expect(steps.map((s) => s.completed)).toEqual([true, false, true, false]);
		expect(steps.map((s) => s.reachable)).toEqual([true, true, false, false]);
	});

	it('预览步永远不算已完成', () => {
		// 它没有独立 schema，完成与否由提交动作决定
		const steps = evaluateSteps(TYPE, { ...validBasic, ...validTrips, ...validBudget });

		expect(steps.at(-1)?.completed).toBe(false);
	});

	it('草稿回退时后续步骤立即关闭：删掉行程后即便预算已填也不可达', () => {
		// 模拟用户填到预览步后又把第一段行程删掉。
		// 预算步自身的 schema 仍然通过（completed=true），但前沿回退到行程步，
		// 因此预算与预览立刻不可达——避免在没有行程的前提下误展示预算页。
		const regressed = { ...validBasic, ...validBudget };
		const steps = evaluateSteps(TYPE, regressed);

		expect(steps.map((s) => s.completed)).toEqual([true, false, true, false]);
		expect(steps.map((s) => s.reachable)).toEqual([true, true, false, false]);
	});
});
