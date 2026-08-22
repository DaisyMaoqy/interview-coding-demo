import { Type } from 'class-transformer';
import {
  IsIn,
  IsInt,
  IsOptional,
  IsString,
  Min,
  Matches,
  ValidateNested
} from 'class-validator';
import {
  APPLICATION_TYPES,
  ApplicationType,
  REQUEST_STATUSES,
  RequestStatus,
  ROLES,
  Role,
  DATE_REGEX
} from '../../common/enums';

/** `scope` 查询：all=全部；mine=我发起的；todo=待我审批的 */
export type RequestScope = 'all' | 'mine' | 'todo';

export class QueryRequestsDto {
  @IsOptional()
  @IsIn(APPLICATION_TYPES)
  type?: ApplicationType;

  @IsOptional()
  @IsIn(REQUEST_STATUSES)
  status?: RequestStatus;

  @IsOptional()
  @IsString()
  keyword?: string;

  @IsOptional()
  @Matches(/^\d{4}$/, { message: 'year 必须为 4 位年份' })
  year?: string;

  @IsOptional()
  @Matches(/^(0?[1-9]|1[0-2])$/, { message: 'month 为 1~12' })
  month?: string;

  @IsOptional()
  @IsString()
  applicantId?: string;

  @IsOptional()
  @IsString()
  department?: string;

  @IsOptional()
  @IsIn(['all', 'mine', 'todo'])
  scope?: RequestScope;

  /** 排序：updated=按更新时间；submitted=按提交时间（缺省提交时间沉底） */
  @IsOptional()
  @IsIn(['updated', 'submitted'])
  sort?: 'updated' | 'submitted';

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  page?: number = 1;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @IsIn([10, 20, 50, 100])
  pageSize?: number = 20;
}
