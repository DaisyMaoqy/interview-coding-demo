<script lang="ts">
	import { page } from '$app/state';
	import { HOME } from '$lib/routes';
	import { useIdentity } from '$lib/state/identity.svelte';
	import Icon from '$lib/components/common/Icon.svelte';
	import { isActive, visibleSections } from './navigation';

	const identity = useIdentity();

	// 角色变化时菜单自动增删「待我审批」
	const sections = $derived(visibleSections(identity.role));
</script>

<!--
	HOME 与 item.href 均已在 $lib/routes、navigation.ts 中经 resolve() 生成，
	ESLint 无法跨模块追踪变量来源，故整个组件豁免该规则。
-->
<!-- eslint-disable svelte/no-navigation-without-resolve -->
<nav class="side-nav" aria-label="主导航">
	<a href={HOME} class="side-nav__brand">
		<span class="side-nav__brand-mark" aria-hidden="true">差</span>
		<span class="side-nav__brand-name">差旅申请</span>
	</a>

	{#each sections as section (section.title)}
		<div class="side-nav__section">
			<h2 class="side-nav__section-title">{section.title}</h2>

			{#each section.items as item (item.href)}
				{@const active = isActive(item.href, page.url.pathname, page.url.search)}
				<a
					href={item.href}
					title={item.description}
					aria-current={active ? 'page' : undefined}
					class="side-nav__link {active ? 'side-nav__link--active' : ''}"
				>
					<Icon name={item.icon} class="nav-icon" strokeWidth={1.75} />
					{item.label}
				</a>
			{/each}
		</div>
	{/each}
</nav>

<!--
	nav-icon 只服务 SideNav，且作用在子组件 <Icon> 上 —— 用 :global 让 SideNav 的
	局部样式能命中子组件 DOM（scoped 默认够不到），同时把这条「组件专属」样式收回到本文件，
	不污染全局 components.css。
-->
<style>
	:global(.nav-icon) {
		width: 1.25rem;
		height: 1.25rem;
		flex-shrink: 0;
	}
</style>
