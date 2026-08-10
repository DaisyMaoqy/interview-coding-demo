<script lang="ts">
	import { resolve } from '$app/paths';
	import type { TravelRequest } from '$lib/domain/types';
	import { budgetTotal, formatYuan } from '$lib/domain/money';
	import { formatDate } from '$lib/format/date';
	import Pagination from '$lib/components/common/Pagination.svelte';
	import StatusBadge from '$lib/components/request/StatusBadge.svelte';

	interface Props {
		requests: readonly TravelRequest[];
		resetKey?: unknown;
	}

	let { requests, resetKey = undefined }: Props = $props();

	function tripChain(req: TravelRequest): string {
		if (req.legs.length === 0) return '—';
		const from = req.legs[0].from;
		const tos = req.legs.map((l) => l.to);
		return [from, ...tos].join(' → ');
	}
</script>

{#if requests.length === 0}
	<p class="empty-text">暂无匹配的申请记录</p>
{:else}
	<Pagination items={requests} pageSizeOptions={[5]} {resetKey} children={tableSnippet} />

	{#snippet tableSnippet({ pageItems }: { pageItems: readonly TravelRequest[] })}
		<div class="table-wrap">
			<table class="app-table">
				<thead>
					<tr>
						<th scope="col">单号</th>
						<th scope="col">申请人</th>
						<th scope="col">行程明细</th>
						<th scope="col">申请日期</th>
						<th scope="col">申请状态</th>
						<th scope="col">申请金额</th>
						<th scope="col">操作</th>
					</tr>
				</thead>
				<tbody>
					{#each pageItems as req (req.id)}
						<tr>
							<td class="app-table__id">{req.id}</td>
							<td>{req.applicantName}</td>
							<td class="app-table__trip">{tripChain(req)}</td>
							<td>{formatDate(req.createdAt)}</td>
							<td><StatusBadge status={req.status} /></td>
							<td class="app-table__amount">{formatYuan(budgetTotal(req.budget))}</td>
							<td>
								<a href={resolve(`/travel/requests/${req.id}?from=reports`)} class="view-link">
									查看
								</a>
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
