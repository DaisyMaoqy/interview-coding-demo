<script lang="ts">
	import PageHeader from '$lib/components/layout/PageHeader.svelte';
	import PagePlaceholder from '$lib/components/layout/PagePlaceholder.svelte';
	import { WIZARD_STEPS, nextStep, prevStep, stepHref, stepIndex } from '$lib/domain/wizard';
	import type { PageData } from './$types';

	interface Props {
		data: PageData;
	}

	let { data }: Props = $props();

	const current = $derived(data.step);
	const index = $derived(stepIndex(current.slug));
	const prev = $derived(prevStep(current.slug));
	const next = $derived(nextStep(current.slug));
</script>

<!--
	本页所有 href 均来自 stepHref()，其内部已调用 resolve()。
	ESLint 无法跨模块追踪函数返回值，故整页豁免该规则。
-->
<!-- eslint-disable svelte/no-navigation-without-resolve -->
<PageHeader title="发起申请" description={current.description} />

<!--
	步骤条。骨架阶段所有步骤都可点，接入草稿后改由 evaluateSteps() 决定可达性，
	防止用户跳到预算页却看到空行程。
-->
<ol class="mb-6 flex flex-wrap items-center gap-x-2 gap-y-2 text-sm">
	{#each WIZARD_STEPS as step, i (step.slug)}
		{@const active = step.slug === current.slug}
		<li class="flex items-center gap-2">
			<a
				href={stepHref(step.slug)}
				aria-current={active ? 'step' : undefined}
				class="flex items-center gap-2 rounded-lg px-2.5 py-1.5 transition-colors
				       {active ? 'bg-brand-50 font-medium text-brand-700' : 'text-slate-500 hover:bg-slate-100'}"
			>
				<span
					class="grid size-5 place-items-center rounded-full text-xs
					       {active ? 'bg-brand-600 text-white' : 'bg-slate-200 text-slate-600'}"
				>
					{i + 1}
				</span>
				{step.title}
			</a>
			{#if i < WIZARD_STEPS.length - 1}
				<span class="text-slate-300" aria-hidden="true">→</span>
			{/if}
		</li>
	{/each}
</ol>

<PagePlaceholder plan={[`第 ${index + 1} 步「${current.title}」的表单字段与即时校验`]} />

<div class="mt-6 flex justify-between">
	{#if prev}
		<a
			href={stepHref(prev)}
			class="rounded-lg border border-slate-300 bg-white px-3.5 py-2 text-sm
			       text-slate-700 transition-colors hover:bg-slate-50"
		>
			上一步
		</a>
	{:else}
		<span></span>
	{/if}

	{#if next}
		<a
			href={stepHref(next)}
			class="rounded-lg bg-brand-600 px-3.5 py-2 text-sm font-medium text-white
			       transition-colors hover:bg-brand-700"
		>
			下一步
		</a>
	{/if}
</div>
