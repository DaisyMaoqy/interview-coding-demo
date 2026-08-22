import { Type } from 'class-transformer';
import {
  IsOptional,
  IsString,
  Length,
  Matches,
  IsIn,
  ValidateNested
} from 'class-validator';
import {
  CITY_MAX,
  DATE_REGEX,
  TRANSPORTS,
  Transport
} from '../../common/enums';

/** 差旅行程段（创建/编辑时随 fields 一起提交；id 为前端重复项键，后端忽略或自生成） */
export class TripLegDto {
  @IsOptional()
  @IsString()
  id?: string;

  @IsString()
  @Length(1, CITY_MAX)
  from!: string;

  @IsString()
  @Length(1, CITY_MAX)
  to!: string;

  @IsString()
  @Matches(DATE_REGEX, { message: 'departDate 必须为 YYYY-MM-DD' })
  departDate!: string;

  @IsString()
  @Matches(DATE_REGEX, { message: 'returnDate 必须为 YYYY-MM-DD' })
  returnDate!: string;

  @IsIn(TRANSPORTS)
  transport!: Transport;
}
