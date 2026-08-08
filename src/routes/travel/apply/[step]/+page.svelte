<script lang="ts">
	import { page } from '$app/state';
	import { browser } from '$app/environment';
	import PageHeader from '$lib/components/layout/PageHeader.svelte';
	import { draft } from '$lib/state/wizardDraft';
	import { evaluateSteps, stepHref } from '$lib/domain/wizard';
	import type { PageData } from './$types';
	import BasicStep from './components/BasicStep.svelte';
	import TripsStep from './components/TripsStep.svelte';
	import BudgetStep from './components/BudgetStep.svelte';
	import PreviewStep from './components/PreviewStep.svelte';

	interface Props {
		data: PageData;
	}

	let { data }: Props = $props();

	const current = $derived(data.step);
	// 步骤条的可达性由草稿实际填写情况决定：已完成 + 第一个未完成可点，其余置灰，
	// 防止用户跳到预算页却看到空行程。
	const steps = $derived(evaluateSteps($draft));

	// 预览页「修改」链接带 ?focus=xxx 时，进入对应步骤后滚动到目标区块（如行程列表）。
	$effect(() => {
		const focus = page.url.searchParams.get('focus');
		if (!browser || !focus) return;
		const el = document.getElementById(focus);
		if (el) el.scrollIntoView({ behavior: 'smooth', block: 'start' });
	});
</script>

<!--
	本页所有 href 均来自 stepHref()/stepHrefWithFocus()，其内部已调用 resolve()。
	ESLint 无法跨模块追踪函数返回值，故整页豁免该规则。
-->
<!-- eslint-disable svelte/no-navigation-without-resolve -->
<PageHeader title="发起申请" description={current.description} />

<ol class="step-nav">
	{#each steps as item, i (item.step.slug)}
		{@const active = item.step.slug === current.slug}
		<li class="step-nav__item">
			{#if item.reachable}
				<a
					class="step-nav__link"
					class:step-nav__link--active={active}
					href={stepHref(item.step.slug)}
					aria-current={active ? 'step' : undefined}
				>
					<span
						class="step-nav__badge"
						class:step-nav__badge--active={active}
						class:step-nav__badge--done={!active && item.completed}
					>{i + 1}</span>
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

{#if current.slug === 'basic'}
	<BasicStep />
{:else if current.slug === 'trips'}
	<TripsStep />
{:else if current.slug === 'budget'}
	<BudgetStep />
{:else if current.slug === 'preview'}
	<PreviewStep />
{/if}

<style>
	/* 向导步骤栏（仅本页使用，按「页面级样式语义化」就近放在 scoped 样式里） */
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
		transition: background-color 0.15s ease, color 0.15s ease;
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
</style>
