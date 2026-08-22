import { Type } from 'class-transformer';
import { ValidateNested, IsIn, IsString, Length, Matches } from 'class-validator';
import {
  LEAVE_TYPES,
  LeaveType,
  LEAVE_REASON_MIN,
  REASON_MAX,
  NOTE_MAX,
  DATE_REGEX
} from '../../common/enums';

/** 请假整单字段（对应前端 LeaveFields，包裹在 payload.fields 下） */
export class LeaveFieldsDto {
  @IsString()
  @Length(LEAVE_REASON_MIN, REASON_MAX)
  reason!: string;

  @IsIn(LEAVE_TYPES)
  leaveType!: LeaveType;

  @IsString()
  @Matches(DATE_REGEX, { message: 'leaveStart 必须为 YYYY-MM-DD' })
  leaveStart!: string;

  @IsString()
  @Matches(DATE_REGEX, { message: 'leaveEnd 必须为 YYYY-MM-DD' })
  leaveEnd!: string;

  @IsString()
  @Length(0, NOTE_MAX)
  note?: string;
}

/** POST /aws/v1/leave-requests —— 仅传 fields 包裹（type 由 URL 决定） */
export class CreateLeaveRequestDto {
  @ValidateNested()
  @Type(() => LeaveFieldsDto)
  fields!: LeaveFieldsDto;
}
