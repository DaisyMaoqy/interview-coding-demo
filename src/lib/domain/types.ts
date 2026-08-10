/**
 * 差旅申请领域模型。
 *
 * 两条贯穿全局的约定：
 * 1. 金额一律用「分」为单位的整数存储，只在 UI 边界转成「元」，见 money.ts。
 * 2. 日期用 `YYYY-MM-DD` 字符串，可直接字典序比较，避免时区问题；
 *    时间戳则用完整 ISO 字符串。
 *
 * 行程单段与分项预算的形状由 schema.ts 的 zod 推导类型统一定义
 * z.infer 才保证类型与校验规则不漂移
 * 用 `import type` 别名引用，编译期擦除、不产生运行时依赖
 * 用 as const 定义的数组（运行时存在）
 */

import type { BudgetInput, LegInput } from './schema';

/**
 * 用户主键ID用UUID而非自增数字
 * 主键不该携带业务含义，不能动
 * 对外展示工号 `employeeId`
 */
export type UserId = string;

/** 角色决定能看到哪些导航与页面，不决定身份 —— 切角色即切当前登录人 */
export type Role = 'employee' | 'manager' | 'finance';

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

/** 审批中：申请人可撤销 */
export const PENDING_STATUSES = ['pending_manager', 'pending_finance'] as const;

/** 紧急程度；字面量元组是唯一真相，类型由它推导，表单 z.enum 也引用同一份 */
export const URGENCY_VALUES = ['normal', 'urgent'] as const;
export type Urgency = (typeof URGENCY_VALUES)[number];

/** 交通方式；同上，避免 domain 类型与 schema 的 z.enum 字面量各写一份 */
export const TRANSPORT_VALUES = ['train', 'flight', 'car', 'other'] as const;
export type Transport = (typeof TRANSPORT_VALUES)[number];

/** 行程单段；形状与 schema.ts 的 `LegInput` 一致（见文件头 import） */
export type TripLeg = LegInput;

/** 分项预算，单位「分」；形状与 schema.ts 的 `BudgetInput['budget']` 一致 */
export type Budget = BudgetInput['budget'];

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
