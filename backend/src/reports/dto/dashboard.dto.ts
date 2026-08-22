import { Type } from 'class-transformer';
import { IsIn, IsOptional, IsString, Matches } from 'class-validator';
import { APPLICATION_TYPES, ApplicationType } from '../../common/enums';

/** GET /aws/v1/reports/dashboard —— 看板聚合查询 */
export class DashboardQueryDto {
  @IsOptional()
  @IsIn(APPLICATION_TYPES)
  type?: ApplicationType;

  @IsOptional()
  @IsString()
  @Matches(/^\d{4}$/)
  year?: string;

  @IsOptional()
  @IsString()
  @Matches(/^(0?[1-9]|1[0-2])$/)
  month?: string;

  @IsOptional()
  @IsString()
  department?: string;
}

/** 看板响应（数值均为计数，金额类按需扩展） */
export class DashboardResponse {
  /** 按状态分布 */
  statusDistribution!: { status: string; count: number }[];
  /** 请假类型分布（仅 type=leave 或全量时返回） */
  leaveTypeDistribution?: { leaveType: string; count: number }[];
  /** 按月趋势：提交量 / 通过量 */
  monthlyTrend!: { month: string; submitted: number; approved: number }[];
  /** 汇总 */
  totals!: {
    total: number;
    pending: number;
    approved: number;
    rejected: number;
  };
}
