<script lang="ts">
	import type { RequestStatus } from '$lib/domain/types';
	import { STATUS_LABELS } from '$lib/domain/workflow';

	interface Props {
		status: RequestStatus;
	}

	let { status }: Props = $props();

	// 状态 → 徽章色调修饰类。草稿/撤销中性灰，审批中琥珀，通过绿，驳回红。
	const TONES: Record<RequestStatus, string> = {
		draft: 'status-badge--draft',
		pending_manager: 'status-badge--pending',
		pending_finance: 'status-badge--pending',
		approved: 'status-badge--approved',
		rejected: 'status-badge--rejected',
		cancelled: 'status-badge--cancelled'
	};
</script>

<span class="status-badge {TONES[status]}">{STATUS_LABELS[status]}</span>

<style>
	.status-badge {
		display: inline-flex;
		align-items: center;
		border-radius: 9999px;
		padding-inline: 0.625rem;
		padding-block: 0.125rem;
		font-size: 0.75rem;
		line-height: 1rem;
		font-weight: 500;
	}

	/* 修饰态用 :global：类名由脚本动态拼接（TONES[status]），Svelte 静态分析看不到，
	   故标记全局；类名带 status-badge 前缀，不会与其他组件冲突。颜色走全局
	   --color-* 设计令牌（Tailwind v4 默认调色板即暴露为 CSS 变量）。 */
	:global(.status-badge--draft) {
		background-color: var(--color-slate-100);
		color: var(--color-slate-600);
	}
	:global(.status-badge--pending) {
		background-color: var(--color-amber-100);
		color: var(--color-amber-700);
	}
	:global(.status-badge--approved) {
		background-color: var(--color-emerald-100);
		color: var(--color-emerald-700);
	}
	:global(.status-badge--rejected) {
		background-color: var(--color-rose-100);
		color: var(--color-rose-700);
	}
	:global(.status-badge--cancelled) {
		background-color: var(--color-slate-100);
		color: var(--color-slate-500);
	}
</style>
