// 审批工作流 —— 共享枚举（字符串联合类型）与常量
//
// 注：MySQL 8 不支持 native enum（API-ALIGNMENT.md §6.1），因此此处仅用
// TypeScript 字符串联合类型做应用层校验，数据库中以 `String` 存储（见 schema.prisma）。

export type ApplicationType = 'travel' | 'leave';

export type RequestStatus =
  | 'draft'
  | 'pending_manager'
  | 'pending_finance'
  | 'approved'
  | 'rejected'
  | 'cancelled';

export type AuditAction = 'submit' | 'approve' | 'reject' | 'cancel' | 'reedit';

export type Role = 'employee' | 'manager' | 'finance';

export type Urgency = 'normal' | 'urgent';

export type Transport = 'train' | 'flight' | 'car' | 'other';

export type LeaveType = 'annual' | 'sick' | 'personal';

// —— 字段长度 / 取值范围约束（对齐前端 applicationTypes.ts / workflow.ts）——
export const APPLICATION_TYPES: ApplicationType[] = ['travel', 'leave'];
export const REQUEST_STATUSES: RequestStatus[] = [
  'draft',
  'pending_manager',
  'pending_finance',
  'approved',
  'rejected',
  'cancelled'
];
export const AUDIT_ACTIONS: AuditAction[] = ['submit', 'approve', 'reject', 'cancel', 'reedit'];
export const URGENCIES: Urgency[] = ['normal', 'urgent'];
export const TRANSPORTS: Transport[] = ['train', 'flight', 'car', 'other'];
export const LEAVE_TYPES: LeaveType[] = ['annual', 'sick', 'personal'];
export const ROLES: Role[] = ['employee', 'manager', 'finance'];

/** 业务日期格式 YYYY-MM-DD */
export const DATE_REGEX = /^\d{4}-\d{2}-\d{2}$/;

/** 单张申请最多行程段数 */
export const MAX_LEGS = 10;

/** 差旅事由字数下限（前端 applicationTypes.ts 权威值） */
export const TRAVEL_REASON_MIN = 10;
/** 请假事由字数下限（API-ALIGNMENT.md §3.3：[已确认] 取 5） */
export const LEAVE_REASON_MIN = 5;
/** 事由 / 备注 / 驳回意见统一上限 200（API-ALIGNMENT.md §3.3） */
export const REASON_MAX = 200;
export const NOTE_MAX = 200;
export const REJECT_COMMENT_MAX = 200;

/** 城市名上限 */
export const CITY_MAX = 30;

/** 单个预算项上限（分）：0 ~ 1_000_000_000 */
export const CENTS_MIN = 0;
export const CENTS_MAX = 1_000_000_000;

/** 预算合计超此阈值（分）时 budgetNote 必填 */
export const BUDGET_NOTE_THRESHOLD_CENTS = 1_000_000;
