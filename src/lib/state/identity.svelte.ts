import { getContext, setContext } from 'svelte';
import { IDENTITY_BY_ROLE, requireUser } from '$lib/domain/org';
import type { Role, User } from '$lib/domain/types';

/**
 * 当前登录身份。
 *
 * 演示中「切角色」即「切登录人」：employee → 张三，manager → 李经理。
 * 这样「审批人不能审批自己的单」这条硬规则无需任何后门就能完整演示。
 *
 * 用 context 持有而非模块级 `$state`：模块级状态在 SSR 下由所有请求共享，
 * 会造成用户之间串号。context 的生命周期跟随组件树，每个请求各自独立。
 */

const IDENTITY_KEY = Symbol('identity');

export class IdentityState {
	role = $state<Role>('employee');

	/** 当前角色对应的登录人 */
	get user(): User {
		return requireUser(IDENTITY_BY_ROLE[this.role]);
	}

	get isManager(): boolean {
		return this.role === 'manager';
	}

	/** 当前身份是否为财务审批人（二级审批） */
	get isFinance(): boolean {
		return this.role === 'finance';
	}

	switchTo(role: Role): void {
		this.role = role;
	}
}

/** 在根 layout 调用一次，向整棵组件树提供身份 */
export function provideIdentity(): IdentityState {
	return setContext(IDENTITY_KEY, new IdentityState());
}

/** 在任意后代组件中取当前身份 */
export function useIdentity(): IdentityState {
	const state = getContext<IdentityState | undefined>(IDENTITY_KEY);
	if (!state) throw new Error('useIdentity 必须在 provideIdentity 的后代组件中调用');
	return state;
}
