<script lang="ts">
	import { resolve } from '$app/paths';
	import EmptyState from '$lib/components/common/EmptyState.svelte';
	import Pagination from '$lib/components/form/Pagination.svelte';
	import RequestCard from './RequestCard.svelte';
	import type { Request } from '$lib/domain/types';

	interface Props {
		/** 已筛选过的待渲染列表（完整集合，分页切片在此处理） */
		requests: readonly Request[];
		/** 搜索词，透传给卡片做命中高亮 */
		keyword?: string;
		/** 该用户名下一张单都没有 —— 决定空状态给「去发起」还是「清筛选」 */
		hasNoRequests: boolean;
		/** 当前存在可清除的年/月/关键字条件 */
		hasClearableFilter: boolean;
		/** 筛选条件变化时回到首页（传入如「状态|关键词|年|月」拼接串） */
		resetKey?: unknown;
		onclear?: () => void;
	}

	let {
		requests,
		keyword = '',
		hasNoRequests,
		hasClearableFilter,
		resetKey,
		onclear
	}: Props = $props();

	// 空状态文案：区分「真的没申请单」与「被筛选/搜索过滤没了」，
	const emptyTitle = $derived(
		hasNoRequests
			? '你还没有发起任何差旅申请'
			: hasClearableFilter
				? '没有符合当前筛选或搜索条件的申请'
				: '没有符合当前状态的申请'
	);
</script>

{#if requests.length === 0}
	<EmptyState title={emptyTitle}>
		{#snippet action()}
			{#if hasNoRequests}
				<a href={resolve('/apply/travel/basic')} class="btn btn--primary">发起第一张申请</a>
			{:else if hasClearableFilter}
				<!-- 仅状态栏导致为空时不给「清除筛选」：该按钮清不掉状态栏，点了没反应更让人困惑 -->
				<button type="button" onclick={onclear} class="btn btn--ghost">清除筛选</button>
			{/if}
		{/snippet}
	</EmptyState>
{:else}
	<Pagination
		items={requests}
		pageSizeOptions={[5, 10, 20]}
		{resetKey}
		children={requestListSnippet}
	/>
	{#snippet requestListSnippet({ pageItems }: { pageItems: Request[] })}
		<ul class="request-list">
			{#each pageItems as request (request.id)}
				<li><RequestCard {request} {keyword} /></li>
			{/each}
		</ul>
	{/snippet}
{/if}

<style>
	.request-list {
		display: flex;
		flex-direction: column;
		gap: 0.75rem;
	}
</style>
