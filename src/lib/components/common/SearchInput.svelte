<script lang="ts">
	import Icon from './Icon.svelte';

	interface Props {
		/** 搜索词（双向绑定） */
		value: string;
		placeholder?: string;
		ariaLabel?: string;
	}

	let { value = $bindable(), placeholder = '', ariaLabel = '搜索' }: Props = $props();
</script>

<div class="search-input">
	<Icon name="search" class="search-input__icon" />
	<input
		type="search"
		bind:value
		{placeholder}
		aria-label={ariaLabel}
		class="search-input__field"
	/>
</div>
