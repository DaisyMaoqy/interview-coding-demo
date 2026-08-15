<script lang="ts">
	import { goto } from '$app/navigation';
	import { page } from '$app/state';
	import { resolve } from '$app/paths';
	import PageHeader from '$lib/components/layout/PageHeader.svelte';
	import Panel from '$lib/components/common/Panel.svelte';
	import StatusBadge from '$lib/components/request/StatusBadge.svelte';
	import RequestBasicInfo from '$lib/components/request/RequestBasicInfo.svelte';
	import LegsTable from '$lib/components/request/LegsTable.svelte';
	import BudgetBreakdown from '$lib/components/request/BudgetBreakdown.svelte';
	import AuditTimeline from '$lib/components/request/AuditTimeline.svelte';
	import RequestActions from './RequestActions.svelte';
	import DynamicPreview from '$lib/components/form/DynamicPreview.svelte';
	import { formatYuan } from '$lib/domain/money';
	import { requestTotal } from '$lib/data/requests';
	import { flattenFields } from '$lib/domain/applicationTypes';
	import { resetRequestListFilters } from '$lib/state/requestListFilters';
	import type { Request, TravelRequest, User } from '$lib/domain/types';

	let {
		request,
		actor,
		/** 入口来源；?from=approvals 表示由「待我审批」点入，此时只读、不展示底部操作 */
		from = null
	}: { request: Request; actor: User; from?: string | null } = $props();

	// 差旅沿用既有的专属展示组件；其它类型用字段配置驱动的只读预览，避免为每种类型重复排版
	const isTravel = $derived(request.type === 'travel');
	// 仅当是差旅时才需要强类型字段；这里强制转换安全（isTravel 已收窄 request.type）
	const travel = $derived(request as TravelRequest);

	// 返回去向随入口：?from=approvals 回待我审批，?from=requests 回我的申请；
	// 直接输入 URL（无 from）时按身份兜底：审批人回待我审批，员工回我的申请
	const isApprover = $derived(actor.role === 'manager' || actor.role === 'finance');
	// 「我的申请」返回带上类型，回到对应类型的列表筛选态
	const myRequestsHref = $derived(`${resolve('/requests')}?type=${request.type}`);
	// 由统计报表进入时，回链带上 URL 上的 ?type=，回到对应类型的报表视图
	const reportsTypeQuery = $derived(page.url.searchParams.get('type') ?? '');
	const reportsBackHref = $derived(
		reportsTypeQuery ? `${resolve('/reports')}?type=${reportsTypeQuery}` : resolve('/reports')
	);
	const backHref = $derived(
		from === 'approvals'
			? resolve('/approvals')
			: from === 'requests'
				? myRequestsHref
				: from === 'reports'
					? reportsBackHref
					: isApprover
						? resolve('/approvals')
						: myRequestsHref
	);
	const backLabel = $derived(
		from === 'approvals'
			? '待我审批'
			: from === 'requests'
				? '我的申请'
				: from === 'reports'
					? '统计报表'
					: isApprover
						? '待我审批'
						: '我的申请'
	);
	// 从「待我审批」进来的详情是只读视角，底部通过/驳回等操作不展示
	const showActions = $derived(from !== 'approvals');
</script>

<!-- 头部内容 -->
<!-- 返回地址含 ?type= 查询参数，resolve 无法内联生成，故豁免该规则 -->
<!-- eslint-disable-next-line svelte/no-navigation-without-resolve -->
<a href={backHref} class="back-link">
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
			{#if isTravel}
				<RequestBasicInfo request={travel} />

				<section>
					<h3 class="section-title">
						行程明细<span class="section-title__sub">共 {travel.fields.legs.length} 段</span>
					</h3>
					<LegsTable legs={travel.fields.legs} />
				</section>

				<section>
					<h3 class="section-title">
						费用预算<span class="section-title__sub">合计 ¥{formatYuan(requestTotal(travel))}</span>
					</h3>
					<BudgetBreakdown budget={travel.fields.budget} budgetNote={travel.fields.budgetNote} />
				</section>
			{:else}
				<DynamicPreview fields={flattenFields(request.type)} value={request.fields} />
			{/if}
		</div>
	</Panel>

	<!-- 审批时间线 -->
	<Panel title="审批记录">
		<AuditTimeline audit={request.audit} />
	</Panel>

	<!-- 操作区：从「待我审批」进入时为只读，不展示底部操作 -->
	{#if showActions}
		<RequestActions
			{request}
			{actor}
			ondeleted={() => {
				// 删除后按原入口返回，我的申请场景带回类型筛选
				// eslint-disable-next-line svelte/no-navigation-without-resolve
				goto(backHref);
			}}
			onsubmitted={() => {
				resetRequestListFilters();
				// 提交后回到「我的申请」，带上类型筛选
				// eslint-disable-next-line svelte/no-navigation-without-resolve
				goto(myRequestsHref);
			}}
		/>
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
