<script lang="ts" generics="T">
	import type { Snippet } from 'svelte';
	import { paginate } from '$lib/domain/paginate';

	interface Props {
		/** 待分页的完整集合（已筛选/排序，分页切片在此处理） */
		items: readonly T[];
		/** 可选的每页条数，默认 5 / 10 / 20 */
		pageSizeOptions?: ReadonlyArray<number>;
		/** 该值变化（如筛选条件、身份切换）时回到首页 */
		resetKey?: unknown;
		/** 接收当前页切片，由调用方决定如何渲染列表（卡片/行样式等） */
		children: Snippet<[{ pageItems: T[] }]>;
	}

	let { items, pageSizeOptions = [5, 10, 20], resetKey = undefined, children }: Props = $props();

	// 页码与每页条数由本组件统一持有，调用方不必再各自维护一份分页状态
	let page = $state(1);
	let pageSize = $state(5);
	const total = $derived(items.length);
	const pageItems = $derived(paginate(items, page, pageSize));
	const pageCount = $derived(Math.max(1, Math.ceil(total / pageSize)));

	// 筛选条件 / 身份切换后回到首页，避免停留在已无数据的页码
	$effect(() => {
		void resetKey;
		page = 1;
	});
	// 数据变少（通过/筛选收紧）致当前页越界时收拢到最后有效页
	$effect(() => {
		if (page > pageCount) page = pageCount;
		if (page < 1) page = 1;
	});

	// 页码窗口：当前页前后各 2 页，靠近边界时向另一侧补齐到 5 个
	const pages = $derived.by(() => {
		const span = 2;
		let from = Math.max(1, page - span);
		let to = Math.min(pageCount, page + span);
		if (to - from < 4) {
			if (from === 1) to = Math.min(pageCount, from + 4);
			else from = Math.max(1, to - 4);
		}
		const arr: number[] = [];
		for (let i = from; i <= to; i++) arr.push(i);
		return arr;
	});

	function go(p: number): void {
		page = Math.min(pageCount, Math.max(1, p));
	}
</script>

{@render children({ pageItems })}

{#if total > 0}
	<div class="pagination">
		<label class="pagination__size">
			每页
			<select bind:value={pageSize} aria-label="每页条数">
				{#each pageSizeOptions as opt (opt)}
					<option value={opt}>{opt}</option>
				{/each}
			</select>
			条
		</label>
		<span class="pagination__total">共 {total} 条</span>

		<div class="pagination__pager">
			<button
				type="button"
				class="pagination__btn"
				disabled={page <= 1}
				onclick={() => go(page - 1)}
			>
				上一页
			</button>
			{#each pages as n (n)}
				<button
					type="button"
					class="pagination__btn {n === page ? 'pagination__btn--active' : ''}"
					onclick={() => go(n)}
				>
					{n}
				</button>
			{/each}
			<button
				type="button"
				class="pagination__btn"
				disabled={page >= pageCount}
				onclick={() => go(page + 1)}
			>
				下一页
			</button>
		</div>
	</div>
{/if}

<style>
	.pagination {
		display: flex;
		align-items: center;
		gap: 1rem;
		flex-wrap: wrap;
		margin-top: 1rem;
	}
	.pagination__size {
		display: inline-flex;
		align-items: center;
		gap: 0.375rem;
		font-size: 0.875rem;
		color: var(--color-slate-600);
	}
	.pagination__size select {
		padding: 0.25rem 0.5rem;
		border: 1px solid var(--color-slate-300);
		border-radius: var(--radius-lg, 0.5rem);
		background: var(--color-white);
		color: var(--color-slate-900);
		font: inherit;
		cursor: pointer;
	}
	.pagination__total {
		font-size: 0.875rem;
		color: var(--color-slate-500);
	}
	.pagination__pager {
		display: inline-flex;
		align-items: center;
		gap: 0.375rem;
		margin-left: auto;
	}
	.pagination__btn {
		min-width: 2rem;
		height: 2rem;
		padding: 0 0.5rem;
		border: 1px solid var(--color-slate-300);
		border-radius: var(--radius-lg, 0.5rem);
		background: var(--color-white);
		color: var(--color-slate-700);
		font-size: 0.875rem;
		cursor: pointer;
	}
	.pagination__btn:hover:not(:disabled) {
		border-color: var(--color-brand-600);
		color: var(--color-brand-600);
	}
	.pagination__btn--active {
		background: var(--color-brand-600);
		border-color: var(--color-brand-600);
		color: var(--color-white);
	}
	.pagination__btn:disabled {
		opacity: 0.5;
		cursor: not-allowed;
	}
</style>
