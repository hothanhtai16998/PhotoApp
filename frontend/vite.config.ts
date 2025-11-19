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
		// Optimize chunk size limits
		chunkSizeWarningLimit: 1000,
		rollupOptions: {
			output: {
				assetFileNames: (assetInfo) => {
					// Ensure consistent naming for CSS files
					if (assetInfo.name && assetInfo.name.endsWith('.css')) {
						return 'assets/[name]-[hash][extname]';
					}
					return 'assets/[name]-[hash][extname]';
				},
				// Manual chunk splitting for better caching and parallel loading
				manualChunks: (id) => {
					// Split vendor libraries into separate chunks
					if (id.includes('node_modules')) {
						// React and React DOM together (often used together)
						if (id.includes('react') || id.includes('react-dom')) {
							return 'vendor-react';
						}
						// React Router
						if (id.includes('react-router')) {
							return 'vendor-router';
						}
						// UI libraries (Radix UI components)
						if (id.includes('@radix-ui')) {
							return 'vendor-radix';
						}
						// Form libraries (react-hook-form, zod)
						if (id.includes('react-hook-form') || id.includes('zod') || id.includes('@hookform')) {
							return 'vendor-forms';
						}
						// State management (zustand)
						if (id.includes('zustand') || id.includes('immer')) {
							return 'vendor-state';
						}
						// HTTP client (axios)
						if (id.includes('axios')) {
							return 'vendor-http';
						}
						// Icons (lucide-react)
						if (id.includes('lucide-react')) {
							return 'vendor-icons';
						}
						// Other vendor libraries
						return 'vendor';
					}
				},
			},
		},
		// Enable minification (esbuild is faster than terser)
		minify: 'esbuild',
		// Optimize source maps for production
		sourcemap: false, // Disable source maps in production for smaller bundle
	},
	// Optimize dependencies
	optimizeDeps: {
		include: [
			'react',
			'react-dom',
			'react-router',
			'react-router-dom',
			'axios',
			'zustand',
			'immer',
		],
	},
});
