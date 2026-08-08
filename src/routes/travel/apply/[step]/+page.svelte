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

<ol class="mb-6 flex flex-wrap items-center gap-x-2 gap-y-2 text-sm">
	{#each steps as item, i (item.step.slug)}
		{@const active = item.step.slug === current.slug}
		<li class="flex items-center gap-2">
			{#if item.reachable}
				<a
					href={stepHref(item.step.slug)}
					aria-current={active ? 'step' : undefined}
					class="flex items-center gap-2 rounded-lg px-2.5 py-1.5 transition-colors
					       {active
						? 'bg-brand-50 font-medium text-brand-700'
						: 'text-slate-500 hover:bg-slate-100'}"
				>
					<span
						class="grid size-5 place-items-center rounded-full text-xs
						       {active
							? 'bg-brand-600 text-white'
							: item.completed
								? 'bg-emerald-100 text-emerald-700'
								: 'bg-slate-200 text-slate-600'}"
					>
						{i + 1}
					</span>
					{item.step.title}
				</a>
			{:else}
				<span class="flex items-center gap-2 rounded-lg px-2.5 py-1.5 text-slate-300" aria-disabled="true">
					<span class="grid size-5 place-items-center rounded-full bg-slate-100 text-xs text-slate-400">
						{i + 1}
					</span>
					{item.step.title}
				</span>
			{/if}
			{#if i < steps.length - 1}
				<span class="text-slate-300" aria-hidden="true">→</span>
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
