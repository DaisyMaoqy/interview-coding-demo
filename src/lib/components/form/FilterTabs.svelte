<script lang="ts" generics="T extends string">
	interface Option {
		value: T;
		label: string;
		/** 可选数量徽标 */
		count?: number;
	}

	interface Props {
		options: ReadonlyArray<Option>;
		/** 当前选中值（双向绑定） */
		value: T;
		ariaLabel?: string;
	}

	let { options, value = $bindable(), ariaLabel = '筛选' }: Props = $props();
</script>

<div class="filter-tabs" role="group" aria-label={ariaLabel}>
	{#each options as opt (opt.value)}
		{@const selected = value === opt.value}
		<button
			type="button"
			aria-pressed={selected}
			onclick={() => (value = opt.value)}
			class="filter-tabs__tab {selected ? 'filter-tabs__tab--active' : ''}"
		>
			{opt.label}
			{#if opt.count !== undefined}
				<span class="filter-tabs__count">{opt.count}</span>
			{/if}
		</button>
	{/each}
</div>
