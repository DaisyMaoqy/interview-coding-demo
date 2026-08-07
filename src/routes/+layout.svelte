<script lang="ts">
	import './layout.css';
	import favicon from '$lib/assets/favicon.svg';
	import IdentitySwitcher from '$lib/components/layout/IdentitySwitcher.svelte';
	import SideNav from '$lib/components/layout/SideNav.svelte';
	import { pageTitle } from '$lib/domain/title';
	import { provideIdentity } from '$lib/state/identity.svelte';

	let { children } = $props();

	// 在根部提供一次，整棵树通过 useIdentity() 读取
	provideIdentity();
</script>

<svelte:head>
	<link rel="icon" href={favicon} />
	<!-- 网站图标 -->
	<!-- 兜底标题：各页面用 <svelte:head><title> 覆盖，后出现的生效 -->
	<title>{pageTitle()}</title>
</svelte:head>

<!-- 跳过导航：键盘用户不必逐个 Tab 过侧栏才能到达正文 -->
<a
	href="#main"
	class="sr-only focus:not-sr-only focus:fixed focus:top-3 focus:left-3 focus:z-50
	       focus:rounded-lg focus:bg-white focus:px-4 focus:py-2 focus:shadow-card"
>
	跳到主要内容
</a>

<div class="flex min-h-screen">
	<aside class="hidden w-56 shrink-0 border-r border-slate-200 bg-white md:block">
		<div class="sticky top-0 h-screen overflow-y-auto">
			<SideNav />
		</div>
	</aside>

	<div class="flex min-w-0 flex-1 flex-col">
		<header
			class="sticky top-0 z-10 flex h-14 items-center justify-end gap-4 border-b
			       border-slate-200 bg-white/80 px-6 backdrop-blur"
		>
			<IdentitySwitcher />
		</header>

		<main id="main" class="flex-1 px-6 py-6">
			{@render children()}
		</main>
	</div>
</div>
