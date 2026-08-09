import { defineConfig } from 'vitest/config';
import tailwindcss from '@tailwindcss/vite';
import { sveltekit } from '@sveltejs/kit/vite';

export default defineConfig({
	plugins: [tailwindcss(), sveltekit()],
	test: {
		expect: { requireAssertions: true }, // 要求每条测试都有except断言，expect.assertions(0); // 明确表示不要断言
		//  用projects包一层，是为了把那句resolve.conditions配置在测试范围内，不污染dev，build的模块解析
		projects: [
			{
				extends: './vite.config.ts',
				// 让svelte走browser导出条件，否则组件会出现无法挂载到jsdom
				resolve: { conditions: ['browser'] },
				test: {
					name: 'client',
					environment: 'jsdom', // 模拟DOM环境测试组件
					include: ['src/**/*.test.ts']
				}
			}
		]
	}
});
