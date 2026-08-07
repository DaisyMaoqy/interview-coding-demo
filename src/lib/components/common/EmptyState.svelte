<script lang="ts">
	import type { Snippet } from 'svelte';

	interface Props {
		/** 主标题 */
		title: string;
		/** 可选副描述 */
		description?: string;
		/** 可选操作区（链接 / 按钮），样式由调用方决定 */
		action?: Snippet;
	}

	let { title, description, action }: Props = $props();
</script>

<div class="rounded-card border border-dashed border-slate-300 bg-white p-10 text-center">
	<p class="text-sm font-medium text-slate-700">{title}</p>
	{#if description}
		<p class="mt-1 text-sm text-slate-500">{description}</p>
	{/if}
	{#if action}
		<div class="mt-3">
			{@render action()}
		</div>
	{/if}
</div>
