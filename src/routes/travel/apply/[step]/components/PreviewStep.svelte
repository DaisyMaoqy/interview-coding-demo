<script lang="ts">
	import { goto } from '$app/navigation';
	import { resolve } from '$app/paths';
	import { page } from '$app/state';
	import { draft, resetDraft } from '$lib/state/wizardDraft';
	import { useIdentity } from '$lib/state/identity.svelte';
	import { addRequest, createRequest, updateRequestFromDraft } from '$lib/data/requests';
	import { travelFormSchema, validate } from '$lib/domain/schema';
	import { stepHref, stepHrefWithFocus, setActiveEditId } from '$lib/domain/wizard';
	import { formatYuan, budgetTotal } from '$lib/domain/money';
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
		createdAt: new Date().toISOString(),
		updatedAt: new Date().toISOString(),
		audit: []
	});

	let submitting = $state(false);
	let submitError = $state('');

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
			let targetId: string;
			if (editId) {
				// 编辑态：在原单上套用新数据并重新提交，沿用原单号与审计轨迹
				const updated = updateRequestFromDraft(editId, $draft, identity.user);
				targetId = updated.id;
			} else {
				const created = createRequest($draft, identity.user);
				addRequest(created);
				targetId = created.id;
			}
			setActiveEditId(null);
			resetDraft();
			await goto(resolve(`/travel/requests/${targetId}?from=requests`));
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
