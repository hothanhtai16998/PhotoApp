/**
 * Admin-related types
 * Types for admin panel data structures
 */

import type { Collection } from './collection';
import type { Image } from './image';
import type { User } from './user';

export interface AdminLog {
  _id: string;
  action: string;
  userId?: string | User;
  targetType?: string;
  targetId?: string;
  details?: Record<string, unknown>;
  ipAddress?: string;
  userAgent?: string;
  createdAt: string;
}

export interface AdminSettings {
  _id: string;
  key: string;
  value: unknown;
  description?: string;
  updatedAt: string;
  updatedBy?: string | User;
}

export interface PendingContent {
  _id: string;
  type: 'image' | 'collection' | 'user';
  content: Image | Collection | User;
  submittedAt: string;
  submittedBy: string | User;
}

export interface AdminFavorite {
  _id: string;
  user: string | User;
  image: string | Image;
  createdAt: string;
}

