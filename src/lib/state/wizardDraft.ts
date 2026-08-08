import { writable } from 'svelte/store';
import { browser } from '$app/environment';
import type { TravelFormInput } from '$lib/domain/schema';

/**
 * 发起申请向导的草稿。
 *
 * 各步骤是独立路由（`/travel/apply/[step]`），用一份模块级 store 在步骤间传递数据，
 * 并镜像到 localStorage —— 刷新不丢、关页再回可续填（与 requestsStore 的缓存策略一致）。
 * 提交成功后由 PreviewStep 调 `resetDraft()` 清空。
 *
 * 用「完整 TravelFormInput + 默认值」而非 Partial：默认值本身通不过各步 schema，
 * 因此 evaluateSteps() 仍能正确判定哪些步骤未完成；同时避免表单绑定出现 undefined。
 */
export type WizardDraft = TravelFormInput;

const STORAGE_KEY = 'travel-apply-draft';

const DEFAULT_DRAFT: WizardDraft = {
	reason: '',
	urgency: 'normal',
	legs: [],
	budget: { transport: 0, hotel: 0, allowance: 0, other: 0 },
	budgetNote: ''
};

function load(): WizardDraft {
	if (!browser) return { ...DEFAULT_DRAFT };
	try {
		const raw = localStorage.getItem(STORAGE_KEY);
		return raw ? { ...DEFAULT_DRAFT, ...(JSON.parse(raw) as Partial<WizardDraft>) } : { ...DEFAULT_DRAFT };
	} catch {
		return { ...DEFAULT_DRAFT };
	}
}

export const draft = writable<WizardDraft>(load());

if (browser) {
	draft.subscribe((value) => {
		try {
			localStorage.setItem(STORAGE_KEY, JSON.stringify(value));
		} catch {
			// 隐私模式 / 配额满：忽略，下次从默认值重新起草稿
		}
	});
}

/** 把当前步填好的那一片并入草稿（浅合并） */
export function patchDraft(partial: Partial<WizardDraft>): void {
	draft.update((d) => ({ ...d, ...partial }));
}

/** 提交成功后清空，回到一份全新的默认草稿 */
export function resetDraft(): void {
	draft.set({ ...DEFAULT_DRAFT });
}
