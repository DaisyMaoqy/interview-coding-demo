import { IsInt, Max, Min, IsOptional, IsString, Length } from 'class-validator';
import { BUDGET_NOTE_THRESHOLD_CENTS, CENTS_MAX, CENTS_MIN, NOTE_MAX } from '../../common/enums';

/**
 * 差旅预算（分）。
 *
 * 约束：
 * - 各分项 0 ~ 1_000_000_000（CENTS_MAX）。
 * - budgetNote 在「合计 > BUDGET_NOTE_THRESHOLD_CENTS」时必填，且 ≤200 字。
 *   该「条件必填」依赖合计，放在 service 层统一校验（见 application.service.ts），
 *   DTO 仅约束长度与可选性，避免跨嵌套对象的脆弱 ValidateIf。
 */
export class BudgetDto {
  @IsInt()
  @Min(CENTS_MIN)
  @Max(CENTS_MAX)
  transport!: number;

  @IsInt()
  @Min(CENTS_MIN)
  @Max(CENTS_MAX)
  hotel!: number;

  @IsInt()
  @Min(CENTS_MIN)
  @Max(CENTS_MAX)
  allowance!: number;

  @IsInt()
  @Min(CENTS_MIN)
  @Max(CENTS_MAX)
  other!: number;

  @IsOptional()
  @IsString()
  @Length(0, NOTE_MAX)
  budgetNote?: string;
}
