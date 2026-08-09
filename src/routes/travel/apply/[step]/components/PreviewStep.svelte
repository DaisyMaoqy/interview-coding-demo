<script lang="ts">
	import { goto } from '$app/navigation';
	import { resolve } from '$app/paths';
	import { page } from '$app/state';
	import { draft, resetDraft } from '$lib/state/wizardDraft';
	import { useIdentity } from '$lib/state/identity.svelte';
	import { addRequest, createDraft, createRequest, updateRequestFromDraft } from '$lib/data/requests';
	import { travelFormSchema, validate } from '$lib/domain/schema';
	import { stepHref, stepHrefWithFocus, setActiveEditId } from '$lib/domain/wizard';
	import { formatYuan, budgetTotal } from '$lib/domain/money';
	import { toLocalISO } from '$lib/format/date';
	import { resetRequestListFilters } from '$lib/state/requestListFilters';
	import type { TravelRequest } from '$lib/domain/types';
	import RequestBasicInfo from '$lib/components/request/RequestBasicInfo.svelte';
	import LegsTable from '$lib/components/request/LegsTable.svelte';
	import BudgetBreakdown from '$lib/components/request/BudgetBreakdown.svelte';
	import WizardFooter from './WizardFooter.svelte';

	const identity = useIdentity();

	// 编辑态由 URL 的 ?edit=ID 决定（刷新/直达都可靠），据此切换按钮文案与提交分支
	const editId = $derived(page.url.searchParams.get('edit'));

	// 预览阶段还没有真实的单号与提交时间，用占位值拼出一条「准申请」，
	// 直接复用详情页已有的三个展示组件，避免重复排版与字段顺序漂移。
	const previewRequest = $derived<TravelRequest>({
		id: 'PREVIEW',
		applicantId: identity.user.id,
		applicantName: identity.user.name,
		department: identity.user.department,
		reason: $draft.reason,
		urgency: $draft.urgency,
		legs: $draft.legs,
		budget: $draft.budget,
		budgetNote: $draft.budgetNote,
		status: 'draft',
		createdAt: toLocalISO(),
		updatedAt: toLocalISO(),
		audit: []
	});

	let submitting = $state(false);
	let submitError = $state('');
	let savingDraft = $state(false);

	// 存为草稿：不校验整单是否填全，直接落当前填写内容，状态停 draft；
	// 仅「发起申请」流程有此入口（编辑态已有单据，走「重新提交」）。
	async function onSaveDraft(): Promise<void> {
		savingDraft = true;
		try {
			addRequest(createDraft($draft, identity.user));
			setActiveEditId(null);
			resetDraft();
			// 存草稿后回到「我的申请」并直接停在「草稿」状态，便于看到刚存的那条
			resetRequestListFilters('draft');
			await goto(resolve('/travel/requests'));
		} catch {
			savingDraft = false;
		}
	}

	async function onSubmit(): Promise<void> {
		// 提交前再跑一遍整单 schema，兜底各步可能因 localStorage 脏数据/手写产生的偏差
		const result = validate(travelFormSchema, $draft);
		if (!result.ok) {
			submitError = '信息不完整，请返回各步骤检查后重试';
			return;
		}
		submitError = '';
		submitting = true;
		try {
			if (editId) {
				// 编辑态：在原单上套用新数据并重新提交，沿用原单号与审计轨迹
				updateRequestFromDraft(editId, $draft, identity.user);
			} else {
				addRequest(createRequest($draft, identity.user));
			}
			setActiveEditId(null);
			resetDraft();
			// 提交会改变单据状态（草稿/驳回 → pending_manager），重置列表筛选为全部，
			// 直接回到「我的申请」即可看到全部数据，无需再经详情页中转
			resetRequestListFilters();
			await goto(resolve('/travel/requests'));
		} catch {
			submitting = false;
		}
	}
</script>

<!-- eslint-disable svelte/no-navigation-without-resolve -->
<section class="step-card preview">
	<div class="preview__head">
		<h3 class="section-title">基本信息</h3>
		<a class="link" href={stepHref('basic', editId)}>修改</a>
	</div>
	<RequestBasicInfo request={previewRequest} showTitle={false} />

	<div class="preview__head">
		<h3 class="section-title">行程明细</h3>
		<a class="link" href={stepHrefWithFocus('trips', 'legs', editId)}>修改</a>
	</div>
	<LegsTable legs={previewRequest.legs} />

	<div class="preview__head">
		<h3 class="section-title">费用预算</h3>
		<a class="link" href={stepHref('budget', editId)}>修改</a>
	</div>
	<BudgetBreakdown budget={previewRequest.budget} budgetNote={previewRequest.budgetNote} />

	<p class="amount-summary">预算合计：<strong>¥{formatYuan(budgetTotal(previewRequest.budget))}</strong></p>

	{#if submitError}
		<p class="field__error">{submitError}</p>
	{/if}
</section>

<WizardFooter
	prevHref={stepHref('budget', editId)}
	primaryLabel={editId ? '重新提交' : '提交申请'}
	loading={submitting}
	onPrimary={onSubmit}
	secondaryLabel={editId ? undefined : '存为草稿'}
	secondaryLoading={savingDraft}
	onSecondary={onSaveDraft}
/>

<style>
	.preview {
		display: flex;
		flex-direction: column;
		gap: 1.25rem;
	}
	.preview__head {
		display: flex;
		align-items: center;
		justify-content: space-between;
	}
	.link {
		font-size: 0.8125rem;
		color: var(--color-brand-600);
	}
	.link:hover {
		text-decoration: underline;
	}
</style>
