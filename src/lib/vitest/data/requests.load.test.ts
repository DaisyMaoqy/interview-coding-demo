import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { getAllRequests, getRequestById, loadRequests, requestsStore } from '$lib/data/requests';
import type { TravelRequest } from '$lib/domain/types';
import seed from '$lib/data/seed.json' with { type: 'json' };

// loadRequests 是全仓唯一的异步/网络逻辑，此前零测试。这里 mock 掉 `fetch` 与
// `PUBLIC_MOCK_BASE_URL`，把三条降级路径（成功 / !res.ok / 网络错误 / 无 base）逐一覆盖。
vi.mock('$env/static/public', () => ({ PUBLIC_MOCK_BASE_URL: 'https://mock.test' }));

const SEED = seed as TravelRequest[];

function remoteData(): TravelRequest[] {
	return [
		{
			id: 'TR-REMOTE-A',
			applicantId: 'u-1',
			applicantName: '甲',
			department: '部门',
			reason: '远端A',
			urgency: 'normal',
			legs: [],
			budget: { transport: 0, hotel: 0, allowance: 0, other: 0 },
			budgetNote: '',
			status: 'draft',
			createdAt: '2026-01-01T00:00:00.000Z',
			// 较早
			updatedAt: '2026-01-01T00:00:00.000Z',
			audit: []
		},
		{
			id: 'TR-REMOTE-B',
			applicantId: 'u-1',
			applicantName: '甲',
			department: '部门',
			reason: '远端B',
			urgency: 'normal',
			legs: [],
			budget: { transport: 0, hotel: 0, allowance: 0, other: 0 },
			budgetNote: '',
			status: 'draft',
			createdAt: '2026-06-01T00:00:00.000Z',
			// 较晚
			updatedAt: '2026-06-01T00:00:00.000Z',
			audit: []
		}
	];
}

beforeEach(() => {
	requestsStore.set([]);
	localStorage.clear();
	vi.stubGlobal('fetch', vi.fn());
});

afterEach(() => {
	vi.unstubAllGlobals();
});

describe('loadRequests', () => {
	it('云端成功：写入工作数据集并按更新时间倒序', async () => {
		const data = remoteData();
		vi.mocked(fetch).mockResolvedValue({ ok: true, json: async () => data } as Response);

		await loadRequests();

		const list = getAllRequests();
		expect(list).toHaveLength(2);
		// 倒序：较晚的 B 在前
		expect(list[0].id).toBe('TR-REMOTE-B');
		expect(list[1].id).toBe('TR-REMOTE-A');
	});

	it('云端返回非 2xx：降级到 seed，不写入远端数据', async () => {
		vi.mocked(fetch).mockResolvedValue({ ok: false, status: 500, json: async () => [] } as Response);

		await loadRequests();

		expect(getAllRequests().length).toBe(SEED.length);
		expect(getRequestById('TR-REMOTE-A')).toBeUndefined();
	});

	it('网络/超时错误：同样降级到 seed', async () => {
		vi.mocked(fetch).mockRejectedValue(new Error('network'));

		await loadRequests();

		expect(getAllRequests().length).toBe(SEED.length);
		expect(getRequestById('TR-REMOTE-A')).toBeUndefined();
	});
});
