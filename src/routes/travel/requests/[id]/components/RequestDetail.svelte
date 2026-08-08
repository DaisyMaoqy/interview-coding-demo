<script lang="ts">
	import { resolve } from '$app/paths';
	import PageHeader from '$lib/components/layout/PageHeader.svelte';
	import Panel from '$lib/components/common/Panel.svelte';
	import StatusBadge from '$lib/components/request/StatusBadge.svelte';
	import RequestBasicInfo from './RequestBasicInfo.svelte';
	import LegsTable from '$lib/components/request/LegsTable.svelte';
	import BudgetBreakdown from '$lib/components/request/BudgetBreakdown.svelte';
	import AuditTimeline from '$lib/components/request/AuditTimeline.svelte';
	import RequestActions from './RequestActions.svelte';
	import { formatYuan } from '$lib/domain/money';
	import { requestTotal } from '$lib/data/requests';
	import type { TravelRequest, User } from '$lib/domain/types';

	let { request, actor }: { request: TravelRequest; actor: User } = $props();
</script>

<!-- 头部内容 -->
<a href={resolve('/travel/requests')} class="back-link">
	<span aria-hidden="true">←</span> 返回我的申请
</a>
<PageHeader title="申请详情" description="单号 {request.id}">
	{#snippet actions()}
		<StatusBadge status={request.status} />
	{/snippet}
</PageHeader>

<div class="space-y-4">
	<!-- 申请详情：基本信息 + 行程 + 预算，归为一组 -->
	<Panel hideHeader>
		<div class="space-y-6">
			<RequestBasicInfo {request} />

			<section>
				<h3 class="section-title">
					行程明细<span class="section-title__sub">共 {request.legs.length} 段</span>
				</h3>
				<LegsTable legs={request.legs} />
			</section>

			<section>
				<h3 class="section-title">
					费用预算<span class="section-title__sub">合计 ¥{formatYuan(requestTotal(request))}</span>
				</h3>
				<BudgetBreakdown budget={request.budget} budgetNote={request.budgetNote} />
			</section>
		</div>
	</Panel>

	<!-- 审批时间线 -->
	<Panel title="审批记录">
		<AuditTimeline audit={request.audit} />
	</Panel>

	<!-- 操作区 -->
	<RequestActions {request} {actor} />
</div>

<!--
	back-link 只服务详情页这一视图，按「组件专属样式就近收口」的约定放在本文件，
	不放进全局 components.css（section-title 因看板/向导页也会复用，仍保留为共享原语）。
-->
<style>
	.back-link {
		display: inline-flex;
		align-items: center;
		gap: 0.25rem;
		margin-bottom: 0.75rem;
		font-size: 0.875rem;
		color: var(--color-slate-500);
	}
	.back-link:hover {
		color: var(--color-slate-800);
	}
</style>
