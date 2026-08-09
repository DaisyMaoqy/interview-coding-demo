import { describe, it, expect } from 'vitest';
import { pageCount, clampPage, paginate } from '../../domain/paginate';

/**
 * 分页纯函数测试。
 *
 * pageCount / clampPage / paginate 是「我的申请」和「待我审批」两处列表共用的
 * 横切逻辑，空表、越界、最后一页缺条等边界场景都需要覆盖。
 */

describe('pageCount', () => {
	it('空表视为 1 页', () => {
		expect(pageCount(0, 5)).toBe(1);
		expect(pageCount(0, 10)).toBe(1);
	});

	it('正好整除时返回商', () => {
		expect(pageCount(10, 5)).toBe(2);
		expect(pageCount(20, 10)).toBe(2);
	});

	it('有余数时向上取整', () => {
		expect(pageCount(11, 5)).toBe(3);
		expect(pageCount(1, 10)).toBe(1);
	});

	it('总数等于页大小时为 1 页', () => {
		expect(pageCount(5, 5)).toBe(1);
	});
});

describe('clampPage', () => {
	it('小于 1 时收拢到 1', () => {
		expect(clampPage(0, 20, 5)).toBe(1);
		expect(clampPage(-1, 20, 5)).toBe(1);
	});

	it('超过总页数时收拢到最后一页', () => {
		expect(clampPage(5, 20, 5)).toBe(4); // 20/5 = 4 页
		expect(clampPage(99, 10, 10)).toBe(1); // 只有 1 页
	});

	it('在合法区间内返回原值', () => {
		expect(clampPage(1, 20, 5)).toBe(1);
		expect(clampPage(3, 20, 5)).toBe(3);
		expect(clampPage(4, 20, 5)).toBe(4);
	});

	it('空表时任何页码都收拢到 1', () => {
		expect(clampPage(5, 0, 10)).toBe(1);
		expect(clampPage(0, 0, 10)).toBe(1);
	});
});

describe('paginate', () => {
	const items = ['a', 'b', 'c', 'd', 'e', 'f', 'g'];

	it('第一页取前 pageSize 条', () => {
		expect(paginate(items, 1, 3)).toEqual(['a', 'b', 'c']);
	});

	it('第二页正确偏移', () => {
		expect(paginate(items, 2, 3)).toEqual(['d', 'e', 'f']);
	});

	it('最后一页条数不足 pageSize 时只取剩余', () => {
		expect(paginate(items, 3, 3)).toEqual(['g']);
	});

	it('空数组返回空', () => {
		expect(paginate([], 1, 5)).toEqual([]);
	});

	it('页码越界自动收拢到最后一页', () => {
		expect(paginate(items, 5, 3)).toEqual(['g']); // 只有 3 页
	});

	it('页码为 0 时收拢到第一页', () => {
		expect(paginate(items, 0, 3)).toEqual(['a', 'b', 'c']);
	});

	it('负数页码收拢到第一页', () => {
		expect(paginate(items, -1, 3)).toEqual(['a', 'b', 'c']);
	});
});
