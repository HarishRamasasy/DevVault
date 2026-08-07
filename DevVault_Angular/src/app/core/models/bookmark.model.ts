export type BookmarkType = 'article' | 'video' | 'documentation' | 'repository' | 'tool' | 'other';

export interface BookmarkFolderRef {
  _id: string;
  name: string;
  color: string;
  icon: string;
}

export interface Bookmark {
  _id: string;
  title: string;
  url: string;
  description: string;
  type: BookmarkType;
  folder: BookmarkFolderRef | null;
  tags: string[];
  favorite: boolean;
  archived: boolean;
  user: string;
  createdAt: string;
  updatedAt: string;
}

export interface BookmarkPayload {
  title: string;
  url: string;
  description?: string;
  type?: BookmarkType;
  tags?: string[];
  folder?: string | null;
  favorite?: boolean;
}

export interface BookmarkQueryParams {
  search?: string;
  favorite?: boolean;
  type?: BookmarkType;
  tag?: string;
  sortBy?: 'createdAt' | 'title' | 'updatedAt';
  sortOrder?: 'asc' | 'desc';
}

export interface BookmarkTypeOption {
  value: BookmarkType;
  label: string;
}

export const BOOKMARK_TYPES: BookmarkTypeOption[] = [
  { value: 'article', label: 'Article' },
  { value: 'video', label: 'Video' },
  { value: 'documentation', label: 'Documentation' },
  { value: 'repository', label: 'Repository' },
  { value: 'tool', label: 'Tool' },
  { value: 'other', label: 'Other' },
];
