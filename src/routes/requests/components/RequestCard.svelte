<script lang="ts">
	import StatusBadge from '$lib/components/request/StatusBadge.svelte';
	import HighlightText from '$lib/components/common/HighlightText.svelte';
	import { resolve } from '$app/paths';
	import { requestSummary, requestMetric } from '$lib/data/requests';
	import { formatDate, formatDateTime } from '$lib/format';
	import type { Request } from '$lib/domain/types';
	import { APPLICATION_TYPE_LABELS } from '$lib/domain/types';

	interface Props {
		request: Request;
		/** 搜索关键词，命中处用主题色高亮；空串不高亮 */
		keyword?: string;
	}

	let { request, keyword = '' }: Props = $props();

	// 卡片底部指标随类型变化（差旅=预算合计，请假=请假天数）
	const metric = $derived(requestMetric(request));
</script>

<a class="request-card" href={resolve(`/requests/${request.id}?from=requests`)}>
	<div class="request-card__top">
		<div class="request-card__main">
			<p class="request-card__reason">
				<span class="request-card__type">{APPLICATION_TYPE_LABELS[request.type]}</span>
				<HighlightText text={String(request.fields.reason ?? '')} {keyword} />
			</p>
			<p class="request-card__meta">
				{request.id} · <HighlightText text={requestSummary(request)} {keyword} /> ·
				{formatDate(request.createdAt)}
			</p>
		</div>
		<div class="request-card__status">
			<StatusBadge status={request.status} />
			<p class="request-card__submitted">
				{request.submittedAt ? `提交于 ${formatDateTime(request.submittedAt)}` : '尚未提交'}
			</p>
		</div>
	</div>

	<div class="request-card__footer">
		<span class="request-card__amount-label">{metric.label}</span>
		<span class="request-card__amount">{metric.value}</span>
	</div>
</a>

<style>
	.request-card {
		display: block;
		border-radius: var(--radius-card);
		border: 1px solid var(--color-slate-200);
		background-color: #fff;
		padding: 1rem;
		transition: box-shadow 150ms ease;
	}
	.request-card:hover {
		box-shadow: var(--shadow-card);
	}
	.request-card__top {
		display: flex;
		align-items: flex-start;
		justify-content: space-between;
		gap: 1rem;
	}
	.request-card__main {
		min-width: 0;
	}
	.request-card__status {
		flex-shrink: 0;
		display: flex;
		flex-direction: column;
		align-items: flex-end;
		gap: 0.375rem;
		text-align: right;
	}
	.request-card__submitted {
		font-size: 0.75rem;
		color: var(--color-slate-400);
		white-space: nowrap;
	}
	.request-card__reason {
		overflow: hidden;
		text-overflow: ellipsis;
		white-space: nowrap;
		font-weight: 500;
		color: var(--color-slate-900);
	}
	.request-card__type {
		display: inline-block;
		margin-right: 0.5rem;
		padding: 0.05rem 0.45rem;
		border-radius: var(--radius-sm);
		background: var(--color-brand-50);
		color: var(--color-brand-700);
		font-size: 0.7rem;
		font-weight: 600;
		vertical-align: middle;
	}
	.request-card__meta {
		margin-top: 0.25rem;
		font-size: 0.75rem;
		color: var(--color-slate-500);
	}
	.request-card__footer {
		margin-top: 0.75rem;
		display: flex;
		align-items: center;
		justify-content: space-between;
		border-top: 1px solid var(--color-slate-100);
		padding-top: 0.75rem;
	}
	.request-card__amount-label {
		font-size: 0.75rem;
		color: var(--color-slate-400);
	}
	.request-card__amount {
		font-size: 0.875rem;
		font-weight: 600;
		color: var(--color-slate-900);
	}
</style>
