import { BookmarkFolderRef, BookmarkPagination, BookmarkSort, BookmarkTagRef } from './bookmark.model';

// Notes share the bookmark folder/tag refs, sort keys and pagination shape.
export const NOTE_CONTENT_MAX = 20000;

export interface Note {
  _id: string;
  title: string;
  content: string;
  folder: BookmarkFolderRef | null;
  tags: BookmarkTagRef[];
  favorite: boolean;
  user: string;
  createdAt: string;
  updatedAt: string;
}

export interface NotePayload {
  title: string;
  content: string;
  folder?: string | null;
  tags?: string[];
}

export interface NoteQueryParams {
  search?: string;
  folder?: string;
  tags?: string[];
  favorite?: boolean;
  sort?: BookmarkSort;
  page?: number;
  limit?: number;
}

export interface NotePage {
  notes: Note[];
  pagination: BookmarkPagination;
}
