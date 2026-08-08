import { resolve } from '$app/paths';
import type { IconName } from '$lib/components/common/Icon.svelte';
import type { Role } from '$lib/domain/types';

/**
 * 左侧导航的结构定义。
 *
 * 放在组件层而非 domain 层：导航分组与图标是纯粹的 UI 关注点，
 * domain 不该知道菜单长什么样。
 *
 * 导航项声明自己对哪些角色可见，权限判断因此只有一处实现
 * （`visibleSections`），而不是在模板里散落 `{#if role === 'manager'}`。
 */

export interface NavItem {
	href: string;
	label: string;
	/** 悬浮提示，同时用作无障碍描述 */
	description: string;
	/** 具体 SVG 在 `Icon.svelte` 中映射，配置层只记名字 */
	icon: IconName;
	/** 省略表示所有角色可见 */
	visibleTo?: readonly Role[];
}

export interface NavSection {
	title: string;
	items: readonly NavItem[];
}

export const NAV_SECTIONS: readonly NavSection[] = [
	{
		title: '差旅申请',
		items: [
			{
				href: resolve('/travel/requests'),
				label: '我的申请',
				description: '我发起的全部申请',
				icon: 'inbox'
			},
			{
				href: resolve('/travel/approvals'),
				label: '待我审批',
				description: '等待我处理的申请',
				icon: 'check',
				// 员工没有审批职责，菜单里不该出现这一项；主管审一级、财务审二级
				visibleTo: ['manager', 'finance']
			},
			{
				href: resolve('/travel/apply'),
				label: '发起申请',
				description: '填写新的差旅申请',
				icon: 'plus'
			}
		]
	},
	{
		title: '统计',
		items: [
			{
				href: resolve('/reports'),
				label: '数据看板',
				description: '申请与费用的统计分析',
				icon: 'chart'
			}
		]
	}
];

/** 按角色过滤，并丢弃因过滤而变空的分组 */
export function visibleSections(role: Role): NavSection[] {
	return NAV_SECTIONS.map((section) => ({
		...section,
		items: section.items.filter((item) => !item.visibleTo || item.visibleTo.includes(role))
	})).filter((section) => section.items.length > 0);
}

/**
 * 判断导航项是否处于选中态。
 *
 * 用前缀匹配而非全等，详情页 `/travel/requests/TR-0001` 
 * `search` 参数中的 `?from=approvals`用于标记「申请详情从哪个入口点击进入」
 * 此时URL虽在 `/travel/requests` 下
 * 但语义归属「待我审批」——点亮该项、熄掉「我的申请」，两侧互斥，避免同时高亮两个入口。
 */
export function isActive(itemHref: string, pathname: string, search = ''): boolean {
	// 编辑态：在 /travel/apply 下带 ?edit=ID，语义归属「我的申请」——
	// 点亮该项、熄掉「发起申请」，与详情页 ?from=approvals 的处理思路一致。
	if (search.includes('edit=')) {
		if (itemHref === resolve('/travel/requests')) return true;
		if (itemHref === resolve('/travel/apply')) return false;
	}

	if (search.includes('from=approvals')) {
		const underRequests = pathname.startsWith(`${resolve('/travel/requests')}/`);
		if (itemHref === resolve('/travel/approvals')) return underRequests;
		if (itemHref === resolve('/travel/requests')) return !underRequests;
	}

	return pathname === itemHref || pathname.startsWith(`${itemHref}/`);
}
