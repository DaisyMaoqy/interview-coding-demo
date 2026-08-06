import type { Role, User, UserId } from './types';

/**
 * 组织架构。
 *
 * 这是演示用的固定编制，不随业务流转变化，因此作为本地常量而非远程数据 ——
 * 远程只提供会变的申请单列表（GET /api/travel/applications）。
 */
export const USERS = [
	{
		id: 'u-zhangsan',
		name: '张三',
		title: '软件工程师',
		department: '研发部',
		role: 'employee',
		managerId: 'u-lijingli'
	},
	{
		id: 'u-wangfang',
		name: '王芳',
		title: '高级软件工程师',
		department: '研发部',
		role: 'employee',
		managerId: 'u-lijingli'
	},
	{
		id: 'u-liuyang',
		name: '刘洋',
		title: '测试工程师',
		department: '研发部',
		role: 'employee',
		managerId: 'u-lijingli'
	},
	{
		id: 'u-chenjing',
		name: '陈静',
		title: '产品经理',
		department: '研发部',
		role: 'employee',
		managerId: 'u-lijingli'
	},
	{
		id: 'u-lijingli',
		name: '李经理',
		title: '研发部主管',
		department: '研发部',
		role: 'manager',
		managerId: null
	}
] as const satisfies readonly User[];

/**
 * `as const satisfies` 让 UserId 由数据本身推导：
 * 拼错 ID 会在编译期报错，而不是运行时查不到人。
 */
export type KnownUserId = (typeof USERS)[number]['id'];

const USER_BY_ID = new Map<UserId, User>(USERS.map((u) => [u.id, u]));

/** 演示的两个身份：切角色即切登录人 */
export const EMPLOYEE_ID = 'u-zhangsan' satisfies KnownUserId;
export const MANAGER_ID = 'u-lijingli' satisfies KnownUserId;

/** 角色 → 该角色对应的登录人。角色切换时用它换身份。 */
export const IDENTITY_BY_ROLE: Record<Role, KnownUserId> = {
	employee: EMPLOYEE_ID,
	manager: MANAGER_ID
};

export function findUser(id: UserId): User | undefined {
	return USER_BY_ID.get(id);
}

/**
 * 取用户，取不到就抛。
 *
 * 用户表是随应用一起发布的常量，取不到只可能是数据损坏或 ID 拼错，
 * 属于程序缺陷 —— 早失败比让 undefined 悄悄渗进 UI 更好排查。
 */
export function requireUser(id: UserId): User {
	const user = USER_BY_ID.get(id);
	if (!user) throw new Error(`未知用户：${id}`);
	return user;
}
