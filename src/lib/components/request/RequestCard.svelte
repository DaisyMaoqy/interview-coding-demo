<script lang="ts">
	import StatusBadge from './StatusBadge.svelte';
	import HighlightText from '$lib/components/common/HighlightText.svelte';
	import { resolve } from '$app/paths';
	import { summarizeLegs, requestTotal } from '$lib/data/requests';
	import { formatYuan } from '$lib/domain/money';
	import type { TravelRequest } from '$lib/domain/types';

	interface Props {
		request: TravelRequest;
		/** 搜索关键词，命中处用主题色高亮；空串不高亮 */
		keyword?: string;
	}

	let { request, keyword = '' }: Props = $props();

	/** ISO → YYYY-MM-DD，仅用于列表展示 */
	function toDate(iso: string): string {
		return iso.slice(0, 10);
	}
</script>

<a
	href={resolve('/travel/requests/[id]', { id: request.id })}
	class="block rounded-card border border-slate-200 bg-white p-4 transition-shadow hover:shadow-card"
>
	<div class="flex items-start justify-between gap-4">
		<div class="min-w-0">
			<p class="truncate font-medium text-slate-900">
				<HighlightText text={request.reason} {keyword} />
			</p>
			<p class="mt-1 text-xs text-slate-500">
				{request.id} · <HighlightText text={summarizeLegs(request)} {keyword} /> ·
				{toDate(request.createdAt)}
			</p>
		</div>
		<StatusBadge status={request.status} />
	</div>

	<div class="mt-3 flex items-center justify-between border-t border-slate-100 pt-3">
		<span class="text-xs text-slate-400">预算合计</span>
		<span class="text-sm font-semibold text-slate-900">¥{formatYuan(requestTotal(request))}</span>
	</div>
</a>
