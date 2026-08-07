<script lang="ts">
	import type { Budget } from '$lib/domain/types';
	import { formatYuan, budgetTotal } from '$lib/domain/money';

	interface Props {
		budget: Budget;
		/** 超阈值说明，见 schema 的 BUDGET_NOTE_THRESHOLD_CENTS */
		budgetNote?: string;
	}

	let { budget, budgetNote }: Props = $props();

	// 分项展示顺序与中文名，与 schema 的 budgetShape 字段对齐（单一真相）
	const ROWS: ReadonlyArray<{ key: keyof Budget; label: string }> = [
		{ key: 'transport', label: '交通' },
		{ key: 'hotel', label: '住宿' },
		{ key: 'allowance', label: '补贴' },
		{ key: 'other', label: '其他' }
	];
</script>

<dl class="budget">
	{#each ROWS as row (row.key)}
		<div class="budget__row">
			<dt class="budget__label">{row.label}</dt>
			<dd class="budget__value">¥{formatYuan(budget[row.key])}</dd>
		</div>
	{/each}
	<div class="budget__row budget__row--total">
		<dt class="budget__label">合计</dt>
		<dd class="budget__value">¥{formatYuan(budgetTotal(budget))}</dd>
	</div>
</dl>
{#if budgetNote}
	<p class="budget__note">说明：{budgetNote}</p>
{/if}

<style>
	.budget {
		margin: 0;
		display: grid;
		gap: 0.5rem;
	}
	.budget__row {
		display: flex;
		justify-content: space-between;
		align-items: baseline;
	}
	.budget__label {
		font-size: 0.875rem;
		color: var(--color-slate-500);
	}
	.budget__value {
		margin: 0;
		font-size: 0.875rem;
		color: var(--color-slate-900);
		font-variant-numeric: tabular-nums;
	}
	.budget__row--total {
		margin-top: 0.25rem;
		padding-top: 0.5rem;
		border-top: 1px solid var(--color-slate-200);
	}
	.budget__row--total .budget__label {
		font-weight: 600;
		color: var(--color-slate-900);
	}
	.budget__row--total .budget__value {
		font-weight: 600;
	}
	.budget__note {
		margin-top: 0.75rem;
		border-left: 2px solid var(--color-amber-300);
		background-color: var(--color-amber-50);
		padding: 0.5rem 0.75rem;
		font-size: 0.8125rem;
		color: var(--color-slate-700);
		border-radius: 0 0.375rem 0.375rem 0;
	}
</style>
