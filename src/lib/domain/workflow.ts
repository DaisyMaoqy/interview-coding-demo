import type {
	AuditAction,
	AuditEntry,
	RequestStatus,
	Transport,
	TravelRequest,
	Urgency,
	User
} from './types';

/**
 * 审批状态机。
 *
 * 设计要点：
 * - **声明式流转表**：谁能在什么状态下做什么动作，集中在 TRANSITIONS 一张表里。
 *   加一个审批环节只需改表，不用去各个页面里找 if。
 * - **不抛异常**：返回判别联合 TransitionResult。非法流转是可预期的业务结果
 *   （比如两个标签页同时操作同一张单），不是程序缺陷，调用方应当展示提示而非崩溃。
 * - **纯函数**：不改入参，返回新的 TravelRequest，便于测试与时间旅行调试。
 */

/** 状态在 UI 上的中文名，列表筛选、时间线、图表图例共用，保证三处措辞一致 */
export const STATUS_LABELS: Record<RequestStatus, string> = {
	draft: '草稿',
	pending_manager: '待主管审批',
	pending_finance: '待财务审批',
	approved: '已通过',
	rejected: '已驳回',
	cancelled: '已撤销'
};

export const ACTION_LABELS: Record<AuditAction, string> = {
	submit: '提交申请',
	approve: '通过',
	reject: '驳回',
	cancel: '撤销',
	reedit: '重新编辑'
};

/** 交通方式在 UI 上的中文名，行程表与详情页共用 */
export const TRANSPORT_LABELS: Record<Transport, string> = {
	train: '动车',
	flight: '飞机',
	car: '汽车',
	other: '其他'
};

/** 紧急程度的中文名，详情页与列表徽章共用 */
export const URGENCY_LABELS: Record<Urgency, string> = {
	normal: '普通',
	urgent: '紧急'
};

/**
 * 该动作是否必须填写意见。
 *
 * 直接问流转表而非在页面里写 `action === 'reject'` —— 若以后新增一个
 * 也需要意见的动作，只改 TRANSITIONS 即可，详情页/审批页的弹窗逻辑不用动。
 */
export function actionRequiresComment(action: AuditAction): boolean {
	return TRANSITIONS[action].some((rule) => rule.commentRequired);
}

/** 必填审批意见（驳回理由）的最大长度；超出时 transition 直接拒绝，避免意见无限拉长 */
export const REJECT_COMMENT_MAX_LENGTH = 200;

/** 谁有资格执行该动作 */
type ActorRule =
	/** 仅申请人本人 */
	| 'applicant'
	/** 申请人的直属主管，且不能是本人 */
	| 'manager'
	/** 财务角色；本演示中同样由主管身份承担 */
	| 'finance';

interface TransitionRule {
	from: RequestStatus;
	to: RequestStatus;
	actor: ActorRule;
	/** 该动作是否必须填写意见 */
	commentRequired: boolean;
}

/**
 * 完整流转表。
 *
 * ```
 * draft ──submit──▶ pending_manager ──approve──▶ pending_finance ──approve──▶ approved
 *                        │                                │
 *                        ├──reject──▶ rejected ◀──reject──┤
 *                        └──cancel──▶ cancelled ◀──cancel─┘
 *
 * rejected ──reedit──▶ draft
 * ```
 */
const TRANSITIONS: Record<AuditAction, readonly TransitionRule[]> = {
	submit: [{ from: 'draft', to: 'pending_manager', actor: 'applicant', commentRequired: false }],
	approve: [
		{ from: 'pending_manager', to: 'pending_finance', actor: 'manager', commentRequired: false },
		{ from: 'pending_finance', to: 'approved', actor: 'finance', commentRequired: false }
	],
	// 驳回必须说明理由，否则申请人不知道该改什么
	reject: [
		{ from: 'pending_manager', to: 'rejected', actor: 'manager', commentRequired: true },
		{ from: 'pending_finance', to: 'rejected', actor: 'finance', commentRequired: true }
	],
	// 已通过的单不可撤销 —— 差旅已成行，撤销没有业务含义
	cancel: [
		{ from: 'pending_manager', to: 'cancelled', actor: 'applicant', commentRequired: false },
		{ from: 'pending_finance', to: 'cancelled', actor: 'applicant', commentRequired: false }
	],
	reedit: [{ from: 'rejected', to: 'draft', actor: 'applicant', commentRequired: false }]
};

export type TransitionFailureCode =
	/** 当前状态不允许该动作 */
	| 'invalid_status'
	/** 当前用户没有执行该动作的资格 */
	| 'forbidden'
	/** 缺少必填的审批意见 */
	| 'comment_required'
	/** 审批意见超出长度上限 */
	| 'comment_too_long';

export type TransitionResult =
	| { ok: true; request: TravelRequest }
	| { ok: false; code: TransitionFailureCode; message: string };

function canActAs(rule: ActorRule, actor: User, request: TravelRequest): boolean {
	switch (rule) {
		case 'applicant':
			return actor.id === request.applicantId;
		case 'manager':
		case 'finance':
			// 审批人必须是管理角色，且不能审批自己提交的单
			return actor.role === 'manager' && actor.id !== request.applicantId;
	}
}

/** 当前用户在当前状态下可执行的动作，用于决定按钮显示哪些 */
export function availableActions(request: TravelRequest, actor: User): AuditAction[] {
	return (Object.keys(TRANSITIONS) as AuditAction[]).filter((action) =>
		TRANSITIONS[action].some(
			(rule) => rule.from === request.status && canActAs(rule.actor, actor, request)
		)
	);
}

/** 是否可编辑内容：只有草稿可改 */
export function isEditable(request: TravelRequest, actor: User): boolean {
	return request.status === 'draft' && actor.id === request.applicantId;
}

/** 是否可删除：只有本人的草稿可删 */
export function isDeletable(request: TravelRequest, actor: User): boolean {
	return isEditable(request, actor);
}

export interface TransitionInput {
	request: TravelRequest;
	action: AuditAction;
	actor: User;
	comment?: string;
	/** 注入时间，便于测试与 seed 生成得到确定性结果 */
	now?: Date;
	/** 注入 ID 生成器，同上 */
	auditId?: string;
}

/**
 * 执行一次状态流转。
 *
 * 成功时返回**新的**申请对象，并自动追加一条 AuditEntry。
 */
export function transition({
	request,
	action,
	actor,
	comment,
	now = new Date(),
	auditId
}: TransitionInput): TransitionResult {
	const candidates = TRANSITIONS[action];
	const byStatus = candidates.filter((rule) => rule.from === request.status);

	if (byStatus.length === 0) {
		return {
			ok: false,
			code: 'invalid_status',
			message: `「${STATUS_LABELS[request.status]}」状态下无法${ACTION_LABELS[action]}`
		};
	}

	const rule = byStatus.find((r) => canActAs(r.actor, actor, request));
	if (!rule) {
		// 自审是最容易撞上的一种越权，单独给一句更具体的提示
		const selfApproval = actor.id === request.applicantId && action !== 'cancel';
		return {
			ok: false,
			code: 'forbidden',
			message: selfApproval ? '不能审批自己提交的申请' : `你没有权限${ACTION_LABELS[action]}此申请`
		};
	}

	const trimmed = comment?.trim();
	if (rule.commentRequired && !trimmed) {
		return {
			ok: false,
			code: 'comment_required',
			message: `${ACTION_LABELS[action]}时必须填写意见`
		};
	}

	if (rule.commentRequired && trimmed && trimmed.length > REJECT_COMMENT_MAX_LENGTH) {
		return {
			ok: false,
			code: 'comment_too_long',
			message: `${ACTION_LABELS[action]}意见不能超过 ${REJECT_COMMENT_MAX_LENGTH} 字`
		};
	}

	const at = now.toISOString();
	const entry: AuditEntry = {
		id: auditId ?? `audit-${request.audit.length + 1}-${at}`,
		at,
		actorId: actor.id,
		actorName: actor.name,
		action,
		from: request.status,
		to: rule.to,
		...(trimmed ? { comment: trimmed } : {})
	};

	return {
		ok: true,
		request: {
			...request,
			status: rule.to,
			updatedAt: at,
			// 首次提交才记录提交时间；驳回后重新提交不覆盖，保证「平均审批时长」以初次提交为基准
			submittedAt: action === 'submit' ? (request.submittedAt ?? at) : request.submittedAt,
			audit: [...request.audit, entry]
		}
	};
}
