<script lang="ts">
	import PageHeader from '$lib/components/layout/PageHeader.svelte';
	import { useIdentity } from '$lib/state/identity.svelte';
	import { requestsStore, getRequestsByApplicant } from '$lib/data/requests';
	import ManagerDashboard from './components/ManagerDashboard.svelte';
	import EmployeeDashboard from './components/EmployeeDashboard.svelte';

	const identity = useIdentity();
	// 看板数据随请求数据集变化（含启动时的 Mock 加载）自动刷新
	const all = $derived($requestsStore);
	const mine = $derived(getRequestsByApplicant(identity.user.id, all));
</script>

<PageHeader
	title="数据看板"
	description={identity.isManager || identity.isFinance ? '团队差旅成本与审批效率' : '我的申请进度与花费'}
/>

{#if identity.isManager || identity.isFinance}
	<ManagerDashboard requests={all} />
{:else}
	<EmployeeDashboard requests={mine} />
{/if}
