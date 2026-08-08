<script lang="ts">
	import PageHeader from '$lib/components/layout/PageHeader.svelte';
	import PagePlaceholder from '$lib/components/layout/PagePlaceholder.svelte';
	import { useIdentity } from '$lib/state/identity.svelte';

	const identity = useIdentity();
</script>

<PageHeader title="待我审批" description="等待 {identity.user.name} 处理的申请" />

{#if identity.isManager}
	<PagePlaceholder
		plan={[
			'待办列表：过滤掉自己提交的单（不能自审）',
			'按待主管审批 / 待财务审批分组',
			'列表内直接通过或驳回，减少跳转',
			'批量通过：勾选多张一次处理'
		]}
	/>
{:else}
	<!--
		员工的侧栏本就没有这一项，能走到这里只有直接输入 URL 一种情况。
		不做 403 拦截而是给出解释与出口 —— 演示中身份可自由切换，
		把话说清楚比把人挡在门外更有用。
	-->
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
