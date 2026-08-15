<script lang="ts">
	import { resolve } from '$app/paths';
	import type { ApplicationType, Request } from '$lib/domain/types';
	import { requestMetric, requestSummary } from '$lib/data/requests';
	import { formatDate } from '$lib/format/date';
	import Pagination from '$lib/components/form/Pagination.svelte';
	import StatusBadge from '$lib/components/request/StatusBadge.svelte';

	interface Props {
		requests: readonly Request[];
		/** 看板当前类型筛选；用于「查看」回链与表头措辞，'all' 表示混合 */
		type?: ApplicationType | 'all';
		resetKey?: unknown;
	}

	let { requests, type = 'all', resetKey = undefined }: Props = $props();

	// 摘要列：差旅=行程城市链，请假=类型+日期区间（requestSummary 已按类型分支）
	const summaryTitle = $derived(
		type === 'leave' ? '请假信息' : type === 'travel' ? '行程明细' : '申请摘要'
	);
	// 指标列：差旅=预算金额，请假=请假天数（requestMetric 已按类型分支）
	const metricTitle = $derived(
		type === 'leave' ? '请假天数' : type === 'travel' ? '申请金额' : '金额/时长'
	);
	// 「查看」回链只带 ?from=reports（用于详情页高亮归属），不再带 ?type=——
	// 返回统计报表时由全局持久化类型决定展示哪个类型，避免点导航切走类型
</script>

{#if requests.length === 0}
	<p class="empty-text">暂无匹配的申请记录</p>
{:else}
	<Pagination items={requests} pageSizeOptions={[5]} {resetKey} children={tableSnippet} />

	{#snippet tableSnippet({ pageItems }: { pageItems: readonly Request[] })}
		<div class="table-wrap">
			<table class="app-table">
				<thead>
					<tr>
						<th scope="col">单号</th>
						<th scope="col">申请人</th>
						<th scope="col">{summaryTitle}</th>
						<th scope="col">申请日期</th>
						<th scope="col">申请状态</th>
						<th scope="col">{metricTitle}</th>
						<th scope="col">操作</th>
					</tr>
				</thead>
				<tbody>
					{#each pageItems as req (req.id)}
						{@const metric = requestMetric(req)}
						<tr>
							<td class="app-table__id">{req.id}</td>
							<td>{req.applicantName}</td>
							<td class="app-table__trip">{requestSummary(req)}</td>
							<td>{formatDate(req.createdAt)}</td>
							<td><StatusBadge status={req.status} /></td>
							<td class="app-table__amount">{metric.value}</td>
							<td>
								<a href={resolve(`/requests/${req.id}?from=reports`)} class="view-link"> 查看 </a>
							</td>
						</tr>
					{/each}
				</tbody>
			</table>
		</div>
	{/snippet}
{/if}

<style>
	.table-wrap {
		overflow-x: auto;
	}
	.app-table {
		width: 100%;
		border-collapse: collapse;
		font-size: 0.875rem;
	}
	.app-table th {
		text-align: left;
		font-weight: 500;
		color: var(--color-slate-500);
		border-bottom: 1px solid var(--color-slate-200);
		padding: 0.5rem 0.75rem;
		white-space: nowrap;
	}
	.app-table td {
		padding: 0.625rem 0.75rem;
		border-bottom: 1px solid var(--color-slate-100);
		color: var(--color-slate-900);
	}
	.app-table__id {
		font-family: var(--font-mono);
		font-size: 0.8125rem;
		color: var(--color-brand-600);
	}
	.app-table__trip {
		max-width: 260px;
		overflow: hidden;
		text-overflow: ellipsis;
		white-space: nowrap;
	}
	.app-table__amount {
		font-variant-numeric: tabular-nums;
		text-align: right;
	}
	.view-link {
		color: var(--color-brand-600);
		text-decoration: none;
		font-size: 0.875rem;
	}
	.view-link:hover {
		text-decoration: underline;
	}
	.empty-text {
		padding: 2rem;
		text-align: center;
		color: var(--color-slate-400);
		font-size: 0.875rem;
	}
</style>
