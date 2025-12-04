import { useState, useEffect, type MouseEvent } from 'react';
import { Moon, Sun } from 'lucide-react';
import { DropdownMenuItem } from '@/components/ui/dropdown-menu';
import { t } from '@/i18n';
import './ThemeToggle.css';

// Initialize theme on module load - default to light
(function initializeTheme() {
    const saved = localStorage.getItem('theme');
    // Only use dark if explicitly saved as 'dark', otherwise default to light
    const shouldBeDark = saved === 'dark';
    
    if (shouldBeDark) {
        document.documentElement.classList.add('dark-theme');
    } else {
        document.documentElement.classList.remove('dark-theme');
    }
})();

export function ThemeToggle({ asMenuItem = false }: { asMenuItem?: boolean }) {
    const [isDark, setIsDark] = useState(() => {
        const saved = localStorage.getItem('theme');
        // Only return true if explicitly saved as 'dark', otherwise default to light (false)
        return saved === 'dark';
    });

    useEffect(() => {
        const root = document.documentElement;
        if (isDark) {
            root.classList.add('dark-theme');
            localStorage.setItem('theme', 'dark');
        } else {
            root.classList.remove('dark-theme');
            localStorage.setItem('theme', 'light');
        }
    }, [isDark]);

    const toggleTheme = (e?: MouseEvent) => {
        e?.stopPropagation(); // Prevent event bubbling in mobile menu
        setIsDark(!isDark);
    };

    if (asMenuItem) {
        return (
            <DropdownMenuItem
                onClick={toggleTheme}
                className="theme-toggle-menu-item"
            >
                {isDark ? <Sun size={16} /> : <Moon size={16} />}
                <span>{isDark ? t('theme.lightMode') : t('theme.darkMode')}</span>
            </DropdownMenuItem>
        );
    }

    return (
        <button
            onClick={toggleTheme}
            className="theme-toggle-btn"
            aria-label={isDark ? t('theme.switchToLight') : t('theme.switchToDark')}
            title={isDark ? t('theme.switchToLight') : t('theme.switchToDark')}
            type="button"
        >
            {isDark ? <Sun size={16} /> : <Moon size={16} />}
        </button>
    );
}

