// Prisma 实体 ↔ 对外 RequestView 的相互转换。
//
// 数据库按「主表 Request + 关联 legs/budgets/audit」存储，对外统一收敛进 `fields` 包，
// 与前端 `Request` 形状一致（见 request.types.ts / 前端 $lib/domain/types.ts）。

import type { Request as PrismaRequest, TripLeg, Budget, AuditEntry } from '@prisma/approval-workflow/client';
import type { ApplicationType, RequestStatus } from '../common/enums';
import type {
  RequestView,
  TravelFields,
  LeaveFields,
  AuditView,
  TripLegView,
  BudgetView,
  Paginated
} from './request.types';

export interface Actor {
  id: string;
  name: string;
  role: string;
  department: string;
  managerId?: string | null;
}

/** PrismaRequest 含关联数据时的完整形态 */
export type RequestWithRelations = PrismaRequest & {
  legs?: TripLeg[];
  budgets?: Budget[];
  audit?: AuditEntry[];
};

function toAuditView(a: AuditEntry): AuditView {
  return {
    id: a.id,
    at: a.at.toISOString(),
    actorId: a.actorId,
    actorName: a.actorName,
    action: a.action as AuditView['action'],
    from: a.from as RequestStatus,
    to: a.to as RequestStatus,
    comment: a.comment ?? undefined
  };
}

function toTripLegView(l: TripLeg): TripLegView {
  return {
    id: l.id,
    from: l.from,
    to: l.to,
    departDate: l.departDate,
    returnDate: l.returnDate,
    transport: l.transport as TripLegView['transport']
  };
}

function budgetToView(b: Budget): BudgetView {
  return {
    transport: Number(b.transport),
    hotel: Number(b.hotel),
    allowance: Number(b.allowance),
    other: Number(b.other),
    budgetNote: b.budgetNote ?? undefined
  };
}

/** 实体 → RequestView（按 type 装配 fields） */
export function toRequestView(r: RequestWithRelations): RequestView {
  const base = {
    id: r.id,
    type: r.type as ApplicationType,
    applicantId: r.applicantId,
    applicantName: r.applicantName,
    department: r.department,
    status: r.status as RequestStatus,
    createdAt: r.createdAt.toISOString(),
    updatedAt: r.updatedAt.toISOString(),
    submittedAt: r.submittedAt ? r.submittedAt.toISOString() : null,
    audit: (r.audit ?? []).map(toAuditView).sort((a, b) => a.at.localeCompare(b.at))
  };

  if (r.type === 'leave') {
    const fields: LeaveFields = {
      reason: r.reason,
      leaveType: r.leaveType as LeaveFields['leaveType'],
      leaveStart: r.leaveStart ?? '',
      leaveEnd: r.leaveEnd ?? '',
      note: r.note ?? undefined
    };
    return { ...base, fields: fields as unknown as Record<string, unknown> };
  }

  const travelsFields: TravelFields = {
    reason: r.reason,
    urgency: (r.urgency as TravelFields['urgency']) ?? 'normal',
    legs: (r.legs ?? []).map(toTripLegView),
    budget: r.budgets && r.budgets.length ? budgetToView(r.budgets[0]) : ({} as BudgetView)
  };
  return { ...base, fields: travelsFields as unknown as Record<string, unknown> };
}

/** 分页包装 */
export function toPaginated<T>(list: T[], total: number, page: number, pageSize: number): Paginated<T> {
  return { list, total, page, pageSize };
}

/** 预算合计（分） */
export function budgetTotalCents(b: { transport: number; hotel: number; allowance: number; other: number }): number {
  return (b.transport ?? 0) + (b.hotel ?? 0) + (b.allowance ?? 0) + (b.other ?? 0);
}
