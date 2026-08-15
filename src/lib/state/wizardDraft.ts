import { writable } from 'svelte/store';
import { browser } from '$app/environment';
import type { ApplicationType } from '$lib/domain/types';
import { setActiveEditId } from '$lib/domain/wizard';

/**
 * 发起申请向导的草稿。
 *
 * 各步骤是独立路由（`/apply/[type]/[step]`），用一份模块级 store 在步骤间传递数据，
 * 并镜像到 localStorage —— 刷新不丢、关页再回可续填。
 *
 * 草稿现在是「业务字段包」`Record<string, unknown>`，结构由 `applicationTypes.ts`
 * 的字段配置决定（不再绑定差旅的 TravelFormInput）。按申请类型分桶持久化，
 * 避免切换类型时不同申请的字段互相串台。
 *
 * 不再预设默认值：未填字段即 undefined，evaluateSteps() 据此正确判定步骤未完成；
 * 表单绑定统一走 `patchDraft`，不会读到 undefined 之外的脏值。
 */
export type WizardDraft = Record<string, unknown>;

let currentType: ApplicationType = 'travel';

/** 进入某类型的向导时调用，决定草稿从哪个 localStorage 桶读写 */
export function setDraftType(type: ApplicationType): void {
	currentType = type;
}

/**
 * 新建入口进入某类型向导时调用：若与上一次草稿类型不同，清空草稿避免串台；
 * 编辑态不走这里（loadDraftForEdit 会按被编辑单的类型回填）。
 */
export function ensureDraftType(type: ApplicationType): void {
	if (currentType !== type) {
		currentType = type;
		draft.set({});
	}
}

const STORAGE_PREFIX = 'apply-draft:';

function storageKey(): string {
	return `${STORAGE_PREFIX}${currentType}`;
}

function load(): WizardDraft {
	if (!browser) return {};
	try {
		const raw = localStorage.getItem(storageKey());
		return raw ? (JSON.parse(raw) as WizardDraft) : {};
	} catch {
		return {};
	}
}

export const draft = writable<WizardDraft>(load());

if (browser) {
	draft.subscribe((value) => {
		try {
			localStorage.setItem(storageKey(), JSON.stringify(value));
		} catch {
			// 隐私模式 / 配额满：忽略，下次重新起草稿
		}
	});
}

/** 把当前步填好的那一片并入草稿（浅合并） */
export function patchDraft(partial: Partial<WizardDraft>): void {
	draft.update((d) => ({ ...d, ...partial }));
}

/** 提交成功后清空，回到一份全新的空草稿 */
export function resetDraft(): void {
	draft.set({});
}

/**
 * 重新编辑：把被编辑申请的业务字段回填进草稿，向导各步骤即可像新建一样直接改。
 * 同时设定草稿类型与目标单号（编辑态上下文），原单身份/审计信息留到提交时再合并。
 */
export function loadDraftForEdit(request: {
	type: ApplicationType;
	id: string;
	fields: Record<string, unknown>;
}): void {
	setDraftType(request.type);
	setActiveEditId(request.id);
	// 深拷贝字段，避免编辑草稿时（如 push 行程段）误改原申请单的数据
	draft.set(structuredClone(request.fields));
}
