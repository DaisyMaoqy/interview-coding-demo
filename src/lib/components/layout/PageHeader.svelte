<script lang="ts">
	import type { Snippet } from 'svelte';
	import { pageTitle } from '$lib/format';

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

<div class="page-header">
	<div class="page-header__heading">
		<h1 class="page-header__title">{title}</h1>
		{#if description}
			<p class="page-header__description">{description}</p>
		{/if}
	</div>

	{#if actions}
		<div class="page-header__actions">
			{@render actions()}
		</div>
	{/if}
</div>
