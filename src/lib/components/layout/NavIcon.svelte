<script lang="ts">
	import type { NavIconName } from './navigation';

	interface Props {
		name: NavIconName;
	}

	let { name }: Props = $props();

	/**
	 * 图标只用 path 数据，不引入图标库 —— 四个图标不值得为此多一个依赖。
	 * 统一 24×24 视窗、`stroke` 描边，保证视觉重量一致。
	 */
	const PATHS: Record<NavIconName, string> = {
		inbox:
			'M4 13h4l2 3h4l2-3h4M4 13V6a2 2 0 0 1 2-2h12a2 2 0 0 1 2 2v7m-16 0v5a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-5',
		check: 'M9 12.5l2 2 4.5-4.5M12 3l7.5 4v5c0 4.5-3 8.3-7.5 9.5C7.5 20.3 4.5 16.5 4.5 12V7L12 3z',
		plus: 'M12 5v14M5 12h14',
		chart: 'M4 20h16M7 16V9m5 7V5m5 11v-4'
	};
</script>

<svg
	viewBox="0 0 24 24"
	fill="none"
	stroke="currentColor"
	stroke-width="1.75"
	stroke-linecap="round"
	stroke-linejoin="round"
	class="nav-icon"
	aria-hidden="true"
>
	<path d={PATHS[name]} />
</svg>
