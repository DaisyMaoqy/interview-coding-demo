import { IsOptional, IsString, Length } from 'class-validator';

/** POST /aws/v1/auth/login —— 简易 SSO 登录（API-ALIGNMENT.md 决策 C：[已确认]） */
export class LoginDto {
  @IsString()
  @Length(1, 64)
  userId!: string;

  @IsString()
  @Length(1, 128)
  password!: string;

  /** 租户 ID，缺省 'tenant_001'（API.md 4.10 冻结决策） */
  @IsOptional()
  @IsString()
  @Length(1, 64)
  tenantId?: string = 'tenant_001';
}

/** 登录响应：Qy_token 即 JWT */
export class AuthResponse {
  Qy_token!: string;
  user!: {
    id: string;
    name: string;
    department: string;
    role: string;
    managerId?: string;
  };
}
