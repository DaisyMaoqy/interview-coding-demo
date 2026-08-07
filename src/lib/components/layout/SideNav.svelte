<script lang="ts">
	import { page } from '$app/state';
	import { HOME } from '$lib/routes';
	import { useIdentity } from '$lib/state/identity.svelte';
	import NavIcon from './NavIcon.svelte';
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
<nav class="flex h-full flex-col gap-6 px-3 py-4" aria-label="主导航">
	<a
		href={HOME}
		class="flex items-center gap-2.5 rounded-lg px-2 py-1.5 focus-visible:outline-2
		       focus-visible:outline-offset-2 focus-visible:outline-brand-500"
	>
		<span
			class="grid size-8 place-items-center rounded-lg bg-brand-600 text-sm font-semibold text-white"
			aria-hidden="true"
		>
			差
		</span>
		<span class="text-[15px] font-semibold tracking-tight text-slate-800">差旅申请</span>
	</a>

	{#each sections as section (section.title)}
		<div class="flex flex-col gap-1">
			<h2 class="px-2 pb-1 text-xs font-medium tracking-wider text-slate-400">
				{section.title}
			</h2>

			{#each section.items as item (item.href)}
				{@const active = isActive(item.href, page.url.pathname)}
				<a
					href={item.href}
					title={item.description}
					aria-current={active ? 'page' : undefined}
					class="flex items-center gap-2.5 rounded-lg px-2 py-2 text-sm transition-colors
					       focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-500
					       {active
						? 'bg-brand-50 font-medium text-brand-700'
						: 'text-slate-600 hover:bg-slate-100 hover:text-slate-900'}"
				>
					<NavIcon name={item.icon} />
					{item.label}
				</a>
			{/each}
		</div>
	{/each}
</nav>
