<script lang="ts">
	import { goto } from '$app/navigation';
	import { page } from '$app/state';
	import { draft, patchDraft } from '$lib/state/wizardDraft';
	import { budgetSchema, validate, type FieldErrors } from '$lib/domain/schema';
	import { nextStep, stepHref } from '$lib/domain/wizard';
	import { centsToYuan, parseYuanInput, budgetTotal, formatYuan } from '$lib/domain/money';
	import type { Budget } from '$lib/domain/types';
	import WizardFooter from './WizardFooter.svelte';

	// 编辑态由 URL 的 ?edit=ID 决定，步骤跳转需带上它以保持编辑上下文
	const editId = $derived(page.url.searchParams.get('edit'));

	// 分项顺序与中文名，与 BudgetBreakdown 的 ROWS、schema 的 budgetShape 对齐（单一真相）
	const FIELDS: ReadonlyArray<{ key: keyof Budget; label: string }> = [
		{ key: 'transport', label: '交通费' },
		{ key: 'hotel', label: '住宿费' },
		{ key: 'allowance', label: '出差补贴' },
		{ key: 'other', label: '其他费用' }
	];

	// 草稿里是「分」，输入框显示「元」。texts 是受控文本源，cents 由它折算后回写草稿。
	let texts = $state<Record<keyof Budget, string>>({
		transport: centsToYuan($draft.budget.transport).toString(),
		hotel: centsToYuan($draft.budget.hotel).toString(),
		allowance: centsToYuan($draft.budget.allowance).toString(),
		other: centsToYuan($draft.budget.other).toString()
	});

	let errors = $state<FieldErrors>({});

	// 实时折算出的金额（分），非法/空文本按 0 计，仅用于「合计」预览
	const candidate = $derived<Budget>({
		transport: parseYuanInput(texts.transport) ?? 0,
		hotel: parseYuanInput(texts.hotel) ?? 0,
		allowance: parseYuanInput(texts.allowance) ?? 0,
		other: parseYuanInput(texts.other) ?? 0
	});

	const total = $derived(budgetTotal(candidate));

	function onInput(key: keyof Budget, value: string): void {
		texts[key] = value;
		const cents = parseYuanInput(value);
		if (cents !== null) patchDraft({ budget: { ...$draft.budget, [key]: cents } });
	}

	/** 非空但解析不出的文本（如「abc」），给字段级提示而非笼统的「合计需大于 0」 */
	function fieldInvalid(key: keyof Budget): boolean {
		const trimmed = texts[key].trim();
		return trimmed !== '' && parseYuanInput(trimmed) === null;
	}

	function fieldError(key: keyof Budget): string | undefined {
		if (fieldInvalid(key)) return '请输入有效的金额';
		return errors[`budget.${key}`];
	}

	function onNext(): void {
		// 先把所有文本（含空/非法）折算成 cents 写回草稿，确保 budgetSchema 校验的是最新值
		const next: Budget = { ...$draft.budget };
		for (const f of FIELDS) {
			next[f.key] = parseYuanInput(texts[f.key]) ?? 0;
		}
		patchDraft({ budget: next });

		const result = validate(budgetSchema, { ...$draft, budget: next });
		if (!result.ok) {
			errors = result.errors;
			return;
		}
		errors = {};
		const n = nextStep('budget');
		// eslint-disable-next-line svelte/no-navigation-without-resolve
		if (n) goto(stepHref(n, editId));
	}
</script>

<section class="step-card">
	{#each FIELDS as f (f.key)}
		<label class="field">
			<span class="field__label">{f.label}（元）</span>
			<input
				class="field__input"
				type="text"
				inputmode="decimal"
				placeholder="0.00"
				value={texts[f.key]}
				oninput={(e) => onInput(f.key, e.currentTarget.value)}
			/>
			{#if fieldError(f.key)}
				<p class="field__error">{fieldError(f.key)}</p>
			{/if}
		</label>
	{/each}

	<label class="field">
		<span class="field__label">预算说明（选填）</span>
		<textarea
			class="field__input"
			rows="3"
			maxlength={200}
			placeholder="超过 10,000 元时必填；说明用途以便审批"
			value={$draft.budgetNote}
			oninput={(e) => patchDraft({ budgetNote: e.currentTarget.value })}
		></textarea>
		<p class="field__hint">已输入 {$draft.budgetNote?.length ?? 0}/200</p>
		{#if errors.budgetNote}<p class="field__error">{errors.budgetNote}</p>{/if}
	</label>

	<p class="amount-summary">预算合计：<strong>¥{formatYuan(total)}</strong></p>
</section>

<WizardFooter prevHref={stepHref('trips', editId)} primaryLabel="下一步" onPrimary={onNext} />
