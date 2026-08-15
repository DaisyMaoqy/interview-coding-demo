import { resolve } from '$app/paths';
import type { IconName } from '$lib/components/common/Icon.svelte';
import type { ApplicationType, Role } from '$lib/domain/types';
import { APPLICATION_TYPES } from '$lib/domain/applicationTypes';
import { firstStep } from '$lib/domain/wizard';

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
	/** 基础路径，用于 `isActive` 的精确匹配（不带 query，保证跨类型一致） */
	href: string;
	/**
	 * 实际跳转链接：默认用 `href`，需要携带 `?type=` 或指向当前类型向导时提供。
	 * 只有「我的申请」「发起申请」「统计报表」这类与申请类型绑定的入口才需要，
	 * 其余（如待我审批）保持基础路径即可。
	 */
	hrefFor?: (type: ApplicationType) => string;
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
	/**
	 * 分组标题随申请类型变化时的动态来源（如「差旅申请」→「请假申请」）。
	 * 省略则用 `title`。测试仍校验静态 `title`，故此处只作增强、不替换。
	 */
	titleFor?: (type: ApplicationType) => string;
	items: readonly NavItem[];
}

const REQUESTS = resolve('/travel/requests');

export const NAV_SECTIONS: readonly NavSection[] = [
	{
		title: '差旅申请',
		// 分组标题随当前申请类型显示对应业务名（差旅申请 / 请假申请）
		titleFor: (type) => APPLICATION_TYPES[type].label,
		items: [
			{
				href: REQUESTS,
				// 进入「我的申请」默认按当前类型筛选（列表页读取 ?type=）
				hrefFor: (type) => `${REQUESTS}?type=${type}`,
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
				// 审批台是角色维度的待办（跨类型），无需携带 ?type=
				visibleTo: ['manager', 'finance']
			},
			{
				href: resolve('/apply/[type]/[step]', { type: 'travel', step: firstStep('travel') }),
				// 「发起申请」跳当前类型的向导首步（travel/leave 首步 slug 不同）
				hrefFor: (type) => resolve('/apply/[type]/[step]', { type, step: firstStep(type) }),
				label: '发起申请',
				description: '填写新的申请',
				icon: 'plus'
			}
		]
	},
	{
		title: '统计',
		items: [
			{
				href: resolve('/reports'),
				// 统计报表也按类型聚合，导航进入时带上当前类型
				hrefFor: (type) => `${resolve('/reports')}?type=${type}`,
				label: '统计报表',
				description: '团队申请统计与审批效率',
				icon: 'chart',
				// 统计报表是面向领导（主管）的管理视图，员工与财务无需也无法查看
				visibleTo: ['manager']
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

/** 新建向导首步路径（travel/leave 首步 slug 一致，落到一个具体路由用于精确匹配） */
const APPLY_BASIC = resolve('/apply/[type]/[step]', { type: 'travel', step: firstStep('travel') });

/**
 * 判断导航项是否处于选中态。
 *
 * 用前缀匹配而非全等，详情页 `/travel/requests/TR-0001`
 * `search` 参数中的 `?from=approvals`用于标记「申请详情从哪个入口点击进入」
 * 此时URL虽在 `/travel/requests` 下
 * 但语义归属「待我审批」——点亮该项、熄掉「我的申请」，两侧互斥，避免同时高亮两个入口。
 */
export function isActive(itemHref: string, pathname: string, search = ''): boolean {
	// 编辑态：向导内带 ?edit=ID，语义归属「我的申请」——
	// 点亮该项、熄掉「发起申请」，与详情页 ?from=approvals 的处理思路一致。
	if (search.includes('edit=')) {
		if (itemHref === resolve('/travel/requests')) return true;
		// 兼容旧路由 /travel/apply 与新路由 /apply/[type]/[step]
		if (itemHref === resolve('/travel/apply') || itemHref === APPLY_BASIC) return false;
	}

	if (search.includes('from=approvals')) {
		const underRequests = pathname.startsWith(`${resolve('/travel/requests')}/`);
		if (itemHref === resolve('/travel/approvals')) return underRequests;
		if (itemHref === resolve('/travel/requests')) return !underRequests;
	}

	if (search.includes('from=reports')) {
		const underRequests = pathname.startsWith(`${resolve('/travel/requests')}/`);
		if (itemHref === resolve('/reports')) return underRequests;
		if (itemHref === resolve('/travel/requests')) return !underRequests;
	}

	// 新建/编辑向导（/apply/<type>/<step> 任意类型）点亮「发起申请」
	if (itemHref === APPLY_BASIC && pathname.startsWith('/apply/')) return true;

	return pathname === itemHref || pathname.startsWith(`${itemHref}/`);
}
