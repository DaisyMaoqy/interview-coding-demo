import { describe, it, expect } from 'vitest';
import seed from '../../data/seed.json' with { type: 'json' };
import { MANAGER_ID, findUser } from '../../domain/org';
import { travelFormSchema } from '../../domain/schema';
import type { RequestStatus, TravelRequest } from '../../domain/types';

/**
 * seed.json 是 `npm run seed` 的产物，同时也是 Apifox Mock 响应的副本。
 *
 * 这里**不重复测已被领域层覆盖的规则**（金额、日期、超限说明等由 schema 保证），
 * 只守住三条底线：数据结构合法、演示所需的场景全覆盖、审批链自洽。
 * 脚本改坏或有人手改 JSON，会在这里被拦下，而不是等页面出现空图表才发现。
 */

const requests = seed as TravelRequest[];

// 当前流程实际会产生的状态（财务审批 pending_finance 已省略，仅保留在
// workflow.ts 的 TRANSITIONS 注释与 types 的联合类型中，待日后接入 finance 角色）。
const ACTIVE_STATUSES: RequestStatus[] = [
	'draft',
	'pending_manager',
	'approved',
	'rejected',
	'cancelled'
];

function budgetSum(request: TravelRequest): number {
	const { transport, hotel, allowance, other } = request.budget;
	return transport + hotel + allowance + other;
}

describe('seed 数据结构', () => {
	it('数据量在演示所需的规模区间内', () => {
		// 这条同时也是后续「筛选后应为空」类断言的前提：
		// 数据集为空时那些断言会真空通过，必须先确保数据确实存在
		expect(requests.length).toBeGreaterThanOrEqual(30);
		expect(requests.length).toBeLessThanOrEqual(60);
	});

	it('单号唯一', () => {
		expect(new Set(requests.map((r) => r.id)).size).toBe(requests.length);
	});

	it('申请人存在于组织架构，且冗余的姓名与之一致', () => {
		// 姓名是为时间线冗余存储的，与用户表脱节会导致详情页显示错人；
		// 用户不存在时 findUser 返回 undefined，同样落入这个断言
		const mismatched = requests
			.filter((r) => findUser(r.applicantId)?.name !== r.applicantName)
			.map((r) => r.id);

		expect(mismatched).toEqual([]);
	});

	it('每张单都能通过整单 schema 校验', () => {
		// 领域层的全部校验规则在此一次性作用于真实数据
		const invalid = requests
			.map((r) => ({ id: r.id, result: travelFormSchema.safeParse(r) }))
			.filter(({ result }) => !result.success)
			.map(({ id, result }) => ({ id, issues: result.error?.issues }));

		expect(invalid).toEqual([]);
	});
});

describe('seed 场景覆盖', () => {
	it('当前流程涉及的五种状态全部有数据，保证每个筛选 tab 都非空', () => {
		const present = new Set(requests.map((r) => r.status));

		expect(ACTIVE_STATUSES.filter((s) => !present.has(s))).toEqual([]);
	});

	it('审批人有待处理的他人单据，审批视图不会是空列表', () => {
		const todo = requests.filter(
			(r) => r.applicantId !== MANAGER_ID && r.status === 'pending_manager'
		);

		expect(todo.length).toBeGreaterThan(0);
	});

	it('存在超过 1 万元的单，覆盖预算超限场景', () => {
		// 是否附了说明由 schema 保证，这里只确认场景被覆盖到
		const highCost = requests.filter((r) => budgetSum(r) > 1_000_000);

		expect(highCost.length).toBeGreaterThan(0);
	});

	it('跨越 12 个自然月，月度趋势图不会断点', () => {
		const months = new Set(requests.map((r) => r.createdAt.slice(0, 7)));

		expect(months.size).toBe(12);
	});

	it('每位成员的单量相近，排行榜差异由金额而非单量体现', () => {
		const counts = new Map<string, number>();
		for (const r of requests) counts.set(r.applicantId, (counts.get(r.applicantId) ?? 0) + 1);

		const values = [...counts.values()];

		// 最多的人不超过最少的人的 3 倍，避免退化成一枝独秀
		expect(Math.max(...values)).toBeLessThanOrEqual(Math.min(...values) * 3);
	});
});

describe('seed 审批留痕', () => {
	it('审批人自己的单不会流转到已通过或已驳回', () => {
		// 「不能自审」是硬规则，且系统中没有更上级审批人
		const managerOwn = requests.filter((r) => r.applicantId === MANAGER_ID);
		const illegal = managerOwn.filter((r) => r.status === 'approved' || r.status === 'rejected');

		expect(managerOwn.length).toBeGreaterThan(0);
		expect(illegal).toEqual([]);
	});

	it('每张被驳回的单都有带意见的驳回记录', () => {
		const rejected = requests.filter((r) => r.status === 'rejected');
		const missingComment = rejected.filter(
			(r) => !r.audit.some((entry) => entry.action === 'reject' && entry.comment?.trim())
		);

		expect(rejected.length).toBeGreaterThan(0);
		expect(missingComment).toEqual([]);
	});

	it('审批链自洽：草稿无记录，其余首尾相接且时间递增', () => {
		const broken = requests
			.filter((r) => {
				const timeOutOfOrder = r.audit.some((e, i) => i > 0 && e.at < r.audit[i - 1].at);
				if (timeOutOfOrder) return true;

				if (r.status === 'draft') return r.audit.length > 0;

				if (r.audit.length === 0) return true;
				if (r.audit[0].from !== 'draft') return true;
				if (r.audit.at(-1)!.to !== r.status) return true;

				return r.audit.some((e, i) => i > 0 && e.from !== r.audit[i - 1].to);
			})
			.map((r) => r.id);

		expect(broken).toEqual([]);
	});
});
