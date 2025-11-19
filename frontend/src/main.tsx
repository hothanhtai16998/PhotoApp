import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import './index.css';
import App from './App.tsx';
import { BrowserRouter } from 'react-router';
import { Toaster } from 'sonner';
import AuthInitializer from './components/auth/AuthInitializer.tsx';
import { ErrorBoundary } from './components/ErrorBoundary.tsx';

createRoot(document.getElementById('root')!).render(
	<StrictMode>
		<ErrorBoundary>
			<BrowserRouter>
				<AuthInitializer>
					<Toaster position="top-right" richColors />
					<App />
				</AuthInitializer>
			</BrowserRouter>
		</ErrorBoundary>
	</StrictMode>
);
