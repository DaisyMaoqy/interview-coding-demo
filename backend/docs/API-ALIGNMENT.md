# 审批工作流 API 对齐契约（修订版 / 供前端对照调整）

> 用途：原 `API.md` 的部分「冻结决策」与前端实际实现存在冲突。本文件给出**目标契约**
> 与**前端需改动清单**，用于前端先据此调整输出，后端随后按同契约实现。
>
> 标记约定：
> - **[建议]** 表示推荐默认，可推翻；推翻后请同步改本文件与 `API.md`。
> - **[待确认]** 表示仍需你拍板，下面给出倾向项。
> - 行内引用形如 `requests.ts:94` 指向前端源码，便于跳转核对。

---

## 0. 五大待定决策的当前建议

| 决策 | 冲突点 | 本文件建议 | 状态 |
|---|---|---|---|
| **A. 路径/包裹/鉴权** | 前端只调 `GET /api/requests`（裸数组、无前缀、无包裹、无 token）；`API.md` 要求 `/aws/v1` + `{code,data}` + Bearer | **[已确认] 采用 `API.md` 目标**：`/aws/v1` 前缀 + Bearer 鉴权；响应包裹统一用**全局** `ResponseInterceptor`/`AllExceptionsFilter` 的 `{code,msg,data}`（成功 `code:'200'`、`msg:'成功'`，HTTP 始终 200），**不再使用 aws 专属 `{code,data,message}` 包裹**；前端改请求层（见 §7） | ✅ |
| **B. 对接范围** | 前端当前仅列表读取真实联网，写操作只落 localStorage | 后端全量实现；前端本轮先接「列表读取 + 写操作回写」，其余端点保留 | [建议] |
| **C. 登录/当前用户** | `API.md` 登录「空出位置」无真实 SSO；但 `users/me`、`scope=todo` 都需当前用户 | **[已确认] 后端提供简易登录**：userId+password 验 `auth_db`，签 JWT，`Qy_token`=JWT；前端新增登录页拿 token | ✅ |
| **D. 用户数据来源** | `API.md` 把 `User` 放 approval_workflow_db 并建 `@relation`，但本项目约定用户在 `auth_db`、逻辑外键不建 DB 级 FK | approval_workflow_db **不存完整 User**；`users/me`、`scope=todo` 所需字段（id/name/department/role/managerId）由**冗余精简 User 表**（D2）或跨库读 `auth_db`（D1）提供 → 倾向 **D2** | [建议] |
| **E. 字段包裹 vs 扁平** | `API.md` 创建 DTO 扁平（`reason/urgency/legs/budget` 顶层）；前端天然用 `fields:{...}` 包裹 | **[已确认] 保持 `fields` 包裹**（前端不改结构，后端 DTO 改为接收 `fields`）。见 §2.5 | ✅ |

> 其余 `API.md` 已冻结决策（RPC 风格端点、Offset 分页、scope 查询、后端报表、Decimal 落库、单号后端生成）**维持不变**，仅按本节修正落地细节。

---

## 1. 全局约定（目标）

- **Base URL**：`/aws/v1`（资源名复数；差旅/请假各自独立资源）。
- **鉴权**：除登录外，请求头 `Authorization: Bearer <Qy_token>`。`<Qy_token>` 为 JWT 值。
- **统一响应包裹**（沿用本 monolith 全局 `ResponseInterceptor` / `AllExceptionsFilter`，aws 模块不再自设拦截器/过滤器）：
  ```json
  { "code": "200", "msg": "成功", "data": <T> }
  ```
  错误（HTTP 状态固定为 200，错误码在 `code` 字段）：
  ```json
  { "code": "<HTTP 状态码串>", "msg": "<错误信息>", "data": null }
  ```
  > 注意：成功 `code` 为字符串 `"200"`（非 `"0"`）；字段名为 `msg` 与 `data`，顺序与全局一致。前端解包以此为准。
- **时间**：`createdAt/updatedAt/submittedAt/audit.at` = ISO-8601 字符串；业务日期 = `YYYY-MM-DD`。
- **金额**：整数「分」（`number`），对外与前端完全一致；落库 `Decimal(15,2)`（服务端原样存分值，不做元/分换算，避免漂移）。单字段范围 `0 ~ 1_000_000_000`。
- **枚举字符串值（不变）**：
  - `ApplicationType`：`travel` | `leave`
  - `RequestStatus`：`draft` | `pending_manager` | `pending_finance` | `approved` | `rejected` | `cancelled`
  - `AuditAction`：`submit` | `approve` | `reject` | `cancel` | `reedit`
  - `Role`：`employee` | `manager` | `finance`
  - `Urgency`：`normal` | `urgent`
  - `Transport`：`train` | `flight` | `car` | `other`
  - `LeaveType`：`annual` | `sick` | `personal`
- **分页（建议简化）**：列表 `data` 默认返回**数组** `Request[]`（匹配前端现有消费习惯，`requests.ts:110` 直接当数组用）。`?page=&pageSize=` 为可选，后续再切换到 `{list,total,page,pageSize}` 包裹形态。**本轮先用数组形态**。

---

## 2. 端点总表（修订版）

| Method | Endpoint | 说明 | 请求体 / Query |
|---|---|---|---|
| POST | `/aws/v1/auth/login` | 简易登录，签 `Qy_token`（C） | `{ userId, password, tenantId? }` |
| GET | `/aws/v1/users/me` | 当前用户（role/managerId/department） | — |
| GET | `/aws/v1/users` | 用户/组织列表 `?department=&role=` | — |
| GET | `/aws/v1/users/:id` | 用户详情（含 managerId） | — |
| GET | `/aws/v1/users/:id/requests` | 某用户发起的全部 | — |
| GET | `/aws/v1/travel-requests` | 差旅列表 | Query 同 §跨类型 |
| POST | `/aws/v1/travel-requests` | 新建差旅草稿（单号 `TR-####` 后端生成） | `{ fields: TravelFields }` |
| GET | `/aws/v1/travel-requests/:id` | 详情（含 audit/legs/budget） | — |
| PUT | `/aws/v1/travel-requests/:id` | 编辑草稿（仅 draft/rejected） | `{ fields: TravelFields }` |
| DELETE | `/aws/v1/travel-requests/:id` | 删除草稿（仅 draft） | — |
| POST | `/aws/v1/travel-requests/:id/submit` | RPC `draft→pending_manager` | `{ comment? }` |
| POST | `/aws/v1/travel-requests/:id/approve` | RPC 经理→finance / 财务→approved | `{ comment? }` |
| POST | `/aws/v1/travel-requests/:id/reject` | RPC `pending_*→rejected` | `{ comment }`（必填，≤200） |
| POST | `/aws/v1/travel-requests/:id/cancel` | RPC `pending_*→cancelled` | `{ comment? }` |
| POST | `/aws/v1/travel-requests/:id/reedit` | RPC `rejected→draft`（draft→draft 不写审计） | `{ comment? }` |
| GET | `/aws/v1/travel-requests/meta` | 校验规则元数据（可选，见 §5） | — |
| GET/POST/PUT/DELETE | `/aws/v1/leave-requests/...` | 结构与 travel 对称（单号 `LV-####`） | `{ fields: LeaveFields }` |
| GET | `/aws/v1/requests` | 跨类型列表 | Query：`type`/`status`/`keyword`/`year`/`month`/`applicantId`/`department`/`scope`(`all|mine|todo`)/`sort`(`updated|submitted`) |
| POST | `/aws/v1/requests/batch` | 批量 `{ action: approve|reject|cancel, ids[], comment? }` | reject 需 comment |
| GET | `/aws/v1/reports/dashboard` | 看板聚合 | Query：`type`/`year`/`month`/`department` |

> 与 `API.md` 的差异：`/api/requests` → `/aws/v1/requests`；新增 `auth/login`；
> `travel-requests`/`leave-requests` 的创建/编辑改为收 **`fields` 包裹**（见 §2.5）；
> `reject` 的 `comment` 上限统一为 **200**（见 §3）。

---

## 3. 字段形态与长度约束（必对齐）

来源：`applicationTypes.ts` / `types.ts` / `workflow.ts`。

### 3.1 差旅 `fields`（TravelFields）
```ts
{
  reason: string;        // 10~200 字（applicationTypes.ts:181-182）
  urgency: 'normal'|'urgent';
  legs: {                // 1~10 段（applicationTypes.ts:206-207）
    id?: string;         // 前端 repeatable 的 itemKey，可带可不带；后端忽略或自生成
    from: string;        // ≤30（applicationTypes.ts:210）
    to: string;          // ≤30（applicationTypes.ts:211）
    departDate: string;  // YYYY-MM-DD
    returnDate: string;  // YYYY-MM-DD
    transport: 'train'|'flight'|'car'|'other';
  }[];
  budget: {
    transport: number;   // 分，≥0
    hotel: number;
    allowance: number;
    other: number;
  };
  budgetNote?: string;   // 预算合计 > 1_000_000 分时必填；≤200 字（applicationTypes.ts:247）
}
```

### 3.2 请假 `fields`（LeaveFields）
```ts
{
  reason: string;        // 5~200 字（applicationTypes.ts:278-279）⚠️ 与 travel 的 10 不同
  leaveType: 'annual'|'sick'|'personal';
  leaveStart: string;    // YYYY-MM-DD（来自 dateRange fromKey，applicationTypes.ts:301）
  leaveEnd: string;      // YYYY-MM-DD（applicationTypes.ts:302）
  note?: string;         // ≤200 字（applicationTypes.ts:304）
}
```

### 3.3 长度差异（前端 vs API.md，需统一为前端值）
| 字段 | API.md | 前端实际 | 本文件裁定 |
|---|---|---|---|
| 差旅 `reason` | 10~200 | 10~200 | 10~200 ✅ |
| 请假 `reason` | 10~200（`REASON_MIN`） | **5~200** | **[已确认] 取 5**（前端 `applicationTypes.ts:278` minLength=5 为权威） |
| `budgetNote` | 1~500 | **≤200** | **200**（与前端一致） |
| `note`（请假） | 1~500 | **≤200** | **200** |
| `reject` comment | 1~500 | **≤200**（`workflow.ts:67`） | **200** |

> 建议：后端 DTO 的 `Length` 上限改为 200，与前端 `REJECT_COMMENT_MAX_LENGTH`、各 `maxLength` 一致；请假 `reason` 下界待你在 5 / 10 间定。

---

## 4. 创建/编辑 payload（E：fields 包裹）

`type` 由 URL 决定，**payload 只传 `fields`**：

```jsonc
// POST /aws/v1/travel-requests
{
  "fields": {
    "reason": "赴客户现场支持系统上线",
    "urgency": "normal",
    "legs": [
      { "from": "北京", "to": "上海", "departDate": "2026-09-01", "returnDate": "2026-09-03", "transport": "train" }
    ],
    "budget": { "transport": 55300, "hotel": 90000, "allowance": 30000, "other": 0 },
    "budgetNote": "含跨城高铁与三晚住宿"
  }
}
```
```jsonc
// POST /aws/v1/leave-requests
{
  "fields": {
    "reason": "家里有事需请假",
    "leaveType": "personal",
    "leaveStart": "2026-09-10",
    "leaveEnd": "2026-09-12",
    "note": "处理个人事务"
  }
}
```
- `PUT`（编辑草稿）同结构，`fields` 全量覆盖。
- 前端 `nextRequestId` 生成的 `id` **不再随请求发送**（或发送但后端忽略），单号以服务端 `TR-/LV-` 为准。

---

## 5. 响应形态（单条 / 列表）

单条响应 `data` = 前端 `Request` 形状（`types.ts:105`），即：

```jsonc
{
  "code": "200",
  "msg": "成功",
  "data": {
    "id": "TR-0013",            // 服务端生成
    "type": "travel",
    "applicantId": "<uuid>",
    "applicantName": "张三",
    "department": "研发中心",
    "status": "draft",
    "createdAt": "2026-08-21T08:00:00.000Z",
    "updatedAt": "2026-08-21T08:00:00.000Z",
    "submittedAt": null,
    "audit": [],                // AuditEntry[]：{id,at,actorId,actorName,action,from,to,comment?}
    "fields": { /* 见 §3.1/§3.2 */ }
  }
}
```
- 列表 `GET /aws/v1/requests`（或 `/travel-requests`）→ `data: Request[]`（数组，见 §1 分页建议）。
- `meta` 端点（§2）：**本轮前端继续用 `applicationTypes.ts` 硬编码表单，不调 `/meta`**；`/meta` 仅作为后端可选能力，未来再切换动态渲染。

---

## 6. 后端侧需修订 `API.md` 的点（供参考，不阻塞前端）

1. **Prisma 原生 enum × MySQL**：MySQL 8 不支持 native enum，`prisma validate/migrate` 报错。所有 `enum {}` 改为 `String` + 应用层校验（`AuditEntry.from/to` 同理）。
2. **datasource**：`provider="mysql"` + `env("AWS_DATABASE_URL")`，模型落入 `prisma/approval-workflow/schema.prisma`（三库三 client 体系），非单文件 `prisma/schema.prisma`。
3. **User 模型**：approval_workflow_db 内不建完整 User（按 D 决策）；`applicantId`/`actorId` 用普通 `String` 逻辑外键，不建 DB 级 FK。
4. **创建/编辑 DTO**：由扁平改为接收 `fields` 包裹（见 §4）。
5. **长度上限**：`reject` comment、`budgetNote`、请假 `note` → 200。
6. **可见性规则**：后端列表/详情需强制 `canViewRequest`（`workflow.ts:175`）—— 自己单恒可见；经理看员工非草稿单；财务只看 `pending_finance`；否则 404。
7. **`reedit` 语义**：`draft→draft` 不追加审计、状态不变（仅改内容），镜像 `workflow.ts:121-124`。

---

## 7. 前端需要修改的输出（文件级清单）

### 7.1 新增：请求封装层（核心改造）
新增 `src/lib/data/api.ts`，统一处理所有后端调用：
- **base**：`PUBLIC_API_BASE_URL` + `/aws/v1`（替代原 `PUBLIC_MOCK_BASE_URL`）。
- **鉴权头**：自动加 `Authorization: Bearer <token>`（token 存 localStorage）。
- **解包**：解析 `{code,msg,data}`，`code !== '200'` 抛业务错误（取 `msg` 作为错误信息）；返回 `data`。
- **401 处理**：未登录/过期 → 跳转登录页。
- 原 `requests.ts:108` 的裸 `fetch` 改为走该封装。

### 7.2 文件级改动表
| 文件 : 行 | 当前输出 / 行为 | 需改为 |
|---|---|---|
| `src/lib/data/requests.ts:101` `loadRequests` | `GET {MOCK}/api/requests`，要裸 `Request[]`，无 header | `GET {API}/aws/v1/requests`，带 Bearer，取 `data`（数组） |
| `src/lib/data/requests.ts:110` | `res.json()` 直接当数组 | 取 `.data`（`code==='200'` 时） |
| `src/lib/data/requests.ts:316-334` `buildBase` | 调 `nextRequestId` 生成**最终** `id` | 不再预填最终 `id`（可乐观占位，以响应 `id` 为准） |
| `src/lib/data/requests.ts:342-365` `createDraft`/`createRequest` | 只构造本地对象，不联网 | 调 `POST /aws/v1/<type>-requests`，body `{ "fields": {...} }`，用响应回写 `id/status/audit/submittedAt` |
| `src/lib/data/requests.ts:383-402` `updateRequestFromDraft` | 只本地 `transition` | 调 `PUT /aws/v1/<type>-requests/:id` + `submit`，用响应回写 |
| `src/lib/data/requests.ts:166-172` `deleteRequest` | 只改 localStorage | 调 `DELETE /aws/v1/<type>-requests/:id` |
| `src/lib/domain/applicationTypes.ts:247,304` | `budgetNote` / `note` maxLength = 200 | ✅ 保持 200（与后端一致） |
| `src/lib/domain/applicationTypes.ts:278` | 请假 `reason` minLength = **5** | ✅ **[已确认] 下界为 5**（差旅 reason 下界为 10，见 §3.3） |
| `src/lib/domain/workflow.ts:67` | `REJECT_COMMENT_MAX_LENGTH = 200` | ✅ 保持 200（与后端一致） |
| `src/lib/domain/schema.ts` | Zod 上限由 `applicationTypes.ts` 推导 | ✅ 已为 200；仅需核对请假 `reason` min 与 §3.3 决策一致 |
| `src/lib/domain/types.ts` | `Request` 形状 | ✅ 与后端单条响应一致（含 `fields` 包裹），无需改 |
| 新增登录页 / `src/lib/data/auth.ts` | 无 token 体系 | `POST /aws/v1/auth/login` 拿 token 存 localStorage；请求层注入 |

### 7.3 配置改动
- `.env`：`PUBLIC_MOCK_BASE_URL`（Apifox mock） → `PUBLIC_API_BASE_URL`（指向后端网关，如 `http://localhost:3000`）；`/api/requests` 路径改为 `/aws/v1/requests`（由封装层处理，页面层无感）。

### 7.4 必改小结（对齐 A / E / 包裹 / 鉴权）
1. 请求 base 加 `/aws/v1` 前缀 + 走封装层。
2. 响应取 `data` 字段（兼容未来 `{list,...}` 分页）。
3. 所有请求带 `Bearer` token。
4. 写操作（建/改/删/流转）改为真实联网，并用服务端返回值回写本地 store。
5. 移除「前端生成最终单号」的强依赖。

### 7.5 待确认后改
6. ~~请假 `reason` 下界~~ **[已确认] 取 5**，后端 DTO 改 `REASON_MIN=5`（或 travel/leave 分别约束：travel 10、leave 5）。
7. 登录页：**[已确认] C 决策**落地后新增，调 `/aws/v1/auth/login` 拿 JWT。
8. `meta` 动态渲染：暂不接，维持 `applicationTypes.ts` 硬编码。

### 7.6 无需改（保持）
- `fields` 包裹结构（E 建议保留）。
- 状态机 `transition`、`scope` 客户端筛选逻辑（与服务端 `scope` 查询并存，服务端为权威）。
- 金额「分」整数、`YYYY-MM-DD` 日期约定。

---

> 本文件为对齐中间产物。待你确认 A–E（尤其 A 路径/包裹、E 字段包裹、C 登录）后，
> 再将结论回写 `API.md`，后端据此实现。
