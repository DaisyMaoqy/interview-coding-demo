<script lang="ts">
	import { page } from '$app/state';
	import { HOME } from '$lib/routes';
	import { pageTitle } from '$lib/format';

	const title = $derived(page.status === 404 ? '页面不存在' : '出错了');
</script>

<svelte:head>
	<title>{pageTitle(title)}</title>
</svelte:head>

<div class="grid min-h-[60vh] place-items-center">
	<div class="text-center">
		<p class="text-5xl font-semibold tracking-tight text-slate-300">{page.status}</p>
		<h1 class="mt-3 text-lg font-medium text-slate-900">{title}</h1>

		{#if page.error?.message}
			<p class="mt-1.5 text-sm text-slate-500">{page.error.message}</p>
		{/if}

		<a href={HOME} class="btn btn--primary mt-6"> 返回我的申请 </a>
	</div>
</div>
