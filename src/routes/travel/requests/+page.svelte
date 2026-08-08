<script lang="ts">
	import PageHeader from '$lib/components/layout/PageHeader.svelte';
	import RequestFilterBar from './components/RequestFilterBar.svelte';
	import RequestList from './components/RequestList.svelte';
	import { resolve } from '$app/paths';
	import { useIdentity } from '$lib/state/identity.svelte';
	import {
		distinctYears,
		filterByDate,
		filterByStatus,
		getRequestsByApplicant,
		requestsStore,
		searchRequests,
		type StatusFilter
	} from '$lib/data/requests';

	const identity = useIdentity();

	/** 筛选 tab：「审批中」是 pending_manager + pending_finance 两个状态的合集 */
	const FILTERS: ReadonlyArray<{ value: StatusFilter; label: string }> = [
		{ value: 'all', label: '全部' },
		{ value: 'draft', label: '草稿' },
		{ value: 'pending', label: '审批中' },
		{ value: 'approved', label: '已通过' },
		{ value: 'rejected', label: '已驳回' },
		{ value: 'cancelled', label: '已撤销' }
	];

	const MONTHS = Array.from({ length: 12 }, (_, i) => i + 1);

	let activeFilter = $state<StatusFilter>('all');
	let keyword = $state('');
	let year = $state<number | 'all'>('all');
	let month = $state<number | 'all'>('all');

	// 切角色即切登录人，依赖 identity.user（读取响应式的 role）会自动重算；
	// 传入 $requestsStore（响应式）让列表随远端加载 / 缓存回退自动刷新
	const mine = $derived(getRequestsByApplicant(identity.user.id, $requestsStore));
	const years = $derived(distinctYears(mine));
	// 三个维度正交：状态 → 年/月 → 关键字，叠加生效
	const visible = $derived(
		searchRequests(filterByDate(filterByStatus(mine, activeFilter), year, month), keyword)
	);

	// 状态 tab：数量徽标只看状态分布，不受搜索词影响（FilterTabs 直接吃 count）
	const filterOptions = $derived(
		FILTERS.map((f) => ({ ...f, count: filterByStatus(mine, f.value).length }))
	);
	const yearOptions = $derived<ReadonlyArray<{ value: number | 'all'; label: string }>>([
		{ value: 'all', label: '全部' },
		...years.map((y) => ({ value: y, label: String(y) }))
	]);
	const monthOptions = $derived<ReadonlyArray<{ value: number | 'all'; label: string }>>([
		{ value: 'all', label: '全部' },
		...MONTHS.map((m) => ({ value: m, label: String(m) }))
	]);

	// 清除筛选按钮显隐：只关心年/月/搜索框，不含状态栏
	const hasClearableFilter = $derived(keyword.trim() !== '' || year !== 'all' || month !== 'all');

	// 清除筛选只重置年/月/搜索框，保留当前状态栏筛选
	function resetFilters(): void {
		keyword = '';
		year = 'all';
		month = 'all';
	}
</script>

<PageHeader title="我的申请" description="{identity.user.name} 发起的全部差旅申请">
	{#snippet actions()}
		<a href={resolve('/travel/apply')} class="btn btn--primary">发起申请</a>
	{/snippet}
</PageHeader>

<RequestFilterBar
	bind:status={activeFilter}
	bind:keyword
	bind:year
	bind:month
	statusOptions={filterOptions}
	{yearOptions}
	{monthOptions}
	showClear={hasClearableFilter && visible.length > 0}
	onclear={resetFilters}
/>

<RequestList
	requests={visible}
	{keyword}
	hasNoRequests={mine.length === 0}
	{hasClearableFilter}
	onclear={resetFilters}
/>
