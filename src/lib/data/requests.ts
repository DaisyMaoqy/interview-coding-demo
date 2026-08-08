import seed from './seed.json' with { type: 'json' };
import type { RequestStatus, TravelRequest, User, UserId } from '$lib/domain/types';
import { budgetTotal } from '$lib/domain/money';
import { transition } from '$lib/domain/workflow';
import type { TravelFormInput } from '$lib/domain/schema';
import { writable, get } from 'svelte/store';
import { PUBLIC_MOCK_BASE_URL } from '$env/static/public';

/**
 * 列表筛选维度。
 *
 * - `'all'`：不限制状态
 * - `'pending'`：审批中，即 `pending_manager` + `pending_finance` 两个状态的合集
 * - 其余为单一 {@link RequestStatus}
 */
export type StatusFilter = 'all' | RequestStatus | 'pending';

/**
 * 申请单数据源（演示用）。
 *
 * 数据获取策略（单一变化点，页面层不关心数据从哪来）：
 *
 * 1. 工作数据集 `requestsStore` 初始为「localStorage 缓存 → seed.json 兜底」。
 * 2. 应用启动（浏览器端 `loadRequests()`）尝试从 Apifox 云端 Mock 拉取
 *    `GET {PUBLIC_MOCK_BASE_URL}/api/travel/applications`，**3 秒超时**。
 * 3. 成功：写入 localStorage 缓存，替换工作数据集。
 * 4. 超时 / 失败：回退到 localStorage 缓存，再不行用 seed.json。
 *
 * 写操作（新建 / 流转）目前只落到 `requestsStore` + localStorage，不回写 Mock。
 * 注意返回的是引用共享的数组，调用方若需要不可变语义请自行浅拷贝。
 */
const STORAGE_KEY = 'travel-requests';

function readStorage(): TravelRequest[] | null {
	if (typeof localStorage === 'undefined') return null;
	try {
		const raw = localStorage.getItem(STORAGE_KEY);
		return raw ? (JSON.parse(raw) as TravelRequest[]) : null;
	} catch {
		return null;
	}
}

function writeStorage(list: TravelRequest[]): void {
	if (typeof localStorage === 'undefined') return;
	try {
		localStorage.setItem(STORAGE_KEY, JSON.stringify(list));
	} catch {
		// 隐私模式 / 配额满：忽略，下次从远端或 seed 取
	}
}

/** 工作数据集：随加载结果变化，页面通过 store 订阅自动更新 */
export const requestsStore = writable<TravelRequest[]>(readStorage() ?? (seed as TravelRequest[]));

function byUpdatedDesc(a: TravelRequest, b: TravelRequest): number {
	return b.updatedAt.localeCompare(a.updatedAt);
}

/**
 * 按「首次提交时间」倒序（最新提交在前）。
 *
 * 草稿没有 `submittedAt`，用空串兜底沉到末尾，保证有实际提交记录的单据始终排在前面。
 * 列表（我的申请 / 待我审批）统一走此排序，让卡片以提交时间先后呈现。
 */
export function sortBySubmittedAtDesc(requests: readonly TravelRequest[]): TravelRequest[] {
	return [...requests].sort((a, b) => (b.submittedAt ?? '').localeCompare(a.submittedAt ?? ''));
}

/** 启动加载：Apifox Mock → localStorage 缓存 → seed.json 兜底 */
export async function loadRequests(): Promise<void> {
	const base = PUBLIC_MOCK_BASE_URL;
	if (!base) {
		requestsStore.set(readStorage() ?? (seed as TravelRequest[]));
		return;
	}

	const controller = new AbortController();
	const timer = setTimeout(() => controller.abort(), 3000);
	try {
		const res = await fetch(`${base}/api/travel/applications`, { signal: controller.signal });
		if (!res.ok) throw new Error(`Mock 接口返回 ${res.status}`);
		const data = (await res.json()) as TravelRequest[];
		const sorted = [...data].sort(byUpdatedDesc);
		writeStorage(sorted);
		requestsStore.set(sorted);
	} catch {
		// 超时（AbortError）或网络错误：降级到缓存 / seed，保证页面永远有数据
		requestsStore.set(readStorage() ?? (seed as TravelRequest[]));
	} finally {
		clearTimeout(timer);
	}
}

/** 全部申请单（按更新时间倒序，与 Mock 响应约定一致） */
export function getAllRequests(): readonly TravelRequest[] {
	return get(requestsStore);
}

/** 按业务单号取单条；不存在返回 undefined（详情页据此走「未找到」分支） */
export function getRequestById(
	id: string,
	requests: readonly TravelRequest[] = get(requestsStore)
): TravelRequest | undefined {
	return requests.find((r) => r.id === id);
}

/**
 * 用流转后的新对象替换工作数据集里的旧记录，并同步 localStorage 缓存。
 *
 * 写操作只落本地（与 loadRequests 的缓存策略一致）：云端 Mock 是只读的，
 * 这里改了不会回写，刷新后若 Mock 优先加载会丢掉改动 —— 演示范围内可接受。
 */
export function updateRequest(updated: TravelRequest): void {
	requestsStore.update((list) => {
		const next = list.map((r) => (r.id === updated.id ? updated : r));
		writeStorage(next);
		return next;
	});
}

/** 某用户发起的全部申请（我的申请 / 待我审批都从这里再按角色筛） */
export function getRequestsByApplicant(
	applicantId: UserId,
	requests: readonly TravelRequest[] = get(requestsStore)
): TravelRequest[] {
	return requests.filter((r) => r.applicantId === applicantId);
}

/**
 * 按筛选维度过滤。
 *
 * - `'all'`：全部
 * - `'pending'`：审批中（pending_manager 或 pending_finance）
 * - 其余：精确匹配该状态
 */
export function filterByStatus(
	requests: readonly TravelRequest[],
	filter: StatusFilter | undefined
): TravelRequest[] {
	if (!filter || filter === 'all') return [...requests];
	if (filter === 'pending')
		return requests.filter((r) => r.status === 'pending_manager' || r.status === 'pending_finance');
	return requests.filter((r) => r.status === filter);
}

/**
 * 按事由与目的地（行程任意一段的 from/to）模糊搜索。
 * 大小写不敏感，空串视为不过滤。
 */
export function searchRequests(
	requests: readonly TravelRequest[],
	keyword: string
): TravelRequest[] {
	const kw = keyword.trim().toLowerCase();
	if (kw === '') return [...requests];

	return requests.filter((r) => {
		const inReason = r.reason.toLowerCase().includes(kw);
		const inLeg = r.legs.some(
			(leg) => leg.from.toLowerCase().includes(kw) || leg.to.toLowerCase().includes(kw)
		);
		return inReason || inLeg;
	});
}

/**
 * 按申请创建时间的年/月过滤。
 *
 * 两个维度独立：年份或月份为 `'all'` 表示该维度不限制。
 * 用 UTC 解析，与 seed 生成（Date.UTC）保持一致，避免时区导致跨月错位。
 */
export function filterByDate(
	requests: readonly TravelRequest[],
	year: number | 'all',
	month: number | 'all'
): TravelRequest[] {
	return requests.filter((r) => {
		const d = new Date(r.createdAt);
		if (year !== 'all' && d.getUTCFullYear() !== year) return false;
		if (month !== 'all' && d.getUTCMonth() + 1 !== month) return false;
		return true;
	});
}

/** 数据里出现过的年份（倒序），用于年份下拉框的可选项 */
export function distinctYears(requests: readonly TravelRequest[]): number[] {
	const years = new Set<number>();
	for (const r of requests) years.add(new Date(r.createdAt).getUTCFullYear());
	return [...years].sort((a, b) => b - a);
}

/** 行程摘要，形如「北京 → 上海 → 广州」 */
export function summarizeLegs(request: TravelRequest): string {
	if (request.legs.length === 0) return '无行程';
	const stops = request.legs.flatMap((leg) => [leg.from, leg.to]);
	return [...new Set(stops)].join(' → ');
}

/** 预算合计（分） */
export function requestTotal(request: TravelRequest): number {
	return budgetTotal(request.budget);
}

/** 由现有单号（TR-####）推算下一个，保证新单号唯一且连续 */
export function nextRequestId(requests: readonly TravelRequest[] = get(requestsStore)): string {
	let max = 0;
	for (const r of requests) {
		const n = Number(r.id.replace(/^TR-/, ''));
		if (Number.isFinite(n) && n > max) max = n;
	}
	return `TR-${String(max + 1).padStart(4, '0')}`;
}

/**
 * 由向导的整单表单数据新建一张申请并直接提交（draft → pending_manager）。
 *
 * 内部走 workflow 的 submit 流转，自动追加首条 audit（记录提交人与提交时间），
 * 与「草稿再提交」共用同一套状态机，避免规则漂移。
 */
export function createRequest(input: TravelFormInput, applicant: User): TravelRequest {
	const now = new Date().toISOString();
	const base: TravelRequest = {
		id: nextRequestId(),
		applicantId: applicant.id,
		applicantName: applicant.name,
		department: applicant.department,
		reason: input.reason,
		urgency: input.urgency,
		legs: input.legs,
		budget: input.budget,
		budgetNote: input.budgetNote,
		status: 'draft',
		createdAt: now,
		updatedAt: now,
		audit: []
	};

	const result = transition({ request: base, action: 'submit', actor: applicant });
	if (!result.ok) throw new Error(result.message);
	return result.request;
}

/** 把新单插入工作数据集（置顶）并同步 localStorage 缓存 */
export function addRequest(request: TravelRequest): void {
	requestsStore.update((list) => {
		const next = [request, ...list];
		writeStorage(next);
		return next;
	});
}

/**
 * 重新编辑后提交：在原有申请上套用新表单数据并走 submit 流转（draft → pending_manager）。
 *
 * 与 {@link createRequest} 的区别是**不生成新的 TR 编号** —— 保留原单号、申请人、
 * 创建时间、审计轨迹，只更新用户填写部分并追加一条新的提交审计。被驳回 → 草稿 →
 * 再提交的闭环由此闭合。
 */
export function updateRequestFromDraft(
	id: string,
	input: TravelFormInput,
	actor: User
): TravelRequest {
	const existing = getRequestById(id);
	if (!existing) throw new Error('申请不存在');
	const now = new Date().toISOString();
	const updated: TravelRequest = {
		...existing,
		reason: input.reason,
		urgency: input.urgency,
		legs: input.legs,
		budget: input.budget,
		budgetNote: input.budgetNote,
		updatedAt: now
	};
	const result = transition({ request: updated, action: 'submit', actor });
	if (!result.ok) throw new Error(result.message);
	updateRequest(result.request);
	return result.request;
}
