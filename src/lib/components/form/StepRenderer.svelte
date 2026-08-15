<script lang="ts">
	import { goto } from '$app/navigation';
	import { resolve } from '$app/paths';
	import { page } from '$app/state';
	import type { ApplicationType } from '$lib/domain/types';
	import type { StepDef } from '$lib/domain/applicationTypes';
	import { flattenFields } from '$lib/domain/applicationTypes';
	import { draft, resetDraft } from '$lib/state/wizardDraft';
	import { useIdentity } from '$lib/state/identity.svelte';
	import {
		addRequest,
		createDraft,
		createRequest,
		updateRequestFromDraft
	} from '$lib/data/requests';
	import { validate } from '$lib/domain/schema';
	import { buildStepSchema, buildTypeSchema } from '$lib/domain/schemaConfig';
	import { nextStep, prevStep, stepHref, setActiveEditId } from '$lib/domain/wizard';
	import { resetRequestListFilters } from '$lib/state/requestListFilters';
	import DynamicForm from './DynamicForm.svelte';
	import DynamicPreview from './DynamicPreview.svelte';
	import WizardFooter from './WizardFooter.svelte';

	interface Props {
		type: ApplicationType;
		step: StepDef;
	}

	let { type, step }: Props = $props();

	const identity = useIdentity();
	const editId = $derived(page.url.searchParams.get('edit'));

	let attempted = $state(false);
	let submitting = $state(false);
	let submitError = $state('');
	let savingDraft = $state(false);

	// 表单步校验当前步 schema；预览步校验整单 schema。仅在用户尝试前进后才展示错误，
	// 避免初次进入就满屏红字。
	const errors = $derived(
		(() => {
			if (!attempted) return {};
			const result = validate(
				step.kind === 'preview' ? buildTypeSchema(type) : buildStepSchema(type, step.slug),
				$draft
			);
			return result.ok ? {} : result.errors;
		})()
	);

	const previewFields = $derived(flattenFields(type));
	const isPreview = $derived(step.kind === 'preview');

	const primaryLabel = $derived(isPreview ? (editId ? '重新提交' : '提交申请') : '下一步');
	const prevHref = $derived(
		editId
			? stepHref(type, prevStep(type, step.slug) ?? '', editId)
			: stepHref(type, prevStep(type, step.slug) ?? '')
	);

	async function onSaveDraft(): Promise<void> {
		if (editId) return;
		savingDraft = true;
		try {
			addRequest(createDraft(type, $draft, identity.user));
			setActiveEditId(null);
			resetDraft();
			resetRequestListFilters('draft');
			// 返回列表时带上类型，列表按该类型筛选
			// eslint-disable-next-line svelte/no-navigation-without-resolve
			await goto(`${resolve('/travel/requests')}?type=${type}`);
		} catch {
			savingDraft = false;
		}
	}

	async function onSubmit(): Promise<void> {
		attempted = true;
		const result = validate(
			isPreview ? buildTypeSchema(type) : buildStepSchema(type, step.slug),
			$draft
		);
		if (!result.ok) {
			submitError = isPreview ? '信息不完整，请返回各步骤检查后重试' : '请先完善本步骤信息';
			return;
		}
		if (!isPreview) {
			const next = nextStep(type, step.slug);
			// stepHref 内部已用 resolve 构造地址，这里只是带编辑态 query 跳转
			// eslint-disable-next-line svelte/no-navigation-without-resolve
			if (next) await goto(stepHref(type, next, editId));
			return;
		}
		submitError = '';
		submitting = true;
		try {
			if (editId) {
				updateRequestFromDraft(editId, type, $draft, identity.user);
			} else {
				addRequest(createRequest(type, $draft, identity.user));
			}
			setActiveEditId(null);
			resetDraft();
			resetRequestListFilters();
			// 返回列表时带上类型，列表按该类型筛选
			// eslint-disable-next-line svelte/no-navigation-without-resolve
			await goto(`${resolve('/travel/requests')}?type=${type}`);
		} catch {
			submitting = false;
		}
	}
</script>

<section class="step-card">
	{#if isPreview}
		<DynamicPreview fields={previewFields} value={$draft} />
	{:else}
		<DynamicForm
			fields={step.fields}
			value={$draft}
			{errors}
			onPatch={(k, v) => draft.update((d) => ({ ...d, [k]: v }))}
		/>
	{/if}

	{#if submitError}
		<p class="field__error step-card__error">{submitError}</p>
	{/if}
</section>

<WizardFooter
	prevHref={prevStep(type, step.slug) ? prevHref : null}
	{primaryLabel}
	loading={submitting}
	onPrimary={onSubmit}
	secondaryLabel={editId ? undefined : '存为草稿'}
	secondaryLoading={savingDraft}
	onSecondary={onSaveDraft}
/>

<style>
	.step-card {
		background: var(--color-white);
		border: 1px solid var(--color-slate-200);
		border-radius: var(--radius-lg);
		padding: 1.5rem;
	}
	.step-card__error {
		margin-top: 1rem;
	}
</style>
