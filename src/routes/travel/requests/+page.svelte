<script lang="ts">
	import PageHeader from '$lib/components/layout/PageHeader.svelte';
	import PagePlaceholder from '$lib/components/layout/PagePlaceholder.svelte';
	import { resolve } from '$app/paths';
	import { useIdentity } from '$lib/state/identity.svelte';

	const identity = useIdentity();
</script>

<PageHeader title="我的申请" description="{identity.user.name} 发起的全部差旅申请">
	{#snippet actions()}
		<a
			href={resolve('/travel/apply')}
			class="rounded-lg bg-brand-600 px-3.5 py-2 text-sm font-medium text-white
			       transition-colors hover:bg-brand-700"
		>
			发起申请
		</a>
	{/snippet}
</PageHeader>

<PagePlaceholder
	plan={[
		'状态筛选标签：全部 / 草稿 / 审批中 / 已通过 / 已驳回 / 已撤销',
		'按事由与目的地搜索',
		'申请卡片列表：单号、事由、行程摘要、金额、状态徽章',
		'空状态：无数据时引导发起第一张申请'
	]}
/>
