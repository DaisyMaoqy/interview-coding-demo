import { getContext, setContext } from 'svelte';

/**
 * 登录态：持有后端签发的 `Qy_token`。
 *
 * 这是「请求头携带 token」的唯一来源：后续联调时，
 * `src/lib/data/requests.ts` 等数据层应读取 `auth.authHeader()` 拼到
 * `Authorization: Bearer <Qy_token>` 上（当前演示数据层尚未接入，留待联调）。
 *
 * token 持久化到 localStorage（key 与凭证变量名一致：`Qy_token`），
 * 刷新页面后保持登录态。
 *
 * [占位] 真实登录由 `POST /aws/v1/auth/login`（企业 SSO）完成，
 * 登录逻辑将复用另一前端项目，此处仅提供 token 的存取与鉴权头组装能力。
 */

const TOKEN_KEY = 'Qy_token';

function loadToken(): string | null {
	if (typeof localStorage === 'undefined') return null;
	return localStorage.getItem(TOKEN_KEY);
}

function saveToken(token: string | null): void {
	if (typeof localStorage === 'undefined') return;
	if (token) localStorage.setItem(TOKEN_KEY, token);
	else localStorage.removeItem(TOKEN_KEY);
}

const AUTH_KEY = Symbol('auth');

export class AuthState {
	token = $state<string | null>(loadToken());

	get isAuthenticated(): boolean {
		return !!this.token;
	}

	setToken(token: string | null): void {
		this.token = token;
		saveToken(token);
	}

	clear(): void {
		this.setToken(null);
	}

	/** 统一鉴权头：Authorization: Bearer <Qy_token>；未登录返回空对象 */
	authHeader(): Record<string, string> {
		return this.token ? { Authorization: `Bearer ${this.token}` } : {};
	}
}

/** 在根 layout 调用一次，向整棵组件树提供登录态 */
export function provideAuth(): AuthState {
	return setContext(AUTH_KEY, new AuthState());
}

/** 在任意后代组件中取当前登录态 */
export function useAuth(): AuthState {
	const state = getContext<AuthState | undefined>(AUTH_KEY);
	if (!state) throw new Error('useAuth 必须在 provideAuth 的后代组件中调用');
	return state;
}
