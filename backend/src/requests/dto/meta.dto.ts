import { IsString, IsArray, IsOptional, ValidateNested } from 'class-validator';

/**
 * `/meta` 元数据端点响应结构（API-ALIGNMENT.md §2 / §5：本轮前端不消费，作为后端可选能力）。
 *
 * 结构对齐前端 `applicationTypes.ts` 的「分区 → 字段 → 选项/校验」三层模型，
 * 便于未来切换动态渲染：前端拿 meta 后按 `sections` 递归生成表单。
 */

export class FieldOption {
  @IsString()
  value!: string;
  @IsString()
  label!: string;
}

export class FieldRule {
  @IsString()
  key!: string;
  @IsString()
  label!: string;
  @IsString()
  type!: 'text' | 'textarea' | 'select' | 'date' | 'dateRange' | 'number' | 'legs' | 'budget';
  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  options?: FieldOption[];
  /** 校验规则：min/max 长度、min/max 数值、required 等 */
  @IsOptional()
  min?: number;
  @IsOptional()
  max?: number;
  @IsOptional()
  required?: boolean;
}

export class MetaSection {
  @IsString()
  key!: string;
  @IsString()
  title!: string;
  @IsArray()
  @ValidateNested({ each: true })
  fields!: FieldRule[];
}

export class MetaResponse {
  /** 资源类型 travel | leave */
  @IsString()
  type!: string;
  @IsArray()
  @ValidateNested({ each: true })
  sections!: MetaSection[];
}
