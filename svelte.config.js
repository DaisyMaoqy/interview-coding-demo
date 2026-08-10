import adapter from '@sveltejs/adapter-node';

const config = {
	compilerOptions: {
		// 判断是否启用runes模式
		runes: ({ filename }) => (filename.split(/[/\\]/).includes('node_modules') ? undefined : true)
	},
	kit: {
		// 适配器
		adapter: adapter({
			out: 'build'
		})
	}
};

export default config;
