import {
  Injectable,
  NotFoundException,
  ForbiddenException,
  BadRequestException,
  ConflictException
} from '@nestjs/common';
import { Prisma } from '@prisma/approval-workflow/client';
import { Decimal } from '@prisma/client/runtime/library';
import { PrismaService } from '../prisma/prisma.service';
import {
  ApplicationType,
  RequestStatus,
  AuditAction,
  AUDIT_ACTIONS,
  BUDGET_NOTE_THRESHOLD_CENTS,
  MAX_LEGS
} from '../common/enums';
import type { Actor } from './request.mapper';
import {
  toRequestView,
  toPaginated,
  budgetTotalCents,
  type RequestWithRelations,
  type Paginated
} from './request.mapper';
import type { RequestView } from './request.types';

/** 状态机：from -> action -> to */
const TRANSITIONS: Record<string, Partial<Record<AuditAction, RequestStatus>>> = {
  draft: { submit: 'pending_manager', reedit: 'draft' },
  pending_manager: { approve: 'pending_finance', reject: 'rejected', cancel: 'cancelled' },
  pending_finance: { approve: 'approved', reject: 'rejected', cancel: 'cancelled' },
  rejected: { reedit: 'draft' }
};

/** 单号前缀 */
const ID_PREFIX: Record<ApplicationType, string> = { travel: 'TR', leave: 'LV' };

/** 允许编辑的状态（草稿 / 已驳回） */
const EDITABLE: RequestStatus[] = ['draft', 'rejected'];
/** 允许删除的状态（仅草稿） */
const DELETABLE: RequestStatus[] = ['draft'];

@Injectable()
export class ApplicationService {
  constructor(private readonly prisma: PrismaService) {}

  // —— 单号生成（后端权威，TR-/LV- + 4 位序号）——
  async generateId(type: ApplicationType): Promise<string> {
    const prefix = ID_PREFIX[type];
    const last = await this.prisma.request.findFirst({
      where: { id: { startsWith: prefix + '-' } },
      orderBy: { id: 'desc' },
      select: { id: true }
    });
    let next = 1;
    if (last) {
      const n = Number(last.id.slice(prefix.length + 1));
      if (Number.isFinite(n)) next = n + 1;
    }
    return `${prefix}-${String(next).padStart(4, '0')}`;
  }

  // —— 创建草稿（事务：主表 + legs + budget）——
  async createDraft(
    type: ApplicationType,
    fields: Record<string, any>,
    actor: Actor
  ): Promise<RequestView> {
    const id = await this.generateId(type);
    const now = new Date();

    return this.prisma.$transaction(async (tx) => {
      const request = await tx.request.create({
        data: this.buildCreateData(type, id, fields, actor, now, null)
      });
      if (type === 'travel') {
        await this.writeTravelChildren(tx, request.id, fields);
      }
      const created = await tx.request.findUnique({
        where: { id: request.id },
        include: { legs: { orderBy: { sortOrder: 'asc' } }, budgets: true, audit: true }
      });
      return toRequestView(created as RequestWithRelations);
    });
  }

  // —— 详情（含可见性校验）——
  async findOne(id: string, actor: Actor): Promise<RequestView> {
    const r = await this.prisma.request.findUnique({
      where: { id },
      include: { legs: { orderBy: { sortOrder: 'asc' } }, budgets: true, audit: true }
    });
    if (!r) throw new NotFoundException(`申请单 ${id} 不存在`);
    this.assertCanView(r, actor);
    return toRequestView(r as RequestWithRelations);
  }

  // —— 编辑草稿（全量覆盖 fields）——
  async updateDraft(
    id: string,
    type: ApplicationType,
    fields: Record<string, any>,
    actor: Actor
  ): Promise<RequestView> {
    const existing = await this.prisma.request.findUnique({
      where: { id },
      include: { budgets: true }
    });
    if (!existing) throw new NotFoundException(`申请单 ${id} 不存在`);
    this.assertOwner(existing, actor);
    if (!EDITABLE.includes(existing.status as RequestStatus)) {
      throw new ConflictException(`仅草稿/已驳回状态可编辑，当前为 ${existing.status}`);
    }

    return this.prisma.$transaction(async (tx) => {
      if (type === 'travel') {
        await tx.tripLeg.deleteMany({ where: { requestId: id } });
        await tx.budget.deleteMany({ where: { requestId: id } });
      }
      const updated = await tx.request.update({
        where: { id },
        data: { ...this.buildUpdateData(type, fields, new Date()), updatedAt: new Date() }
      });
      if (type === 'travel') {
        await this.writeTravelChildren(tx, id, fields);
      }
      const refreshed = await tx.request.findUnique({
        where: { id },
        include: { legs: { orderBy: { sortOrder: 'asc' } }, budgets: true, audit: true }
      });
      return toRequestView(refreshed as RequestWithRelations);
    });
  }

  // —— 删除草稿 ——
  async remove(id: string, actor: Actor): Promise<void> {
    const existing = await this.prisma.request.findUnique({ where: { id } });
    if (!existing) throw new NotFoundException(`申请单 ${id} 不存在`);
    this.assertOwner(existing, actor);
    if (!DELETABLE.includes(existing.status as RequestStatus)) {
      throw new ConflictException(`仅草稿可删除，当前为 ${existing.status}`);
    }
    await this.prisma.request.delete({ where: { id } });
  }

  // —— 流转动作（submit/approve/reject/cancel/reedit）——
  async transition(
    id: string,
    action: AuditAction,
    actor: Actor,
    comment?: string
  ): Promise<RequestView> {
    if (!AUDIT_ACTIONS.includes(action)) throw new BadRequestException(`未知动作 ${action}`);

    const r = await this.prisma.request.findUnique({
      where: { id },
      include: { legs: { orderBy: { sortOrder: 'asc' } }, budgets: true, audit: true }
    });
    if (!r) throw new NotFoundException(`申请单 ${id} 不存在`);

    const from = r.status as RequestStatus;
    const to = this.resolveTransition(from, action, actor);
    if (!to) {
      throw new ConflictException(`状态 ${from} 不允许动作 ${action}`);
    }

    if (action === 'reject' && (!comment || !comment.trim())) {
      throw new BadRequestException('驳回必须填写意见');
    }
    if (action === 'submit' && r.type === 'travel' && r.budgets?.length) {
      const total = budgetTotalCents({
        transport: Number(r.budgets[0].transport),
        hotel: Number(r.budgets[0].hotel),
        allowance: Number(r.budgets[0].allowance),
        other: Number(r.budgets[0].other)
      });
      if (total > BUDGET_NOTE_THRESHOLD_CENTS && !r.budgets[0].budgetNote) {
        throw new BadRequestException('预算合计超过阈值，必须填写预算说明');
      }
    }

    const now = new Date();
    const submittedAt = action === 'submit' ? now : r.submittedAt;

    return this.prisma.$transaction(async (tx) => {
      const updated = await tx.request.update({
        where: { id },
        data: { status: to, submittedAt, updatedAt: now }
      });
      // reedit：draft→draft 不追加审计、状态不变（API-ALIGNMENT.md §6.7）
      if (!(action === 'reedit' && to === 'draft')) {
        await tx.auditEntry.create({
          data: {
            requestId: id,
            at: now,
            actorId: actor.id,
            actorName: actor.name,
            action,
            from,
            to,
            comment: comment ?? null
          }
        });
      }
      const refreshed = await tx.request.findUnique({
        where: { id },
        include: { legs: { orderBy: { sortOrder: 'asc' } }, budgets: true, audit: true }
      });
      return toRequestView(refreshed as RequestWithRelations);
    });
  }

  // —— 列表（scope + Offset 分页）——
  async list(
    query: {
      type?: ApplicationType;
      status?: RequestStatus;
      keyword?: string;
      year?: string;
      month?: string;
      applicantId?: string;
      department?: string;
      scope?: 'all' | 'mine' | 'todo';
      sort?: 'updated' | 'submitted';
      page?: number;
      pageSize?: number;
    },
    actor: Actor
  ): Promise<Paginated<RequestView>> {
    const where = this.buildBaseWhere(query);
    this.applyScope(where, query.scope ?? 'all', actor);

    const page = query.page ?? 1;
    const pageSize = query.pageSize ?? 20;
    const orderBy =
      query.sort === 'submitted'
        ? [{ submittedAt: Prisma.SortOrder.desc }, { updatedAt: Prisma.SortOrder.desc }]
        : [{ updatedAt: Prisma.SortOrder.desc }];

    const [rows, total] = await this.prisma.$transaction([
      this.prisma.request.findMany({
        where,
        include: { legs: { orderBy: { sortOrder: 'asc' } }, budgets: true, audit: true },
        orderBy,
        skip: (page - 1) * pageSize,
        take: pageSize
      }),
      this.prisma.request.count({ where })
    ]);

    const list = rows.map((r) => toRequestView(r as RequestWithRelations));
    return toPaginated(list, total, page, pageSize);
  }

  // —— 元数据（可选能力，前端本轮不消费）——
  async getMeta(type: ApplicationType): Promise<unknown> {
    return { type, sections: [] };
  }

  // —— 看板聚合 ——
  async dashboard(filter: {
    type?: ApplicationType;
    year?: string;
    month?: string;
    department?: string;
  }): Promise<unknown> {
    const where: Prisma.RequestWhereInput = {};
    if (filter.type) where.type = filter.type;
    if (filter.department) where.department = filter.department;
    if (filter.year) {
      where.createdAt = {
        gte: new Date(`${filter.year}-01-01`),
        lt: new Date(`${Number(filter.year) + 1}-01-01`)
      };
    }
    if (filter.month && filter.year) {
      const m = String(filter.month).padStart(2, '0');
      const gte = new Date(`${filter.year}-${m}-01`);
      const lt = new Date(gte);
      lt.setMonth(lt.getMonth() + 1);
      where.createdAt = { gte, lt };
    }

    const [all, statusGroups, leaveGroups] = await this.prisma.$transaction([
      this.prisma.request.findMany({ where, select: { status: true, type: true, leaveType: true } }),
      this.prisma.request.groupBy({ by: ['status'], where, _count: true }),
      this.prisma.request.groupBy({
        by: ['leaveType'],
        where: { ...where, type: 'leave' },
        _count: true
      })
    ]);

    const statusDistribution = statusGroups.map((g) => ({ status: g.status, count: g._count }));
    const leaveTypeDistribution = leaveGroups.map((g) => ({
      leaveType: g.leaveType,
      count: g._count
    }));
    const totals = {
      total: all.length,
      pending: all.filter((r) => r.status === 'pending_manager' || r.status === 'pending_finance')
        .length,
      approved: all.filter((r) => r.status === 'approved').length,
      rejected: all.filter((r) => r.status === 'rejected').length
    };

    return {
      statusDistribution,
      leaveTypeDistribution: filter.type === 'travel' ? undefined : leaveTypeDistribution,
      monthlyTrend: [],
      totals
    };
  }

  // ============ 私有辅助 ============

  private resolveTransition(
    from: RequestStatus,
    action: AuditAction,
    actor: Actor
  ): RequestStatus | null {
    if (action === 'approve' || action === 'reject') {
      if (from === 'pending_manager' && actor.role !== 'manager') return null;
      if (from === 'pending_finance' && actor.role !== 'finance') return null;
    }
    return TRANSITIONS[from]?.[action] ?? null;
  }

  private assertOwner(r: { applicantId: string }, actor: Actor): void {
    if (r.applicantId !== actor.id) throw new ForbiddenException('无权操作他人申请单');
  }

  /** 可见性规则（API-ALIGNMENT.md §6.6） */
  private assertCanView(
    r: { applicantId: string; status: string; department: string },
    actor: Actor
  ): void {
    if (r.applicantId === actor.id) return;
    if (actor.role === 'manager') {
      if (r.status !== 'draft' && r.department === actor.department) return;
    }
    if (actor.role === 'finance') {
      if (r.status === 'pending_finance') return;
    }
    throw new NotFoundException('无权限查看该申请单');
  }

  private buildBaseWhere(query: {
    type?: ApplicationType;
    status?: RequestStatus;
    keyword?: string;
    applicantId?: string;
    department?: string;
  }): Prisma.RequestWhereInput {
    const where: Prisma.RequestWhereInput = {};
    if (query.type) where.type = query.type;
    if (query.status) where.status = query.status;
    if (query.applicantId) where.applicantId = query.applicantId;
    if (query.department) where.department = query.department;
    if (query.keyword) where.reason = { contains: query.keyword };
    return where;
  }

  /** 按 scope 收窄可见范围（mine/todo 依赖当前用户角色） */
  private applyScope(
    where: Prisma.RequestWhereInput,
    scope: 'all' | 'mine' | 'todo',
    actor: Actor
  ): void {
    if (scope === 'mine') {
      where.applicantId = actor.id;
    } else if (scope === 'todo') {
      if (actor.role === 'manager') {
        where.status = 'pending_manager';
        where.department = actor.department;
        where.applicantId = { not: actor.id };
      } else if (actor.role === 'finance') {
        where.status = 'pending_finance';
      } else {
        where.id = '__never__';
      }
    }
  }

  private buildCreateData(
    type: ApplicationType,
    id: string,
    fields: Record<string, any>,
    actor: Actor,
    now: Date,
    submittedAt: Date | null
  ): Prisma.RequestCreateInput {
    const base: Prisma.RequestCreateInput = {
      id,
      type,
      status: 'draft',
      applicantId: actor.id,
      applicantName: actor.name,
      department: actor.department,
      createdAt: now,
      updatedAt: now,
      submittedAt,
      reason: String(fields.reason ?? '')
    };
    if (type === 'travel') {
      base.urgency = fields.urgency ?? 'normal';
    } else {
      base.leaveType = fields.leaveType ?? null;
      base.leaveStart = fields.leaveStart ?? null;
      base.leaveEnd = fields.leaveEnd ?? null;
      base.note = fields.note ?? null;
    }
    return base;
  }

  private buildUpdateData(
    type: ApplicationType,
    fields: Record<string, any>,
    now: Date
  ): Prisma.RequestUpdateInput {
    const data: Prisma.RequestUpdateInput = {
      reason: String(fields.reason ?? ''),
      updatedAt: now
    };
    if (type === 'travel') {
      data.urgency = fields.urgency ?? 'normal';
    } else {
      data.leaveType = fields.leaveType ?? null;
      data.leaveStart = fields.leaveStart ?? null;
      data.leaveEnd = fields.leaveEnd ?? null;
      data.note = fields.note ?? null;
    }
    return data;
  }

  private async writeTravelChildren(
    tx: Prisma.TransactionClient,
    requestId: string,
    fields: Record<string, any>
  ): Promise<void> {
    const legs = Array.isArray(fields.legs) ? fields.legs.slice(0, MAX_LEGS) : [];
    if (legs.length) {
      await tx.tripLeg.createMany({
        data: legs.map((l: any, i: number) => ({
          requestId,
          from: String(l.from),
          to: String(l.to),
          departDate: String(l.departDate),
          returnDate: String(l.returnDate),
          transport: String(l.transport),
          sortOrder: i
        }))
      });
    }
    const b = fields.budget ?? {};
    const total = budgetTotalCents({
      transport: Number(b.transport) || 0,
      hotel: Number(b.hotel) || 0,
      allowance: Number(b.allowance) || 0,
      other: Number(b.other) || 0
    });
    if (total > 0 || b.budgetNote) {
      await tx.budget.create({
        data: {
          requestId,
          transport: new Decimal(Number(b.transport) || 0),
          hotel: new Decimal(Number(b.hotel) || 0),
          allowance: new Decimal(Number(b.allowance) || 0),
          other: new Decimal(Number(b.other) || 0),
          budgetNote: b.budgetNote ?? null
        }
      });
    }
  }
}
