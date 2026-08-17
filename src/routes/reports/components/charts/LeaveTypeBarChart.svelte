<script lang="ts">
	import type { EChartsOption } from 'echarts';
	import type * as echarts from 'echarts';
	import Chart from '$lib/components/common/Chart.svelte';

	interface Slice {
		name: string;
		value: number;
		key: string;
		color: string;
	}

	interface Props {
		/** 请假类型聚合结果（年假/病假/事假计数） */
		slices: Slice[];
		/** 点击条形时回传分类名，由父组件决定如何筛选 */
		onSelect?: (name: string) => void;
	}

	let { slices, onSelect }: Props = $props();

	const option = $derived<EChartsOption>({
		tooltip: {
			trigger: 'axis',
			axisPointer: { type: 'shadow' },
			valueFormatter: (v) => `${Number(v)} 单`
		},
		grid: { left: 8, right: 24, top: 16, bottom: 8, containLabel: true },
		xAxis: {
			type: 'value',
			minInterval: 1,
			axisLabel: { formatter: (v: number) => String(v) },
			splitLine: { lineStyle: { color: '#f1f5f9' } }
		},
		yAxis: {
			type: 'category',
			data: slices.map((s) => s.name),
			axisLabel: { color: '#64748b' },
			axisLine: { lineStyle: { color: '#e2e8f0' } }
		},
		series: [
			{
				type: 'bar',
				barWidth: '55%',
				data: slices.map((s) => ({
					value: s.value,
					itemStyle: { color: s.color, borderRadius: [0, 4, 4, 0] }
				})),
				label: { show: true, position: 'right', color: '#475569', formatter: '{c}' }
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
