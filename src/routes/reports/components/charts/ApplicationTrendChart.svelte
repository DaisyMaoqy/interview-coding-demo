<script lang="ts">
	import type { EChartsOption } from 'echarts';
	import type * as echarts from 'echarts';
	import Chart from '$lib/components/common/Chart.svelte';
	import { CHART_COLORS } from '$lib/domain/dashboard';

	interface Point {
		month: string;
		amount: number;
	}

	interface Props {
		points: Point[];
		/** 指标名（申请量 / 请假天数），用于图例与 tooltip */
		name: string;
		/** 单位（单 / 天），用于 tooltip 后缀 */
		unit: string;
		/** 点击数据点时回传月份，由父组件决定如何筛选 */
		onSelect?: (month: string) => void;
	}

	let { points, name, unit, onSelect }: Props = $props();

	const option = $derived<EChartsOption>({
		color: CHART_COLORS,
		tooltip: { trigger: 'axis', valueFormatter: (v) => `${Number(v)} ${unit}` },
		grid: { left: 8, right: 16, top: 24, bottom: 8, containLabel: true },
		xAxis: {
			type: 'category',
			data: points.map((p) => p.month),
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
				name,
				type: 'line',
				smooth: true,
				showSymbol: false,
				areaStyle: { opacity: 0.12 },
				data: points.map((p) => p.amount)
			}
		]
	});

	function onReady(chart: echarts.ECharts): void {
		chart.on('click', (params: { name?: string }) => {
			if (params.name) onSelect?.(params.name);
		});
	}
</script>

<Chart {option} {onReady} />
