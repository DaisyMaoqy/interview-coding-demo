<script lang="ts">
	import type { EChartsOption } from 'echarts';
	import type * as echarts from 'echarts';
	import type { RequestStatus, TravelRequest } from '$lib/domain/types';
	import {
		statusDistribution,
		monthlyApplicationTrend,
		managerOverview,
		STATUS_COLORS,
		STATUS_ORDER,
		CHART_COLORS,
		computeDateRange,
		filterByDateRange,
		type DatePreset
	} from '$lib/domain/dashboard';
	import Panel from '$lib/components/common/Panel.svelte';
	import Chart from '$lib/components/common/Chart.svelte';
	import StatCard from '$lib/components/common/StatCard.svelte';
	import DateFilter from './DateFilter.svelte';
	import ApplicationTable from './ApplicationTable.svelte';

	let { requests }: { requests: readonly TravelRequest[] } = $props();

	// ---- 筛选状态 ----
	let preset = $state<DatePreset>('all');
	let customStart = $state('');
	let customEnd = $state('');
	let selectedStatus = $state<RequestStatus | null>(null);
	let selectedMonth = $state<string | null>(null);
	let showDateFilter = $state(false);

	function resetDateFilter(): void {
		preset = 'all';
		customStart = '';
		customEnd = '';
		showDateFilter = false;
	}

	function resetAllFilters(): void {
		resetDateFilter();
		selectedStatus = null;
		selectedMonth = null;
	}

	// ---- 日期范围 ----
	const dateRange = $derived.by(() => {
		const start = customStart ? new Date(customStart) : undefined;
		const end = customEnd ? new Date(customEnd) : undefined;
		return computeDateRange(preset, start, end);
	});

	// ---- 筛选 & 排序 ----
	const dateFiltered = $derived(filterByDateRange(requests, dateRange));
	const finalFiltered = $derived.by(() => {
		let result = dateFiltered;
		if (selectedStatus) {
			result = result.filter((r) => r.status === selectedStatus);
		}
		if (selectedMonth) {
			result = result.filter((r) => r.createdAt.slice(0, 7) === selectedMonth);
		}
		return result;
	});
	const sortedRequests = $derived([...finalFiltered].sort(
		(a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
	));

	// 筛选条件改变 → 分页回到首页
	const filterKey = $derived(`${preset}:${selectedStatus ?? ''}:${selectedMonth ?? ''}:${customStart}:${customEnd}`);

	// ---- 图表聚合（仅对日期筛选后的数据做聚合） ----
	const overview = $derived(managerOverview(dateFiltered));
	const status = $derived(statusDistribution(dateFiltered));
	const trend = $derived(monthlyApplicationTrend(dateFiltered));

	// 状态标签名 → 状态 key 的反向映射
	const LABEL_TO_STATUS: Record<string, RequestStatus> = $derived(
		Object.fromEntries(status.map((s) => [s.name, s.status]))
	);

	const statusOption = $derived<EChartsOption>({
		color: STATUS_ORDER.filter((s) => status.some((d) => d.status === s)).map((s) => STATUS_COLORS[s]),
		tooltip: { trigger: 'item', formatter: (p: any) => `${p.name}：${p.value} 单（${p.percent ?? 0}%）` },
		legend: { bottom: 0, textStyle: { color: '#64748b' } },
		series: [
			{
				type: 'pie',
				radius: ['42%', '68%'],
				center: ['50%', '45%'],
				label: { formatter: '{b}\n{d}%' },
				data: status.map((d) => ({ name: d.name, value: d.value }))
			}
		]
	});

	const trendOption = $derived<EChartsOption>({
		color: CHART_COLORS,
		tooltip: { trigger: 'axis', valueFormatter: (v) => `${v as number} 单` },
		grid: { left: 8, right: 16, top: 24, bottom: 8, containLabel: true },
		xAxis: {
			type: 'category',
			data: trend.map((p) => p.month),
			axisLabel: { color: '#64748b' },
			axisLine: { lineStyle: { color: '#e2e8f0' } }
		},
		yAxis: {
			type: 'value',
			minInterval: 1,
			axisLabel: { formatter: (v: number) => String(v) },
			splitLine: { lineStyle: { color: '#f1f5f9' } }
		},
		series: [{ name: '申请量', type: 'line', smooth: true, showSymbol: false, areaStyle: { opacity: 0.12 }, data: trend.map((p) => p.amount) }]
	});

	// ---- 图表点击交互 ----
	function onPieReady(chart: echarts.ECharts): void {
		chart.on('click', (params: { name?: string }) => {
			const key: RequestStatus | undefined = LABEL_TO_STATUS[params.name ?? ''];
			if (!key) return;
			selectedStatus = selectedStatus === key ? null : key;
			selectedMonth = null;
			resetDateFilter();
		});
	}

	function onLineReady(chart: echarts.ECharts): void {
		chart.on('click', (params: { name?: string }) => {
			const month = params.name as string;
			if (!month) return;
			selectedMonth = selectedMonth === month ? null : month;
			selectedStatus = null;
			resetDateFilter();
		});
	}
</script>

<div class="cards">
	<StatCard label="申请总数" value={String(overview.total)} />
	<StatCard label="待处理" value={String(overview.pending)} />
	<StatCard label="通过率" value={`${(overview.passRate * 100).toFixed(1)}%`} />
</div>

<div class="grid">
	<Panel title="申请状态分布">
		<Chart option={statusOption} onReady={onPieReady} />
	</Panel>
	<Panel title="近 12 个月申请量趋势">
		<Chart option={trendOption} onReady={onLineReady} />
	</Panel>
</div>

<Panel title="申请记录" actions={header}>
	<ApplicationTable requests={sortedRequests} resetKey={filterKey} />
</Panel>

{#snippet header()}
	<DateFilter bind:preset bind:customStart bind:customEnd bind:visible={showDateFilter} onreset={resetAllFilters} />
{/snippet}

<style>
	.cards {
		display: grid;
		grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
		gap: 1rem;
		margin-bottom: 1.25rem;
	}
	.grid {
		display: grid;
		grid-template-columns: repeat(auto-fit, minmax(320px, 1fr));
		gap: 1.25rem;
		margin-bottom: 1.25rem;
	}
</style>
