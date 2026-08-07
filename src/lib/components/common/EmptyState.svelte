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

<div class="empty-state">
	<p class="empty-state__title">{title}</p>
	{#if description}
		<p class="empty-state__description">{description}</p>
	{/if}
	{#if action}
		<div class="empty-state__action">
			{@render action()}
		</div>
	{/if}
</div>
