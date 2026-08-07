<script lang="ts">
	import type { TripLeg } from '$lib/domain/types';
	import { TRANSPORT_LABELS } from '$lib/domain/workflow';

	interface Props {
		legs: TripLeg[];
	}

	let { legs }: Props = $props();
</script>

<div class="table-wrap">
	<table class="data-table">
		<thead>
			<tr>
				<th scope="col">#</th>
				<th scope="col">出发地</th>
				<th scope="col">目的地</th>
				<th scope="col">出发日期</th>
				<th scope="col">返回日期</th>
				<th scope="col">交通方式</th>
			</tr>
		</thead>
		<tbody>
			{#each legs as leg, i (leg.id)}
				<tr>
					<td class="data-table__muted">{i + 1}</td>
					<td>{leg.from}</td>
					<td>{leg.to}</td>
					<td>{leg.departDate}</td>
					<td>{leg.returnDate}</td>
					<td>{TRANSPORT_LABELS[leg.transport]}</td>
				</tr>
			{/each}
		</tbody>
	</table>
</div>

<style>
	.table-wrap {
		overflow-x: auto;
	}
	.data-table {
		width: 100%;
		border-collapse: collapse;
		font-size: 0.875rem;
	}
	.data-table th {
		text-align: left;
		font-weight: 500;
		color: var(--color-slate-500);
		border-bottom: 1px solid var(--color-slate-200);
		padding: 0.5rem 0.75rem;
		white-space: nowrap;
	}
	.data-table td {
		padding: 0.625rem 0.75rem;
		border-bottom: 1px solid var(--color-slate-100);
		color: var(--color-slate-900);
	}
	.data-table__muted {
		color: var(--color-slate-400);
	}
</style>
