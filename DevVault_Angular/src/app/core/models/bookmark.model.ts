export type BookmarkType = 'article' | 'video' | 'documentation' | 'repository' | 'tool' | 'other';

export interface BookmarkFolderRef {
  _id: string;
  name: string;
  color: string;
  icon: string;
}

export interface BookmarkTagRef {
  _id: string;
  name: string;
  color: string;
}

export interface Bookmark {
  _id: string;
  title: string;
  url: string;
  description: string;
  type: BookmarkType;
  folder: BookmarkFolderRef | null;
  tags: BookmarkTagRef[];
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

export type BookmarkSort = 'newest' | 'oldest' | 'az' | 'za' | 'updated';

export interface BookmarkQueryParams {
  search?: string;
  folder?: string;
  tags?: string[];
  favorite?: boolean;
  type?: BookmarkType;
  sort?: BookmarkSort;
  page?: number;
  limit?: number;
}

export interface BookmarkPagination {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
}

export interface BookmarkPage {
  bookmarks: Bookmark[];
  pagination: BookmarkPagination;
}

export const BOOKMARK_SORTS: { value: BookmarkSort; label: string }[] = [
  { value: 'newest', label: 'Newest first' },
  { value: 'oldest', label: 'Oldest first' },
  { value: 'az', label: 'Title (A–Z)' },
  { value: 'za', label: 'Title (Z–A)' },
  { value: 'updated', label: 'Recently updated' },
];

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
