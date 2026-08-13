import { resolve } from '$app/paths';

/**
 * 应用落地页。
 *
 * 进站（`/`）、业务入口裸访问（`/travel`）、错误页的返回按钮、侧栏 logo
 * 都归到这里。落地页归属是一个会变的产品决策，集中一处以免将来漏改。
 *
 * 其余路径**不**在此处再包一层常量，而是在使用处直接调用 `resolve()` ——
 * SvelteKit 的 `resolve` 接受 route ID 并做类型检查，路由拼错或缺少参数
 * 都会在编译期报错。自己维护一份字符串常量反倒会丢掉这层保护。
 */
export const HOME = resolve('/travel/requests');
