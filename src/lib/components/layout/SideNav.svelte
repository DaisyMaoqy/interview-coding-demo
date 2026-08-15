<script lang="ts">
	import { goto } from '$app/navigation';
	import { page } from '$app/state';
	import { resolve } from '$app/paths';
	import { HOME } from '$lib/core/routes';
	import { useIdentity } from '$lib/state/identity.svelte';
	import { useApplicationType } from '$lib/state/applicationType.svelte';
	import Icon from '$lib/components/common/Icon.svelte';
	import { isActive, visibleSections } from './navigation';
	import {
		APPLICATION_TYPE_VALUES,
		APPLICATION_TYPE_LABELS,
		type ApplicationType
	} from '$lib/domain/types';
	import { APPLICATION_TYPES } from '$lib/domain/applicationTypes';

	const identity = useIdentity();
	const appType = useApplicationType();

	// 角色变化时菜单自动增删「待我审批」
	const sections = $derived(visibleSections(identity.role));

	// 当前申请类型来自持久化 store（localStorage），不随 URL 变化；只有侧栏下拉会改它
	const currentType = $derived(appType.value);

	// 当前类型的配置（标记字、名称等），品牌区随切换实时变化
	const currentDef = $derived(APPLICATION_TYPES[currentType as keyof typeof APPLICATION_TYPES]);

	// 分组标题：类型绑定项随当前类型显示（差旅申请 / 请假申请）
	function sectionTitle(title: string, titleFor?: (type: ApplicationType) => string): string {
		return titleFor ? titleFor(currentType as ApplicationType) : title;
	}

	// 实际跳转链接：仅「发起申请」需要带上当前类型指向对应向导；
	// 「我的申请」「统计报表」不再附带 ?type=，避免点导航就把类型切走
	function linkHref(item: { href: string; hrefFor?: (type: ApplicationType) => string }): string {
		return item.hrefFor ? item.hrefFor(currentType as ApplicationType) : item.href;
	}

	// 切换类型：仅此处会改持久化的申请类型；写入即存 localStorage。
	// 已在报表页则停留本页、由各页面从 store 读取重算；在请求列表页靠 effect 同步；
	// 其它页面（首页 / 待我审批）跳到「我的申请」展示该类型
	function switchType(event: Event): void {
		const type = (event.currentTarget as HTMLSelectElement).value as ApplicationType;
		appType.switchTo(type);
		if (page.url.pathname === resolve('/reports')) return;
		if (page.url.pathname.startsWith(`${resolve('/requests')}`)) return;
		// 当前不在请求 / 报表页，跳到「我的申请」展示该类型
		goto(resolve('/requests'));
	}
</script>

<!--
	HOME 与 item.href 均已在 $lib/routes、navigation.ts 中经 resolve() 生成，
	ESLint 无法跨模块追踪变量来源，故整个组件豁免该规则。
-->
<!-- eslint-disable svelte/no-navigation-without-resolve -->
<nav class="side-nav" aria-label="主导航">
	<div class="side-nav__brand">
		<a href={HOME} class="side-nav__brand-mark" aria-label="返回首页">
			<span aria-hidden="true">{currentDef.mark}</span>
		</a>
		<!-- 申请类型切换放在品牌区：下拉框即名称，切换后标记字与名称同步变化 -->
		<select
			id="type-switch"
			class="side-nav__type-select"
			value={currentType}
			onchange={switchType}
			aria-label="切换申请类型"
		>
			{#each APPLICATION_TYPE_VALUES as type (type)}
				<option value={type}>{APPLICATION_TYPE_LABELS[type]}</option>
			{/each}
		</select>
	</div>

	{#each sections as section (section.title)}
		<div class="side-nav__section">
			<h2 class="side-nav__section-title">{sectionTitle(section.title, section.titleFor)}</h2>

			{#each section.items as item (item.href)}
				{@const active = isActive(item.href, page.url.pathname, page.url.search)}
				<a
					href={linkHref(item)}
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
	.side-nav__brand {
		display: flex;
		align-items: center;
		gap: 0.5rem;
		padding: 0.5rem 0.75rem 0.75rem;
		margin-bottom: 0.5rem;
		border-bottom: 1px solid var(--color-slate-200);
	}
	.side-nav__brand-mark {
		display: flex;
		align-items: center;
		justify-content: center;
		width: 2rem;
		height: 2rem;
		flex-shrink: 0;
		border-radius: var(--radius-md);
		background: var(--color-brand-600);
		color: var(--color-white);
		font-size: 0.875rem;
		font-weight: 600;
	}
	.side-nav__type-select {
		flex: 1;
		min-width: 0;
		padding: 0.4rem 0.5rem;
		border: 1px solid var(--color-slate-300);
		border-radius: var(--radius-md);
		background: var(--color-white);
		font-size: 0.875rem;
	}
</style>
