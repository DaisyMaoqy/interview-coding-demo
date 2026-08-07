<script lang="ts">
	interface Props {
		/** 这个页面接下来要放什么 */
		plan: string[];
	}

	let { plan }: Props = $props();
</script>

<!--
	骨架阶段的占位。写清楚「这里将来放什么」而不是一句 TODO ——
	路由跑通与内容填充是两件事，占位期间也应当能看出信息架构是否合理。
	页面实现后整块删除。
-->
<div class="rounded-card border border-dashed border-slate-300 bg-white p-8">
	<p class="text-sm font-medium text-slate-500">此页面待实现，规划内容：</p>
	<ul class="mt-3 space-y-1.5">
		{#each plan as item (item)}
			<li class="flex gap-2 text-sm text-slate-600">
				<span class="text-slate-300" aria-hidden="true">·</span>
				{item}
			</li>
		{/each}
	</ul>
</div>
