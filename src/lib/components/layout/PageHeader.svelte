<script lang="ts">
	import type { Snippet } from 'svelte';
	import { pageTitle } from '$lib/domain/title';

	interface Props {
		title: string;
		description?: string;
		/** 右上角的操作区，如「新建申请」按钮 */
		actions?: Snippet;
	}

	let { title, description, actions }: Props = $props();
</script>

<!--
	页面标题与 document.title 由同一个 title 参数驱动，
	避免出现「页面上写 A、标签页写 B」的不一致。
-->
<svelte:head>
	<title>{pageTitle(title)}</title>
</svelte:head>

<div class="mb-6 flex items-start justify-between gap-4">
	<div>
		<h1 class="text-xl font-semibold tracking-tight text-slate-900">{title}</h1>
		{#if description}
			<p class="mt-1 text-sm text-slate-500">{description}</p>
		{/if}
	</div>

	{#if actions}
		<div class="flex shrink-0 items-center gap-2">
			{@render actions()}
		</div>
	{/if}
</div>
