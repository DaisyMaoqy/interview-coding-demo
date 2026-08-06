<script lang="ts">
	import './layout.css';
	import favicon from '$lib/assets/favicon.svg';
	import { pageTitle } from '$lib/domain/title';

	let { children } = $props();
</script>

<svelte:head>
	<link rel="icon" href={favicon} />
	<!-- 网站图标 -->
	<!-- 兜底标题：各页面用 <svelte:head><title> 覆盖，后出现的生效 -->
	<title>{pageTitle()}</title>
</svelte:head>
{@render children()}
