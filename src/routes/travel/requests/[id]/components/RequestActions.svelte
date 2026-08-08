<script lang="ts">
	import RejectDialog from '../../../components/RejectDialog.svelte';
	import {
		ACTION_LABELS,
		actionRequiresComment,
		availableActions,
		transition
	} from '$lib/domain/workflow';
	import { updateRequest } from '$lib/data/requests';
	import type { AuditAction, TravelRequest, User } from '$lib/domain/types';

	interface Props {
		request: TravelRequest;
		/** 当前操作者；切角色即切人，自审规则由 workflow 统一拦截 */
		actor: User;
		/** 无可用操作时展示的提示，审批页可能想换成别的措辞 */
		emptyHint?: string;
	}

	let { request, actor, emptyHint = '当前状态下你没有可执行的操作' }: Props = $props();

	// 能做什么完全由状态机决定，详情页与审批页共用同一套按钮逻辑
	const actions = $derived(availableActions(request, actor));
	// 展示顺序：提交/通过靠前，重新编辑居中，驳回/撤销靠后
	const ACTION_ORDER: readonly AuditAction[] = ['submit', 'approve', 'reedit', 'reject', 'cancel'];
	const visibleActions = $derived(ACTION_ORDER.filter((a) => actions.includes(a)));

	let feedback = $state<string | null>(null);
	let showReject = $state(false);

	/** 执行一次流转并落库；需要意见的动作（驳回）由调用方传入 comment */
	function runAction(action: AuditAction, comment?: string): void {
		feedback = null;
		const result = transition({
			request,
			action,
			actor,
			comment: actionRequiresComment(action) ? comment : undefined
		});

		if (!result.ok) {
			feedback = result.message;
			return;
		}

		updateRequest(result.request);
		showReject = false;
	}

	function openReject(): void {
		feedback = null;
		showReject = true;
	}
</script>

{#if visibleActions.length > 0}
	<div class="action-bar">
		{#if feedback}
			<p class="action-bar__feedback" role="alert">{feedback}</p>
		{/if}
		<div class="action-bar__buttons">
			{#each visibleActions as action (action)}
				{#if actionRequiresComment(action)}
					<button type="button" class="btn btn--danger" onclick={openReject}>
						{ACTION_LABELS[action]}
					</button>
				{:else}
					<button
						type="button"
						class="btn {action === 'cancel' ? 'btn--ghost' : 'btn--primary'}"
						onclick={() => runAction(action)}
					>
						{ACTION_LABELS[action]}
					</button>
				{/if}
			{/each}
		</div>
	</div>
{:else}
	<p class="action-empty">{emptyHint}</p>
{/if}

<RejectDialog
	open={showReject}
	error={feedback}
	onclose={() => (showReject = false)}
	onconfirm={(c) => runAction('reject', c)}
/>

<style>
	.action-bar {
		display: flex;
		flex-wrap: wrap;
		align-items: center;
		justify-content: flex-end;
		gap: 1rem;
	}
	.action-bar__feedback {
		margin: 0;
		font-size: 0.8125rem;
		color: var(--color-rose-700);
	}
	.action-bar__buttons {
		display: flex;
		flex-wrap: wrap;
		gap: 0.75rem;
	}
	.action-empty {
		text-align: center;
		font-size: 0.875rem;
		color: var(--color-slate-400);
		padding: 1rem 0;
	}
</style>
