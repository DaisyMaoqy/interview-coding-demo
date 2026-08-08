<script lang="ts">
	import PageHeader from '$lib/components/layout/PageHeader.svelte';
	import EmptyState from '$lib/components/common/EmptyState.svelte';
	import ApprovalCard from './components/ApprovalCard.svelte';
	import RejectDialog from '../components/RejectDialog.svelte';
	import { useIdentity } from '$lib/state/identity.svelte';
	import { requestsStore, updateRequest } from '$lib/data/requests';
	import { canViewRequest, transition } from '$lib/domain/workflow';
	import type { TravelRequest } from '$lib/domain/types';

	const identity = useIdentity();

	// 经理的「待我审批」只收一级审批：待主管审批。财务审批由独立角色处理，
	// 不在本视图出现（既不能看，也不会从这里流转过去）。自审规则由 workflow 在
	// transition 时再兜底拦截，这里先按状态收窄列表。
	const todo = $derived(
		$requestsStore.filter(
			(r) =>
				r.applicantId !== identity.user.id &&
				canViewRequest(r, identity.user) &&
				r.status === 'pending_manager'
		)
	);
	const allIds = $derived(todo.map((r) => r.id));

	// 批量选择：以 id 数组为唯一真相，卡片只回传切换事件，由这里维护集合
	let selected = $state<string[]>([]);
	const selectedCount = $derived(selected.length);
	const allSelected = $derived(allIds.length > 0 && selected.length === allIds.length);

	function isSelected(id: string): boolean {
		return selected.includes(id);
	}
	function toggle(id: string): void {
		selected = selected.includes(id) ? selected.filter((x) => x !== id) : [...selected, id];
	}
	function toggleAll(): void {
		selected = allSelected ? [] : [...allIds];
	}

	// 通过/驳回只描述意图，具体落到 approved 还是 rejected 由状态机决定。
	// 当前为一级审批（pending_manager → approved），见 workflow.ts 的 TRANSITIONS 注释。
	function approve(request: TravelRequest): void {
		const res = transition({ request, action: 'approve', actor: identity.user });
		if (res.ok) {
			updateRequest(res.request);
			selected = selected.filter((id) => id !== request.id);
		}
	}
	function batchApprove(): void {
		// 每张都按最新引用再流转，避免 store 更新后的 stale 引用
		for (const id of selected) {
			const found = $requestsStore.find((r) => r.id === id);
			if (found) approve(found);
		}
		selected = [];
	}

	// 驳回需填意见：意见与校验由 RejectDialog，这里只拿到最终 comment 去流转
	let rejectTarget = $state<TravelRequest | null>(null);
	let rejectError = $state<string | null>(null);

	function openReject(request: TravelRequest): void {
		rejectTarget = request;
		rejectError = null;
	}
	function closeReject(): void {
		rejectTarget = null;
		rejectError = null;
	}
	function confirmReject(comment: string): void {
		if (!rejectTarget) return;
		const res = transition({
			request: rejectTarget,
			action: 'reject',
			actor: identity.user,
			comment
		});
		if (res.ok) {
			updateRequest(res.request);
			closeReject();
		} else {
			rejectError = res.message;
		}
	}
</script>

{#if identity.isManager}
	<PageHeader title="待我审批" />

	{#if todo.length === 0}
		<EmptyState title="暂无待我审批的申请" />
	{:else}
		<div class="toolbar">
			<label class="toolbar__check">
				<input type="checkbox" checked={allSelected} aria-label="全选" onchange={toggleAll} />
				全选
			</label>
			<span class="toolbar__count">已选 {selectedCount} 项 · 共 {todo.length} 条</span>
			<span class="toolbar__spacer"></span>
			<button
				type="button"
				class="btn btn--primary"
				disabled={selectedCount === 0}
				onclick={batchApprove}
			>
				批量通过
			</button>
		</div>

		<ul class="approval-list">
			{#each todo as request (request.id)}
				<li>
					<ApprovalCard
						{request}
						selected={isSelected(request.id)}
						ontoggle={toggle}
						onapprove={approve}
						onreject={openReject}
					/>
				</li>
			{/each}
		</ul>
	{/if}

	<RejectDialog
		open={rejectTarget !== null}
		error={rejectError}
		onclose={closeReject}
		onconfirm={confirmReject}
	/>
{:else}
	<!-- 员工没有审批权限 -->
	<div class="notice-card">
		<p class="notice-card__text">
			当前身份是 <span class="font-medium text-slate-900">{identity.user.name}</span
			>，没有审批职责。
		</p>
		<button
			type="button"
			onclick={() => identity.switchTo('manager')}
			class="notice-card__action btn btn--primary"
		>
			切换到主管身份
		</button>
	</div>
{/if}

<style>
	.toolbar {
		display: flex;
		align-items: center;
		gap: 0.75rem;
		margin-bottom: 1rem;
	}
	.toolbar__check {
		display: inline-flex;
		align-items: center;
		gap: 0.375rem;
		font-size: 0.875rem;
		color: var(--color-slate-600);
		cursor: pointer;
	}
	.toolbar__check input {
		width: 1rem;
		height: 1rem;
		cursor: pointer;
		accent-color: var(--color-brand-600);
	}
	.toolbar__count {
		font-size: 0.875rem;
		color: var(--color-slate-500);
	}
	.toolbar__spacer {
		flex: 1;
	}
	.approval-list {
		display: flex;
		flex-direction: column;
		gap: 0.75rem;
	}
</style>
