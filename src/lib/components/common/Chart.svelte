<script lang="ts">
	import { onMount, onDestroy } from 'svelte';
	import { browser } from '$app/environment';
	import * as echarts from 'echarts';
	import type { EChartsOption } from 'echarts';

	interface Props {
		/** echarts 配置项；变化时自动 setOption(notMerge) 重绘 */
		option: EChartsOption;
		/** 容器高度，默认 320px */
		height?: string;
		/** 初始化完成后回调，传递 ECharts 实例供父组件注册事件 */
		onReady?: (chart: echarts.ECharts) => void;
	}

	let { option, height = '320px', onReady }: Props = $props();

	let container = $state<HTMLDivElement>();
	let chart: echarts.ECharts | null = null;
	let observer: ResizeObserver | null = null;

	// option 变化即重绘（notMerge 保证移除旧系列，避免残留）
	$effect(() => {
		if (chart) chart.setOption(option, true);
	});

	onMount(() => {
		if (!browser) return;
		chart = echarts.init(container!);
		chart.setOption(option, true);
		observer = new ResizeObserver(() => chart?.resize());
		observer.observe(container!);
		onReady?.(chart);
	});

	onDestroy(() => {
		observer?.disconnect();
		chart?.dispose();
		chart = null;
	});
</script>

<div bind:this={container} class="chart" style="height: {height}"></div>

<style>
	.chart {
		width: 100%;
	}
</style>
