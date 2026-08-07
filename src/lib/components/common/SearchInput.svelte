<script lang="ts">
	interface Props {
		/** 搜索词（双向绑定） */
		value: string;
		placeholder?: string;
		ariaLabel?: string;
	}

	let { value = $bindable(), placeholder = '', ariaLabel = '搜索' }: Props = $props();
</script>

<div class="search-input">
	<svg
		class="search-input__icon"
		viewBox="0 0 20 20"
		fill="none"
		stroke="currentColor"
		stroke-width="2"
		aria-hidden="true"
	>
		<circle cx="9" cy="9" r="6" />
		<path d="m17 17-3.5-3.5" stroke-linecap="round" />
	</svg>
	<input
		type="search"
		bind:value
		{placeholder}
		aria-label={ariaLabel}
		class="search-input__field"
	/>
</div>
