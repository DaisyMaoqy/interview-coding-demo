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
		/** 实例销毁前回调，供父组件解绑事件监听 */
		onDispose?: (chart: echarts.ECharts) => void;
	}

	let { option, height = '320px', onReady, onDispose }: Props = $props();

	let container = $state<HTMLDivElement>();
	let chart: echarts.ECharts | null = null;
	let observer: ResizeObserver | null = null;
	/** option 变更 debounce 计时器 */
	let renderTimer: ReturnType<typeof setTimeout> | null = null;

	// option 变化即重绘（防抖 60ms，避免快速连续变更时多次 setOption）
	$effect(() => {
		if (!chart) return;
		if (renderTimer) clearTimeout(renderTimer);
		renderTimer = setTimeout(() => {
			chart?.setOption(option, true);
		}, 60);
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
		if (renderTimer) clearTimeout(renderTimer);
		renderTimer = null;
		observer?.disconnect();
		if (chart) {
			onDispose?.(chart);
			chart.dispose();
		}
		chart = null;
	});
</script>

<div bind:this={container} class="chart" style="height: {height}"></div>

<style>
	.chart {
		width: 100%;
	}
</style>
