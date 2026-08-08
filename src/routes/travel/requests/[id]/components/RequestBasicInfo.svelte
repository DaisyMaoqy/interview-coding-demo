<script lang="ts">
	import InfoGrid from '$lib/components/common/InfoGrid.svelte';
	import { URGENCY_LABELS } from '$lib/domain/workflow';
	import { formatDate } from '$lib/format';
	import type { TravelRequest } from '$lib/domain/types';

	let { request }: { request: TravelRequest } = $props();
</script>

<section>
	{#snippet reasonValue()}
		{request.reason}
	{/snippet}

	{#snippet urgencyValue()}
		{#if request.urgency === 'urgent'}
			<span class="urgent-tag">{URGENCY_LABELS.urgent}</span>
		{:else}
			{URGENCY_LABELS.normal}
		{/if}
	{/snippet}

	{#snippet applicantValue()}
		{request.applicantName} · {request.department}
	{/snippet}

	{#snippet submittedValue()}
		{request.submittedAt ? formatDate(request.submittedAt) : '—'}
	{/snippet}

	{#snippet createdValue()}
		{formatDate(request.createdAt)}
	{/snippet}

	<h3 class="mb-3 text-sm font-semibold text-slate-900">基本信息</h3>
	<InfoGrid
		items={[
			{ label: '出差事由', full: true, value: reasonValue },
			{ label: '紧急程度', value: urgencyValue },
			{ label: '申请人', value: applicantValue },
			{ label: '提交时间', value: submittedValue },
			{ label: '创建时间', value: createdValue }
		]}
	/>
</section>
