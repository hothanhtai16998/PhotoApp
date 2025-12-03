import type { ComponentType } from 'react';
import { Button } from '@/components/ui/button';
import './AdminEmptyState.css';

interface AdminEmptyStateProps {
    icon?: ComponentType<{ size?: number }>;
    title: string;
    description?: string;
    actionLabel?: string;
    onAction?: () => void;
}

export function AdminEmptyState({ 
    icon: Icon, 
    title, 
    description, 
    actionLabel, 
    onAction 
}: AdminEmptyStateProps) {
    return (
        <div className="admin-empty-state">
            {Icon && (
                <div className="admin-empty-state-icon">
                    <Icon size={64} />
                </div>
            )}
            <h3 className="admin-empty-state-title">{title}</h3>
            {description && (
                <p className="admin-empty-state-description">{description}</p>
            )}
            {actionLabel && onAction && (
                <Button onClick={onAction} variant="outline" className="admin-empty-state-action">
                    {actionLabel}
                </Button>
            )}
        </div>
    );
}

