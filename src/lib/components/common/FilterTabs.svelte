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

<div class="flex flex-wrap gap-1 rounded-lg bg-slate-100 p-1" role="group" aria-label={ariaLabel}>
	{#each options as opt (opt.value)}
		{@const selected = value === opt.value}
		<button
			type="button"
			aria-pressed={selected}
			onclick={() => (value = opt.value)}
			class="rounded-md px-3 py-1.5 text-sm transition-colors
				{selected
				? 'bg-white font-medium text-slate-900 shadow-sm'
				: 'text-slate-500 hover:text-slate-800'}"
		>
			{opt.label}
			{#if opt.count !== undefined}
				<span class="ml-1 text-xs text-slate-400">{opt.count}</span>
			{/if}
		</button>
	{/each}
</div>
