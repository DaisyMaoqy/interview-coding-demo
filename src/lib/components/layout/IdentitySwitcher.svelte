<script lang="ts">
	import { requireUser, IDENTITY_BY_ROLE } from '$lib/domain/org';
	import type { Role } from '$lib/domain/types';
	import { useIdentity } from '$lib/state/identity.svelte';

	const identity = useIdentity();

	const OPTIONS: ReadonlyArray<{ role: Role; hint: string }> = [
		{ role: 'employee', hint: '发起申请' },
		{ role: 'manager', hint: '审批他人' }
	];
</script>

<!--
	切角色即切登录人。做成分段控件而非下拉，是因为只有两个选项，
	平铺让「当前是谁、能切成谁」一眼可见，也少一次点击。
-->
<div class="flex items-center gap-3">
	<div class="hidden text-right sm:block">
		<div class="text-sm font-medium text-slate-800">{identity.user.name}</div>
		<div class="text-xs text-slate-500">
			工号 {identity.user.employeeId} · {identity.user.department} · {identity.user.title}
		</div>
	</div>
	<!-- 方便演示切换申请人和审批人 -->
	<div class="flex gap-0.5 rounded-lg bg-slate-100 p-0.5" role="group" aria-label="切换演示身份">
		{#each OPTIONS as option (option.role)}
			{@const user = requireUser(IDENTITY_BY_ROLE[option.role])}
			{@const selected = identity.role === option.role}
			<button
				type="button"
				aria-pressed={selected}
				title="以 {user.name}（{user.title}）的身份{option.hint}"
				onclick={() => identity.switchTo(option.role)}
				class="rounded-md px-3 py-1.5 text-sm transition-colors
				       focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-500
				       {selected
					? 'bg-white font-medium text-slate-900 shadow-sm'
					: 'text-slate-500 hover:text-slate-800'}"
			>
				{user.name}
			</button>
		{/each}
	</div>
</div>
