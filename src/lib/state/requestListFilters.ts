import { writable } from 'svelte/store';
import type { StatusFilter } from '$lib/data/requests';

/**
 * 「我的申请」列表的筛选条件（状态 / 关键字 / 年 / 月）共享状态。
 *
 * 这些筛选原本是页面级 `$state`，一旦离开列表（例如点「重新编辑」进向导）再回来就会重置。
 * 用一个模块级 store 兜住当前筛选，使得从编辑页「返回我的申请」时能恢复上次的筛选视图。
 *
 * 只存内存、不落 localStorage：整页刷新即回到默认，避免把临时筛选持久化造成困惑。
 */
export interface RequestListFilterState {
	status: StatusFilter;
	keyword: string;
	year: number | 'all';
	month: number | 'all';
}

const DEFAULT_FILTERS: RequestListFilterState = {
	status: 'all',
	keyword: '',
	year: 'all',
	month: 'all'
};

export const requestListFilters = writable<RequestListFilterState>({ ...DEFAULT_FILTERS });
