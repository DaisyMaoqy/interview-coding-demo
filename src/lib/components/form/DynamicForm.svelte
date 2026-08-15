<script lang="ts">
	import type { FieldDef } from '$lib/domain/applicationTypes';
	import DynamicField from './DynamicField.svelte';
	import GroupField from './GroupField.svelte';
	import RepeatableField from './RepeatableField.svelte';

	interface Props {
		fields: FieldDef[];
		value: Record<string, unknown>;
		errors?: Record<string, string>;
		onPatch: (key: string, value: unknown) => void;
		touched?: Record<string, boolean>;
		attempted?: boolean;
		markTouched?: (path: string) => void;
	}

	let {
		fields,
		value,
		errors = {},
		onPatch,
		touched = {},
		attempted = false,
		markTouched = () => {}
	}: Props = $props();
</script>

<div class="dynamic-form">
	{#each fields as field (field.key)}
		{#if field.kind === 'group'}
			<GroupField
				{field}
				scopeValue={value}
				scopePatch={onPatch}
				{errors}
				{touched}
				{attempted}
				{markTouched}
			/>
		{:else if field.kind === 'repeatable'}
			<RepeatableField
				{field}
				scopeValue={value}
				scopePatch={onPatch}
				{errors}
				{touched}
				{attempted}
				{markTouched}
			/>
		{:else}
			<DynamicField
				{field}
				scopeValue={value}
				scopePatch={onPatch}
				{errors}
				{touched}
				{attempted}
				{markTouched}
			/>
		{/if}
	{/each}
</div>

<style>
	.dynamic-form {
		display: flex;
		flex-direction: column;
		gap: 1.25rem;
	}
</style>
