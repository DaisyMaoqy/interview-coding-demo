<script lang="ts">
	import './layout.css';
	import { onMount } from 'svelte';
	import { page } from '$app/state';
	import favicon from '$lib/assets/favicon.svg';
	import IdentitySwitcher from '$lib/components/layout/IdentitySwitcher.svelte';
	import SideNav from '$lib/components/layout/SideNav.svelte';
	import { pageTitle } from '$lib/format';
	import { provideIdentity } from '$lib/state/identity.svelte';
	import { loadRequests } from '$lib/data/requests';

	let { children } = $props();

	// 申请详情（/travel/requests/[id]）为只读视角，隐藏角色切换开关，避免误切身份
	const showSwitch = $derived(!page.url.pathname.startsWith('/travel/requests/'));

	// 在根部提供一次，整棵树通过 useIdentity() 读取
	provideIdentity();

	// 浏览器端启动拉取 Apifox Mock 数据（3s 超时，失败回退缓存 / seed）
	onMount(loadRequests);
</script>

<svelte:head>
	<link rel="icon" href={favicon} />
	<!-- 网站图标 -->
	<!-- 兜底标题：各页面用 <svelte:head><title> 覆盖，后出现的生效 -->
	<title>{pageTitle()}</title>
</svelte:head>

<!-- 跳过导航：键盘用户不必逐个 Tab 过侧栏才能到达正文 -->
<a href="#main" class="app-layout__skip-link">跳到主要内容</a>

<div class="app-layout">
	<aside class="app-layout__sidebar">
		<div class="app-layout__sidebar-inner">
			<SideNav />
		</div>
	</aside>

	<div class="app-layout__main-col">
		<header class="app-layout__header">
			<IdentitySwitcher showSwitch={showSwitch} />
		</header>

		<main id="main" class="app-layout__main">
			{@render children()}
		</main>
	</div>
</div>
