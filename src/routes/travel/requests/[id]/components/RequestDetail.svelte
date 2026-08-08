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

	let {
		request,
		actor,
		/** 入口来源；?from=approvals 表示由「待我审批」点入，此时只读、不展示底部操作 */
		from = null
	}: { request: TravelRequest; actor: User; from?: string | null } = $props();

	// 返回去向随入口：?from=approvals 回待我审批，?from=requests 回我的申请；
	// 直接输入 URL（无 from）时按身份兜底：经理回待我审批，员工回我的申请
	const backHref = $derived(
		from === 'approvals'
			? '/travel/approvals'
			: from === 'requests'
				? '/travel/requests'
				: actor.role === 'manager'
					? '/travel/approvals'
					: '/travel/requests'
	);
	const backLabel = $derived(
		from === 'approvals'
			? '待我审批'
			: from === 'requests'
				? '我的申请'
				: actor.role === 'manager'
					? '待我审批'
					: '我的申请'
	);
	// 从「待我审批」进来的详情是只读视角，底部通过/驳回等操作不展示
	const showActions = $derived(from !== 'approvals');
</script>

<!-- 头部内容 -->
<a href={resolve(backHref)} class="back-link">
	<span aria-hidden="true">←</span> 返回{backLabel}
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

	<!-- 操作区：从「待我审批」进入时为只读，不展示底部操作 -->
	{#if showActions}
		<RequestActions {request} {actor} />
	{/if}
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
