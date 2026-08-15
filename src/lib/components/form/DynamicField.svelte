<script lang="ts">
	import type { Snippet } from 'svelte';
	import type { FieldDef } from '$lib/domain/applicationTypes';
	import Field from './Field.svelte';
	import { centsToYuan, parseYuanInput } from '$lib/domain/money';

	interface Props {
		field: FieldDef;
		scopeValue: Record<string, unknown>;
		scopePatch: (key: string, value: unknown) => void;
		basePath?: string;
		errors?: Record<string, string>;
		children?: Snippet;
	}

	let { field, scopeValue, scopePatch, basePath = '', errors = {}, children }: Props = $props();

	// 统一接口：每个渲染器都拿到「当前作用域的值对象」与「写入某 key 的回调」。
	// 基础字段读写 field.key；dateRange 直接写 fromKey/toKey 到同一作用域。
	const errorFor = (key: string) => (basePath ? errors[`${basePath}${key}`] : errors[key]) ?? '';
	const childPath = (key: string) => (basePath ? `${basePath}${key}` : key);

	const value = $derived(scopeValue[field.key]);

	// 金额字段：UI 输入「元」，领域层存「分」。用本地文本态避免逐字符输入被格式化覆盖。
	let moneyText = $state('');
	let moneyInput = $state<HTMLInputElement | null>(null);
	$effect(() => {
		const cents = scopeValue[field.key];
		if (moneyInput && document.activeElement === moneyInput) return;
		moneyText = cents == null ? '' : String(centsToYuan(cents as number));
	});
	function onMoneyInput(event: Event) {
		const text = (event.currentTarget as HTMLInputElement).value;
		moneyText = text;
		const cents = parseYuanInput(text);
		scopePatch(field.key, cents ?? undefined);
	}
</script>

{#if field.kind === 'text' || field.kind === 'textarea'}
	<Field
		label={field.label}
		required={field.required}
		error={errorFor(field.key)}
		hint={field.hint}
	>
		{#if field.kind === 'textarea'}
			<textarea
				class="input"
				rows="4"
				placeholder={field.placeholder}
				value={String(value ?? '')}
				oninput={(e) => scopePatch(field.key, e.currentTarget.value)}></textarea>
		{:else}
			<input
				class="input"
				type="text"
				placeholder={field.placeholder}
				value={String(value ?? '')}
				oninput={(e) => scopePatch(field.key, e.currentTarget.value)}
			/>
		{/if}
	</Field>
{:else if field.kind === 'number'}
	<Field
		label={field.label}
		required={field.required}
		error={errorFor(field.key)}
		hint={field.hint}
	>
		<input
			class="input"
			type="text"
			inputmode="decimal"
			bind:this={moneyInput}
			placeholder={field.placeholder ?? (field.money ? '单位：元' : undefined)}
			value={moneyText}
			oninput={onMoneyInput}
		/>
		{#if field.unit && !field.money}<span class="field__unit">{field.unit}</span>{/if}
	</Field>
{:else if field.kind === 'date'}
	<Field label={field.label} required={field.required} error={errorFor(field.key)}>
		<input
			class="input"
			type="date"
			value={String(value ?? '')}
			oninput={(e) => scopePatch(field.key, e.currentTarget.value)}
		/>
	</Field>
{:else if field.kind === 'dateRange'}
	<Field label={field.label} required={field.required} error={errorFor(field.toKey)}>
		<div class="date-range">
			<input
				class="input"
				type="date"
				value={String(scopeValue[field.fromKey] ?? '')}
				oninput={(e) => scopePatch(field.fromKey, e.currentTarget.value)}
				aria-label={`${field.label}开始`}
			/>
			<span class="date-range__sep" aria-hidden="true">至</span>
			<input
				class="input"
				type="date"
				value={String(scopeValue[field.toKey] ?? '')}
				oninput={(e) => scopePatch(field.toKey, e.currentTarget.value)}
				aria-label={`${field.label}结束`}
			/>
		</div>
	</Field>
{:else if field.kind === 'select' || field.kind === 'radio'}
	<Field label={field.label} required={field.required} error={errorFor(field.key)}>
		{#if field.kind === 'radio'}
			<div class="radio-group">
				{#each field.options as opt (opt.value)}
					<label class="radio">
						<input
							type="radio"
							name={childPath(field.key)}
							value={opt.value}
							checked={value === opt.value}
							onchange={() => scopePatch(field.key, opt.value)}
						/>
						{opt.label}
					</label>
				{/each}
			</div>
		{:else}
			<select
				class="input"
				value={String(value ?? '')}
				onchange={(e) => scopePatch(field.key, e.currentTarget.value)}
			>
				<option value="" disabled selected={!value}>请选择</option>
				{#each field.options as opt (opt.value)}
					<option value={opt.value}>{opt.label}</option>
				{/each}
			</select>
		{/if}
	</Field>
{:else if field.kind === 'group' || field.kind === 'repeatable'}
	<!-- group/repeatable 由 DynamicForm 委托给专用组件，这里不应被直接渲染 -->
{:else if field.kind === 'custom'}
	<Field label={field.label} error={errorFor(field.key)}>
		{#if children}{@render children()}{/if}
	</Field>
{/if}

<style>
	.input {
		width: 100%;
		padding: 0.5rem 0.75rem;
		border: 1px solid var(--color-slate-300);
		border-radius: var(--radius-md);
		font-size: 0.875rem;
		background: var(--color-white);
	}
	.input:focus {
		outline: 2px solid var(--color-brand-300);
		border-color: var(--color-brand-500);
	}
	textarea.input {
		resize: vertical;
		font-family: inherit;
	}
	.date-range {
		display: flex;
		align-items: center;
		gap: 0.5rem;
		flex-wrap: wrap;
	}
	.date-range__sep {
		color: var(--color-slate-500);
	}
	.radio-group {
		display: flex;
		flex-wrap: wrap;
		gap: 1rem;
	}
	.radio {
		display: inline-flex;
		align-items: center;
		gap: 0.375rem;
		cursor: pointer;
	}
	.field__unit {
		margin-left: 0.5rem;
		color: var(--color-slate-500);
		font-size: 0.875rem;
	}
</style>
