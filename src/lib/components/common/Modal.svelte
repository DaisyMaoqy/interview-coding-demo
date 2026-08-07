<script lang="ts">
	import type { Snippet } from 'svelte';

	interface Props {
		/** 由父组件控制显隐；关闭（点遮罩 / Esc / 取消）时回调让其置 false */
		open: boolean;
		title: string;
		onclose?: () => void;
		/** 弹窗主体内容，例如说明文案与输入控件 */
		children: Snippet;
		/** 底部操作区，例如取消 / 确认按钮 */
		actions?: Snippet;
	}

	let { open, title, onclose, children, actions }: Props = $props();
</script>

<!-- Esc 关闭：窗口级监听，无论焦点在弹窗内还是外都能生效 -->
<svelte:window
	onkeydown={(e) => {
		if (open && e.key === 'Escape') onclose?.();
	}}
/>

{#if open}
	<!-- 遮罩：仅当点击落在本层（而非弹窗内部）时关闭，无需在内部再挂 stopPropagation -->
	<div
		class="modal-backdrop"
		role="presentation"
		onclick={(e) => {
			if (e.target === e.currentTarget) onclose?.();
		}}
		onkeydown={(e) => {
			if (e.key === 'Escape') onclose?.();
		}}
	>
		<div class="modal" role="dialog" aria-modal="true" aria-label={title} tabindex="-1">
			<h3 class="modal__title">{title}</h3>
			<div class="modal__body">
				{@render children()}
			</div>
			{#if actions}
				<div class="modal__actions">
					{@render actions()}
				</div>
			{/if}
		</div>
	</div>
{/if}

<style>
	.modal-backdrop {
		position: fixed;
		inset: 0;
		background-color: rgb(15 23 42 / 0.4);
		display: flex;
		align-items: center;
		justify-content: center;
		padding: 1rem;
		z-index: 50;
	}
	.modal {
		width: 100%;
		max-width: 28rem;
		background-color: #fff;
		border-radius: var(--radius-card);
		padding: 1.25rem;
		box-shadow: var(--shadow-card);
	}
	.modal__title {
		margin: 0;
		font-size: 1rem;
		font-weight: 600;
		color: var(--color-slate-900);
	}
	.modal__body {
		margin-top: 0.75rem;
	}
	/* 以下三类由调用方以 snippet 注入 Modal 内容区，元素带调用方作用域，
	   故用 :global 让 Modal 的视觉语言对注入内容也生效（否则会被 scoped 挡掉） */
	:global(.modal__hint) {
		margin: 0 0 0.75rem;
		font-size: 0.8125rem;
		color: var(--color-slate-500);
	}
	:global(.modal__input) {
		width: 100%;
		border: 1px solid var(--color-slate-300);
		border-radius: 0.5rem;
		padding: 0.5rem 0.75rem;
		font-size: 0.875rem;
		color: var(--color-slate-900);
		resize: vertical;
	}
	:global(.modal__input:focus-visible) {
		outline: 2px solid var(--color-brand-500);
		outline-offset: 1px;
	}
	:global(.modal__error) {
		margin: 0.5rem 0 0;
		font-size: 0.8125rem;
		color: var(--color-rose-700);
	}
	.modal__actions {
		margin-top: 1rem;
		display: flex;
		justify-content: flex-end;
		gap: 0.75rem;
	}
</style>
