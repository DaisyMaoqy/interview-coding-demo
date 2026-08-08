/**
 * 差旅申请领域模型。
 *
 * 两条贯穿全局的约定：
 * 1. 金额一律用「分」为单位的整数存储，只在 UI 边界转成「元」，见 money.ts。
 * 2. 日期用 `YYYY-MM-DD` 字符串，可直接字典序比较，避免时区问题；
 *    时间戳则用完整 ISO 字符串。
 */

/**
 * 用户主键ID用UUID而非自增数字
 * 主键不该携带业务含义，不能动
 * 对外展示工号 `employeeId`
 */
export type UserId = string;

/** 角色决定能看到哪些导航与页面，不决定身份 —— 切角色即切当前登录人 */
export type Role = 'employee' | 'manager';

export interface User {
	id: UserId;
	/** 工号，对外展示与人工检索用，例如「EMP10086」 */
	employeeId: string;
	name: string;
	/** 职位，例如「软件工程师」 */
	title: string;
	department: string;
	role: Role;
	/** 直属主管的 `User.id`（UUID）；本人即最高层级时为 null */
	managerId: UserId | null;
}

/**
 * 申请状态机。
 *
 * ```
 * draft ──submit──▶ pending_manager ──approve──▶ pending_finance ──approve──▶ approved
 *                        │                             │
 *                        ├──reject──▶ rejected ◀──reject──┤
 *                        └──cancel──▶ cancelled ◀──cancel─┘
 *
 * rejected ──reedit──▶ draft
 * ```
 */
export type RequestStatus =
	'draft' | 'pending_manager' | 'pending_finance' | 'approved' | 'rejected' | 'cancelled';

/** 终态：不可再流转 */
export const TERMINAL_STATUSES = ['approved', 'rejected', 'cancelled'] as const;

/** 审批中：申请人可撤销 */
export const PENDING_STATUSES = ['pending_manager', 'pending_finance'] as const;

export type Urgency = 'normal' | 'urgent';

export type Transport = 'train' | 'flight' | 'car' | 'other';

export interface TripLeg {
	id: string;
	/** 出发地 */
	from: string;
	/** 目的地 */
	to: string;
	/** YYYY-MM-DD */
	departDate: string;
	/** YYYY-MM-DD，不早于 departDate */
	returnDate: string;
	transport: Transport;
}

/** 分项预算，单位「分」 */
export interface Budget {
	/** 交通费 */
	transport: number;
	/** 住宿费 */
	hotel: number;
	/** 出差补贴 */
	allowance: number;
	/** 其他费用 */
	other: number;
}

export type AuditAction = 'submit' | 'approve' | 'reject' | 'cancel' | 'reedit';

/** 一次状态流转的留痕，详情页时间线由它渲染 */
export interface AuditEntry {
	id: string;
	/** ISO 时间戳 */
	at: string;
	actorId: UserId;
	/** 冗余存名字，避免时间线依赖用户表 */
	actorName: string;
	action: AuditAction;
	from: RequestStatus;
	to: RequestStatus;
	/** 驳回时必填，通过时可选 */
	comment?: string;
}

export interface TravelRequest {
	/** 业务单号，形如 TR-0012 */
	id: string;
	applicantId: UserId;
	applicantName: string;
	department: string;
	/** 出差事由 */
	reason: string;
	urgency: Urgency;
	legs: TripLeg[];
	budget: Budget;
	/** 预算超过阈值时的说明，见 schema.ts 的 BUDGET_NOTE_THRESHOLD_CENTS */
	budgetNote?: string;
	status: RequestStatus;
	/** ISO */
	createdAt: string;
	/** ISO */
	updatedAt: string;
	/** ISO，首次提交时间；草稿为 undefined */
	submittedAt?: string;
	/** 按时间正序 */
	audit: AuditEntry[];
}
