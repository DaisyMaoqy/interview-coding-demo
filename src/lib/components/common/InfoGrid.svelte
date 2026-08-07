<script lang="ts">
	import type { Snippet } from 'svelte';

	export interface InfoItem {
		label: string;
		/** 值以 snippet 传入，支持任意富内容（徽章、链接等），而非只能塞字符串 */
		value: Snippet;
		/** 占满整行，例如「出差事由」这种较长的文本 */
		full?: boolean;
	}

	interface Props {
		items: InfoItem[];
	}

	let { items }: Props = $props();
</script>

<dl class="info-grid">
	{#each items as item (item.label)}
		<div class="info-grid__item" class:info-grid__item--full={item.full}>
			<dt class="info-grid__label">{item.label}</dt>
			<dd class="info-grid__value">
				{@render item.value()}
			</dd>
		</div>
	{/each}
</dl>

<style>
	.info-grid {
		display: grid;
		grid-template-columns: repeat(2, minmax(0, 1fr));
		gap: 1rem 1.5rem;
		margin: 0;
	}
	.info-grid__item--full {
		grid-column: 1 / -1;
	}
	.info-grid__label {
		font-size: 0.75rem;
		color: var(--color-slate-500);
	}
	.info-grid__value {
		margin: 0.25rem 0 0;
		font-size: 0.875rem;
		color: var(--color-slate-900);
	}
	/* 紧急程度徽章：值由调用方以 snippet 注入，元素带调用方作用域，
	   故用 :global 让徽章样式对注入内容生效（否则会被 scoped 挡掉） */
	:global(.urgent-tag) {
		display: inline-flex;
		align-items: center;
		border-radius: 9999px;
		background-color: var(--color-rose-100);
		color: var(--color-rose-700);
		padding-inline: 0.5rem;
		padding-block: 0.125rem;
		font-size: 0.75rem;
		font-weight: 500;
	}
</style>
