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

<div class="unit-select">
	<select bind:value aria-label={ariaLabel} class="unit-select__field">
		{#each options as opt (opt.value)}
			<option value={opt.value}>{opt.label}</option>
		{/each}
	</select>
	<span class="unit-select__unit">{unit}</span>
</div>
