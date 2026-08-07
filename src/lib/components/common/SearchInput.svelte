<script lang="ts">
	interface Props {
		/** 搜索词（双向绑定） */
		value: string;
		placeholder?: string;
		ariaLabel?: string;
	}

	let { value = $bindable(), placeholder = '', ariaLabel = '搜索' }: Props = $props();
</script>

<div class="relative">
	<svg
		class="pointer-events-none absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2 text-slate-400"
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
		class="h-9 w-full rounded-lg border border-slate-200 bg-white pr-3 pl-9 text-sm
		       text-slate-800 placeholder:text-slate-400 focus-visible:border-brand-500
		       focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-500 sm:w-64"
	/>
</div>
