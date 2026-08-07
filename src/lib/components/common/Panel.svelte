<script lang="ts">
	import type { Snippet } from 'svelte';

	interface Props {
		title: string;
		/** 标题下方的补充说明，例如数据口径 */
		subtitle?: string;
		/** 标题右侧的操作区，例如「展开 / 新增」按钮 */
		actions?: Snippet;
		children: Snippet;
	}

	let { title, subtitle, actions, children }: Props = $props();
</script>

<section class="panel">
	<header class="panel__header">
		<div class="panel__heading">
			<h2 class="panel__title">{title}</h2>
			{#if subtitle}
				<p class="panel__subtitle">{subtitle}</p>
			{/if}
		</div>
		{#if actions}
			<div class="panel__actions">
				{@render actions()}
			</div>
		{/if}
	</header>
	<div class="panel__body">
		{@render children()}
	</div>
</section>

<style>
	.panel {
		border-radius: var(--radius-card);
		border: 1px solid var(--color-slate-200);
		background-color: #fff;
	}
	.panel__header {
		display: flex;
		align-items: flex-start;
		justify-content: space-between;
		gap: 1rem;
		padding: 1rem 1.25rem;
		border-bottom: 1px solid var(--color-slate-100);
	}
	.panel__title {
		font-size: 0.95rem;
		font-weight: 600;
		color: var(--color-slate-900);
	}
	.panel__subtitle {
		margin-top: 0.25rem;
		font-size: 0.75rem;
		color: var(--color-slate-500);
	}
	.panel__body {
		padding: 1.25rem;
	}
</style>
