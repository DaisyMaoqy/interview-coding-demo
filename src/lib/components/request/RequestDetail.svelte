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
<a
	href={resolve('/travel/requests')}
	class="mb-3 inline-flex items-center gap-1 text-sm text-slate-500 hover:text-slate-800"
>
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
				<h3 class="mb-3 text-sm font-semibold text-slate-900">
					行程明细<span class="ml-2 text-xs font-normal text-slate-500"
						>共 {request.legs.length} 段</span
					>
				</h3>
				<LegsTable legs={request.legs} />
			</section>

			<section>
				<h3 class="mb-3 text-sm font-semibold text-slate-900">
					费用预算<span class="ml-2 text-xs font-normal text-slate-500"
						>合计 ¥{formatYuan(requestTotal(request))}</span
					>
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
