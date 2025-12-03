import { useState, useEffect } from 'react';
import { Moon, Sun } from 'lucide-react';
import { Button } from '@/components/ui/button';
import './ThemeToggle.css';

export function ThemeToggle() {
    const [isDark, setIsDark] = useState(() => {
        const saved = localStorage.getItem('admin-theme');
        if (saved) return saved === 'dark';
        return window.matchMedia('(prefers-color-scheme: dark)').matches;
    });

    useEffect(() => {
        const root = document.documentElement;
        if (isDark) {
            root.classList.add('dark-theme');
            localStorage.setItem('admin-theme', 'dark');
        } else {
            root.classList.remove('dark-theme');
            localStorage.setItem('admin-theme', 'light');
        }
    }, [isDark]);

    return (
        <Button
            variant="outline"
            size="sm"
            onClick={() => setIsDark(!isDark)}
            className="theme-toggle-btn"
            aria-label={isDark ? 'Switch to light mode' : 'Switch to dark mode'}
            title={isDark ? 'Switch to light mode' : 'Switch to dark mode'}
        >
            {isDark ? <Sun size={16} /> : <Moon size={16} />}
        </Button>
    );
}

