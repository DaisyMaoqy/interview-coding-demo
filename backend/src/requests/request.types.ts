// 后端对外视图类型：与前端 `$lib/domain/types.ts` 的 `Request` 形状保持一致，
// 关键点是「业务字段统一收敛进 `fields` 包」。

import type {
  ApplicationType,
  AuditAction,
  RequestStatus,
  Transport,
  Urgency,
  LeaveType
} from '../common/enums';

export interface AuditView {
  id: string;
  at: string; // ISO
  actorId: string;
  actorName: string;
  action: AuditAction;
  from: RequestStatus;
  to: RequestStatus;
  comment?: string;
}

export interface TripLegView {
  id?: string;
  from: string;
  to: string;
  departDate: string;
  returnDate: string;
  transport: Transport;
}

export interface BudgetView {
  transport: number;
  hotel: number;
  allowance: number;
  other: number;
  budgetNote?: string;
}

export interface TravelFields {
  reason: string;
  urgency: Urgency;
  legs: TripLegView[];
  budget: BudgetView;
}

export interface LeaveFields {
  reason: string;
  leaveType: LeaveType;
  leaveStart: string;
  leaveEnd: string;
  note?: string;
}

export interface RequestView {
  id: string;
  type: ApplicationType;
  applicantId: string;
  applicantName: string;
  department: string;
  status: RequestStatus;
  createdAt: string;
  updatedAt: string;
  submittedAt: string | null;
  audit: AuditView[];
  fields: Record<string, unknown>;
}

export interface Paginated<T> {
  list: T[];
  total: number;
  page: number;
  pageSize: number;
}
