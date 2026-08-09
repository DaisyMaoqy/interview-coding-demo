<script lang="ts">
	import { goto } from '$app/navigation';
	import { page } from '$app/state';
	import { draft, patchDraft } from '$lib/state/wizardDraft';
	import { basicSchema, validate, REASON_MIN_LENGTH, type BasicInput, type FieldErrors } from '$lib/domain/schema';
	import { nextStep, stepHref } from '$lib/domain/wizard';
	import { URGENCY_LABELS } from '$lib/domain/workflow';
	import type { Urgency } from '$lib/domain/types';
	import WizardFooter from './WizardFooter.svelte';

	// 编辑态由 URL 的 ?edit=ID 决定，步骤跳转需带上它以保持编辑上下文
	const editId = $derived(page.url.searchParams.get('edit'));

	// 紧急程度选项统一取自 workflow 的 URGENCY_LABELS，与详情页/列表徽章保持一致
	const URGENCIES: ReadonlyArray<{ value: Urgency; label: string }> = (
		Object.keys(URGENCY_LABELS) as Urgency[]
	).map((value) => ({ value, label: URGENCY_LABELS[value] }));

	let errors = $state<FieldErrors>({});

	function onNext(): void {
		const result = validate<BasicInput>(basicSchema, $draft);
		if (!result.ok) {
			errors = result.errors;
			return;
		}
		errors = {};
		const next = nextStep('basic');
		// eslint-disable-next-line svelte/no-navigation-without-resolve
		if (next) goto(stepHref(next, editId));
	}
</script>

<section class="step-card">
	<label class="field">
		<span class="field__label">出差事由</span>
		<textarea
			id="reason"
			class="field__input"
			rows="4"
			maxlength={200}
			placeholder="请说明出差目的，不少于 10 个字"
			value={$draft.reason}
			oninput={(e) => patchDraft({ reason: e.currentTarget.value })}
		></textarea>
		{#if $draft.reason.length < REASON_MIN_LENGTH}
			<p class="field__hint">还差 {REASON_MIN_LENGTH - $draft.reason.length} 字（至少 {REASON_MIN_LENGTH} 字）</p>
		{:else}
			<p class="field__hint">已输入 {$draft.reason.length}/200</p>
		{/if}
		{#if errors.reason}<p class="field__error">{errors.reason}</p>{/if}
	</label>

	<fieldset class="field">
		<legend class="field__label">紧急程度</legend>
		<div class="radio-row">
			{#each URGENCIES as item (item.value)}
				<label class="radio">
					<input
						type="radio"
						name="urgency"
						checked={$draft.urgency === item.value}
						onchange={() => patchDraft({ urgency: item.value })}
					/>
					{item.label}
				</label>
			{/each}
		</div>
	</fieldset>
</section>

<!-- 第一步基本信息只有下一步按钮 -->
<WizardFooter prevHref={null} primaryLabel="下一步" onPrimary={onNext} />
