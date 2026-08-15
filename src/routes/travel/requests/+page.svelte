<script lang="ts">
	import { get } from 'svelte/store';
	import { untrack } from 'svelte';
	import PageHeader from '$lib/components/layout/PageHeader.svelte';
	import RequestFilterBar from './components/RequestFilterBar.svelte';
	import RequestList from './components/RequestList.svelte';
	import { page } from '$app/state';
	import { resolve } from '$app/paths';
	import { useIdentity } from '$lib/state/identity.svelte';
	import { requestListFilters } from '$lib/state/requestListFilters';
	import {
		distinctYears,
		filterByDate,
		filterByStatus,
		filterByType,
		getRequestsByApplicant,
		requestsStore,
		searchRequests,
		sortBySubmittedAtDesc,
		type StatusFilter
	} from '$lib/data/requests';
	import { type ApplicationType } from '$lib/domain/types';
	import { firstStep } from '$lib/domain/wizard';

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

	// 以共享 store 的当前值初始化，离开本页（去重新编辑申请）后再回来可恢复上次筛选
	const savedFilters = get(requestListFilters);
	let activeFilter = $state<StatusFilter>(savedFilters.status);
	let keyword = $state(savedFilters.keyword);
	let year = $state<number | 'all'>(savedFilters.year);
	let month = $state<number | 'all'>(savedFilters.month);
	// 类型筛选优先取 URL 的 ?type=：侧栏切换申请类型时默认按该类型查询
	let typeFilter = $state<ApplicationType | 'all'>(
		(page.url.searchParams.get('type') as ApplicationType) ?? 'all'
	);

	// 同一路由内仅 query 变化（如已在列表页切换类型）时组件不重挂载，
	// 这里把 ?type= 同步进本地筛选态；用 untrack 避免写回时把自己变成依赖造成循环
	$effect(() => {
		const t = page.url.searchParams.get('type');
		if (!t) return;
		untrack(() => {
			if (t !== typeFilter) typeFilter = t as ApplicationType | 'all';
		});
	});

	// 任一筛选维度变化都同步回 store，供「返回我的申请」等跨页导航恢复
	$effect(() => {
		requestListFilters.set({ status: activeFilter, keyword, year, month });
	});

	// 切角色即切登录人，依赖 identity.user（读取响应式的 role）会自动重算；
	// 传入 $requestsStore（响应式）让列表随远端加载 / 缓存回退自动刷新
	const mine = $derived(
		sortBySubmittedAtDesc(getRequestsByApplicant(identity.user.id, $requestsStore))
	);
	const years = $derived(distinctYears(mine));
	// 维度正交：状态 → 类型 → 年/月 → 关键字，叠加生效
	const visible = $derived(
		(() => {
			const byStatus = filterByStatus(mine, activeFilter);
			const byDate = filterByDate(byStatus, year, month);
			const byType = typeFilter === 'all' ? byDate : filterByType(byDate, typeFilter);
			return searchRequests(byType, keyword);
		})()
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

	// 「发起申请」跟随当前类型：列表按某类型筛选时，新建也走该类型的向导
	const applyType = $derived(typeFilter === 'all' ? 'travel' : typeFilter);
	const applyHref = $derived(
		resolve('/apply/[type]/[step]', { type: applyType, step: firstStep(applyType) })
	);

	// 筛选条件拼接串：任一维度变化都令分页回到首页
	const filterKey = $derived(`${activeFilter}|${keyword}|${year}|${month}`);
</script>

<PageHeader title="我的申请" description="{identity.user.name} 发起的全部申请">
	{#snippet actions()}
		<a href={applyHref} class="btn btn--primary">发起申请</a>
	{/snippet}
</PageHeader>

<RequestFilterBar
	bind:status={activeFilter}
	bind:keyword
	bind:year
	bind:month
	bind:type={typeFilter}
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
	resetKey={filterKey}
	onclear={resetFilters}
/>
