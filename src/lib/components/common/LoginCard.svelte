<script lang="ts">
	// —— 登录卡片组件：可整体放进任意 SvelteKit 项目 ——
	interface Credentials {
		username: string;
		password: string;
		remember: boolean;
		onLogin?: () => void;
	}

	let {
		onLogin,
		title = 'OA 工作台',
		subtitle = '欢迎登录企业协同办公系统'
	}: {
		/** 真实登录逻辑；不传则走 1.2s 演示等待 */
		onLogin?: (creds: Credentials) => Promise<void> | void;
		title?: string;
		subtitle?: string;
	} = $props();
	// interface Props {
	// 	onLogin?: () => void;
	// 	title?: string;
	// 	subtitle?: string;
	// }

	// —— 表单状态（Svelte 5 runes）——
	let username = $state('');
	let password = $state('');
	let showPassword = $state(false);
	let remember = $state(true);
	let loading = $state(false);
	let error = $state('');

	const canSubmit = $derived(username.trim().length > 0 && password.length > 0);

	async function handleLogin(event: SubmitEvent) {
		event.preventDefault();
		error = '';
		
		if (!canSubmit) {
			error = '请输入账号和密码';
			return;
		}
		loading = true;
		try {
			if (onLogin) {
				await onLogin({ username, password, remember });
			} else {
				await new Promise((r) => setTimeout(r, 1200)); // 演示用
			}
		} catch (e) {
			error = e instanceof Error ? e.message : '登录失败，请重试';
		} finally {
			loading = false;
		}
	}
</script>

<div class="relative min-h-screen overflow-hidden bg-ink text-white">
	<!-- 背景霓虹光晕（紫 / 青） -->
	<div class="pointer-events-none absolute -top-32 -right-24 h-96 w-96 rounded-full bg-brand/40 blur-[120px]"></div>
	<div class="pointer-events-none absolute -bottom-40 -left-20 h-[30rem] w-[30rem] rounded-full bg-brand-2/30 blur-[130px]"></div>

	<div class="relative z-10 flex min-h-screen items-center justify-center px-4 py-10">
		<div class="w-full max-w-md">
			<!-- 登录卡片（玻璃拟态） -->
			<div class="rounded-2xl border border-white/10 bg-white/5 p-8 shadow-2xl backdrop-blur-xl">
				<!-- 品牌区 -->
				<div class="mb-8 flex flex-col items-center text-center">
					<div class="mb-4 flex h-14 w-14 items-center justify-center rounded-xl bg-gradient-to-br from-brand to-brand-2 text-xl font-bold tracking-wide">
						OA
					</div>
					<h1 class="text-xl font-semibold">{title}</h1>
					<p class="mt-1 text-sm text-white/50">{subtitle}</p>
				</div>

				<form onsubmit={handleLogin} class="space-y-5">
					{#if error}
						<div class="rounded-lg border border-red-500/30 bg-red-500/10 px-4 py-2 text-sm text-red-300">
							{error}
						</div>
					{/if}

					<!-- 账号 -->
					<div>
						<label for="username" class="mb-1.5 block text-sm text-white/70">账号</label>
						<div class="relative">
							<svg
								class="pointer-events-none absolute left-3 top-1/2 h-5 w-5 -translate-y-1/2 text-white/30"
								viewBox="0 0 24 24"
								fill="none"
								stroke="currentColor"
								stroke-width="1.8"
							>
								<path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" stroke-linecap="round" stroke-linejoin="round" />
								<circle cx="12" cy="7" r="4" />
							</svg>
							<input
								id="username"
								type="text"
								bind:value={username}
								placeholder="请输入账号 / 手机号"
								autocomplete="username"
								class="w-full rounded-lg border border-white/10 bg-white/5 py-2.5 pl-10 pr-4 text-white placeholder-white/30 outline-none transition focus:border-brand focus:ring-2 focus:ring-brand/40"
							/>
						</div>
					</div>

					<!-- 密码 -->
					<div>
						<label for="password" class="mb-1.5 block text-sm text-white/70">密码</label>
						<div class="relative">
							<svg
								class="pointer-events-none absolute left-3 top-1/2 h-5 w-5 -translate-y-1/2 text-white/30"
								viewBox="0 0 24 24"
								fill="none"
								stroke="currentColor"
								stroke-width="1.8"
							>
								<rect x="3" y="11" width="18" height="11" rx="2" />
								<path d="M7 11V7a5 5 0 0 1 10 0v4" stroke-linecap="round" />
							</svg>
							<input
								id="password"
								type={showPassword ? 'text' : 'password'}
								bind:value={password}
								placeholder="请输入密码"
								autocomplete="current-password"
								class="w-full rounded-lg border border-white/10 bg-white/5 py-2.5 pl-10 pr-10 text-white placeholder-white/30 outline-none transition focus:border-brand-2 focus:ring-2 focus:ring-brand-2/40"
							/>
							<button
								type="button"
								onclick={() => (showPassword = !showPassword)}
								aria-label={showPassword ? '隐藏密码' : '显示密码'}
								class="absolute right-3 top-1/2 -translate-y-1/2 text-white/40 transition hover:text-white/70"
							>
								{#if showPassword}
									<svg class="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8">
										<path d="M2 12s3.5-7 10-7 10 7 10 7a13 13 0 0 1-2 2.5M6.5 6.5A13 13 0 0 1 12 5c6.5 0 10 7 10 7a13 13 0 0 1-2 2.5" stroke-linecap="round" />
										<path d="M9.5 9.5a3.5 3.5 0 0 0 5 5" stroke-linecap="round" />
										<line x1="3" y1="3" x2="21" y2="21" stroke-linecap="round" />
									</svg>
								{:else}
									<svg class="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8">
										<path d="M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7-10-7-10-7Z" stroke-linecap="round" stroke-linejoin="round" />
										<circle cx="12" cy="12" r="3" />
									</svg>
								{/if}
							</button>
						</div>
					</div>

					<!-- 记住我 / 忘记密码 -->
					<div class="flex items-center justify-between text-sm">
						<label class="flex cursor-pointer items-center gap-2 text-white/70">
							<input type="checkbox" bind:checked={remember} class="h-4 w-4 rounded border-white/20 bg-white/5 accent-brand" />
							记住我
						</label>
						<!-- <a href="/forgot" sclass="text-brand-2 transition hover:underline">忘记密码？</a> -->
					</div>

					<!-- 登录按钮 -->
					<button
						type="submit"
						disabled={loading}
						class="flex w-full items-center justify-center gap-2 rounded-lg bg-gradient-to-r from-brand to-brand-2 py-2.5 font-medium text-white transition hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-60"
					>
						{#if loading}
							<span class="h-4 w-4 animate-spin rounded-full border-2 border-white/40 border-t-white"></span>
							登录中…
						{:else}
							登 录
						{/if}
					</button>
				</form>

				<p class="mt-6 text-center text-xs text-white/40">© 2026 公司名称. 保留所有权利.</p>
			</div>
		</div>
	</div>
</div>
