<script lang="ts">
	import { page } from '$app/state';
	import { browser } from '$app/environment';
	import { resolve } from '$app/paths';
	import PageHeader from '$lib/components/layout/PageHeader.svelte';
	import StepRenderer from '$lib/components/form/StepRenderer.svelte';
	import { draft, ensureDraftType, loadDraftForEdit } from '$lib/state/wizardDraft';
	import {
		evaluateSteps,
		stepHref,
		getActiveEditId,
		setActiveEditId,
		stepBySlug
	} from '$lib/domain/wizard';
	import { getRequestById } from '$lib/data/requests';
	import { resetRequestListFilters } from '$lib/state/requestListFilters';
	import { APPLICATION_TYPES } from '$lib/domain/applicationTypes';
	import type { PageData } from './$types';

	interface Props {
		data: PageData;
	}

	let { data }: Props = $props();

	const type = $derived(data.type);
	const slug = $derived(data.step);
	const stepDef = $derived(stepBySlug(type, slug));

	// 步骤条的可达性由草稿实际填写情况决定：已完成 + 第一个未完成可点，其余置灰，
	// 防止用户跳到预算页却看到空行程。
	const steps = $derived(evaluateSteps(type, $draft));

	const isEditing = $derived(page.url.searchParams.has('edit'));

	// 新建入口进入某类型向导：确保草稿桶对应此类型，跨类型不串台。
	$effect(() => {
		if (!isEditing) ensureDraftType(type);
	});

	// 重新编辑进入向导时 URL 带 ?edit=ID；外壳据此同步编辑态与回填草稿，
	// 这样直接打开编辑链接或刷新也能恢复。普通新建不带该参数，则清掉编辑态。
	$effect(() => {
		const id = page.url.searchParams.get('edit');
		if (id) {
			if (getActiveEditId() !== id) {
				const req = getRequestById(id);
				if (req) {
					setActiveEditId(id);
					loadDraftForEdit(req);
				}
			}
		} else if (getActiveEditId() !== null) {
			setActiveEditId(null);
		}
	});

	// 预览页「修改」链接带 ?focus=xxx 时，进入对应步骤后滚动到目标区块（如行程列表）。
	$effect(() => {
		const focus = page.url.searchParams.get('focus');
		if (!browser || !focus) return;
		const el = document.getElementById(focus);
		if (el) el.scrollIntoView({ behavior: 'smooth', block: 'start' });
	});

	function backToRequests(): void {
		resetRequestListFilters();
	}
</script>

<!-- eslint-disable svelte/no-navigation-without-resolve -->
{#if isEditing}
	<a class="edit-back" href={`${resolve('/travel/requests')}?type=${type}`} onclick={backToRequests}
		>← 返回我的申请</a
	>
{/if}

<PageHeader
	title={isEditing ? '编辑申请' : `发起${APPLICATION_TYPES[type].label}`}
	description={stepDef.description}
/>

<ol class="step-nav">
	{#each steps as item, i (item.step.slug)}
		{@const active = item.step.slug === slug}
		<li class="step-nav__item">
			{#if item.reachable}
				<a
					class="step-nav__link"
					class:step-nav__link--active={active}
					href={stepHref(type, item.step.slug, page.url.searchParams.get('edit'))}
					aria-current={active ? 'step' : undefined}
				>
					<span
						class="step-nav__badge"
						class:step-nav__badge--active={active}
						class:step-nav__badge--done={!active && item.completed}>{i + 1}</span
					>
					{item.step.title}
				</a>
			{:else}
				<span class="step-nav__link step-nav__link--disabled" aria-disabled="true">
					<span class="step-nav__badge step-nav__badge--disabled">{i + 1}</span>
					{item.step.title}
				</span>
			{/if}
			{#if i < steps.length - 1}
				<span class="step-nav__sep" aria-hidden="true">→</span>
			{/if}
		</li>
	{/each}
</ol>

<!-- 按 step slug 强制重挂载：每进入一个步骤都重置该步的「已交互 / 已提交」状态，
	 避免上一步的 touched/attempted 残留污染当前步的实时校验展示。 -->
{#key slug}
	<StepRenderer {type} step={stepDef} />
{/key}

<style>
	.step-nav {
		display: flex;
		flex-wrap: wrap;
		align-items: center;
		gap: 0.5rem;
		margin-bottom: 1.5rem;
		font-size: 0.875rem;
	}
	.step-nav__item {
		display: flex;
		align-items: center;
		gap: 0.5rem;
	}
	.step-nav__link {
		display: flex;
		align-items: center;
		gap: 0.5rem;
		padding: 0.375rem 0.625rem;
		border-radius: var(--radius-lg);
		color: var(--color-slate-500);
		transition:
			background-color 0.15s ease,
			color 0.15s ease;
	}
	.step-nav__link:hover {
		background-color: var(--color-slate-100);
	}
	.step-nav__link--active {
		background-color: var(--color-brand-50);
		font-weight: 500;
		color: var(--color-brand-700);
	}
	.step-nav__link--active:hover {
		background-color: var(--color-brand-50);
	}
	.step-nav__link--disabled {
		color: var(--color-slate-300);
		cursor: default;
	}
	.step-nav__link--disabled:hover {
		background-color: transparent;
	}
	.step-nav__badge {
		display: grid;
		place-items: center;
		width: 1.25rem;
		height: 1.25rem;
		border-radius: 9999px;
		font-size: 0.75rem;
		background-color: var(--color-slate-200);
		color: var(--color-slate-600);
	}
	.step-nav__badge--active {
		background-color: var(--color-brand-600);
		color: var(--color-white);
	}
	.step-nav__badge--done {
		background-color: var(--color-emerald-100);
		color: var(--color-emerald-700);
	}
	.step-nav__badge--disabled {
		background-color: var(--color-slate-100);
		color: var(--color-slate-400);
	}
	.step-nav__sep {
		color: var(--color-slate-300);
	}
	.edit-back {
		display: inline-flex;
		align-items: center;
		gap: 0.25rem;
		margin-bottom: 1rem;
		font-size: 0.875rem;
		color: var(--color-slate-600);
	}
	.edit-back:hover {
		color: var(--color-brand-600);
	}
</style>
