<script lang="ts" module>
	/**
	 * 全站图标出口。
	 *
	 * 不引图标库：用到的图标屈指可数，为此多一个依赖并不划算。
	 * 统一 24×24 视窗 + `stroke="currentColor"` 描边，图标颜色随文字走，
	 * 视觉重量也就天然一致；调用方只需给 class 控制尺寸。
	 */
	export type IconName = 'inbox' | 'check' | 'plus' | 'chart' | 'filter' | 'search' | 'x';

	/** 图标名 → path 数据。新增图标只改这里一处 */
	const PATHS: Record<IconName, string> = {
		inbox:
			'M4 13h4l2 3h4l2-3h4M4 13V6a2 2 0 0 1 2-2h12a2 2 0 0 1 2 2v7m-16 0v5a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-5',
		check: 'M9 12.5l2 2 4.5-4.5M12 3l7.5 4v5c0 4.5-3 8.3-7.5 9.5C7.5 20.3 4.5 16.5 4.5 12V7L12 3z',
		plus: 'M12 5v14M5 12h14',
		chart: 'M4 20h16M7 16V9m5 7V5m5 11v-4',
		filter: 'M3 4h18l-7 8v6l-4 2v-8z',
		search: 'm20 20-4.2-4.2M18 11a7 7 0 1 1-14 0 7 7 0 0 1 14 0z',
		x: 'M18 6 6 18M6 6l12 12'
	};
</script>

<script lang="ts">
	interface Props {
		name: IconName;
		/** 尺寸与定位交给调用方，图标自身不预设大小 */
		class?: string;
		/** 描边粗细：导航用 1.75 更轻盈，独立按钮里的图标用默认 2 */
		strokeWidth?: number;
	}

	let { name, class: className = '', strokeWidth = 2 }: Props = $props();
</script>

<!-- aria-hidden：图标一律作装饰，语义由外层的 aria-label / 文本承担 -->
<svg
	viewBox="0 0 24 24"
	fill="none"
	stroke="currentColor"
	stroke-width={strokeWidth}
	stroke-linecap="round"
	stroke-linejoin="round"
	class={className}
	aria-hidden="true"
>
	<path d={PATHS[name]} />
</svg>
