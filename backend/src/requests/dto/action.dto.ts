import { IsOptional, IsString, Length, IsIn } from 'class-validator';
import { REJECT_COMMENT_MAX } from '../../common/enums';

/** RPC 动作通用载荷：comment 可选（提交/审批/撤回/重编辑可附言） */
export class ActionDto {
  @IsOptional()
  @IsString()
  @Length(0, REJECT_COMMENT_MAX)
  comment?: string;
}

/** 驳回动作：comment 必填（API-ALIGNMENT.md §3.3：reject comment ≤200 且必填） */
export class RejectActionDto {
  @IsString()
  @Length(1, REJECT_COMMENT_MAX)
  comment!: string;
}
