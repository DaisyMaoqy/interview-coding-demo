<script lang="ts">
	import type { EChartsOption } from 'echarts';
	import type { TravelRequest } from '$lib/domain/types';
	import {
		statusDistribution,
		monthlyApplicationTrend,
		managerOverview,
		STATUS_COLORS,
		STATUS_ORDER,
		CHART_COLORS
	} from '$lib/domain/dashboard';
	import Panel from '$lib/components/common/Panel.svelte';
	import Chart from '$lib/components/common/Chart.svelte';
	import StatCard from '$lib/components/common/StatCard.svelte';

	let { requests }: { requests: readonly TravelRequest[] } = $props();

	const overview = $derived(managerOverview(requests));
	const status = $derived(statusDistribution(requests));
	const trend = $derived(monthlyApplicationTrend(requests));

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
</script>

<div class="cards">
	<StatCard label="申请总数" value={String(overview.total)} />
	<StatCard label="待处理" value={String(overview.pending)} />
	<StatCard label="通过率" value={`${(overview.passRate * 100).toFixed(1)}%`} />
</div>

<div class="grid">
	<Panel title="申请状态分布">
		<Chart option={statusOption} />
	</Panel>
	<Panel title="近 12 个月申请量趋势">
		<Chart option={trendOption} />
	</Panel>
</div>

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
	}
</style>
