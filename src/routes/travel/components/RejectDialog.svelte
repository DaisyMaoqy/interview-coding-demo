<script lang="ts">
	import Modal from '$lib/components/common/Modal.svelte';
	import { REJECT_COMMENT_MAX_LENGTH } from '$lib/domain/workflow';

	interface Props {
		open: boolean;
		/** 驳回失败的错误信息（如状态机校验不过），由父组件在 onconfirm 后回填 */
		error?: string | null;
		onclose: () => void;
		/** 用户确认且意见非空时回调；comment 已做 trim 校验 */
		onconfirm: (comment: string) => void;
	}

	let { open, error = null, onclose, onconfirm }: Props = $props();

	// 意见只在弹窗内部暂存，每次打开重置，避免上一张单的内容残留到新单
	let comment = $state('');

	$effect(() => {
		if (open) comment = '';
	});

	function confirm(): void {
		if (comment.trim() === '') return;
		onconfirm(comment);
	}
</script>

<Modal open={open} title="驳回申请" onclose={onclose}>
	{#snippet body()}
		<p class="modal__hint">
			请填写驳回理由（不超过 {REJECT_COMMENT_MAX_LENGTH} 字），申请人会看到这条意见。
		</p>
		<textarea
			class="modal__input"
			rows="3"
			maxlength={REJECT_COMMENT_MAX_LENGTH}
			placeholder="驳回理由（必填）"
			bind:value={comment}></textarea>
		<p
			class="modal__counter"
			class:modal__counter--max={comment.length >= REJECT_COMMENT_MAX_LENGTH}
		>
			{comment.length}/{REJECT_COMMENT_MAX_LENGTH}
		</p>
		{#if error}
			<p class="modal__error" role="alert">{error}</p>
		{/if}
	{/snippet}
	{#snippet actions()}
		<button type="button" class="btn btn--ghost" onclick={onclose}>取消</button>
		<button
			type="button"
			class="btn btn--danger"
			disabled={comment.trim() === ''}
			onclick={confirm}
		>
			确认驳回
		</button>
	{/snippet}
</Modal>
