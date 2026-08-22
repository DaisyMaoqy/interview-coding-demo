# 审批工作流系统 · 后端接口与数据契约（前端反推）

> ⚠️ **本文部分「冻结决策」已修订**，权威对齐契约见同目录 `API-ALIGNMENT.md`。
> 关键修订：路径/包裹/鉴权按 `/aws/v1` + `{code,data}` + Bearer（前端改请求层）；
> 登录 = 验 `auth_db` 签 JWT；创建/编辑 payload 用 `fields` 包裹；
> Prisma `enum` 因 **MySQL 不支持原生 enum** 改为 `String`；`reject`/`budgetNote`/请假 `note` 长度上限 **200**；
> 请假 `reason` 下界为 **5**；`datasource` 改为 `mysql` + `env("AWS_DATABASE_URL")`，模型落入 `prisma/approval-workflow/schema.prisma`。

> 由前端已有 Schema / 状态机 / 接口调用反推，作为 NestJS + Prisma 后端实现的唯一契约。
> 约束（来自任务卡）：字段命名、枚举值、校验规则与前端**完全一致**；请求/响应结构对齐前端类型；不引入额外字段、不重命名字段、不改变枚举字符串格式；不修改前端代码。
>
> **决策已冻结**（见文末 §7 待澄清决议）：Base `/aws/v1`、RPC 风格业务端点、统一响应 `{code,data,msg}`、企业 SSO 登录、按类型拆分 `travel-requests`/`leave-requests` 资源与 `meta`、Offset 分页、`scope` query、后端报表聚合、预算 `Decimal(15,2)`、创建 DTO 拆分、业务单号后端生成。

---

## 0. 通用约定

- **Base URL**：`/aws/v1`（资源名一律复数；差旅/请假各自独立资源）
- **鉴权**：除登录外，所有请求头部必须携带
  `Authorization: Bearer <Qy_token>`
  > `<Qy_token>` 是 token 的**值**；`Qy_token` 为前端持有的凭证变量名（SSO 签发后本地保存）。后端按标准 `Bearer` 解析。
- **统一响应包裹**：所有成功响应包为
  ```json
  { "code": "200", "data": <T>, "msg": "ok" }
  ```
  错误响应（HTTP 状态仍对齐 401/403/422/404）：
  ```json
  { "code": "<业务码>", "data": null, "msg": "<错误信息>" }
  ```
- **时间**：`createdAt/updatedAt/submittedAt/audit.at` = ISO-8601（UTC 字符串）；业务日期 = `YYYY-MM-DD` 字符串。
- **金额**：整数「分」（`Int` 语义），对外传输与前端完全一致；落库使用 `Decimal(15,2)`（见 §2 注）。单字段范围 `0 ~ 1_000_000_000`。
- **分页（Offset）**：`?page=1&pageSize=20`，分页响应 `data` 为对象，列表置于 `list`：
  ```json
  { "code":"200", "data":{ "list":[...], "total":123, "page":1, "pageSize":20 }, "msg":"ok" }
  ```
- **枚举值字符串**（不得改变格式）：
  - `ApplicationType`：`travel` | `leave`
  - `RequestStatus`：`draft` | `pending_manager` | `pending_finance` | `approved` | `rejected` | `cancelled`
  - `AuditAction`：`submit` | `approve` | `reject` | `cancel` | `reedit`
  - `Role`：`employee` | `manager` | `finance`
  - `Urgency`：`normal` | `urgent`
  - `Transport`：`train` | `flight` | `car` | `other`
  - `LeaveType`：`annual` | `sick` | `personal`

---

## 1. 资源模型（决策）

- **`travel-requests`** 与 **`leave-requests`** 为两个**主资源**（类型互斥、字段不同）。
  - 各自具备：列表、创建草稿、详情、编辑草稿、删除草稿、5 个 RPC 动作（`submit/approve/reject/cancel/reedit`）、`meta`（校验规则）。
- **`requests`** 为**跨类型只读列表视图**（供报表/待办/全局搜索），带 `?type=&status=&scope=&keyword=&year=&month=&applicantId=&department=&page=&pageSize=&sort=`。
- **`reports`**：`dashboard` 聚合。
- **`users` / `auth`**：用户组织与登录。

> 业务单号 `TR-####` / `LV-####` 由**后端**按类型前缀（`TR`/`LV`）+ 当前最大值 +1 生成（对应前端 `nextRequestId` 逻辑移至服务端）。

---

## 2. API 接口清单（RESTful + RPC）

### 2.1 认证（`auth`，无需鉴权）
| Method | Endpoint | 说明 |
|---|---|---|
| POST | `/aws/v1/auth/login` | 企业 SSO 登录，签发 `Qy_token`。Body 见 §3.10（SSO 字段待定，前端登录逻辑将复用另一项目，此处**空出位置**） |

### 2.2 当前用户 & 组织（`users`）
| Method | Endpoint | 说明 |
|---|---|---|
| GET | `/aws/v1/users/me` | 当前登录用户（从 token 解析；返回 `role/managerId/department`） |
| GET | `/aws/v1/users` | 用户/组织列表。Query：`?department=&role=` |
| GET | `/aws/v1/users/:id` | 用户详情（含上下级 `managerId`） |
| GET | `/aws/v1/users/:id/requests` | 某用户发起的全部申请（=「我的申请」的另一种取法） |

### 2.3 差旅申请（`travel-requests`，主资源）
| Method | Endpoint | Body / Query | 说明 |
|---|---|---|---|
| GET | `/aws/v1/travel-requests` | Query（同 §2.6） | 差旅列表 |
| POST | `/aws/v1/travel-requests` | `CreateTravelRequestDto` | 新建**差旅草稿**（返回 `draft`，单号 `TR-####` 后端生成） |
| GET | `/aws/v1/travel-requests/:id` | — | 差旅详情（含 `audit[]`、`legs[]`、`budget`） |
| PUT | `/aws/v1/travel-requests/:id` | `CreateTravelRequestDto`（全量） | 编辑草稿（仅 `draft`/`rejected` 可编辑，对应前端 `isEditable`） |
| DELETE | `/aws/v1/travel-requests/:id` | — | 删除草稿（仅 `draft`，对应 `isDeletable`） |
| POST | `/aws/v1/travel-requests/:id/submit` | `{ comment? }` | RPC：`draft → pending_manager` |
| POST | `/aws/v1/travel-requests/:id/approve` | `{ comment? }` | RPC：经理 `pending_manager→pending_finance` / 财务 `pending_finance→approved` |
| POST | `/aws/v1/travel-requests/:id/reject` | `{ comment }`（必填） | RPC：`pending_* → rejected` |
| POST | `/aws/v1/travel-requests/:id/cancel` | `{ comment? }` | RPC：`pending_* → cancelled` |
| POST | `/aws/v1/travel-requests/:id/reedit` | `{ comment? }` | RPC：`rejected→draft` 或 `draft→draft` |
| GET | `/aws/v1/travel-requests/meta` | — | 校验规则元数据（前端动态渲染/动态校验，见 §3.11） |

### 2.4 请假申请（`leave-requests`，主资源，结构同 §2.3）
| Method | Endpoint | 说明 |
|---|---|---|
| GET | `/aws/v1/leave-requests` | 请假列表 |
| POST | `/aws/v1/leave-requests` | 新建请假草稿（单号 `LV-####`） |
| GET | `/aws/v1/leave-requests/:id` | 详情 |
| PUT | `/aws/v1/leave-requests/:id` | 编辑草稿 |
| DELETE | `/aws/v1/leave-requests/:id` | 删除草稿 |
| POST | `/aws/v1/leave-requests/:id/submit` | RPC |
| POST | `/aws/v1/leave-requests/:id/approve` | RPC |
| POST | `/aws/v1/leave-requests/:id/reject` | RPC（`comment` 必填） |
| POST | `/aws/v1/leave-requests/:id/cancel` | RPC |
| POST | `/aws/v1/leave-requests/:id/reedit` | RPC |
| GET | `/aws/v1/leave-requests/meta` | 校验规则元数据 |

### 2.5 跨类型列表 & 批量（决策 2/7）
| Method | Endpoint | 说明 |
|---|---|---|
| GET | `/aws/v1/requests` | 跨类型列表。Query：`type`(`travel|leave`)、`status`(`all|pending|<单状态>`)、`keyword`、`year`、`month`、`applicantId`、`department`、`scope`(`all|mine|todo`)、`page`、`pageSize`、`sort`(`updated|submitted`) |
| POST | `/aws/v1/requests/batch` | 批量 RPC。Body `{ action: approve|reject|cancel, ids: string[], comment? }`（`reject` 需 `comment`）`[待澄清：批量范围是否含 submit/reedit]` |

### 2.6 审批待办（`scope` query，决策 7）
`GET /aws/v1/requests?scope=todo` → 待当前用户处理：
- manager：状态 `pending_manager` 且 `applicant.managerId = 当前用户.id`
- finance：状态 `pending_finance`
`scope=mine` → 当前用户发起的全部（`applicantId = 当前用户.id`）。

### 2.7 报表聚合（`reports`，决策 8）
| Method | Endpoint | 说明 |
|---|---|---|
| GET | `/aws/v1/reports/dashboard` | 看板聚合。Query：`type`、`year`、`month`、`department`。响应见 §3.9 `DashboardResponse` |

---

## 3. `prisma/schema.prisma`（Phase 1）

> 反推自 `types.ts` / `seed.json`。异构 `fields` 规范化拆表（`TripLeg` / `Budget` / 各类型专属列）。预算金额采用 **`Decimal(15,2)`** 落库（决策 9）；对外传输仍按前端契约以**「分」整数**收发，服务端落库时原样存为 `Decimal`（如 `119400` → `119400.00`），保证前端零改动。

```prisma
generator client {
  provider = "prisma-client-js"
}

datasource db {
  provider = "mysql" // 目标后端为 MySQL 8
  url      = env("DATABASE_URL")
}

enum ApplicationType {
  travel
  leave
}

enum RequestStatus {
  draft
  pending_manager
  pending_finance
  approved
  rejected
  cancelled
}

enum AuditAction {
  submit
  approve
  reject
  cancel
  reedit
}

enum Role {
  employee
  manager
  finance
}

enum Urgency {
  normal
  urgent
}

enum Transport {
  train
  flight
  car
  other
}

enum LeaveType {
  annual
  sick
  personal
}

model User {
  id         String   @id @default(uuid())
  employeeId String   @unique
  name       String
  title      String?
  department String
  role       Role     @default(employee)
  managerId  String?
  manager    User?    @relation("ManagerSubordinates", fields: [managerId], references: [id])
  subordinates User[] @relation("ManagerSubordinates")

  requests   Request[]    @relation("Applicant")
  audits     AuditEntry[] @relation("Actor")

  createdAt  DateTime @default(now())
  updatedAt  DateTime @updatedAt

  @@index([department])
  @@index([managerId])
}

model Request {
  id            String          @id // 业务单号 TR-#### / LV-####，后端生成
  type          ApplicationType
  applicantId   String
  applicant     User            @relation("Applicant", fields: [applicantId], references: [id])
  applicantName String // 冗余，便于列表展示
  department    String // 冗余
  status        RequestStatus   @default(draft)

  reason        String          // 通用
  urgency       Urgency?        // 差旅专属
  leaveType     LeaveType?      // 请假专属
  leaveStart    String?         // YYYY-MM-DD
  leaveEnd      String?         // YYYY-MM-DD
  note          String?         // 请假备注 / 差旅预算说明（按需）

  createdAt     DateTime  @default(now())
  updatedAt     DateTime  @updatedAt
  submittedAt   DateTime?

  audit         AuditEntry[]
  legs          TripLeg[]
  budget        Budget?

  @@index([applicantId])
  @@index([status])
  @@index([type])
  @@index([createdAt])
}

model TripLeg {
  id          String   @id @default(uuid())
  requestId   String
  request     Request  @relation(fields: [requestId], references: [id], onDelete: Cascade)
  from        String
  to          String
  departDate  String   // YYYY-MM-DD
  returnDate  String   // YYYY-MM-DD
  transport   Transport

  @@index([requestId])
}

model Budget {
  id         String  @id @default(uuid())
  requestId  String  @unique
  request    Request @relation(fields: [requestId], references: [id], onDelete: Cascade)
  // 决策 9：Decimal(15,2)。对外仍以「分」整数收发，服务端原样存 Decimal。
  transport  Decimal  @db.Decimal(15, 2)
  hotel      Decimal  @db.Decimal(15, 2)
  allowance   Decimal  @db.Decimal(15, 2)
  other      Decimal  @db.Decimal(15, 2)
  note       String?

  @@index([requestId])
}

model AuditEntry {
  id        String       @id @default(uuid())
  requestId String
  request   Request      @relation(fields: [requestId], references: [id], onDelete: Cascade)
  at        DateTime     @default(now())
  actorId   String
  actor     User?        @relation("Actor", fields: [actorId], references: [id])
  actorName String
  action    AuditAction
  from      RequestStatus
  to        RequestStatus
  comment   String?

  @@index([requestId])
}
```

---

## 4. DTO（`class-validator`，Phase 2）

> 映射自 `domain/schema.ts` / `domain/applicationTypes.ts` 的 Zod 规则：`reason` 10–200 字、`urgency` 枚举、行程 1–10 段、金额非负整数且 ≤1e9（对外「分」）、预算合计 > 1_000_000 分（1 万元）时 `note` 必填、日期 `YYYY-MM-DD`。

### 4.1 `common/enums.ts`
```ts
export enum ApplicationType { Travel = 'travel', Leave = 'leave' }
export enum RequestStatus {
  Draft = 'draft',
  PendingManager = 'pending_manager',
  PendingFinance = 'pending_finance',
  Approved = 'approved',
  Rejected = 'rejected',
  Cancelled = 'cancelled',
}
export type StatusFilter = 'all' | 'pending' | RequestStatus;
export enum AuditAction {
  Submit = 'submit', Approve = 'approve', Reject = 'reject', Cancel = 'cancel', Reedit = 'reedit',
}
export enum Urgency { Normal = 'normal', Urgent = 'urgent' }
export enum Transport { Train = 'train', Flight = 'flight', Car = 'car', Other = 'other' }
export enum LeaveType { Annual = 'annual', Sick = 'sick', Personal = 'personal' }
export enum Role { Employee = 'employee', Manager = 'manager', Finance = 'finance' }

export const DATE_REGEX = /^\d{4}-\d{2}-\d{2}$/;
export const MAX_LEGS = 10;
export const REASON_MIN = 10;
export const REASON_MAX = 200;
export const CENTS_MAX = 1_000_000_000;
export const BUDGET_NOTE_THRESHOLD_CENTS = 1_000_000;
```

### 4.2 `leg.dto.ts`
```ts
import { IsString, IsEnum, Matches, IsNotEmpty } from 'class-validator';
import { Transport, DATE_REGEX } from '../common/enums';

export class LegDto {
  @IsString() @IsNotEmpty() from: string;
  @IsString() @IsNotEmpty() to: string;
  @Matches(DATE_REGEX, { message: 'departDate 格式应为 YYYY-MM-DD' })
  departDate: string;
  @Matches(DATE_REGEX, { message: 'returnDate 格式应为 YYYY-MM-DD' })
  returnDate: string;
  @IsEnum(Transport) transport: Transport;
}
```

### 4.3 `budget.dto.ts`（含「超阈值强制说明」校验；对外「分」整数，落库转 Decimal）
```ts
import { IsInt, Min, Max, IsOptional, IsString, Length, ValidateIf } from 'class-validator';
import { CENTS_MAX, BUDGET_NOTE_THRESHOLD_CENTS } from '../common/enums';

export class BudgetDto {
  @IsInt() @Min(0) @Max(CENTS_MAX) transport: number;
  @IsInt() @Min(0) @Max(CENTS_MAX) hotel: number;
  @IsInt() @Min(0) @Max(CENTS_MAX) allowance: number;
  @IsInt() @Min(0) @Max(CENTS_MAX) other: number;

  @IsOptional() @IsString() @Length(1, 500) note?: string;

  // 预算合计 > 1,000,000 分（1 万元）时，note 必填
  @ValidateIf((o: BudgetDto) => o.transport + o.hotel + o.allowance + o.other > BUDGET_NOTE_THRESHOLD_CENTS)
  @IsString({ message: '预算合计超过 1 万元（1,000,000 分）时必须填写说明' })
  note!: string;
}
```

### 4.4 创建 DTO（决策 10：按类型拆分为两个独立端点，无判别联合）
```ts
// create-travel-request.dto.ts —— POST /aws/v1/travel-requests
import { IsString, Length, IsEnum, IsArray, ValidateNested, Type } from 'class-validator';
import { Urgency, REASON_MIN, REASON_MAX, MAX_LEGS } from '../common/enums';
import { LegDto } from './leg.dto';
import { BudgetDto } from './budget.dto';

export class CreateTravelRequestDto {
  @IsString() @Length(REASON_MIN, REASON_MAX) reason: string;
  @IsEnum(Urgency) urgency: Urgency;
  @IsArray() @ValidateNested({ each: true }) @Type(() => LegDto)
  @Length(1, MAX_LEGS) // 1~10 段
  legs: LegDto[];
  @ValidateNested() @Type(() => BudgetDto) budget: BudgetDto;
}

// create-leave-request.dto.ts —— POST /aws/v1/leave-requests
import { IsString, Length, IsEnum, IsOptional, Matches } from 'class-validator';
import { LeaveType, REASON_MIN, REASON_MAX, DATE_REGEX } from '../common/enums';

export class CreateLeaveRequestDto {
  @IsString() @Length(REASON_MIN, REASON_MAX) reason: string;
  @IsEnum(LeaveType) leaveType: LeaveType;
  @Matches(DATE_REGEX, { message: 'leaveStart 格式应为 YYYY-MM-DD' })
  leaveStart: string;
  @Matches(DATE_REGEX, { message: 'leaveEnd 格式应为 YYYY-MM-DD' })
  leaveEnd: string;
  @IsOptional() @IsString() @Length(1, 500) note?: string;
}
```

### 4.5 `update-request.dto.ts`（编辑草稿，字段全可选）
```ts
import { PartialType } from '@nestjs/mapped-types';
import { CreateTravelRequestDto } from './create-travel-request.dto';
import { CreateLeaveRequestDto } from './create-leave-request.dto';
// 差旅编辑用 PartialType(CreateTravelRequestDto)，请假编辑用 PartialType(CreateLeaveRequestDto)
export class UpdateTravelRequestDto extends PartialType(CreateTravelRequestDto) {}
export class UpdateLeaveRequestDto extends PartialType(CreateLeaveRequestDto) {}
```

### 4.6 RPC 动作 DTO（决策 2）
```ts
// action.dto.ts —— 用于 submit/approve/cancel/reedit（comment 可选）
import { IsOptional, IsString, Length } from 'class-validator';
export class ActionDto {
  @IsOptional() @IsString() @Length(1, 500) comment?: string;
}

// reject-action.dto.ts —— reject 强制 comment
import { IsString, Length } from 'class-validator';
export class RejectActionDto {
  @IsString() @Length(1, 500) comment: string;
}

// batch-action.dto.ts —— POST /aws/v1/requests/batch
import { IsArray, IsString, IsIn, IsOptional, IsString, Length } from 'class-validator';
export class BatchActionDto {
  @IsIn(['approve', 'reject', 'cancel']) action: 'approve' | 'reject' | 'cancel';
  @IsArray() @IsString({ each: true }) ids: string[];
  @IsOptional() @IsString() @Length(1, 500) comment?: string;
  // reject 时 comment 必填（Service 层按 action 校验）
}
```

### 4.7 `query-requests.dto.ts`（跨类型列表 / scope）
```ts
import { IsOptional, IsEnum, IsString, IsInt, Min, Max, IsIn } from 'class-validator';
import { Type } from 'class-transformer';
import { ApplicationType, RequestStatus } from '../common/enums';

export class QueryRequestsDto {
  @IsOptional() @IsEnum(ApplicationType) type?: ApplicationType;
  @IsOptional() @IsIn(['all', 'pending', ...Object.values(RequestStatus)]) status?: string;
  @IsOptional() @IsString() keyword?: string;
  @IsOptional() @Type(() => Number) @IsInt() @Min(2000) year?: number;
  @IsOptional() @Type(() => Number) @IsInt() @Min(1) @Max(12) month?: number;
  @IsOptional() @IsString() applicantId?: string;
  @IsOptional() @IsString() department?: string;
  @IsOptional() @IsIn(['all', 'mine', 'todo']) scope?: 'all' | 'mine' | 'todo';
  @IsOptional() @Type(() => Number) @IsInt() @Min(1) page?: number = 1;
  @IsOptional() @Type(() => Number) @IsInt() @Min(1) @Max(100) pageSize?: number = 20;
  @IsOptional() @IsIn(['updated', 'submitted']) sort?: 'updated' | 'submitted';
}
```

### 4.8 `dashboard.dto.ts`（决策 8）
```ts
// Query
export class DashboardQueryDto {
  @IsOptional() @IsEnum(ApplicationType) type?: ApplicationType;
  @IsOptional() @Type(() => Number) @IsInt() year?: number;
  @IsOptional() @Type(() => Number) @IsInt() @Min(1) @Max(12) month?: number;
  @IsOptional() @IsString() department?: string;
}

// Response 形态（Service 组装后返回，经统一响应包裹）
export interface Slice { name: string; value: number }
export interface TrendPoint { month: string; value: number; unit: string }
export interface DashboardResponse {
  statusDistribution: Slice[];
  leaveTypeDistribution?: Slice[]; // 仅 type=leave
  monthlyTrend: TrendPoint[];
  totals: { count: number; budgetCents: number; leaveDays: number };
}
```

### 4.9 `meta.dto.ts`（决策 5：`/aws/v1/<type>-requests/meta`）
```ts
// 后端统一管理的校验规则；前端动态渲染表单与动态校验。
export interface FieldRule {
  key: string;
  label: string;
  type: 'text' | 'textarea' | 'number' | 'select' | 'date' | 'dateRange' | 'repeatable' | 'group';
  required: boolean;
  min?: number;
  max?: number;
  options?: { value: string; label: string }[];
  noteThresholdCents?: number; // 如 budget 超该阈值需填说明
}
export interface MetaResponse {
  type: 'travel' | 'leave';
  fields: FieldRule[];
  maxLegs: number;
  centsMax: number;
}
// 示例 GET /aws/v1/travel-requests/meta →
// { type:'travel', maxLegs:10, centsMax:1000000000,
//   fields:[ {key:'reason',type:'textarea',required:true,min:10,max:200},
//            {key:'urgency',type:'select',required:true,options:[{value:'normal',label:'普通'},{value:'urgent',label:'紧急'}]},
//            {key:'legs',type:'repeatable',required:true,min:1,max:10},
//            {key:'budget',type:'group',required:true,noteThresholdCents:1000000} ] }
```

### 4.10 `auth.dto.ts`（决策 4：企业 SSO）
```ts
import { IsString, IsNotEmpty } from 'class-validator';

// SSO 登录：字段为 userId / password / tenantId。
// 前端将新增独立登录页，登录逻辑**空出位置**，复用另一前端项目的登录逻辑；此处仅定义契约骨架。
export class LoginDto {
  @IsString() @IsNotEmpty() userId: string;
  @IsString() @IsNotEmpty() password: string;
  @IsString() @IsOptional() tenantId?: string = 'tenant_001'; // 默认租户
}

export class AuthResponse {
  token: string; // 即 Qy_token
  user: { id: string; name: string; role: string; department: string; managerId: string | null };
}
```

---

## 5. 前端 ↔ 后端 映射速查

| 前端（`src/lib/data/requests.ts` / `domain/*`） | 后端 |
|---------|---------|
| `loadRequests(type?` → `GET /api/requests` | `GET /aws/v1/requests?type=` 或 `GET /aws/v1/<type>-requests` |
| `filterByStatus` | `?status=`（`pending` = 两待审态合集） |
| `searchRequests` | `?keyword=`（事由 / 目的地模糊） |
| `filterByDate` | `?year=&month=` |
| `getRequestsByApplicant` | `?scope=mine`（或 `GET /aws/v1/users/:id/requests`） |
| 「待我审批」 | `GET /aws/v1/requests?scope=todo` |
| `createDraft` | `POST /aws/v1/<type>-requests`（不提交） |
| `createRequest` / `updateRequestFromDraft` | `POST /aws/v1/<type>-requests`（建草稿）+ `POST /aws/v1/<type>-requests/:id/submit` |
| `transition()` 状态机 | 各 RPC 端点 `submit/approve/reject/cancel/reedit`（角色 / comment 由服务端强制） |
| `deleteRequest`（仅 draft） | `DELETE /aws/v1/<type>-requests/:id` |
| 本地聚合 `ManagerDashboard` | `GET /aws/v1/reports/dashboard`（决策 8） |
| 前端 `nextRequestId` | 后端生成 `TR-/LV-` 单号（决策 11） |
| 表单/校验硬编码 | `GET /aws/v1/<type>-requests/meta` 动态校验（决策 5） |

---

## 6. 实施阶段（来自任务卡，逐步确认）

- **Phase 1**：`prisma/schema.prisma`（本文 §3）✅ 已定稿
- **Phase 2**：所有 DTO（本文 §4）✅ 已定稿
- **Phase 3**：`ApplicationService`（状态机驱动，事务保证；含单号生成、审计追加、`scope` 计算）
- **Phase 4**：`ApplicationController` + `ApprovalController`（路径对齐本文 §2；RPC 动作端点）
- **Phase 5**：JWT 鉴权 + 全局异常过滤 + 统一响应拦截器（包裹 `{code,data,msg}`）

> 任务卡要求：每一步生成后等待确认，再继续下一步。

---

## 7. 待澄清决议（全部已决策，冻结）

| # | 议题 | 决议 |
|---|---|---|
| 1 | Base URL | `/aws/v1` |
| 2 | 复杂业务操作 | RPC 风格端点（`submit/approve/reject/cancel/reedit/batch`） |
| 3 | 统一响应格式 | `{ code, data, msg }`（成功 `code:"200"`） |
| 4 | 登录方式 | 企业 SSO；前端新增独立登录页，登录逻辑空出位置复用另一项目 |
| 5 | 元数据端点 | 需要；`GET /aws/v1/travel-requests/meta` 与 `.../leave-requests/meta`（后端管规则，前端动态渲染/校验） |
| 6 | 分页策略 | Offset 分页（`page` / `pageSize` / `total`） |
| 7 | 「我的申请 / 待我审批」 | `scope` query（`mine` / `todo`） |
| 8 | 报表聚合 | 由后端提供 `GET /aws/v1/reports/dashboard` |
| 9 | 预算金额类型 | `Decimal(15,2)` 落库；对外仍以「分」整数收发，服务端原样存 Decimal |
| 10 | 创建 DTO | 拆为 `travel-requests` / `leave-requests` 两个独立端点（无判别联合） |
| 11 | 业务单号 | 后端生成 `TR-/LV-` + 序号 |
| 12 | 前端代码改动 | 如涉及，保留原逻辑并补注释标注「已停用」以便溯源（当前阶段不改前端） |

> 仍留白项（非阻塞，可在 Phase 实现时再定）：
> - 批量 RPC 是否含 `submit`/`reedit`（当前限定 `approve/reject/cancel`）。
> - `meta` 返回结构的字段细节（§4.9 为推荐形态）。
