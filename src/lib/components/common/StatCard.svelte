<script lang="ts">
	interface Props {
		/** 指标名，如「待处理」「本月团队支出」 */
		label: string;
		/** 指标值（已格式化的文本，如 ¥12,800 或 3 小时） */
		value: string;
		/** 补充说明，如口径或口径备注 */
		hint?: string;
	}

	let { label, value, hint }: Props = $props();
</script>

<div class="stat-card">
	<p class="stat-card__label">{label}</p>
	<p class="stat-card__value">{value}</p>
	{#if hint}
		<p class="stat-card__hint">{hint}</p>
	{/if}
</div>

<style>
	.stat-card {
		border-radius: var(--radius-card);
		border: 1px solid var(--color-slate-200);
		background-color: #fff;
		padding: 1.25rem;
	}
	.stat-card__label {
		font-size: 0.8125rem;
		color: var(--color-slate-500);
	}
	.stat-card__value {
		margin-top: 0.5rem;
		font-size: 1.75rem;
		font-weight: 600;
		line-height: 1.2;
		color: var(--color-slate-900);
		font-variant-numeric: tabular-nums;
	}
	.stat-card__hint {
		margin-top: 0.25rem;
		font-size: 0.75rem;
		color: var(--color-slate-400);
	}
</style>
