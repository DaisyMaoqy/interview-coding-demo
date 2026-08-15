<script lang="ts">
	import { resolve } from '$app/paths';
	import StatusBadge from '$lib/components/request/StatusBadge.svelte';
	import { requestSummary, requestMetric } from '$lib/data/requests';
	import { formatDate, formatDateTime } from '$lib/format';
	import { availableActions } from '$lib/domain/workflow';
	import { useIdentity } from '$lib/state/identity.svelte';
	import type { Request } from '$lib/domain/types';
	import { APPLICATION_TYPE_LABELS } from '$lib/domain/types';

	interface Props {
		request: Request;
		/** 是否被选入批量通过 */
		selected: boolean;
		/** 勾选状态切换时回调，由父组件维护选择集合 */
		ontoggle: (id: string) => void;
		onapprove: (request: Request) => void;
		onreject: (request: Request) => void;
	}

	let { request, selected, ontoggle, onapprove, onreject }: Props = $props();

	// 能做什么完全由状态机决定，与详情页 RequestActions 共用同一套判定
	const identity = useIdentity();
	const actions = $derived(availableActions(request, identity.user));
	const canApprove = $derived(actions.includes('approve'));
	const canReject = $derived(actions.includes('reject'));
	// 卡片底部指标随类型变化（差旅=预算合计，请假=请假天数）
	const metric = $derived(requestMetric(request));
</script>

<div class="approval-card">
	<div class="approval-card__head">
		<label class="approval-card__check">
			<input
				type="checkbox"
				checked={selected}
				aria-label="选择 {request.id}"
				onchange={() => ontoggle(request.id)}
			/>
		</label>
		<div class="approval-card__applicant">
			<span class="approval-card__name">{request.applicantName}</span>
			<span class="approval-card__dept">{request.department}</span>
		</div>
		<div class="approval-card__status">
			<StatusBadge status={request.status} />
			<p class="approval-card__submitted">
				{request.submittedAt ? `提交于 ${formatDateTime(request.submittedAt)}` : '尚未提交'}
			</p>
		</div>
	</div>

	<div class="approval-card__body">
		<a
			class="approval-card__reason"
			href={resolve(`/travel/requests/${request.id}?from=approvals`)}
		>
			<span class="approval-card__type">{APPLICATION_TYPE_LABELS[request.type]}</span>
			{String(request.fields.reason ?? '')}
		</a>
		<p class="approval-card__meta">
			{request.id} · {requestSummary(request)} · {formatDate(request.createdAt)}
		</p>
	</div>

	<div class="approval-card__foot">
		<div class="approval-card__amount-group">
			<span class="approval-card__amount-label">{metric.label}</span>
			<span class="approval-card__amount">{metric.value}</span>
		</div>
		<div class="approval-card__actions">
			{#if canApprove}
				<button type="button" class="btn btn--primary" onclick={() => onapprove(request)}
					>通过</button
				>
			{/if}
			{#if canReject}
				<button type="button" class="btn btn--danger" onclick={() => onreject(request)}>驳回</button
				>
			{/if}
		</div>
	</div>
</div>

<style>
	.approval-card {
		border-radius: var(--radius-card);
		border: 1px solid var(--color-slate-200);
		background-color: #fff;
		padding: 1rem;
		transition: box-shadow 150ms ease;
	}
	.approval-card:hover {
		box-shadow: var(--shadow-card);
	}
	.approval-card__head {
		display: flex;
		align-items: center;
		gap: 0.75rem;
	}
	.approval-card__check {
		display: inline-flex;
		align-items: center;
		cursor: pointer;
	}
	.approval-card__check input {
		width: 1rem;
		height: 1rem;
		cursor: pointer;
		accent-color: var(--color-brand-600);
	}
	.approval-card__applicant {
		display: flex;
		flex-direction: column;
		min-width: 0;
		flex: 1;
	}
	.approval-card__name {
		font-size: 0.875rem;
		font-weight: 500;
		color: var(--color-slate-900);
	}
	.approval-card__dept {
		font-size: 0.75rem;
		color: var(--color-slate-500);
	}
	.approval-card__status {
		flex-shrink: 0;
		display: flex;
		flex-direction: column;
		align-items: flex-end;
		gap: 0.375rem;
		text-align: right;
	}
	.approval-card__submitted {
		font-size: 0.75rem;
		color: var(--color-slate-400);
		white-space: nowrap;
	}
	.approval-card__body {
		margin-top: 0.75rem;
	}
	.approval-card__reason {
		display: block;
		overflow: hidden;
		text-overflow: ellipsis;
		white-space: nowrap;
		font-weight: 500;
		color: var(--color-slate-900);
		text-decoration: none;
	}
	.approval-card__reason:hover {
		color: var(--color-brand-700);
	}
	.approval-card__type {
		display: inline-block;
		margin-right: 0.4rem;
		padding: 0.05rem 0.4rem;
		border-radius: var(--radius-sm);
		background: var(--color-brand-50);
		color: var(--color-brand-700);
		font-size: 0.7rem;
		font-weight: 600;
	}
	.approval-card__meta {
		margin-top: 0.25rem;
		font-size: 0.75rem;
		color: var(--color-slate-500);
	}
	.approval-card__foot {
		margin-top: 0.75rem;
		display: flex;
		align-items: center;
		justify-content: space-between;
		gap: 0.75rem;
		border-top: 1px solid var(--color-slate-100);
		padding-top: 0.75rem;
	}
	.approval-card__amount-group {
		display: flex;
		align-items: baseline;
		gap: 0.375rem;
	}
	.approval-card__amount-label {
		font-size: 0.75rem;
		color: var(--color-slate-400);
	}
	.approval-card__amount {
		font-size: 0.875rem;
		font-weight: 600;
		color: var(--color-slate-900);
	}
	.approval-card__actions {
		display: flex;
		gap: 0.5rem;
	}
</style>
