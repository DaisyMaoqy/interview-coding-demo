import { Type } from 'class-transformer';
import { ValidateNested, IsIn, IsString, Length, IsArray, ArrayMinSize, ArrayMaxSize } from 'class-validator';
import { URGENCIES, Urgency, TRAVEL_REASON_MIN, REASON_MAX } from '../../common/enums';
import { TripLegDto } from './leg.dto';
import { BudgetDto } from './budget.dto';

/** 差旅整单字段（对应前端 TravelFields，包裹在 payload.fields 下） */
export class TravelFieldsDto {
  @IsString()
  @Length(TRAVEL_REASON_MIN, REASON_MAX)
  reason!: string;

  @IsIn(URGENCIES)
  urgency!: Urgency;

  @IsArray()
  @ArrayMinSize(1)
  @ArrayMaxSize(10)
  @ValidateNested({ each: true })
  @Type(() => TripLegDto)
  legs!: TripLegDto[];

  @ValidateNested()
  @Type(() => BudgetDto)
  budget!: BudgetDto;
}

/** POST /aws/v1/travel-requests —— 仅传 fields 包裹（type 由 URL 决定） */
export class CreateTravelRequestDto {
  @ValidateNested()
  @Type(() => TravelFieldsDto)
  fields!: TravelFieldsDto;
}
