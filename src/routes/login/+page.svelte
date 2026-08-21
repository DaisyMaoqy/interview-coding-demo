<script lang="ts">
	import { goto } from '$app/navigation';
	import type { Role } from '$lib/domain/types';
	import { HOME } from '$lib/core/routes';
	import { useIdentity } from '$lib/state/identity.svelte';
	import { useAuth } from '$lib/state/auth.svelte';
	import LoginCard from '$lib/components/common/LoginCard.svelte';

	const identity = useIdentity();
	const auth = useAuth();

	let userId = $state('');
	let username = $state('');
	let password = $state('');
	let tenantId = $state('tenant_001');
	// let error = $state('');
	// let loading = $state(false);

	interface LoginUser {
		id: string;
		name: string;
		role: string;
		department: string;
		managerId: string | null;
	}

	async function handleSubmit({ username, password, remember }: { username: string; password: string; remember: boolean }): Promise<void>{
		// error = '';
		// loading = true;
		
		try {
			// [占位] 真实登录逻辑请复用另一前端项目的企业 SSO 实现；
			// 下方为联调骨架：调用后端 POST /aws/v1/auth/login。
			const res = await fetch('/aws/v1/auth/login', {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({ username, password, tenantId, remember})
			});
			if (!res.ok) {
				// 后端约定：非 2xx 视为登录失败
				throw new Error('登录失败，请检查账号或租户');
			}
			
			const data: { token: string; user: LoginUser } = await res.json();

			// 保存 Qy_token，供后续请求携带
			auth.setToken(data.token);

			// [占位] 后续联调：用后端返回的 user 替换演示身份（含真实 id/name/department/managerId）；
			// 当前先按 role 切换演示身份，保持现有页面可用。
			identity.switchTo(data.user.role as Role);

			goto(HOME);
		} catch (err) {
			// error = err instanceof Error ? err.message : '登录失败';
		// } finally {
		// 	loading = false;
		}
	}
</script>

<svelte:head>
	<title>登录 · 审批工作流</title>
</svelte:head>
<LoginCard onLogin={handleSubmit} title="OA审批工作台" subtitle="欢迎登录企业协同办公系统" />
<!-- <main class="login">
	
	<form class="login__card" onsubmit={handleSubmit}>
		<h1 class="login__title">审批工作流 · 登录</h1>

		<label class="login__field">
			<span>用户ID</span>
			<input bind:value={userId} type="text" autocomplete="username" placeholder="userId" required />
		</label>

		<label class="login__field">
			<span>密码</span>
			<input bind:value={password} type="password" autocomplete="current-password" placeholder="password" required />
		</label>

		<label class="login__field">
			<span>租户ID</span>
			<input bind:value={tenantId} type="text" placeholder="tenant_001" />
		</label>

		{#if error}
			<p class="login__error" role="alert">{error}</p>
		{/if}

		<button type="submit" class="login__submit" disabled={loading}>
			{loading ? '登录中…' : '登录'}
		</button>
	</form>
</main> -->

