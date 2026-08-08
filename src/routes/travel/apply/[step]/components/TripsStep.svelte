<script lang="ts">
	import { goto } from '$app/navigation';
	import { page } from '$app/state';
	import { draft, patchDraft } from '$lib/state/wizardDraft';
	import { tripsSchema, validate, type FieldErrors } from '$lib/domain/schema';
	import { nextStep, stepHref, prevStep } from '$lib/domain/wizard';
	import { TRANSPORT_LABELS } from '$lib/domain/workflow';
	import type { TripLeg, Transport } from '$lib/domain/types';
	import WizardFooter from './WizardFooter.svelte';

	// 编辑态由 URL 的 ?edit=ID 决定，步骤跳转需带上它以保持编辑上下文
	const editId = $derived(page.url.searchParams.get('edit'));

	// 交通方式中文名统一取自 workflow 的 TRANSPORT_LABELS（行程表/详情页共用），避免各处的叫法漂移
	const TRANSPORTS: ReadonlyArray<{ value: Transport; label: string }> = (
		Object.keys(TRANSPORT_LABELS) as Transport[]
	).map((value) => ({ value, label: TRANSPORT_LABELS[value] }));

	let errors = $state<FieldErrors>({});

	function newLeg(): TripLeg {
		return {
			id: `leg-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
			from: '',
			to: '',
			departDate: '',
			returnDate: '',
			transport: 'train'
		};
	}

	// 每次改动都生成新数组并写回草稿，保证响应式与 localStorage 持久化都生效
	function updateLeg(index: number, patch: Partial<TripLeg>): void {
		patchDraft({ legs: $draft.legs.map((leg, i) => (i === index ? { ...leg, ...patch } : leg)) });
	}

	function addLeg(): void {
		patchDraft({ legs: [...$draft.legs, newLeg()] });
	}

	function removeLeg(index: number): void {
		patchDraft({ legs: $draft.legs.filter((_, i) => i !== index) });
	}

	function errorFor(index: number, field: string): string | undefined {
		return errors[`legs.${index}.${field}`];
	}

	function onNext(): void {
		const result = validate(tripsSchema, $draft);
		if (!result.ok) {
			errors = result.errors;
			return;
		}
		errors = {};
		const next = nextStep('trips');
		// eslint-disable-next-line svelte/no-navigation-without-resolve
		if (next) goto(stepHref(next, editId));
	}
</script>

<section id="legs" class="step-card">
	{#if $draft.legs.length === 0}
		<p class="empty">还没有行程，先添加第一段。</p>
	{:else}
		{#each $draft.legs as leg, i (leg.id)}
			<div class="leg">
				<div class="leg__head">
					<span class="leg__index">第 {i + 1} 段</span>
					<button type="button" class="leg__remove" onclick={() => removeLeg(i)}>删除</button>
				</div>
				<div class="leg__grid">
					<label class="field">
						<span class="field__label">出发地</span>
						<input
							class="field__input"
							value={leg.from}
							oninput={(e) => updateLeg(i, { from: e.currentTarget.value })}
						/>
						{#if errorFor(i, 'from')}<p class="field__error">{errorFor(i, 'from')}</p>{/if}
					</label>
					<label class="field">
						<span class="field__label">目的地</span>
						<input
							class="field__input"
							value={leg.to}
							oninput={(e) => updateLeg(i, { to: e.currentTarget.value })}
						/>
						{#if errorFor(i, 'to')}<p class="field__error">{errorFor(i, 'to')}</p>{/if}
					</label>
					<label class="field">
						<span class="field__label">出发日期</span>
						<input
							type="date"
							class="field__input"
							value={leg.departDate}
							oninput={(e) => updateLeg(i, { departDate: e.currentTarget.value })}
						/>
						{#if errorFor(i, 'departDate')}<p class="field__error">{errorFor(i, 'departDate')}</p>{/if}
					</label>
					<label class="field">
						<span class="field__label">返回日期</span>
						<input
							type="date"
							class="field__input"
							value={leg.returnDate}
							oninput={(e) => updateLeg(i, { returnDate: e.currentTarget.value })}
						/>
						{#if errorFor(i, 'returnDate')}<p class="field__error">{errorFor(i, 'returnDate')}</p>{/if}
					</label>
					<label class="field">
						<span class="field__label">交通方式</span>
						<select
							class="field__input"
							value={leg.transport}
							onchange={(e) => updateLeg(i, { transport: e.currentTarget.value as Transport })}
						>
							{#each TRANSPORTS as t (t.value)}
								<option value={t.value}>{t.label}</option>
							{/each}
						</select>
					</label>
				</div>
			</div>
		{/each}
	{/if}

	{#if errors.legs}<p class="field__error">{errors.legs}</p>{/if}

	<button type="button" class="btn btn--ghost" onclick={addLeg}>+ 添加一段行程</button>
</section>

<WizardFooter prevHref={stepHref(prevStep('trips')!, editId)} primaryLabel="下一步" onPrimary={onNext} />

<style>
	.leg {
		border: 1px solid var(--color-slate-200);
		border-radius: var(--radius-card);
		padding: 0.75rem;
		margin-bottom: 0.75rem;
	}
	.leg__head {
		display: flex;
		align-items: center;
		justify-content: space-between;
		margin-bottom: 0.75rem;
	}
	.leg__index {
		font-size: 0.875rem;
		font-weight: 500;
		color: var(--color-slate-700);
	}
	.leg__remove {
		font-size: 0.8125rem;
		color: var(--color-rose-600);
	}
	.leg__grid {
		display: grid;
		grid-template-columns: repeat(auto-fit, minmax(160px, 1fr));
		gap: 0.75rem;
	}
</style>
