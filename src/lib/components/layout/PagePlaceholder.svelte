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
<div class="page-placeholder">
	<p class="page-placeholder__title">此页面待实现，规划内容：</p>
	<ul class="page-placeholder__list">
		{#each plan as item (item)}
			<li class="page-placeholder__item">
				<span class="page-placeholder__bullet" aria-hidden="true">·</span>
				{item}
			</li>
		{/each}
	</ul>
</div>
