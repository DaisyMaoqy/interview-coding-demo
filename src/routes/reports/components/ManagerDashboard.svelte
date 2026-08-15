<script lang="ts">
	import type { EChartsOption } from 'echarts';
	import type * as echarts from 'echarts';
	import type { ApplicationType, RequestStatus } from '$lib/domain/types';
	import type { Request } from '$lib/domain/types';
	import {
		statusDistribution,
		monthlyApplicationTrend,
		monthlyLeaveDays,
		leaveTypeDistribution,
		leaveOverview,
		managerOverview,
		STATUS_COLORS,
		LEAVE_TYPE_COLORS,
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

	let {
		requests,
		/** 看板当前类型筛选；'leave' 时图表与卡片切换为请假语义指标 */
		type = 'all'
	}: { requests: readonly Request[]; type?: ApplicationType | 'all' } = $props();

	// 当前是否为请假视图：驱动图表/卡片/表头的差异化渲染
	const isLeave = $derived(type === 'leave');

	// ---- 筛选状态 ----
	let preset = $state<DatePreset>('all');
	let customStart = $state('');
	let customEnd = $state('');
	let selectedStatus = $state<RequestStatus | null>(null);
	let selectedLeaveType = $state<string | null>(null);
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
		selectedLeaveType = null;
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
		if (selectedLeaveType) {
			result = result.filter(
				(r) =>
					r.type === 'leave' &&
					(r.fields as Record<string, unknown>).leaveType === selectedLeaveType
			);
		}
		if (selectedMonth) {
			result = result.filter((r) => r.createdAt.slice(0, 7) === selectedMonth);
		}
		return result;
	});
	const sortedRequests = $derived(
		[...finalFiltered].sort(
			(a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
		)
	);

	// 筛选条件改变 → 分页回到首页
	const filterKey = $derived(
		`${preset}:${selectedStatus ?? ''}:${selectedLeaveType ?? ''}:${selectedMonth ?? ''}:${customStart}:${customEnd}`
	);

	// ---- 图表聚合（仅对日期筛选后的数据做聚合） ----
	const overview = $derived(managerOverview(dateFiltered));
	const leave = $derived(leaveOverview(dateFiltered));

	// 饼图数据：请假视图看「请假类型分布」，其余看「申请状态分布」
	const pieSlices = $derived(
		isLeave
			? leaveTypeDistribution(dateFiltered).map((s) => ({
					name: s.name,
					value: s.count,
					key: s.value,
					color: LEAVE_TYPE_COLORS[s.value] ?? CHART_COLORS[0]
				}))
			: statusDistribution(dateFiltered).map((s) => ({
					name: s.name,
					value: s.value,
					key: s.status,
					color: STATUS_COLORS[s.status]
				}))
	);

	// 趋势：请假视图看「请假天数」，其余看「申请量」
	const trend = $derived(
		isLeave ? monthlyLeaveDays(dateFiltered) : monthlyApplicationTrend(dateFiltered)
	);
	const trendName = $derived(isLeave ? '请假天数' : '申请量');
	const trendUnit = $derived(isLeave ? '天' : '单');

	const statusOption = $derived<EChartsOption>({
		color: pieSlices.map((s) => s.color),
		tooltip: {
			trigger: 'item',
			// eslint-disable-next-line @typescript-eslint/no-explicit-any
			formatter: (p: any) => `${p.name}：${p.value} ${trendUnit}（${p.percent ?? 0}%）`
		},
		legend: { bottom: 0, textStyle: { color: '#64748b' } },
		series: [
			{
				type: 'pie',
				radius: ['42%', '68%'],
				center: ['50%', '45%'],
				label: { formatter: '{b}\n{d}%' },
				data: pieSlices.map((s) => ({ name: s.name, value: s.value }))
			}
		]
	});

	const trendOption = $derived<EChartsOption>({
		color: CHART_COLORS,
		tooltip: { trigger: 'axis', valueFormatter: (v) => `${v as number} ${trendUnit}` },
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
		series: [
			{
				name: trendName,
				type: 'line',
				smooth: true,
				showSymbol: false,
				areaStyle: { opacity: 0.12 },
				data: trend.map((p) => p.amount)
			}
		]
	});

	// ---- 图表点击交互 ----
	function onPieReady(chart: echarts.ECharts): void {
		chart.on('click', (params: { name?: string }) => {
			const slice = pieSlices.find((s) => s.name === params.name);
			if (!slice) return;
			if (isLeave) {
				selectedLeaveType = selectedLeaveType === slice.key ? null : slice.key;
				selectedStatus = null;
			} else {
				selectedStatus =
					selectedStatus === (slice.key as RequestStatus) ? null : (slice.key as RequestStatus);
				selectedLeaveType = null;
			}
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
			selectedLeaveType = null;
			resetDateFilter();
		});
	}
</script>

<div class="cards">
	<StatCard label="申请总数" value={String(overview.total)} />
	<StatCard label="待处理" value={String(overview.pending)} />
	{#if isLeave}
		<StatCard label="请假总天数" value={`${leave.totalDays} 天`} />
	{/if}
	<StatCard label="通过率" value={`${(overview.passRate * 100).toFixed(1)}%`} />
</div>

<div class="grid">
	<Panel title={isLeave ? '请假类型分布' : '申请状态分布'}>
		<Chart option={statusOption} onReady={onPieReady} />
	</Panel>
	<Panel title={isLeave ? '近 12 个月请假天数趋势' : '近 12 个月申请量趋势'}>
		<Chart option={trendOption} onReady={onLineReady} />
	</Panel>
</div>

<Panel title="申请记录" actions={header}>
	<ApplicationTable requests={sortedRequests} {type} resetKey={filterKey} />
</Panel>

{#snippet header()}
	<DateFilter
		bind:preset
		bind:customStart
		bind:customEnd
		bind:visible={showDateFilter}
		onreset={resetAllFilters}
	/>
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
