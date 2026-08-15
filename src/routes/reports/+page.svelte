<script lang="ts">
	import { goto } from '$app/navigation';
	import { onMount } from 'svelte';
	import { page } from '$app/state';
	import { resolve } from '$app/paths';
	import PageHeader from '$lib/components/layout/PageHeader.svelte';
	import { useIdentity } from '$lib/state/identity.svelte';
	import { requestsStore, filterByType } from '$lib/data/requests';
	import {
		APPLICATION_TYPE_VALUES,
		APPLICATION_TYPE_LABELS,
		type ApplicationType
	} from '$lib/domain/types';
	import ManagerDashboard from './components/ManagerDashboard.svelte';

	const identity = useIdentity();
	// 报表数据随请求数据集变化（含启动时的 Mock 加载）自动刷新
	const all = $derived($requestsStore);
	// 主管只查看本部门员工（不含自己、排除草稿）的申请数据
	const deptRequests = $derived.by(() =>
		all.filter(
			(r) =>
				r.department === identity.user.department &&
				r.applicantId !== identity.user.id &&
				r.status !== 'draft'
		)
	);

	// 类型以 URL 的 ?type= 为单一数据源：导航「统计报表」带类型进入即默认该类型，
	// 在报表页切换类型只改写 ?type=（replaceState）并停留本页，由下方派生重算统计
	const selectedType = $derived<ApplicationType | 'all'>(
		(page.url.searchParams.get('type') as ApplicationType) ?? 'all'
	);
	const visibleRequests = $derived(
		selectedType === 'all' ? deptRequests : filterByType(deptRequests, selectedType)
	);
	const typeLabel = $derived(
		selectedType === 'all' ? '团队申请' : APPLICATION_TYPE_LABELS[selectedType]
	);
	const description = $derived(`${typeLabel}统计与审批效率`);

	// 切换类型：停留报表页，仅更新 ?type= 查询参数（不新增历史记录）
	function changeReportType(event: Event): void {
		const type = (event.currentTarget as HTMLSelectElement).value;
		const target = type === 'all' ? resolve('/reports') : `${resolve('/reports')}?type=${type}`;
		// 需附带 query 参数，resolve 写在模板字符串内，故逐行豁免该规则
		// eslint-disable-next-line svelte/no-navigation-without-resolve
		goto(target, { replaceState: true });
	}

	// URL 直达时自动纠正非主管身份，无需手动点切换按钮
	onMount(() => {
		if (!identity.isManager) identity.switchTo('manager');
	});
</script>

{#if identity.isManager}
	<PageHeader title="统计报表" {description}>
		{#snippet actions()}
			<select
				class="reports__type-select"
				value={selectedType}
				onchange={changeReportType}
				aria-label="按申请类型查看报表"
			>
				<option value="all">全部类型</option>
				{#each APPLICATION_TYPE_VALUES as t (t)}
					<option value={t}>{APPLICATION_TYPE_LABELS[t]}</option>
				{/each}
			</select>
		{/snippet}
	</PageHeader>

	<ManagerDashboard requests={visibleRequests} type={selectedType} />
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
	.reports__type-select {
		height: 2.25rem;
		padding: 0 0.5rem;
		border: 1px solid var(--color-slate-300);
		border-radius: var(--radius-md);
		background: var(--color-white);
		font-size: 0.875rem;
	}
	.notice-card__actions {
		display: flex;
		flex-wrap: wrap;
		justify-content: center;
		gap: 0.75rem;
	}
</style>
