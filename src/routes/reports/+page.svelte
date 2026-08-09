<script lang="ts">
	import PageHeader from '$lib/components/layout/PageHeader.svelte';
	import { useIdentity } from '$lib/state/identity.svelte';
	import { requestsStore } from '$lib/data/requests';
	import ManagerDashboard from './components/ManagerDashboard.svelte';

	const identity = useIdentity();
	// 报表数据随请求数据集变化（含启动时的 Mock 加载）自动刷新
	const all = $derived($requestsStore);
</script>

{#if identity.isManager}
	<PageHeader title="统计报表" description="团队差旅成本与审批效率" />

	<ManagerDashboard requests={all} />
{:else}
	<!-- 统计报表是领导（主管）专属视图，其余身份无权查看 -->
	<div class="notice-card">
		<p class="notice-card__text">
			当前身份是 <span class="font-medium text-slate-900">{identity.user.name}</span
			>，统计报表仅对领导（主管）开放。可切换到主管身份查看团队数据。
		</p>
		<div class="notice-card__actions">
			<button
				type="button"
				onclick={() => identity.switchTo('manager')}
				class="notice-card__action btn btn--primary"
			>
				切换到主管身份
			</button>
		</div>
	</div>
{/if}

<style>
	.notice-card__actions {
		display: flex;
		flex-wrap: wrap;
		gap: 0.75rem;
	}
</style>
