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
		/** 次按钮文案，如「存为草稿」；不传则不渲染 */
		secondaryLabel?: string;
		/** 次按钮点击：各步注入自己的逻辑（如存草稿） */
		onSecondary?: () => void;
		/** 次按钮进行中时禁用并切换文案 */
		secondaryLoading?: boolean;
	}

	let {
		prevHref,
		primaryLabel,
		onPrimary,
		loading = false,
		secondaryLabel,
		onSecondary,
		secondaryLoading = false
	}: Props = $props();
</script>

<div class="wizard-footer">
	{#if prevHref}
		<!-- eslint-disable-next-line svelte/no-navigation-without-resolve -->
		<a href={prevHref} class="btn btn--ghost">上一步</a>
	{:else}
		<span></span>
	{/if}
	<div class="wizard-footer__right">
		{#if secondaryLabel}
			<button
				type="button"
				class="btn btn--ghost"
				onclick={onSecondary}
				disabled={loading || secondaryLoading}
			>
				{secondaryLoading ? `${secondaryLabel}中...` : secondaryLabel}
			</button>
		{/if}
		<button
			type="button"
			class="btn btn--primary"
			onclick={onPrimary}
			disabled={loading || secondaryLoading}
		>
			{loading ? `${primaryLabel}中...` : primaryLabel}
		</button>
	</div>
</div>

<style>
	.wizard-footer {
		display: flex;
		align-items: center;
		justify-content: space-between;
		margin-top: 1.5rem;
	}
	.wizard-footer__right {
		display: flex;
		gap: 0.75rem;
	}
</style>
