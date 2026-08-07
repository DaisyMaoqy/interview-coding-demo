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
<div class="identity-switcher">
	<div class="identity-switcher__user">
		<div class="identity-switcher__name">{identity.user.name}</div>
		<div class="identity-switcher__meta">
			工号 {identity.user.employeeId} · {identity.user.department} · {identity.user.title}
		</div>
	</div>
	<!-- 方便演示切换申请人和审批人 -->
	<div class="identity-switcher__switch" role="group" aria-label="切换演示身份">
		{#each OPTIONS as option (option.role)}
			{@const user = requireUser(IDENTITY_BY_ROLE[option.role])}
			{@const selected = identity.role === option.role}
			<button
				type="button"
				aria-pressed={selected}
				title="以 {user.name}（{user.title}）的身份{option.hint}"
				onclick={() => identity.switchTo(option.role)}
				class="identity-switcher__option {selected ? 'identity-switcher__option--active' : ''}"
			>
				{user.name}
			</button>
		{/each}
	</div>
</div>
