<script lang="ts">
	import { resolve } from '$app/paths';
	import { page } from '$app/state';
	import PageHeader from '$lib/components/layout/PageHeader.svelte';
	import Panel from '$lib/components/common/Panel.svelte';
	import InfoGrid from '$lib/components/common/InfoGrid.svelte';
	import StatusBadge from '$lib/components/request/StatusBadge.svelte';
	import AuditTimeline from '$lib/components/request/AuditTimeline.svelte';
	import LegsTable from '$lib/components/request/LegsTable.svelte';
	import BudgetBreakdown from '$lib/components/request/BudgetBreakdown.svelte';
	import RequestActions from '$lib/components/request/RequestActions.svelte';
	import { useIdentity } from '$lib/state/identity.svelte';
	import { requestsStore, requestTotal } from '$lib/data/requests';
	import { formatYuan } from '$lib/domain/money';
	import { formatDate } from '$lib/format';
	import { URGENCY_LABELS } from '$lib/domain/workflow';

	const identity = useIdentity();
	const id = $derived(page.params.id);

	// 从响应式 store 派生，流转后仍会自动刷新（RequestActions 改的是同一 store）
	const request = $derived($requestsStore.find((r) => r.id === id));
</script>

<a
	href={resolve('/travel/requests')}
	class="mb-3 inline-flex items-center gap-1 text-sm text-slate-500 hover:text-slate-800"
>
	<span aria-hidden="true">←</span> 返回我的申请
</a>

{#if !request}
	<!-- 数据里没有这张单：可能 id 拼错，或流转后本地缓存与远端不一致 -->
	<div class="rounded-card border border-slate-200 bg-white p-8 text-center">
		<p class="text-sm text-slate-600">没有找到单号为 {id} 的申请</p>
	</div>
{:else}
	<PageHeader title="申请详情" description="单号 {request.id}">
		{#snippet actions()}
			<StatusBadge status={request.status} />
		{/snippet}
	</PageHeader>

	<div class="space-y-4">
		<!-- 基本信息：事由、紧急程度、申请人、时间 -->
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

		<Panel title="基本信息">
			<InfoGrid
				items={[
					{ label: '出差事由', full: true, value: reasonValue },
					{ label: '紧急程度', value: urgencyValue },
					{ label: '申请人', value: applicantValue },
					{ label: '提交时间', value: submittedValue },
					{ label: '创建时间', value: createdValue }
				]}
			/>
		</Panel>

		<!-- 行程明细：多段行程以表格呈现 -->
		<Panel title="行程明细" subtitle="共 {request.legs.length} 段">
			<LegsTable legs={request.legs} />
		</Panel>

		<!-- 费用预算：分项 + 合计；超阈值说明单独成块 -->
		<Panel title="费用预算" subtitle="合计 ¥{formatYuan(requestTotal(request))}">
			<BudgetBreakdown budget={request.budget} budgetNote={request.budgetNote} />
		</Panel>

		<!-- 审批时间线：由 audit 数组渲染 -->
		<Panel title="审批记录">
			<AuditTimeline audit={request.audit} />
		</Panel>

		<!-- 操作区：能做什么、怎么流转，全部交给 RequestActions -->
		<RequestActions request={request} actor={identity.user} />
	</div>
{/if}
