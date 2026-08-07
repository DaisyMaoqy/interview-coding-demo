<script lang="ts" generics="T extends string | number">
	interface Option {
		value: T;
		label: string;
	}

	interface Props {
		/** 当前选中值（双向绑定） */
		value: T;
		/** 可选项，含「全部」占位项 */
		options: ReadonlyArray<Option>;
		/** 跟在下拉框后的单位文字，例如「年」「月」 */
		unit: string;
		ariaLabel: string;
	}

	let { value = $bindable(), options, unit, ariaLabel }: Props = $props();
</script>

<div
	class="flex h-9 items-center gap-1.5 rounded-lg border-0 bg-slate-100 px-2.5 focus-within:outline-2 focus-within:outline-offset-2 focus-within:outline-brand-500"
>
	<select
		bind:value
		aria-label={ariaLabel}
		class="h-full w-auto border-0 bg-transparent text-sm text-slate-800 outline-none focus-visible:text-brand-600"
	>
		{#each options as opt (opt.value)}
			<option value={opt.value}>{opt.label}</option>
		{/each}
	</select>
	<span class="text-xs text-slate-400">{unit}</span>
</div>
