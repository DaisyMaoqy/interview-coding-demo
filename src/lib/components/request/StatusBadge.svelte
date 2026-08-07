<script lang="ts">
	import type { RequestStatus } from '$lib/domain/types';
	import { STATUS_LABELS } from '$lib/domain/workflow';

	interface Props {
		status: RequestStatus;
	}

	let { status }: Props = $props();

	// 状态 → 徽章色调。草稿/撤销是中性灰，审批中是琥珀，通过是绿，驳回是红。
	const TONES: Record<RequestStatus, string> = {
		draft: 'bg-slate-100 text-slate-600',
		pending_manager: 'bg-amber-100 text-amber-700',
		pending_finance: 'bg-amber-100 text-amber-700',
		approved: 'bg-emerald-100 text-emerald-700',
		rejected: 'bg-rose-100 text-rose-700',
		cancelled: 'bg-slate-100 text-slate-500'
	};
</script>

<span
	class="inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium {TONES[status]}"
>
	{STATUS_LABELS[status]}
</span>
