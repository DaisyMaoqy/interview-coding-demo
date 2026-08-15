import { getContext, setContext } from 'svelte';
import { APPLICATION_TYPE_VALUES, type ApplicationType } from '$lib/domain/types';

/**
 * 当前申请类型（差旅 / 请假 ……），演示用的全局偏好。
 *
 * 与登录身份（identity）同理持久化到 localStorage：刷新后保持上次选中的类型不变，
 * 且**只有**侧栏的「切换申请类型」下拉会改它——普通导航（点菜单、列表、详情）绝不改动，
 * 避免「点一下导航就把类型切走了」。
 *
 * 用 context 持有而非模块级 `$state`：规避 SSR 下跨请求共享状态造成的串台
 * （与 identity.svelte.ts 保持一致）。
 */

const STORAGE_KEY = 'approval-app-type';

function loadType(): ApplicationType {
	if (typeof localStorage === 'undefined') return 'travel';
	const saved = localStorage.getItem(STORAGE_KEY);
	return saved && APPLICATION_TYPE_VALUES.includes(saved as ApplicationType)
		? (saved as ApplicationType)
		: 'travel';
}

function saveType(type: ApplicationType): void {
	if (typeof localStorage === 'undefined') return;
	localStorage.setItem(STORAGE_KEY, type);
}

const KEY = Symbol('applicationType');

export class ApplicationTypeState {
	type = $state<ApplicationType>(loadType());

	get value(): ApplicationType {
		return this.type;
	}

	/** 主动切换申请类型：仅侧栏下拉调用；写入即持久化到浏览器缓存 */
	switchTo(type: ApplicationType): void {
		this.type = type;
		saveType(type);
	}
}

/** 在根 layout 调用一次，向整棵组件树提供当前申请类型 */
export function provideApplicationType(): ApplicationTypeState {
	return setContext(KEY, new ApplicationTypeState());
}

/** 在任意后代组件中取当前申请类型（含切换能力） */
export function useApplicationType(): ApplicationTypeState {
	const state = getContext<ApplicationTypeState | undefined>(KEY);
	if (!state) throw new Error('useApplicationType 必须在 provideApplicationType 的后代组件中调用');
	return state;
}
