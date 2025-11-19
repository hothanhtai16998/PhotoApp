import path from 'path';
import tailwindcss from '@tailwindcss/vite';
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// https://vite.dev/config/
export default defineConfig({
	plugins: [react(), tailwindcss()],
	resolve: {
		alias: {
			'@': path.resolve(
				__dirname,
				'./src'
			),
		},
	},
	build: {
		cssCodeSplit: true,
		rollupOptions: {
			output: {
				assetFileNames: (assetInfo) => {
					// Ensure consistent naming for CSS files
					if (assetInfo.name && assetInfo.name.endsWith('.css')) {
						return 'assets/[name]-[hash][extname]';
					}
					return 'assets/[name]-[hash][extname]';
				},
			},
		},
	},
});
