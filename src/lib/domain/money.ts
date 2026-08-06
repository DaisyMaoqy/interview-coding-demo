import type { Budget } from './types';

/**
 * 金额一律以「分」为单位的整数在领域层流转，只在 UI 边界转成「元」。
 *
 * 理由：`0.1 + 0.2 !== 0.3`。预算有 4 个分项要相加，再按月份聚合、按成员排行，
 * 用浮点数累加到报表那一层误差会肉眼可见。
 */

const CENTS_PER_YUAN = 100;

/** 分 → 元，仅用于展示与图表输入 */
export function centsToYuan(cents: number): number {
	return cents / CENTS_PER_YUAN;
}

/**
 * 元 → 分。四舍五入到整数分，规避 `19.99 * 100 === 1998.9999999999998`。
 */
export function yuanToCents(yuan: number): number {
	return Math.round(yuan * CENTS_PER_YUAN);
}

/**
 * 解析用户输入的金额文本为「分」。
 *
 * 表单里人会输入 `1,200`、`¥1200`、`1200 `、`１２００`（全角）这些形态，
 * 在进入校验前统一归一化，让 zod 只需关心数值规则。
 *
 * @returns 解析失败返回 null，交由调用方决定报错文案
 */
export function parseYuanInput(input: string): number | null {
	const normalized = input
		// 全角数字与全角句点 → 半角
		.replace(/[０-９]/g, (c) => String.fromCharCode(c.charCodeAt(0) - 0xfee0))
		.replace(/[．。]/g, '.')
		// 去掉货币符号、千分位逗号与所有空白
		.replace(/[¥￥,，\s]/g, '')
		.trim();

	if (normalized === '') return null;
	// 只接受可选负号 + 数字 + 最多两位小数，杜绝 '1e3' / '0x10' / 'Infinity' 被 Number 放行
	if (!/^-?\d+(\.\d{1,2})?$/.test(normalized)) return null;

	return yuanToCents(Number(normalized));
}

/** 预算合计（分） */
export function budgetTotal(budget: Budget): number {
	return budget.transport + budget.hotel + budget.allowance + budget.other;
}

/** 整数分求和，空数组返回 0 */
export function sumCents(values: readonly number[]): number {
	return values.reduce((acc, v) => acc + v, 0);
}

const YUAN_FORMATTER = new Intl.NumberFormat('zh-CN', {
	minimumFractionDigits: 2,
	maximumFractionDigits: 2
});

/**
 * 格式化为带千分位的金额文本。
 *
 * @param withSymbol 是否带 ¥ 前缀。表格里同列重复出现货币符号是噪音，
 *                   通常只在合计、KPI 卡这类单独出现的位置带上。
 */
export function formatYuan(cents: number, withSymbol = false): string {
	const text = YUAN_FORMATTER.format(centsToYuan(cents));
	return withSymbol ? `¥${text}` : text;
}

/**
 * 紧凑格式，用于图表坐标轴与 KPI 卡：12345600 →「12.3 万」
 *
 * 报表里动辄五六位数，完整数字会把坐标轴挤爆。
 */
export function formatYuanCompact(cents: number): string {
	const yuan = centsToYuan(cents);
	const abs = Math.abs(yuan);

	if (abs >= 10_000) return `${(yuan / 10_000).toFixed(1)} 万`;
	if (abs >= 1_000) return `${(yuan / 1_000).toFixed(1)} 千`;
	return String(Math.round(yuan));
}
