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
		/** 状态聚合结果（按 STATUS_ORDER 排序） */
		slices: Slice[];
		/** 展示形态：差旅用饼图，请假用环形图 */
		variant?: 'pie' | 'donut';
		/** 点击扇区时回传分类名，由父组件决定如何筛选 */
		onSelect?: (name: string) => void;
	}

	let { slices, variant = 'pie', onSelect }: Props = $props();

	const isDonut = $derived(variant === 'donut');
	const total = $derived(slices.reduce((sum, s) => sum + s.value, 0));

	const option = $derived<EChartsOption>({
		animation: true,
		animationType: 'scale',
		animationEasing: 'cubicOut',
		animationDuration: 800,
		animationDurationUpdate: 600,
		animationEasingUpdate: 'cubicInOut',
		color: slices.map((s) => s.color),
		tooltip: {
			trigger: 'item',
			// eslint-disable-next-line @typescript-eslint/no-explicit-any
			formatter: (p: any) => `${p.name}：${p.value} 单（${p.percent ?? 0}%）`
		},
		legend: { bottom: 0, textStyle: { color: '#64748b' } },
		title: isDonut
			? {
					text: String(total),
					subtext: '总单数',
					left: 'center',
					top: '40%',
					textStyle: { fontSize: 22, color: '#0f172a' },
					subtextStyle: { color: '#64748b' }
				}
			: undefined,
		series: [
			{
				type: 'pie',
				radius: isDonut ? ['45%', '68%'] : ['42%', '68%'],
				center: ['50%', isDonut ? '44%' : '45%'],
				avoidLabelOverlap: true,
				label: isDonut ? { show: false } : { formatter: '{b}\n{d}%' },
				data: slices.map((s) => ({ name: s.name, value: s.value })),
				emphasis: isDonut
					? {
							itemStyle: {
								shadowBlur: 10,
								shadowOffsetX: 0,
								shadowColor: 'rgba(0, 0, 0, 0.5)'
							}
						}
					: undefined
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
