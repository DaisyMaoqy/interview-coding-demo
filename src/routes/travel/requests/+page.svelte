<script lang="ts">
	import PageHeader from '$lib/components/layout/PageHeader.svelte';
	import StatusBadge from '$lib/components/request/StatusBadge.svelte';
	import { resolve } from '$app/paths';
	import { useIdentity } from '$lib/state/identity.svelte';
	import {
		distinctYears,
		filterByDate,
		filterByStatus,
		getRequestsByApplicant,
		requestTotal,
		searchRequests,
		summarizeLegs,
		type StatusFilter
	} from '$lib/data/requests';
	import { formatYuan } from '$lib/domain/money';

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

	// 切角色即切登录人，依赖 identity.user（读取响应式的 role）会自动重算
	const mine = $derived(getRequestsByApplicant(identity.user.id));
	const years = $derived(distinctYears(mine));
	// 三个维度正交：状态 → 年/月 → 关键字，叠加生效
	const visible = $derived(
		searchRequests(filterByDate(filterByStatus(mine, activeFilter), year, month), keyword)
	);

	/** 状态tab数量徽标（只看状态分布，不受搜索筛选控制） */
	function countOf(value: StatusFilter): number {
		return filterByStatus(mine, value).length;
	}

	/** ISO → YYYY-MM-DD，仅用于列表展示 */
	function toDate(iso: string): string {
		return iso.slice(0, 10);
	}

	// 清除筛选按钮显隐
	const hasClearableFilter = $derived(keyword.trim() !== '' || year !== 'all' || month !== 'all');

	// 清除筛选只重置年/月/搜索框，保留当前状态栏筛选
	function resetFilters(): void {
		keyword = '';
		year = 'all';
		month = 'all';
	}

	/**
	 * 搜索词主题色高亮
	 * 把文本里命中搜索词的部分切开，供模板用主题色标注。
	 * 用片段数组而非 innerHTML，避免把用户输入当 HTML 注入。
	 */
	function highlightParts(text: string, kw: string): ReadonlyArray<{ text: string; hit: boolean }> {
		const word = kw.trim();
		if (word === '') return [{ text, hit: false }];

		const lower = text.toLowerCase();
		const target = word.toLowerCase();
		const parts: Array<{ text: string; hit: boolean }> = [];
		let cursor = 0;
		let idx = lower.indexOf(target);

		while (idx !== -1) {
			if (idx > cursor) parts.push({ text: text.slice(cursor, idx), hit: false });
			parts.push({ text: text.slice(idx, idx + target.length), hit: true });
			cursor = idx + target.length;
			idx = lower.indexOf(target, cursor);
		}
		if (cursor < text.length) parts.push({ text: text.slice(cursor), hit: false });
		return parts;
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
	<div
		class="flex flex-wrap gap-1 rounded-lg bg-slate-100 p-1"
		role="group"
		aria-label="按状态筛选"
	>
		{#each FILTERS as filter (filter.value)}
			{@const selected = activeFilter === filter.value}
			<button
				type="button"
				aria-pressed={selected}
				onclick={() => (activeFilter = filter.value)}
				class="rounded-md px-3 py-1.5 text-sm transition-colors
				       {selected
					? 'bg-white font-medium text-slate-900 shadow-sm'
					: 'text-slate-500 hover:text-slate-800'}"
			>
				{filter.label}
				<span class="ml-1 text-xs text-slate-400">{countOf(filter.value)}</span>
			</button>
		{/each}
	</div>

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
		<div
			class="flex h-9 items-center gap-1.5 rounded-lg border-0 bg-slate-100 px-2.5 focus-within:outline-2 focus-within:outline-offset-2 focus-within:outline-brand-500"
		>
			<select
				bind:value={year}
				aria-label="按年份筛选"
				class="h-full w-auto border-0 bg-transparent text-sm text-slate-800 outline-none focus-visible:text-brand-600"
			>
				<option value="all">全部</option>
				{#each years as y (y)}
					<option value={y}>{y}</option>
				{/each}
			</select>
			<span class="text-xs text-slate-400">年</span>
		</div>

		<div
			class="flex h-9 items-center gap-1.5 rounded-lg border-0 bg-slate-100 px-2.5 focus-within:outline-2 focus-within:outline-offset-2 focus-within:outline-brand-500"
		>
			<select
				bind:value={month}
				aria-label="按月份筛选"
				class="h-full w-auto border-0 bg-transparent text-sm text-slate-800 outline-none focus-visible:text-brand-600"
			>
				<option value="all">全部</option>
				{#each MONTHS as m (m)}
					<option value={m}>{m}</option>
				{/each}
			</select>
			<span class="text-xs text-slate-400">月</span>
		</div>

		<!-- 搜索框：内嵌放大镜图标，与下拉等高 -->
		<div class="relative">
			<svg
				class="pointer-events-none absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2 text-slate-400"
				viewBox="0 0 20 20"
				fill="none"
				stroke="currentColor"
				stroke-width="2"
				aria-hidden="true"
			>
				<circle cx="9" cy="9" r="6" />
				<path d="m17 17-3.5-3.5" stroke-linecap="round" />
			</svg>
			<input
				type="search"
				bind:value={keyword}
				placeholder="搜索事由或目的地"
				aria-label="搜索事由或目的地"
				class="h-9 w-full rounded-lg border border-slate-200 bg-white pr-3 pl-9 text-sm
				       text-slate-800 placeholder:text-slate-400 focus-visible:border-brand-500
				       focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-500 sm:w-64"
			/>
		</div>

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

<!-- 把搜索词命中处用主题色标注高亮 -->
{#snippet highlight(text: string)}
	{#each highlightParts(text, keyword) as part, i (i)}
		{#if part.hit}
			<span class="rounded bg-brand-100 px-0.5 font-medium text-brand-700">{part.text}</span>
		{:else}
			{part.text}
		{/if}
	{/each}
{/snippet}

{#if visible.length === 0}
	<!-- 空状态：区分「真的没申请单」与「被筛选/搜索过滤没了」 -->
	<div class="rounded-card border border-dashed border-slate-300 bg-white p-10 text-center">
		{#if mine.length === 0}
			<p class="text-sm text-slate-500">你还没有发起任何差旅申请</p>
			<a
				href={resolve('/travel/apply')}
				class="mt-3 inline-block rounded-lg bg-brand-600 px-3.5 py-2 text-sm font-medium text-white hover:bg-brand-700"
			>
				发起第一张申请
			</a>
		{:else}
			<p class="text-sm text-slate-500">没有符合当前筛选或搜索条件的申请</p>
			<button
				type="button"
				onclick={resetFilters}
				class="mt-3 inline-block rounded-lg border border-slate-200 px-3.5 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50"
			>
				清除筛选
			</button>
		{/if}
	</div>
{:else}
	<ul class="space-y-3">
		{#each visible as request (request.id)}
			<li>
				<a
					href={resolve('/travel/requests/[id]', { id: request.id })}
					class="block rounded-card border border-slate-200 bg-white p-4 transition-shadow hover:shadow-card"
				>
					<div class="flex items-start justify-between gap-4">
						<div class="min-w-0">
							<p class="truncate font-medium text-slate-900">
								{@render highlight(request.reason)}
							</p>
							<p class="mt-1 text-xs text-slate-500">
								{request.id} · {@render highlight(summarizeLegs(request))} ·
								{toDate(request.createdAt)}
							</p>
						</div>
						<StatusBadge status={request.status} />
					</div>

					<div class="mt-3 flex items-center justify-between border-t border-slate-100 pt-3">
						<span class="text-xs text-slate-400">预算合计</span>
						<span class="text-sm font-semibold text-slate-900">
							¥{formatYuan(requestTotal(request))}
						</span>
					</div>
				</a>
			</li>
		{/each}
	</ul>
{/if}
