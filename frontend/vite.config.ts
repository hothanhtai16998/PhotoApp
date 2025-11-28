import path from 'path';
import tailwindcss from '@tailwindcss/vite';
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { visualizer } from 'rollup-plugin-visualizer';

// https://vite.dev/config/
export default defineConfig({
	plugins: [
		react(),
		tailwindcss(),
		// Bundle analyzer - generates stats.html in dist folder
		// Run with ANALYZE=true npm run build to generate analysis
		process.env.ANALYZE === 'true' &&
			visualizer({
				open: true,
				filename: 'dist/stats.html',
				gzipSize: true,
				brotliSize: true,
			}),
	].filter(Boolean),
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
		// Optimize chunk size limits (in KB)
		// Warn if any chunk exceeds 500KB (helps identify optimization opportunities)
		chunkSizeWarningLimit: 500,
		rollupOptions: {
			output: {
				assetFileNames: (assetInfo) => {
					// Ensure consistent naming for CSS files
					if (assetInfo.name && assetInfo.name.endsWith('.css')) {
						return 'assets/[name]-[hash][extname]';
					}
					return 'assets/[name]-[hash][extname]';
				},
				// Smart chunk splitting for better performance and caching
				manualChunks: (id) => {
					// Don't split React/ReactDOM - keep them in main bundle to avoid loading issues
					// React is small and always needed, so splitting doesn't provide much benefit
					if (id.includes('node_modules/react/') || id.includes('node_modules/react-dom/')) {
						return undefined; // Keep in main bundle
					}

					// Router - only needed for navigation, can be loaded on demand
					if (id.includes('node_modules/react-router')) {
						return 'router';
					}

					// Radix UI components - UI library, can be lazy loaded
					if (id.includes('node_modules/@radix-ui')) {
						return 'ui-radix';
					}

					// Recharts - charting library, only used in admin/modal (large, ~200KB)
					if (id.includes('node_modules/recharts')) {
						return 'charts';
					}

					// Form libraries - only needed on form pages
					if (
						id.includes('node_modules/react-hook-form') ||
						id.includes('node_modules/@hookform') ||
						id.includes('node_modules/zod')
					) {
						return 'forms';
					}

					// Icons - lucide-react (can be code-split)
					if (id.includes('node_modules/lucide-react')) {
						return 'icons';
					}

					// State management and utilities
					if (
						id.includes('node_modules/zustand') ||
						id.includes('node_modules/immer')
					) {
						return 'state';
					}

					// HTTP client and image utilities
					if (
						id.includes('node_modules/axios') ||
						id.includes('node_modules/browser-image-compression')
					) {
						return 'utils';
					}

					// Toast notifications
					if (id.includes('node_modules/sonner')) {
						return 'notifications';
					}

					// Tailwind and styling utilities
					if (
						id.includes('node_modules/tailwind') ||
						id.includes('node_modules/clsx') ||
						id.includes('node_modules/tailwind-merge') ||
						id.includes('node_modules/class-variance-authority')
					) {
						return 'styles';
					}

					// All other node_modules go into vendor chunk
					if (id.includes('node_modules')) {
						return 'vendor';
					}
				},
				// Prevent circular dependency issues
				format: 'es',
			},
			// Handle circular dependencies better
			onwarn(warning, warn) {
				// Suppress circular dependency warnings for vendor chunks
				if (warning.code === 'CIRCULAR_DEPENDENCY') {
					return;
				}
				// Suppress other warnings that don't affect functionality
				if (warning.code === 'MODULE_LEVEL_DIRECTIVE') {
					return;
				}
				warn(warning);
			},
			// Better handling of module dependencies and circular dependencies
			treeshake: {
				moduleSideEffects: 'no-external',
				preset: 'recommended',
			},
		},
		// Enable minification (esbuild is faster than terser)
		minify: 'esbuild',
		// Optimize source maps for production
		sourcemap: false, // Disable source maps in production for smaller bundle
		// Common chunk splitting strategy
		commonjsOptions: {
			include: [/node_modules/],
			transformMixedEsModules: true,
		},
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
			'recharts',
		],
		// Don't force re-optimization - let Vite handle it naturally
		force: false,
		// Better handling of commonjs dependencies
		esbuildOptions: {
			target: 'es2020',
		},
	},
	// Server configuration for development
	server: {
		// Ensure proper handling of module scripts
		fs: {
			strict: false,
		},
	},
});
