import seed from './seed.json' with { type: 'json' };
import { PENDING_STATUSES } from '$lib/domain/types';
import type {
	ApplicationType,
	Budget,
	Request,
	RequestStatus,
	TravelFields,
	User,
	UserId
} from '$lib/domain/types';
import { APPLICATION_TYPES, LEAVE_TYPE_OPTIONS } from '$lib/domain/applicationTypes';
import { budgetTotal, formatYuan } from '$lib/domain/money';
import { transition } from '$lib/domain/workflow';
import type { TripLeg } from '$lib/domain/types';
import { writable, get } from 'svelte/store';
import { PUBLIC_MOCK_BASE_URL } from '$env/static/public';
import { toLocalISO } from '$lib/format/date';

/**
 * [占位] 联调开关。
 *
 * 置为 `true` 后，`loadRequests` 改为请求后端 `/aws/v1` 并在请求头携带
 * `Authorization: Bearer <Qy_token>`（token 取自已持久化的 `Qy_token`）。
 * 置为 `false`（默认）时沿用原有 Apifox Mock 演示数据，逻辑完全不变。
 *
 * 后续与后端联调时，只需把 `USE_BACKEND` 改成 `true` 即可切换数据源，
 * 无需改动下方任何原有 Mock 代码。
 */
const USE_BACKEND = true;
const BACKEND_BASE = '/aws/v1';

/** 组装请求头：联调模式下附加 Bearer token，其余情况仅基础头 */
function buildApiHeaders(): HeadersInit {
	const headers: Record<string, string> = { 'Content-Type': 'application/json' };
	if (USE_BACKEND) {
		const token =
			typeof localStorage !== 'undefined' ? localStorage.getItem('Qy_token') : null;
		if (token) headers['Authorization'] = `Bearer ${token}`;
	}
	return headers;
}

/** 解析数据基址：联调模式用后端 /aws/v1，否则用原有 Mock base */
function resolveBaseUrl(): string {
	return USE_BACKEND ? BACKEND_BASE : PUBLIC_MOCK_BASE_URL;
}

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
 * 2. 应用启动（浏览器端 `loadRequests()`）尝试从云端 Mock 拉取
 *    `GET {PUBLIC_MOCK_BASE_URL}/api/requests`，**3 秒超时**。
 * 3. 成功：写入 localStorage 缓存，替换工作数据集。
 * 4. 超时 / 失败：回退到 localStorage 缓存，再不行用 seed.json。
 *
 * 接口契约为「类型可选」：`/api/requests` 不带 `type` 返回全部；带 `?type=leave`
 * 仅返回该类型。这是为了后续接入真后端时按类型分接口，前端统一 store + 客户端
 * `filterByType` 筛选的现状保持不变 —— 真后端只需支持「无 type = 全部」即可。
 *
 * 写操作（新建 / 流转）目前只落到 `requestsStore` + localStorage，不回写 Mock。
 * 注意返回的是引用共享的数组，调用方若需要不可变语义请自行浅拷贝。
 */
const STORAGE_KEY = 'travel-requests';

function readStorage(): Request[] | null {
	if (typeof localStorage === 'undefined') return null;
	try {
		const raw = localStorage.getItem(STORAGE_KEY);
		const parsed = raw ? (JSON.parse(raw) as Request[]) : null;
		// 丢弃缓存里缺 `type` 的旧形状数据，避免污染新模型
		return parsed ? parsed.filter((r) => 'type' in r) : null;
	} catch {
		return null;
	}
}

function writeStorage(list: Request[]): void {
	if (typeof localStorage === 'undefined') return;
	try {
		localStorage.setItem(STORAGE_KEY, JSON.stringify(list));
	} catch {
		// 隐私模式 / 配额满：忽略，下次从远端或 seed 取
	}
}

/** 工作数据集：随加载结果变化，页面通过 store 订阅自动更新 */
export const requestsStore = writable<Request[]>(readStorage() ?? (seed as unknown as Request[]));

function byUpdatedDesc(a: Request, b: Request): number {
	return b.updatedAt.localeCompare(a.updatedAt);
}

/**
 * 按「首次提交时间」倒序（最新提交在前）。
 *
 * 草稿没有 `submittedAt`，用空串兜底沉到末尾，保证有实际提交记录的单据始终排在前面。
 * 列表（我的申请 / 待我审批）统一走此排序，让卡片以提交时间先后呈现。
 */
export function sortBySubmittedAtDesc(requests: readonly Request[]): Request[] {
	return [...requests].sort((a, b) => (b.submittedAt ?? '').localeCompare(a.submittedAt ?? ''));
}

/**
 * 启动加载 / 按类型刷新：`/api/requests`（不带 type 取全部；带 `?type=` 取单类型）。
 *
 * 统一 store 策略下，带 type 的调用会把远端返回**并入**现有数据集（按 id 去重），
 * 保留其它类型，避免「待我审批 / 报表全量」等跨类型视图被一次单类型请求清空；
 * 不带 type 的启动调用则整体替换（与缓存策略一致）。
 */
export async function loadRequests(type?: ApplicationType): Promise<void> {
	const base = resolveBaseUrl();
	if (!base) {
		requestsStore.set(readStorage() ?? (seed as unknown as Request[]));
		return;
	}

	// 联调模式走 /aws/v1/requests，否则沿用原 Mock 的 /api/requests
	const endpoint = USE_BACKEND
		? `${base}/requests`
		: `${base.replace(/\/$/, '')}/api/requests`;
	const url = new URL(endpoint);
	if (type) url.searchParams.set('type', type);

	const controller = new AbortController();
	const timer = setTimeout(() => controller.abort(), 3000);
	try {
		const res = await fetch(url, { headers: buildApiHeaders(), signal: controller.signal });
		if (!res.ok) throw new Error(`接口返回 ${res.status}`);
		const data = (await res.json()) as Request[];
		const sorted = [...data].sort(byUpdatedDesc);

		if (type) {
			// 按类型拉取：并入统一 store（按 id 去重），保留其它类型数据。
			requestsStore.update((list) => {
				const byId = new Map(list.map((r) => [r.id, r]));
				for (const r of sorted) byId.set(r.id, r);
				return [...byId.values()].sort(byUpdatedDesc);
			});
		} else {
			requestsStore.set(sorted);
		}
		writeStorage(get(requestsStore));
	} catch {
		// 超时（AbortError）或网络错误：降级到缓存 / seed，保证页面永远有数据
		requestsStore.set(readStorage() ?? (seed as unknown as Request[]));
	} finally {
		clearTimeout(timer);
	}
}

/** 全部申请单（按更新时间倒序，与 Mock 响应约定一致） */
export function getAllRequests(): readonly Request[] {
	return get(requestsStore);
}

/** 按业务单号取单条；不存在返回 undefined（详情页据此走「未找到」分支） */
export function getRequestById(
	id: string,
	requests: readonly Request[] = get(requestsStore)
): Request | undefined {
	return requests.find((r) => r.id === id);
}

/**
 * 用流转后的新对象替换工作数据集里的旧记录，并同步 localStorage 缓存。
 *
 * 写操作只落本地（与 loadRequests 的缓存策略一致）：云端 Mock 是只读的，
 * 这里改了不会回写，刷新后若 Mock 优先加载会丢掉改动 —— 演示范围内可接受。
 */
export function updateRequest(updated: Request): void {
	requestsStore.update((list) => {
		const next = list.map((r) => (r.id === updated.id ? updated : r));
		writeStorage(next);
		return next;
	});
}

/**
 * 删除一张申请单。
 *
 * 仅草稿允许删除，调用方需先经 {@link isDeletable} 校验；与 updateRequest 一样只落本地
 * localStorage 缓存（云端 Mock 只读，删除不会回写远端）。删除后该 id 从工作数据集消失，
 * 列表/详情订阅会自动刷新。
 */
export function deleteRequest(id: string): void {
	requestsStore.update((list) => {
		const next = list.filter((r) => r.id !== id);
		writeStorage(next);
		return next;
	});
}

/** 某用户发起的全部申请（我的申请 / 待我审批都从这里再按角色筛） */
export function getRequestsByApplicant(
	applicantId: UserId,
	requests: readonly Request[] = get(requestsStore)
): Request[] {
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
	requests: readonly Request[],
	filter: StatusFilter | undefined
): Request[] {
	if (!filter || filter === 'all') return [...requests];
	if (filter === 'pending')
		return requests.filter((r) => PENDING_STATUSES.some((s) => r.status === s));
	return requests.filter((r) => r.status === filter);
}

/** 按申请类型过滤（列表/统计按业务线切分） */
export function filterByType(requests: readonly Request[], type: ApplicationType): Request[] {
	return requests.filter((r) => r.type === type);
}

/**
 * 按事由与目的地（行程任意一段的 from/to）模糊搜索。
 * 大小写不敏感，空串视为不过滤。非差旅类型（无 legs）仅匹配事由。
 */
export function searchRequests(requests: readonly Request[], keyword: string): Request[] {
	const kw = keyword.trim().toLowerCase();
	if (kw === '') return [...requests];

	return requests.filter((r) => {
		const fields = r.fields as Partial<TravelFields>;
		const inReason = String(fields.reason ?? '')
			.toLowerCase()
			.includes(kw);
		const legs = (fields.legs ?? []) as TripLeg[];
		const inLeg = legs.some(
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
	requests: readonly Request[],
	year: number | 'all',
	month: number | 'all'
): Request[] {
	return requests.filter((r) => {
		const d = new Date(r.createdAt);
		if (year !== 'all' && d.getUTCFullYear() !== year) return false;
		if (month !== 'all' && d.getUTCMonth() + 1 !== month) return false;
		return true;
	});
}

/** 数据里出现过的年份（倒序），用于年份下拉框的可选项 */
export function distinctYears(requests: readonly Request[]): number[] {
	const years = new Set<number>();
	for (const r of requests) years.add(new Date(r.createdAt).getUTCFullYear());
	return [...years].sort((a, b) => b - a);
}

/** 行程摘要，形如「北京 → 上海 → 广州」（差旅专用；空行程返回「无行程」） */
export function summarizeLegs(request: Request): string {
	const legs = (request.fields as Partial<TravelFields>).legs as TripLeg[] | undefined;
	if (!legs || legs.length === 0) return '无行程';
	const stops = legs.flatMap((leg) => [leg.from, leg.to]);
	return [...new Set(stops)].join(' → ');
}

/** 预算合计（分） */
export function requestTotal(request: Request): number {
	const budget = (request.fields as Partial<TravelFields>).budget as Budget | undefined;
	return budget ? budgetTotal(budget) : 0;
}

/**
 * 卡片副标题：随申请类型给出一行摘要。
 * 差旅=行程城市链；请假=请假类型 + 日期区间。取代原本写死差旅的 summarizeLegs，
 * 让列表 / 审批卡片对新增类型也能给出有意义的描述。
 */
export function requestSummary(request: Request): string {
	if (request.type === 'leave') {
		const f = request.fields as Record<string, unknown>;
		const start = f.leaveStart as string | undefined;
		const end = f.leaveEnd as string | undefined;
		const type = f.leaveType as string | undefined;
		const typeLabel = type ? (LEAVE_TYPE_OPTIONS.find((o) => o.value === type)?.label ?? type) : '';
		const range = [start, end].filter(Boolean).join(' ~ ');
		return [typeLabel, range].filter(Boolean).join(' · ') || '请假申请';
	}
	return summarizeLegs(request);
}

/**
 * 卡片底部指标：差旅=预算合计（元），请假=请假天数。
 * 返回 { label, value } 由卡片直接渲染，避免卡片内部再按类型分支。
 */
export function requestMetric(request: Request): { label: string; value: string } {
	if (request.type === 'leave') {
		const f = request.fields as Record<string, unknown>;
		const start = f.leaveStart as string | undefined;
		const end = f.leaveEnd as string | undefined;
		const days =
			start && end
				? Math.max(0, Math.round((Date.parse(end) - Date.parse(start)) / 86_400_000) + 1)
				: 0;
		return { label: '请假天数', value: `${days} 天` };
	}
	return { label: '预算合计', value: `¥${formatYuan(requestTotal(request))}` };
}

/** 由现有单号（如 TR-#### / LV-####）推算下一个，保证新单号唯一且连续 */
export function nextRequestId(
	type: ApplicationType,
	requests: readonly Request[] = get(requestsStore)
): string {
	const prefix = APPLICATION_TYPES[type].idPrefix;
	let max = 0;
	for (const r of requests) {
		if (!r.id.startsWith(`${prefix}-`)) continue;
		const n = Number(r.id.slice(prefix.length + 1));
		if (Number.isFinite(n) && n > max) max = n;
	}
	return `${prefix}-${String(max + 1).padStart(4, '0')}`;
}

function buildBase(
	type: ApplicationType,
	fields: Record<string, unknown>,
	applicant: User
): Request {
	const now = toLocalISO();
	return {
		id: nextRequestId(type),
		type,
		applicantId: applicant.id,
		applicantName: applicant.name,
		department: applicant.department,
		status: 'draft',
		createdAt: now,
		updatedAt: now,
		audit: [],
		fields
	};
}

/**
 * 由向导的整单表单数据新建一张申请并直接提交（draft → pending_manager）。
 *
 * 内部走 workflow 的 submit 流转，自动追加首条 audit（记录提交人与提交时间），
 * 与「草稿再提交」共用同一套状态机，避免规则漂移。
 */
export function createRequest(
	type: ApplicationType,
	fields: Record<string, unknown>,
	applicant: User
): Request {
	const base = buildBase(type, fields, applicant);
	const result = transition({ request: base, action: 'submit', actor: applicant });
	if (!result.ok) throw new Error(result.message);
	return result.request;
}

/**
 * 由向导整单表单数据新建一条「草稿」申请，不提交（不走 submit 流转）。
 *
 * 草稿不要求字段齐全，直接落当前填写内容；无审计、无提交时间，状态停 `draft`。
 * 用户可从「我的申请」的草稿卡片继续编辑。
 */
export function createDraft(
	type: ApplicationType,
	fields: Record<string, unknown>,
	applicant: User
): Request {
	return buildBase(type, fields, applicant);
}

/** 把新单插入工作数据集（置顶）并同步 localStorage 缓存 */
export function addRequest(request: Request): void {
	requestsStore.update((list) => {
		const next = [request, ...list];
		writeStorage(next);
		return next;
	});
}

/**
 * 重新编辑后提交：在原有申请上套用新表单数据并走 submit 流转（draft → pending_manager）。
 *
 * 与 {@link createRequest} 的区别是**不生成新的编号** —— 保留原单号、申请人、
 * 创建时间、审计轨迹，只更新用户填写部分并追加一条新的提交审计。被驳回 → 草稿 →
 * 再提交的闭环由此闭合。
 */
export function updateRequestFromDraft(
	id: string,
	type: ApplicationType,
	fields: Record<string, unknown>,
	actor: User
): Request {
	const existing = getRequestById(id);
	if (!existing) throw new Error('申请不存在');
	const now = new Date().toISOString();
	const updated: Request = {
		...existing,
		type,
		fields,
		updatedAt: now
	};
	const result = transition({ request: updated, action: 'submit', actor });
	if (!result.ok) throw new Error(result.message);
	updateRequest(result.request);
	return result.request;
}
