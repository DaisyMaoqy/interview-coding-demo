import { describe, it, expect } from 'vitest';
import { render } from '@testing-library/svelte';
import DynamicPreview from '../../../components/form/DynamicPreview.svelte';
import type { FieldDef } from '../../../domain/applicationTypes';

/**
 * DynamicPreview 预览渲染测试。
 *
 * 重点回归：dateRange 的值写在 fromKey/toKey（如请假 leaveStart/leaveEnd），
 * field.key 本身永不赋值；display 不能因 field.key 为空就提前返回占位符，
 * 否则请假时间这类「区间」字段在预览里永远显示「—」。
 */

const dateRange: FieldDef = {
	kind: 'dateRange',
	key: 'leaveRange',
	label: '请假时间',
	required: true,
	fromKey: 'leaveStart',
	toKey: 'leaveEnd'
};

describe('DynamicPreview dateRange 渲染', () => {
	it('请假时间（fromKey/toKey）在预览中正常展示', () => {
		const { getByText } = render(DynamicPreview, {
			props: {
				fields: [dateRange],
				value: { leaveStart: '2026-01-05', leaveEnd: '2026-01-08' }
			}
		});
		expect(getByText('2026-01-05 至 2026-01-08')).toBeTruthy();
	});

	it('dateRange 仅有一个端点时，另一端以占位符展示', () => {
		const { getByText } = render(DynamicPreview, {
			props: {
				fields: [dateRange],
				value: { leaveStart: '2026-01-05' }
			}
		});
		expect(getByText('2026-01-05 至 —')).toBeTruthy();
	});

	it('dateRange 完全为空时显示占位符', () => {
		const { getByText } = render(DynamicPreview, {
			props: {
				fields: [dateRange],
				value: {}
			}
		});
		expect(getByText('—')).toBeTruthy();
	});
});
