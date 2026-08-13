<script lang="ts">
	import type { Snippet } from 'svelte';

	interface Props {
		/** 字段标签，必填项会带红色星号 */
		label: string;
		/** 校验失败时的错误消息；有值时优先于 hint 显示，并标记输入框为错误态 */
		error?: string;
		/** 非错误时的辅助说明（如字数统计），与 error 互斥显示 */
		hint?: string;
		/** 是否必填，决定星号显示 */
		required?: boolean;
		/** 输入控件插槽，由调用方自行决定 input/select/textarea */
		children: Snippet;
	}

	let { label, error, hint, required = false, children }: Props = $props();
</script>

<label class="field" class:field--invalid={Boolean(error)}>
	<span class="field__label">
		{label}{#if required}<span class="field__required" aria-hidden="true">*</span>{/if}
	</span>
	{@render children()}
	{#if error}
		<p class="field__error" role="alert">{error}</p>
	{:else if hint}
		<p class="field__hint">{hint}</p>
	{/if}
</label>
