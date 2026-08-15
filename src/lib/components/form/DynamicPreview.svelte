<script lang="ts">
	import type { FieldDef } from '$lib/domain/applicationTypes';
	import { formatYuan, budgetTotal } from '$lib/domain/money';
	import type { Budget } from '$lib/domain/types';

	interface Props {
		fields: FieldDef[];
		value: Record<string, unknown>;
	}

	let { fields, value }: Props = $props();

	function optionLabel(field: FieldDef, val: unknown): string {
		if (field.kind !== 'select' && field.kind !== 'radio') return String(val ?? '');
		const opt = field.options.find((o) => o.value === val);
		return opt ? opt.label : String(val ?? '');
	}

	function display(field: FieldDef, val: unknown): string {
		// dateRange 的值写在 fromKey/toKey 上，field.key 本身永远是 undefined，
		// 不能走下面的「val 为空即返回占位符」判断，否则会提前 return '—' 而不展示日期。
		if (field.kind === 'dateRange') {
			const from = value[field.fromKey];
			const to = value[field.toKey];
			if (!from && !to) return '—';
			return `${from ?? '—'} 至 ${to ?? '—'}`;
		}
		if (val === undefined || val === null || val === '') return '—';
		switch (field.kind) {
			case 'number':
				return field.money ? `${formatYuan(Number(val))} 元` : String(val);
			case 'select':
			case 'radio':
				return optionLabel(field, val);
			default:
				return String(val);
		}
	}
</script>

<div class="preview">
	{#each fields as field (field.key)}
		{#if field.kind === 'repeatable'}
			<section class="preview__section">
				<h4 class="section-title">{field.label}</h4>
				{#if Array.isArray(value[field.key]) && (value[field.key] as unknown[]).length > 0}
					<table class="preview__table">
						<thead>
							<tr>
								{#each field.itemFields as col (col.key)}
									<th>{col.label}</th>
								{/each}
							</tr>
						</thead>
						<tbody>
							{#each value[field.key] as unknown[] as row, i (`${field.itemKey}-${i}`)}
								<tr>
									{#each field.itemFields as col (col.key)}
										<td>{display(col, (row as Record<string, unknown>)[col.key])}</td>
									{/each}
								</tr>
							{/each}
						</tbody>
					</table>
				{:else}
					<p class="preview__empty">暂无{field.label}</p>
				{/if}
			</section>
		{:else if field.kind === 'group'}
			<section class="preview__section">
				<h4 class="section-title">{field.label}</h4>
				<dl class="preview__list">
					{#each field.fields as sub (sub.key)}
						<div class="preview__item">
							<dt>{sub.label}</dt>
							<dd>{display(sub, (value[field.key] as Record<string, unknown>)?.[sub.key])}</dd>
						</div>
					{/each}
				</dl>
				{#if field.key === 'budget'}
					{@const budget = value[field.key] as Budget | undefined}
					{#if budget}
						<p class="preview__amount">
							预算合计：<strong>{formatYuan(budgetTotal(budget))} 元</strong>
						</p>
					{/if}
				{/if}
			</section>
		{:else}
			<section class="preview__section">
				<h4 class="section-title">{field.label}</h4>
				<p class="preview__text">{display(field, value[field.key])}</p>
			</section>
		{/if}
	{/each}
</div>

<style>
	.preview {
		display: flex;
		flex-direction: column;
		gap: 1.25rem;
	}
	.section-title {
		font-size: 0.9375rem;
		font-weight: 600;
		margin: 0 0 0.5rem;
		color: var(--color-slate-800);
	}
	.preview__text {
		margin: 0;
		white-space: pre-wrap;
		color: var(--color-slate-700);
	}
	.preview__list {
		margin: 0;
		display: grid;
		grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
		gap: 0.5rem 1.5rem;
	}
	.preview__item {
		display: flex;
		gap: 0.5rem;
	}
	.preview__item dt {
		color: var(--color-slate-500);
		flex-shrink: 0;
	}
	.preview__item dd {
		margin: 0;
		color: var(--color-slate-800);
	}
	.preview__table {
		width: 100%;
		border-collapse: collapse;
		font-size: 0.875rem;
	}
	.preview__table th,
	.preview__table td {
		border: 1px solid var(--color-slate-200);
		padding: 0.4rem 0.6rem;
		text-align: left;
	}
	.preview__table th {
		background: var(--color-slate-50);
		font-weight: 600;
	}
	.preview__empty {
		color: var(--color-slate-400);
		margin: 0;
	}
	.preview__amount {
		margin: 0.5rem 0 0;
	}
</style>
