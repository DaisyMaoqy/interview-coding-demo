import { describe, it, expect } from 'vitest';
import {
	FIRST_STEP,
	LAST_STEP,
	WIZARD_STEPS,
	evaluateSteps,
	isWizardSlug,
	nextStep,
	prevStep,
	stepHref,
	stepHrefWithFocus,
	stepIndex
} from '../../domain/wizard';

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

describe('步骤定义', () => {
	it('四个步骤按顺序排列', () => {
		expect(WIZARD_STEPS.map((s) => s.slug)).toEqual(['basic', 'trips', 'budget', 'preview']);
	});

	it('首步与末步指向数组两端', () => {
		expect([FIRST_STEP, LAST_STEP]).toEqual(['basic', 'preview']);
	});
});

describe('isWizardSlug', () => {
	it('识别合法 slug', () => {
		expect(isWizardSlug('trips')).toBe(true);
	});

	it('拒绝未知 slug', () => {
		expect(isWizardSlug('unknown')).toBe(false);
	});

	it('拒绝数字形式的旧路由', () => {
		expect(isWizardSlug('2')).toBe(false);
	});
});

describe('prevStep / nextStep', () => {
	it('中间步骤前后都能走', () => {
		expect([prevStep('trips'), nextStep('trips')]).toEqual(['basic', 'budget']);
	});

	it('首步没有上一步', () => {
		expect(prevStep('basic')).toBeNull();
	});

	it('末步没有下一步', () => {
		expect(nextStep('preview')).toBeNull();
	});
});

describe('stepIndex', () => {
	it('返回步骤下标', () => {
		expect(stepIndex('budget')).toBe(2);
	});
});

describe('stepHref', () => {
	it('生成步骤地址', () => {
		expect(stepHref('trips')).toBe('/travel/apply/trips');
	});

	it('带 focus 参数用于预览页跳回并定位字段', () => {
		expect(stepHrefWithFocus('trips', 'leg-1')).toBe('/travel/apply/trips?focus=leg-1');
	});

	it('对 focus 做 URL 编码', () => {
		expect(stepHrefWithFocus('budget', 'budget.hotel')).toBe(
			'/travel/apply/budget?focus=budget.hotel'
		);
	});
});

describe('evaluateSteps', () => {
	it('空草稿时只有第一步可达', () => {
		const steps = evaluateSteps({});

		expect(steps.map((s) => s.reachable)).toEqual([true, false, false, false]);
		expect(steps.every((s) => !s.completed)).toBe(true);
	});

	it('填完第一步后第二步可达', () => {
		const steps = evaluateSteps(validBasic);

		expect(steps.map((s) => s.completed)).toEqual([true, false, false, false]);
		expect(steps.map((s) => s.reachable)).toEqual([true, true, false, false]);
	});

	it('填完前两步后第三步可达', () => {
		const steps = evaluateSteps({ ...validBasic, ...validTrips });

		expect(steps.map((s) => s.reachable)).toEqual([true, true, true, false]);
	});

	it('三步都完成后预览步可达', () => {
		const steps = evaluateSteps({ ...validBasic, ...validTrips, ...validBudget });

		expect(steps.map((s) => s.completed)).toEqual([true, true, true, false]);
		expect(steps.every((s) => s.reachable)).toBe(true);
	});

	it('跳过中间步骤时后续步骤仍不可达', () => {
		// 只填了基本信息和预算、漏了行程，此时不该允许直接跳到预算页，
		// 否则预算页会在没有行程的前提下展示，跨字段规则也无从校验
		const steps = evaluateSteps({ ...validBasic, ...validBudget });

		expect(steps.map((s) => s.completed)).toEqual([true, false, true, false]);
		expect(steps.map((s) => s.reachable)).toEqual([true, true, false, false]);
	});

	it('预览步永远不算已完成', () => {
		// 它没有独立 schema，完成与否由提交动作决定
		const steps = evaluateSteps({ ...validBasic, ...validTrips, ...validBudget });

		expect(steps.at(-1)?.completed).toBe(false);
	});
});
