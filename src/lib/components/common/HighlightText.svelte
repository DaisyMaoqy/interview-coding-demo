<script lang="ts">
	interface Props {
		/** 待展示文本 */
		text: string;
		/** 高亮关键词，空串或空白视为不高亮 */
		keyword?: string;
	}

	let { text, keyword = '' }: Props = $props();

	interface Part {
		text: string;
		hit: boolean;
	}

	/**
	 * 把命中关键词的片段切开。用片段数组而非 innerHTML，
	 * 避免把用户输入当 HTML 注入（XSS 安全）。
	 */
	function split(text: string, kw: string): ReadonlyArray<Part> {
		const word = kw.trim();
		if (word === '') return [{ text, hit: false }];

		const lower = text.toLowerCase();
		const target = word.toLowerCase();
		const parts: Part[] = [];
		let cursor = 0;
		let idx = lower.indexOf(target);

		while (idx !== -1) {
			if (idx > cursor) parts.push({ text: text.slice(cursor, idx), hit: false });
			parts.push({ text: text.slice(idx, idx + target.length), hit: true });
			cursor = idx + target.length;
			idx = lower.indexOf(target, cursor);
		}
		if (cursor < text.length) parts.push({ text: text.slice(cursor), hit: false });
		return parts;
	}

	const parts = $derived(split(text, keyword));
</script>

{#each parts as part, i (i)}
	{#if part.hit}
		<span class="highlight-text__mark">{part.text}</span>
	{:else}
		{part.text}
	{/if}
{/each}

<!--
	highlight-text__mark 只服务于本组件，按「单处使用留在组件」的约定收口到这里，
	不进全局 components.css（全局只保留复用 ≥2 处或跨页共享的原语，如 .btn / section-title）。
-->
<style>
	.highlight-text__mark {
		border-radius: 0.25rem;
		background-color: var(--color-brand-100);
		padding-inline: 0.125rem;
		font-weight: 500;
		color: var(--color-brand-700);
	}
</style>
