import { PartialType } from '@nestjs/mapped-types';
import { Type } from 'class-transformer';
import { ValidateNested } from 'class-validator';
import { TravelFieldsDto } from './create-travel-request.dto';
import { LeaveFieldsDto } from './create-leave-request.dto';

/** 编辑草稿（仅 draft/rejected 可编辑），fields 全量覆盖（部分更新时缺省字段保持原值由 service 决定） */
export class UpdateTravelRequestDto extends PartialType(TravelFieldsDto) {}

export class UpdateTravelRequestPayloadDto {
  @ValidateNested()
  @Type(() => UpdateTravelRequestDto)
  fields!: UpdateTravelRequestDto;
}

export class UpdateLeaveRequestDto extends PartialType(LeaveFieldsDto) {}

export class UpdateLeaveRequestPayloadDto {
  @ValidateNested()
  @Type(() => UpdateLeaveRequestDto)
  fields!: UpdateLeaveRequestDto;
}
