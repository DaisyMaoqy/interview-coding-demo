<script lang="ts">
	interface Props {
		/** 上一步链接；首步传 null，渲染占位以维持两端对齐 */
		prevHref: string | null;
		/** 主按钮文案，如「下一步」「提交」 */
		primaryLabel: string;
		/** 主按钮点击：各步注入自己的校验 + 跳转逻辑 */
		onPrimary: () => void;
		/** 提交/下一步进行中时禁用按钮并切换文案 */
		loading?: boolean;
	}

	let { prevHref, primaryLabel, onPrimary, loading = false }: Props = $props();
</script>

<div class="wizard-footer">
	{#if prevHref}
		<a href={prevHref} class="btn btn--ghost">上一步</a>
	{:else}
		<span></span>
	{/if}
	<button type="button" class="btn btn--primary" onclick={onPrimary} disabled={loading}>
		{loading ? `${primaryLabel}中...` : primaryLabel}
	</button>
</div>

<style>
	.wizard-footer {
		display: flex;
		align-items: center;
		justify-content: space-between;
		margin-top: 1.5rem;
	}
</style>
