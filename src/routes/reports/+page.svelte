<script lang="ts">
	import PageHeader from '$lib/components/layout/PageHeader.svelte';
	import PagePlaceholder from '$lib/components/layout/PagePlaceholder.svelte';
	import { useIdentity } from '$lib/state/identity.svelte';

	const identity = useIdentity();
</script>

<PageHeader
	title="数据看板"
	description={identity.isManager ? '团队差旅成本与审批效率' : '我的申请进度与花费'}
/>

<!--
	看板内容随身份切换，而非用同一套图表配不同数据 ——
	员工关心自己的进度，主管关心团队的成本，两者该看的东西本就不同。
-->
{#if identity.isManager}
	<PagePlaceholder
		plan={[
			'概览卡片：待处理数、本月团队支出、平均审批时长',
			'折线图：近 12 个月团队差旅费用趋势',
			'柱状图：成员费用排行',
			'饼图：交通方式与费用构成占比'
		]}
	/>
{:else}
	<PagePlaceholder
		plan={[
			'概览卡片：我的申请总数、审批中、已通过金额',
			'折线图：我的月度差旅花费',
			'饼图：我的费用构成（交通 / 住宿 / 补助 / 其他）'
		]}
	/>
{/if}
