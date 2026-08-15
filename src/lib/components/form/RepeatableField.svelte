<script lang="ts">
	import type { FieldDef } from '$lib/domain/applicationTypes';
	import DynamicField from './DynamicField.svelte';

	interface Props {
		field: Extract<FieldDef, { kind: 'repeatable' }>;
		scopeValue: Record<string, unknown>;
		scopePatch: (key: string, value: unknown) => void;
		basePath?: string;
		errors?: Record<string, string>;
		touched?: Record<string, boolean>;
		attempted?: boolean;
		markTouched?: (path: string) => void;
	}

	let {
		field,
		scopeValue,
		scopePatch,
		basePath = '',
		errors = {},
		touched = {},
		attempted = false,
		markTouched = () => {}
	}: Props = $props();

	const rows = $derived(
		Array.isArray(scopeValue[field.key]) ? (scopeValue[field.key] as Record<string, unknown>[]) : []
	);
	const childBase = $derived(basePath ? `${basePath}${field.key}.` : `${field.key}.`);

	function defaultValue(f: FieldDef): unknown {
		if (f.kind === 'select' || f.kind === 'radio') return f.options[0]?.value ?? '';
		if (f.kind === 'number') return f.money ? 0 : 0;
		return '';
	}

	function newRow(): void {
		const row: Record<string, unknown> = {
			[field.itemKey]: `row-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 7)}`
		};
		for (const f of field.itemFields) row[f.key] = defaultValue(f);
		scopePatch(field.key, [...rows, row]);
	}

	function removeRow(index: number): void {
		scopePatch(
			field.key,
			rows.filter((_, i) => i !== index)
		);
	}

	function patchRow(index: number, subKey: string, value: unknown): void {
		scopePatch(
			field.key,
			rows.map((r, i) => (i === index ? { ...r, [subKey]: value } : r))
		);
	}
</script>

<fieldset class="repeat">
	<legend class="repeat__legend">{field.label}</legend>

	{#each rows as row, index (row[field.itemKey] as string)}
		<div class="repeat__row">
			<div class="repeat__fields">
				{#each field.itemFields as sub (sub.key)}
					<DynamicField
						field={sub}
						scopeValue={row}
						scopePatch={(k, v) => patchRow(index, k, v)}
						basePath={`${childBase}${index}.`}
						{errors}
						{touched}
						{attempted}
						{markTouched}
					/>
				{/each}
			</div>
			<button
				type="button"
				class="repeat__remove"
				onclick={() => removeRow(index)}
				aria-label="删除此行">删除</button
			>
		</div>
	{/each}

	<button type="button" class="btn btn--ghost repeat__add" onclick={newRow}
		>{field.addLabel ?? '添加'}</button
	>
</fieldset>

<style>
	.repeat {
		border: 1px solid var(--color-slate-200);
		border-radius: var(--radius-lg);
		padding: 1rem 1.25rem 0.5rem;
		margin: 0;
	}
	.repeat__legend {
		font-size: 0.875rem;
		font-weight: 600;
		color: var(--color-slate-700);
		padding: 0 0.5rem;
	}
	.repeat__row {
		display: flex;
		align-items: flex-start;
		gap: 0.75rem;
		padding: 0.75rem 0;
		border-bottom: 1px dashed var(--color-slate-200);
	}
	.repeat__fields {
		flex: 1;
		display: grid;
		grid-template-columns: repeat(auto-fit, minmax(180px, 1fr));
		gap: 0.75rem 1rem;
	}
	.repeat__remove {
		flex-shrink: 0;
		margin-top: 0.25rem;
		font-size: 0.8125rem;
		color: var(--color-rose-600);
		background: none;
		border: none;
		cursor: pointer;
	}
	.repeat__remove:hover {
		text-decoration: underline;
	}
	.repeat__add {
		margin: 0.75rem 0;
	}
</style>
