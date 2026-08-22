import { IsArray, IsIn, IsOptional, IsString, Length, ArrayMinSize } from 'class-validator';
import { AUDIT_ACTIONS, AuditAction, REJECT_COMMENT_MAX } from '../../common/enums';

/** POST /aws/v1/requests/batch —— 批量流转 */
export class BatchActionDto {
  @IsIn(AUDIT_ACTIONS)
  action!: AuditAction;

  @IsArray()
  @ArrayMinSize(1)
  @IsString({ each: true })
  ids!: string[];

  /** reject 时必填（由 controller/service 按 action 校验） */
  @IsOptional()
  @IsString()
  @Length(0, REJECT_COMMENT_MAX)
  comment?: string;
}
