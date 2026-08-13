<script lang="ts">
	import { goto } from '$app/navigation';
	import { page } from '$app/state';
	import { draft, patchDraft } from '$lib/state/wizardDraft';
	import { basicSchema, validate, type BasicInput, type FieldErrors } from '$lib/domain/schema';
	import { nextStep, stepHref } from '$lib/domain/wizard';
	import { URGENCY_LABELS } from '$lib/domain/workflow';
	import type { Urgency } from '$lib/domain/types';
	import Field from '$lib/components/form/Field.svelte';
	import WizardFooter from './WizardFooter.svelte';

	// 编辑态由 URL 的 ?edit=ID 决定，步骤跳转需带上它以保持编辑上下文
	const editId = $derived(page.url.searchParams.get('edit'));

	// 紧急程度选项统一取自 workflow 的 URGENCY_LABELS，与详情页/列表徽章保持一致
	const URGENCIES: ReadonlyArray<{ value: Urgency; label: string }> = (
		Object.keys(URGENCY_LABELS) as Urgency[]
	).map((value) => ({ value, label: URGENCY_LABELS[value] }));

	let errors = $state<FieldErrors>({});

	// 出差事由输入实时校验
	function onReasonInput(e: Event): void {
		const val = (e.currentTarget as HTMLTextAreaElement).value;
		patchDraft({ reason: val });
		const result = validate<BasicInput>(basicSchema, { ...$draft, reason: val });
		if (!result.ok) {
			errors = { ...errors, reason: result.errors.reason };
			return;
		}
		const newErrors = { ...errors };
		delete newErrors.reason;
		errors = newErrors;
	}

	// 字数提示：错误优先，故仅在无错误时显示实时计数
	function hintForReason(): string {
		return `已输入 ${$draft.reason.length}/200`;
	}

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
	<Field label="出差事由" required error={errors.reason} hint={hintForReason()}>
		<textarea
			id="reason"
			class="field__input"
			rows="4"
			maxlength={200}
			placeholder="请说明出差目的，不少于 10 个字"
			value={$draft.reason}
			oninput={onReasonInput}></textarea>
	</Field>

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
