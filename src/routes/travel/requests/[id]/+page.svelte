<script lang="ts">
	import { resolve } from '$app/paths';
	import { page } from '$app/state';
	import PageHeader from '$lib/components/layout/PageHeader.svelte';
	import PagePlaceholder from '$lib/components/layout/PagePlaceholder.svelte';

	const id = $derived(page.params.id);
</script>

<a
	href={resolve('/travel/requests')}
	class="mb-3 inline-flex items-center gap-1 text-sm text-slate-500 hover:text-slate-800"
>
	<span aria-hidden="true">←</span> 返回我的申请
</a>

<PageHeader title="申请详情" description="单号 {id}" />

<PagePlaceholder
	plan={[
		'基本信息：事由、紧急程度、申请人、提交时间',
		'行程明细表与费用预算明细',
		'审批时间线：由 audit 数组渲染，含操作人、动作、意见',
		'操作区：按钮由 availableActions(request, actor) 决定',
		'驳回弹窗：意见为必填'
	]}
/>
