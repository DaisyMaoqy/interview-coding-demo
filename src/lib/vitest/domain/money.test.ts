import { describe, it, expect } from 'vitest';
import {
	budgetTotal,
	centsToYuan,
	formatYuan,
	formatYuanCompact,
	parseYuanInput,
	sumCents,
	yuanToCents
} from '../../domain/money';

describe('yuanToCents', () => {
	it('把元转成整数分', () => {
		expect(yuanToCents(12.34)).toBe(1234);
	});

	it('规避浮点误差：19.99 元应为 1999 分而非 1998', () => {
		// 19.99 * 100 在 IEEE754 下是 1998.9999999999998，直接取整会少 1 分
		expect(yuanToCents(19.99)).toBe(1999);
	});

	it('超过两位小数时四舍五入到分', () => {
		expect(yuanToCents(0.005)).toBe(1);
		expect(yuanToCents(0.004)).toBe(0);
	});
});

describe('centsToYuan', () => {
	it('把分转回元', () => {
		expect(centsToYuan(1234)).toBe(12.34);
	});
});

describe('parseYuanInput', () => {
	it('解析普通数字', () => {
		expect(parseYuanInput('1200')).toBe(120000);
	});

	it('容忍千分位逗号、货币符号与空白', () => {
		expect(parseYuanInput(' ¥1,200.50 ')).toBe(120050);
	});

	it('容忍全角数字与全角句点', () => {
		expect(parseYuanInput('１２００．５０')).toBe(120050);
	});

	it('空串视为未填写', () => {
		expect(parseYuanInput('')).toBeNull();
		expect(parseYuanInput('   ')).toBeNull();
	});

	it('拒绝非数字文本', () => {
		expect(parseYuanInput('abc')).toBeNull();
		expect(parseYuanInput('12元')).toBeNull();
	});

	it('拒绝科学计数法与十六进制，避免 Number() 的宽松解析', () => {
		// Number('1e3') === 1000、Number('0x10') === 16，都不该被当作合法金额输入
		expect(parseYuanInput('1e3')).toBeNull();
		expect(parseYuanInput('0x10')).toBeNull();
		expect(parseYuanInput('Infinity')).toBeNull();
	});

	it('拒绝超过两位小数的输入', () => {
		expect(parseYuanInput('1.234')).toBeNull();
	});

	it('保留负号，由 schema 层去判断是否允许负数', () => {
		expect(parseYuanInput('-50')).toBe(-5000);
	});
});

describe('budgetTotal', () => {
	it('累加四个分项', () => {
		expect(budgetTotal({ transport: 120000, hotel: 240000, allowance: 60000, other: 8000 })).toBe(
			428000
		);
	});

	it('全零预算合计为 0', () => {
		expect(budgetTotal({ transport: 0, hotel: 0, allowance: 0, other: 0 })).toBe(0);
	});
});

describe('sumCents', () => {
	it('空数组返回 0', () => {
		expect(sumCents([])).toBe(0);
	});

	it('整数分累加不产生误差', () => {
		// 换成浮点元累加（0.1+0.2+0.3）会得到 0.6000000000000001
		expect(sumCents([10, 20, 30])).toBe(60);
	});
});

describe('formatYuan', () => {
	it('带千分位与两位小数', () => {
		expect(formatYuan(428000)).toBe('4,280.00');
	});

	it('可选货币符号', () => {
		expect(formatYuan(428000, true)).toBe('¥4,280.00');
	});

	it('零值也补足两位小数', () => {
		expect(formatYuan(0)).toBe('0.00');
	});
});

describe('formatYuanCompact', () => {
	it('万位以上用「万」', () => {
		expect(formatYuanCompact(12_345_600)).toBe('12.3 万');
	});

	it('千位用「千」', () => {
		expect(formatYuanCompact(428_000)).toBe('4.3 千');
	});

	it('千元以下直接取整', () => {
		expect(formatYuanCompact(42_800)).toBe('428');
	});

	it('负数按绝对值选择量级', () => {
		expect(formatYuanCompact(-12_345_600)).toBe('-12.3 万');
	});
});
