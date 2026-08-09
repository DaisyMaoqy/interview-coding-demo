<script lang="ts">
	import type { DatePreset } from '$lib/domain/dashboard';
	import Icon from '$lib/components/common/Icon.svelte';

	interface Props {
		preset: DatePreset;
		customStart: string;
		customEnd: string;
		/** 筛选面板是否展开（双向绑定，外部可在图表点击时折叠） */
		visible: boolean;
		/** 重置全部筛选条件（日期 + 图表筛选） */
		onreset?: () => void;
	}

	let {
		preset = $bindable('all'),
		customStart = $bindable(''),
		customEnd = $bindable(''),
		visible = $bindable(false),
		onreset
	}: Props = $props();

	const presets: { value: DatePreset; label: string }[] = [
		{ value: 'all', label: '全部' },
		{ value: 'thisMonth', label: '本月' },
		{ value: 'thisQuarter', label: '本季度' },
		{ value: 'thisYear', label: '本年' },
		{ value: 'custom', label: '自定义' }
	];
</script>

<div class="filter-bar">
	{#if visible}
		<div class="date-filter" role="group" aria-label="日期范围">
			{#each presets as p (p.value)}
				{@const active = preset === p.value}
				<button
					type="button"
					aria-pressed={active}
					onclick={() => (preset = p.value)}
					class="filter-btn {active ? 'filter-btn--active' : ''}"
				>
					{p.label}
				</button>
			{/each}

			{#if preset === 'custom'}
				<div class="custom-range">
					<input
						type="date"
						bind:value={customStart}
						aria-label="开始日期"
						class="date-input"
					/>
					<span class="range-sep">—</span>
					<input
						type="date"
						bind:value={customEnd}
						aria-label="结束日期"
						class="date-input"
					/>
				</div>
			{/if}
		</div>
	{/if}

	<button
		type="button"
		class="toggle-btn"
		aria-label="时间筛选"
		aria-expanded={visible}
		onclick={() => (visible = !visible)}
	>
		<Icon name="filter" class="date-filter-icon" />
	</button>

	{#if onreset}
		<button
			type="button"
			class="toggle-btn"
			aria-label="重置筛选"
			title="重置全部筛选条件"
			onclick={onreset}
		>
			<Icon name="x" class="date-filter-icon" />
		</button>
	{/if}
</div>

<style>
	.toggle-btn {
		display: inline-flex;
		align-items: center;
		justify-content: center;
		width: 2rem;
		height: 2rem;
		border: 1px solid var(--color-slate-300);
		border-radius: var(--radius-lg, 0.5rem);
		background: var(--color-white);
		color: var(--color-slate-500);
		cursor: pointer;
		transition: border-color 0.15s, color 0.15s;
	}
	.toggle-btn:hover {
		border-color: var(--color-brand-600);
		color: var(--color-brand-600);
	}
	/* 图标在子组件 Icon 内，需 :global 穿透 */
	:global(.date-filter-icon) {
		width: 1rem;
		height: 1rem;
	}

	.filter-bar {
		display: flex;
		align-items: center;
		gap: 0.5rem;
	}

	.date-filter {
		display: flex;
		align-items: center;
		gap: 0.5rem;
		flex-wrap: wrap;
	}
	.filter-btn {
		padding: 0.375rem 0.875rem;
		border: 1px solid var(--color-slate-300);
		border-radius: var(--radius-lg, 0.5rem);
		background: var(--color-white);
		color: var(--color-slate-600);
		font-size: 0.875rem;
		cursor: pointer;
		transition: border-color 0.15s, color 0.15s;
	}
	.filter-btn:hover {
		border-color: var(--color-brand-600);
		color: var(--color-white);
	}
	.filter-btn--active {
		background: var(--color-brand-600);
		border-color: var(--color-brand-600);
		color: var(--color-white);
	}
	.custom-range {
		display: inline-flex;
		align-items: center;
		gap: 0.375rem;
		margin-left: 0.25rem;
	}
	.date-input {
		padding: 0.375rem 0.625rem;
		border: 1px solid var(--color-slate-300);
		border-radius: var(--radius-lg, 0.5rem);
		background: var(--color-white);
		color: var(--color-slate-900);
		font-size: 0.875rem;
	}
	.date-input:focus {
		outline: none;
		border-color: var(--color-brand-600);
		box-shadow: 0 0 0 2px var(--color-brand-100);
	}
	.range-sep {
		color: var(--color-slate-400);
		font-size: 0.875rem;
	}
</style>
