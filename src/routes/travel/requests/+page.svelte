<script lang="ts">
	import PageHeader from '$lib/components/layout/PageHeader.svelte';
	import FilterTabs from '$lib/components/common/FilterTabs.svelte';
	import SearchInput from '$lib/components/common/SearchInput.svelte';
	import UnitSelect from '$lib/components/common/UnitSelect.svelte';
	import EmptyState from '$lib/components/common/EmptyState.svelte';
	import RequestCard from '$lib/components/request/RequestCard.svelte';
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
	/** 搜索行（年/月/关键字）默认收起，点过滤器图标展开/收起 */
	let showFilters = $state(false);

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
		<a
			href={resolve('/travel/apply')}
			class="rounded-lg bg-brand-600 px-3.5 py-2 text-sm font-medium text-white
			       transition-colors hover:bg-brand-700"
		>
			发起申请
		</a>
	{/snippet}
</PageHeader>

<!-- 第一行：状态筛选（左）+ 过滤器开关（右） -->
<div class="mb-3 flex flex-wrap items-center gap-3">
	<FilterTabs options={filterOptions} bind:value={activeFilter} ariaLabel="按状态筛选" />

	<!-- 过滤器开关：点它展开/收起下方搜索行 -->
	<button
		type="button"
		onclick={() => (showFilters = !showFilters)}
		aria-pressed={showFilters}
		aria-label="显示或隐藏筛选"
		title="筛选"
		class="ml-auto inline-flex h-9 w-9 items-center justify-center rounded-lg border border-slate-200 text-slate-500 transition-colors hover:bg-slate-50 hover:text-slate-800 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-500
		       {showFilters ? 'border-brand-500 bg-brand-50 text-brand-600' : ''}"
	>
		<svg
			class="h-4 w-4"
			viewBox="0 0 24 24"
			fill="none"
			stroke="currentColor"
			stroke-width="2"
			stroke-linecap="round"
			stroke-linejoin="round"
			aria-hidden="true"
		>
			<path d="M3 4h18l-7 8v6l-4 2v-8z" />
		</svg>
	</button>
</div>

<!-- 搜索行：默认收起，点过滤器图标展开 -->
{#if showFilters}
	<div class="mb-3 flex flex-wrap items-center justify-end gap-2">
		<UnitSelect bind:value={year} options={yearOptions} unit="年" ariaLabel="按年份筛选" />
		<UnitSelect bind:value={month} options={monthOptions} unit="月" ariaLabel="按月份筛选" />
		<SearchInput bind:value={keyword} placeholder="搜索事由或目的地" ariaLabel="搜索事由或目的地" />

		<!-- 清除筛选：跟随搜索行，置于筛选控件簇内，不另起一行影响状态栏 -->
		{#if hasClearableFilter && visible.length > 0}
			<button
				type="button"
				onclick={resetFilters}
				class="text-sm text-brand-600 hover:text-brand-700 hover:underline"
			>
				清除筛选
			</button>
		{/if}
	</div>
{/if}

{#if visible.length === 0}
	<!-- 空状态：区分「真的没申请单」与「被筛选/搜索过滤没了」 -->
	<EmptyState
		title={
			mine.length === 0
				? '你还没有发起任何差旅申请'
				: hasClearableFilter
					? '没有符合当前筛选或搜索条件的申请'
					: '没有符合当前状态的申请'
		}
	>
		{#snippet action()}
			{#if mine.length === 0}
				<a
					href={resolve('/travel/apply')}
					class="inline-block rounded-lg bg-brand-600 px-3.5 py-2 text-sm font-medium text-white hover:bg-brand-700"
				>
					发起第一张申请
				</a>
			{:else if hasClearableFilter}
				<!-- 仅状态栏导致为空时不显示「清除筛选」：该按钮只清搜索条件，对状态栏无效 -->
				<button
					type="button"
					onclick={resetFilters}
					class="inline-block rounded-lg border border-slate-200 px-3.5 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50"
				>
					清除筛选
				</button>
			{/if}
		{/snippet}
	</EmptyState>
{:else}
	<ul class="space-y-3">
		{#each visible as request (request.id)}
			<li><RequestCard {request} {keyword} /></li>
		{/each}
	</ul>
{/if}
