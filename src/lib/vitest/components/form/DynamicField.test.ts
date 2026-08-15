import { describe, it, expect, vi } from 'vitest';
import { render, fireEvent } from '@testing-library/svelte';
import DynamicField from '../../../components/form/DynamicField.svelte';
import type { FieldDef } from '../../../domain/applicationTypes';

/**
 * DynamicField 实时校验交互测试。
 *
 * 核心诉求：错误在「输入过程中」就实时出现，不必等失焦。
 * 实现上由 oninput 触发 markTouched（失焦 onblur 也会），配合 revealError 的
 * touched 门控让错误随输入实时刷新。
 */

function renderField(field: FieldDef, props: Record<string, unknown> = {}) {
	const base = {
		field,
		scopeValue: {},
		scopePatch: () => {},
		errors: {} as Record<string, string>,
		touched: {} as Record<string, boolean>,
		attempted: false,
		markTouched: () => {}
	};
	return render(DynamicField, { props: { ...base, ...props } });
}

describe('DynamicField 实时校验', () => {
	it('初始未交互时不展示错误（即便 errors 已存在）', () => {
		const { container } = renderField(
			{ kind: 'text', key: 'name', label: '姓名', required: true },
			{ errors: { name: '必填' }, touched: {} }
		);
		expect(container.querySelector('.field__error')).toBeNull();
	});

	it('文本字段输入即标记 touched，无需先失焦', async () => {
		const markTouched = vi.fn();
		const { container } = renderField(
			{ kind: 'text', key: 'name', label: '姓名', required: true },
			{ markTouched }
		);
		const input = container.querySelector('input') as HTMLInputElement;
		await fireEvent.input(input, { target: { value: '张' } });
		expect(markTouched).toHaveBeenCalledWith('name');
	});

	it('文本字段失焦也会标记 touched（回归）', async () => {
		const markTouched = vi.fn();
		const { container } = renderField(
			{ kind: 'text', key: 'name', label: '姓名', required: true },
			{ markTouched }
		);
		const input = container.querySelector('input') as HTMLInputElement;
		await fireEvent.blur(input);
		expect(markTouched).toHaveBeenCalledWith('name');
	});

	it('被标记 touched 后，错误随输入实时展示（不必等失焦才出现）', () => {
		const { container } = renderField(
			{ kind: 'text', key: 'name', label: '姓名', required: true },
			{ errors: { name: '必填' }, touched: { name: true } }
		);
		expect(container.querySelector('.field__error')?.textContent).toContain('必填');
	});

	it('金额字段输入即标记 touched（oninput 而非仅失焦）', async () => {
		const markTouched = vi.fn();
		const { container } = renderField(
			{ kind: 'number', key: 'amount', label: '金额', required: true, money: true },
			{ markTouched }
		);
		const input = container.querySelector('input') as HTMLInputElement;
		await fireEvent.input(input, { target: { value: '100' } });
		expect(markTouched).toHaveBeenCalledWith('amount');
	});

	it('dateRange 起止框各自标记 touched（输入即触发）', async () => {
		const markTouched = vi.fn();
		const field: FieldDef = {
			kind: 'dateRange',
			key: 'range',
			label: '请假区间',
			required: true,
			fromKey: 'start',
			toKey: 'end'
		};
		const { container } = renderField(field, { markTouched });
		const inputs = container.querySelectorAll('input');
		await fireEvent.input(inputs[0], { target: { value: '2026-01-01' } });
		await fireEvent.input(inputs[1], { target: { value: '2026-01-02' } });
		expect(markTouched).toHaveBeenCalledWith('start');
		expect(markTouched).toHaveBeenCalledWith('end');
	});
});
