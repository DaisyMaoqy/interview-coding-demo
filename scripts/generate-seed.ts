/**
 * 生成演示用的种子数据 `src/lib/data/seed.json`。
 *
 * ```
 * npm run seed
 * ```
 *
 * 三条设计约束：
 *
 * 1. **确定性**：用固定种子的伪随机数生成器，同样的输入永远产出同样的文件。
 *    否则每跑一次脚本，报表的数字就全变一遍，diff 也没法看。
 * 2. **走真实状态机**：每张单的状态都由 `transition()` 一步步流转出来，
 *    而不是直接写死 `status: 'approved'`。这样审批时间线必然自洽，
 *    也顺带反向验证了状态机本身。
 * 3. **李经理的单全部预置为终态**：他既是主管又是员工，
 *    而「不能自审」是硬规则，所以他的单不能停在待审批状态，否则永远无人处理。
 *
 * 审批为两级：主管先审（pending_manager → pending_finance），财务二审
 * （pending_finance → approved）。申请人池仅限 role==='employee'，财务角色
 * 只作为二审审批人出现，避免「自己审自己」的死锁。
 */

import { mkdirSync, writeFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { EMPLOYEE_ID, FINANCE_ID, MANAGER_ID, USERS, requireUser } from '../src/lib/domain/org';
import { budgetTotal } from '../src/lib/domain/money';
import { BUDGET_NOTE_THRESHOLD_CENTS } from '../src/lib/domain/schema';
import { transition } from '../src/lib/domain/workflow';
import type {
	ApplicationType,
	Budget,
	Request,
	RequestStatus,
	TravelFields,
	TripLeg,
	Urgency,
	User
} from '../src/lib/domain/types';

// ── 确定性随机 ────────────────────────────────────────────────────

/**
 * mulberry32：32 位种子的小型 PRNG。
 * 选它是因为实现只有几行、无依赖，且分布对演示数据足够均匀。
 */
function createRandom(seed: number) {
	let state = seed >>> 0;

	const next = () => {
		state = (state + 0x6d2b79f5) >>> 0;
		let t = state;
		t = Math.imul(t ^ (t >>> 15), t | 1);
		t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
		return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
	};

	return {
		/** [min, max] 闭区间整数 */
		int: (min: number, max: number) => min + Math.floor(next() * (max - min + 1)),
		pick: <T>(items: readonly T[]): T => items[Math.floor(next() * items.length)],
		/** 以 p 的概率返回 true */
		chance: (p: number) => next() < p
	};
}

const SEED = 20260806;
const random = createRandom(SEED);

// ── 语料 ─────────────────────────────────────────────────────────

const CITIES = ['北京', '上海', '深圳', '杭州', '广州', '成都', '南京', '武汉'] as const;

const REASONS = [
	'赴客户现场进行系统上线支持',
	'参加年度技术大会并做主题分享',
	'对接分公司完成需求调研',
	'参与合作伙伴季度业务复盘会议',
	'现场排查生产环境性能问题',
	'参加行业展会并考察竞品方案',
	'新签客户的实施方案交付培训',
	'配合审计部门完成现场资料核查'
] as const;

const REJECT_COMMENTS = [
	'预算超出部门季度额度，请压缩住宿费用后重新提交',
	'该时间段已有同事出差同一地点，建议合并行程',
	'出差事由描述不够具体，请补充客户名称与交付目标'
] as const;

const APPROVE_COMMENTS = ['同意，注意留存票据', '同意', '同意，请按期提交出差总结'] as const;

const LEAVE_REASONS = [
	'家中有事需回老家处理',
	'身体不适需就医休养',
	'陪产假期间照顾新生儿',
	'婚假筹备婚礼事宜',
	'年假调休陪伴家人出游',
	'病假复查与康复训练'
] as const;

const LEAVE_NOTES = [
	'已与组内同事完成工作交接',
	'紧急事务可电话联系',
	'返岗后补交相关资料'
] as const;

// ── 单张申请的构造 ────────────────────────────────────────────────

/** 生成 1~2 段互不重叠的行程；long=true 时拉长天数，用于高成本大单 */
function makeLegs(baseDate: Date, long = false): TripLeg[] {
	const count = long ? 2 : random.chance(0.25) ? 2 : 1;
	const legs: TripLeg[] = [];
	let cursor = new Date(baseDate);

	for (let i = 0; i < count; i++) {
		const from = random.pick(CITIES);
		let to = random.pick(CITIES);
		while (to === from) to = random.pick(CITIES);

		const depart = new Date(cursor);
		const days = long ? random.int(5, 7) : random.int(1, 4);
		const back = new Date(depart);
		back.setUTCDate(back.getUTCDate() + days);

		legs.push({
			id: `leg-${i + 1}`,
			from,
			to,
			departDate: toDateString(depart),
			returnDate: toDateString(back),
			transport: random.pick(['train', 'flight', 'car', 'other'] as const)
		});

		// 下一段至少隔一天出发，避开 schema 的重叠校验
		cursor = new Date(back);
		cursor.setUTCDate(cursor.getUTCDate() + random.int(2, 5));
	}

	return legs;
}

/** 预算与行程天数正相关，让「金额-天数」看起来合乎常理 */
function makeBudget(legs: TripLeg[], forceHighCost = false): Budget {
	const totalDays = legs.reduce((sum, leg) => {
		const depart = Date.parse(`${leg.departDate}T00:00:00Z`);
		const back = Date.parse(`${leg.returnDate}T00:00:00Z`);
		return sum + Math.round((back - depart) / 86_400_000) + 1;
	}, 0);

	const hasFlight = legs.some((leg) => leg.transport === 'flight');

	// 约两成是长期驻场的高成本出差。刻意保留这档，是为了让数据里
	// 真实存在突破 10,000 元阈值的单 —— 否则 budgetNote 字段和
	// 「超限需说明」这条校验规则在演示中永远不会被触发。
	// forceHighCost 用于「保证覆盖」：直接拉满酒店单价与天数，确保一定过线。
	const isHighCost = forceHighCost || random.chance(0.2);
	const hotelRate = isHighCost ? random.int(1100, 1600) : random.int(350, 800);

	return {
		// 机票明显贵于高铁，制造金额差异，让成员排行榜有区分度
		transport: hasFlight ? random.int(1400, 3200) * 100 : random.int(400, 1200) * 100,
		hotel: totalDays * hotelRate * 100,
		allowance: totalDays * 20000,
		other: random.chance(0.4) ? random.int(50, 400) * 100 : 0
	};
}

function toDateString(date: Date): string {
	return date.toISOString().slice(0, 10);
}

/** 在给定日期上加减若干小时，让时间线的各条记录不撞在同一秒 */
function shiftHours(iso: string, hours: number): Date {
	return new Date(Date.parse(iso) + hours * 3600_000);
}

interface Plan {
	applicant: User;
	/** 期望达到的最终状态 */
	target: RequestStatus;
	createdAt: Date;
	/** 申请类型；决定字段形状与单号前缀 */
	type: ApplicationType;
	/** 标记为高成本出差：强制预算突破阈值，保证「超限需说明」场景被覆盖 */
	highCost?: boolean;
}

/**
 * 把一张草稿沿状态机推到目标状态。
 *
 * 走真实 `transition()` 而非硬写状态，好处是审批时间线一定合法，
 * 且脚本本身成了状态机的一道额外验证 —— 流转不通会直接抛错。
 */
function driveToTarget(draft: Request, target: RequestStatus, approver: User): Request {
	let current: Request = draft;
	let clock = 0;
	// 财务二审审批人：与主管分离的独立角色，确保两级审批由不同人完成
	const financeApprover = requireUser(FINANCE_ID);

	const step = (
		action: Parameters<typeof transition>[0]['action'],
		actor: User,
		comment?: string
	) => {
		clock += random.int(3, 30);
		const result = transition({
			request: current,
			action,
			actor,
			comment,
			now: shiftHours(current.updatedAt, clock),
			auditId: `${current.id}-audit-${current.audit.length + 1}`
		});

		if (!result.ok) {
			// 脚本里出现非法流转说明目标状态的推导逻辑写错了，直接失败比产出脏数据好
			throw new Error(`[${current.id}] ${action} 失败：${result.message}`);
		}

		current = result.request;
	};

	if (target === 'draft') return current;

	const applicant = requireUser(current.applicantId);
	step('submit', applicant);

	switch (target) {
		case 'pending_manager':
			break;

		case 'pending_finance':
			// 只走主管一审：主管通过即停在「待财务审批」，留待财务二审
			step('approve', approver, random.chance(0.5) ? random.pick(APPROVE_COMMENTS) : undefined);
			break;

		case 'approved':
			// 两级审批：主管通过后再由财务通过才归档
			step('approve', approver, random.chance(0.5) ? random.pick(APPROVE_COMMENTS) : undefined);
			step(
				'approve',
				financeApprover,
				random.chance(0.5) ? random.pick(APPROVE_COMMENTS) : undefined
			);
			break;

		case 'rejected':
			// 驳回统一发生在主管环节（主管驳回即终止，不进财务）
			step('reject', approver, random.pick(REJECT_COMMENTS));
			break;

		case 'cancelled':
			step('cancel', applicant);
			break;
	}

	return current;
}

function makeTravelFields(plan: Plan): TravelFields {
	const legs = makeLegs(plan.createdAt, plan.highCost === true);
	const budget = makeBudget(legs, plan.highCost === true);
	const total = budgetTotal(budget);

	return {
		reason: random.pick(REASONS),
		urgency: (random.chance(0.2) ? 'urgent' : 'normal') satisfies Urgency,
		legs,
		budget,
		// 超过阈值必须带说明，否则整单 schema 校验不过
		...(total > BUDGET_NOTE_THRESHOLD_CENTS
			? { budgetNote: '客户现场驻场周期较长，住宿与交通成本高于常规出差' }
			: {})
	};
}

function makeLeaveFields(plan: Plan): Record<string, unknown> {
	const start = plan.createdAt;
	const days = random.int(1, 10);
	const end = new Date(start);
	end.setUTCDate(end.getUTCDate() + days);

	const note = random.chance(0.6) ? random.pick(LEAVE_NOTES) : undefined;

	return {
		reason: random.pick(LEAVE_REASONS),
		leaveType: random.pick(['annual', 'sick', 'personal'] as const),
		// dateRange 字段把起止拆成 leaveStart / leaveEnd 两个键，schema 据此校验
		leaveStart: toDateString(start),
		leaveEnd: toDateString(end),
		...(note ? { note } : {})
	};
}

function makeDraft(plan: Plan, id: string): Request {
	const fields = plan.type === 'travel' ? makeTravelFields(plan) : makeLeaveFields(plan);
	const createdAt = plan.createdAt.toISOString();

	return {
		id,
		type: plan.type,
		applicantId: plan.applicant.id,
		applicantName: plan.applicant.name,
		department: plan.applicant.department,
		fields,
		status: 'draft',
		createdAt,
		updatedAt: createdAt,
		audit: []
	};
}

// ── 编排 ─────────────────────────────────────────────────────────

/**
 * 员工单的状态配额。
 *
 * 用**精确配额**而非按权重随机抽样 —— 抽样有概率让某个状态一张都不出现
 * （实测就撞上过 pending_finance 为 0），演示时那个筛选 tab 就是空的。
 * 配额能保证每个状态都有内容，且各 tab 的数量比例可控。
 */
const EMPLOYEE_QUOTA: ReadonlyArray<readonly [RequestStatus, number]> = [
	['draft', 4],
	['pending_manager', 6],
	['pending_finance', 4],
	['approved', 12],
	['rejected', 4],
	['cancelled', 3]
];

/**
 * 李经理的单只取「他自己就能达到」的状态。
 *
 * 他是系统里唯一的审批人，而「不能自审」是硬规则，所以他的单走不到
 * approved / rejected —— 那需要一位他的上级，本演示不引入该角色。
 * 停在 pending_manager 是合理的：业务上就是「等更上级批」，
 * 且 /approvals 会按 applicantId !== 当前用户过滤掉，不会出现在他自己的待办里。
 */
const MANAGER_QUOTA: ReadonlyArray<readonly [RequestStatus, number]> = [
	['draft', 1],
	['pending_manager', 2],
	['cancelled', 1]
];

/** 把 [状态, 数量] 配额展开成扁平数组 */
function expandQuota(quota: ReadonlyArray<readonly [RequestStatus, number]>): RequestStatus[] {
	return quota.flatMap(([status, count]) => Array.from({ length: count }, () => status));
}

/** Fisher-Yates 洗牌。用注入的 PRNG，保证同种子下结果一致 */
function shuffle<T>(items: T[]): T[] {
	const result = [...items];

	for (let i = result.length - 1; i > 0; i--) {
		const j = random.int(0, i);
		[result[i], result[j]] = [result[j], result[i]];
	}

	return result;
}

function buildPlans(): Plan[] {
	const approver = requireUser(MANAGER_ID);
	const zhangsan = requireUser(EMPLOYEE_ID);
	// 申请人池只取普通员工：财务角色仅作为二审审批人出现，
	// 否则财务自己提交的单会卡在「待财务审批」且无人可二审（自审被禁止）。
	const employees = USERS.filter((u) => u.role === 'employee');

	// 覆盖最近 12 个自然月，锚定在固定日期以保证输出稳定
	const anchor = new Date(Date.UTC(2026, 7, 1));

	/** 在指定月份内取一个确定性的随机时刻 */
	const dateInMonth = (monthsAgo: number) => {
		const date = new Date(anchor);
		date.setUTCMonth(date.getUTCMonth() - monthsAgo);
		date.setUTCDate(random.int(1, 26));
		date.setUTCHours(random.int(9, 18), random.int(0, 59), 0, 0);
		return date;
	};

	const employeeTargets = shuffle(expandQuota(EMPLOYEE_QUOTA));
	const managerTargets = shuffle(expandQuota(MANAGER_QUOTA));

	// 申请人按轮转分配而非独立随机抽样：后者会让某人拿到十几张、某人只有两三张，
	// 成员排行榜就退化成一枝独秀，看不出对比。轮转保证人均单量接近，
	// 排行榜的差异由「金额」而非「单量」体现，更贴近真实的成本分析场景。
	const rotation = shuffle([...employees]);

	const plans: Plan[] = [
		...employeeTargets.map((target, i) => ({
			applicant: rotation[i % rotation.length],
			target,
			type: 'travel' as const,
			// 沿 12 个月轮转铺开，保证月度趋势图每个月都有数据点
			createdAt: dateInMonth(11 - (i % 12))
		})),
		...managerTargets.map((target, i) => ({
			applicant: approver,
			target,
			type: 'travel' as const,
			// 错开到不同季度，避免他的单全挤在同一个月
			createdAt: dateInMonth((i * 3) % 12)
		}))
	];

	// 保证张三（默认登录人）在最近两个月有草稿和被驳回的单，
	// 这样一进首页就能看到「待办提醒」，不必翻页找
	plans.push(
		{
			applicant: zhangsan,
			target: 'draft',
			type: 'travel' as const,
			createdAt: new Date(Date.UTC(2026, 7, 3, 10, 0, 0))
		},
		{
			applicant: zhangsan,
			target: 'rejected',
			type: 'travel' as const,
			createdAt: new Date(Date.UTC(2026, 6, 20, 14, 0, 0))
		},
		{
			applicant: zhangsan,
			target: 'pending_manager',
			type: 'travel' as const,
			// 高成本大单：预算突破阈值，演示「超限需补充说明」与 budgetNote 字段
			highCost: true,
			createdAt: new Date(Date.UTC(2026, 7, 1, 9, 30, 0))
		}
	);

	// 按创建时间正序，单号才会随时间递增
	plans.sort((a, b) => a.createdAt.getTime() - b.createdAt.getTime());
	return plans;
}

/**
 * 请假单的状态配额（与差旅独立计数）。
 *
 * 同样用精确配额保证每个状态都有内容。李经理的请假单也只取他自身可达的状态
 * （draft / pending_manager / cancelled），避免出现无人可二审的死锁。
 */
const LEAVE_EMPLOYEE_QUOTA: ReadonlyArray<readonly [RequestStatus, number]> = [
	['draft', 2],
	['pending_manager', 2],
	['pending_finance', 2],
	['approved', 6],
	['rejected', 1],
	['cancelled', 1]
];

const LEAVE_MANAGER_QUOTA: ReadonlyArray<readonly [RequestStatus, number]> = [
	['draft', 1],
	['pending_manager', 1],
	['cancelled', 1]
];

/** 生成请假演示数据，结构与 `buildPlans` 一致，只是字段与单号前缀不同 */
function buildLeavePlans(): Plan[] {
	const approver = requireUser(MANAGER_ID);
	const zhangsan = requireUser(EMPLOYEE_ID);
	const employees = USERS.filter((u) => u.role === 'employee');

	const anchor = new Date(Date.UTC(2026, 7, 1));
	const dateInMonth = (monthsAgo: number) => {
		const date = new Date(anchor);
		date.setUTCMonth(date.getUTCMonth() - monthsAgo);
		date.setUTCDate(random.int(1, 26));
		date.setUTCHours(random.int(9, 18), random.int(0, 59), 0, 0);
		return date;
	};

	const employeeTargets = shuffle(expandQuota(LEAVE_EMPLOYEE_QUOTA));
	const managerTargets = shuffle(expandQuota(LEAVE_MANAGER_QUOTA));
	const rotation = shuffle([...employees]);

	const plans: Plan[] = [
		...employeeTargets.map((target, i) => ({
			applicant: rotation[i % rotation.length],
			target,
			type: 'leave' as const,
			createdAt: dateInMonth(11 - (i % 12))
		})),
		...managerTargets.map((target, i) => ({
			applicant: approver,
			target,
			type: 'leave' as const,
			createdAt: dateInMonth((i * 3) % 12)
		}))
	];

	// 张三的请假单也保持「近期有草稿与待审」，演示里能直接看到
	plans.push(
		{
			applicant: zhangsan,
			target: 'draft',
			type: 'leave' as const,
			createdAt: new Date(Date.UTC(2026, 7, 5, 10, 0, 0))
		},
		{
			applicant: zhangsan,
			target: 'pending_manager',
			type: 'leave' as const,
			createdAt: new Date(Date.UTC(2026, 7, 2, 9, 30, 0))
		}
	);

	plans.sort((a, b) => a.createdAt.getTime() - b.createdAt.getTime());
	return plans;
}

function main(): void {
	const approver = requireUser(MANAGER_ID);

	// 差旅与请假各有独立单号前缀（TR- / LV-），分别生成后合并
	const travelPlans = buildPlans();
	const leavePlans = buildLeavePlans();

	const travelRequests = travelPlans.map((plan, i) =>
		driveToTarget(makeDraft(plan, `TR-${String(i + 1).padStart(4, '0')}`), plan.target, approver)
	);
	const leaveRequests = leavePlans.map((plan, i) =>
		driveToTarget(makeDraft(plan, `LV-${String(i + 1).padStart(4, '0')}`), plan.target, approver)
	);

	const requests = [...travelRequests, ...leaveRequests];

	// 列表默认按更新时间倒序，seed 里先排好，省得每次读取都要排
	requests.sort((a, b) => b.updatedAt.localeCompare(a.updatedAt));

	const here = dirname(fileURLToPath(import.meta.url));
	const outFile = resolve(here, '../src/lib/data/seed.json');
	mkdirSync(dirname(outFile), { recursive: true });
	writeFileSync(outFile, `${JSON.stringify(requests, null, '\t')}\n`, 'utf8');

	const byStatus = requests.reduce<Record<string, number>>((acc, r) => {
		acc[r.status] = (acc[r.status] ?? 0) + 1;
		return acc;
	}, {});

	const byType = requests.reduce<Record<string, number>>((acc, r) => {
		acc[r.type] = (acc[r.type] ?? 0) + 1;
		return acc;
	}, {});

	console.log(`已生成 ${requests.length} 张申请单 → ${outFile}`);
	console.table(byStatus);
	console.table(byType);
}

main();
