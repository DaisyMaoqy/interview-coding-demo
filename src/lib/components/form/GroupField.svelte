<script lang="ts">
	import type { FieldDef } from '$lib/domain/applicationTypes';
	import DynamicField from './DynamicField.svelte';

	interface Props {
		field: Extract<FieldDef, { kind: 'group' }>;
		scopeValue: Record<string, unknown>;
		scopePatch: (key: string, value: unknown) => void;
		basePath?: string;
		errors?: Record<string, string>;
	}

	let { field, scopeValue, scopePatch, basePath = '', errors = {} }: Props = $props();

	const groupValue = $derived((scopeValue[field.key] as Record<string, unknown>) ?? {});
	const childBase = $derived(basePath ? `${basePath}${field.key}.` : `${field.key}.`);

	function patch(subKey: string, value: unknown): void {
		scopePatch(field.key, { ...groupValue, [subKey]: value });
	}
</script>

<fieldset class="group">
	<legend class="group__legend">{field.label}</legend>
	<div class="group__body">
		{#each field.fields as sub (sub.key)}
			<DynamicField
				field={sub}
				scopeValue={groupValue}
				scopePatch={patch}
				basePath={childBase}
				{errors}
			/>
		{/each}
	</div>
</fieldset>

<style>
	.group {
		border: 1px solid var(--color-slate-200);
		border-radius: var(--radius-lg);
		padding: 1rem 1.25rem 0.5rem;
		margin: 0;
	}
	.group__legend {
		font-size: 0.875rem;
		font-weight: 600;
		color: var(--color-slate-700);
		padding: 0 0.5rem;
	}
	.group__body {
		display: flex;
		flex-direction: column;
		gap: 1rem;
	}
</style>
