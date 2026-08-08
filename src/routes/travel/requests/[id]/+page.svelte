<script lang="ts">
	import { resolve } from '$app/paths';
	import { page } from '$app/state';
	import RequestDetail from '$lib/components/request/RequestDetail.svelte';
	import { useIdentity } from '$lib/state/identity.svelte';
	import { requestsStore } from '$lib/data/requests';
	import { canViewRequest } from '$lib/domain/workflow';

	const identity = useIdentity();
	const id = $derived(page.params.id);

	// 从响应式 store 派生，流转后仍会自动刷新（RequestActions 改的是同一 store）
	const request = $derived($requestsStore.find((r) => r.id === id));
	// 查看权限：自己的单或待我审批的单才可看；随身份切换响应式变化（员工看不到领导的单）
	const canView = $derived(request ? canViewRequest(request, identity.user) : false);
</script>

{#if !request}
	<!-- 数据里没有这张单：可能 id 拼错，或流转后本地缓存与远端不一致 -->
	<div class="rounded-card border border-slate-200 bg-white p-8 text-center">
		<p class="text-sm text-slate-600">没有找到单号为 {id} 的申请</p>
	</div>
{:else if !canView}
	<!-- 单存在但当前身份无权查看（如员工访问领导的单）；切到有权身份会自动恢复 -->
	<div class="rounded-card border border-slate-200 bg-white p-8 text-center">
		<p class="text-sm text-slate-600">
			当前身份（{identity.user.name}）没有权限查看这张申请
		</p>
		<a
			href={resolve('/travel/requests')}
			class="mt-4 inline-block rounded-lg bg-brand-600 px-3.5 py-2 text-sm font-medium text-white hover:bg-brand-700"
		>
			返回我的申请
		</a>
	</div>
{:else}
	<RequestDetail {request} actor={identity.user} />
{/if}
