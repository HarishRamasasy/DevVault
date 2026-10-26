import { BookmarkFolderRef, BookmarkPagination, BookmarkSort, BookmarkTagRef } from './bookmark.model';

// Snippets share the bookmark folder/tag refs, sort keys and pagination shape.
export const SNIPPET_CODE_MAX = 50000;
export const SNIPPET_DESCRIPTION_MAX = 500;

// Keep in sync with SNIPPET_LANGUAGES in DevVault_Node/models/Snippet.js.
export const SNIPPET_LANGUAGES = [
  { value: 'plaintext', label: 'Plain text' },
  { value: 'javascript', label: 'JavaScript' },
  { value: 'typescript', label: 'TypeScript' },
  { value: 'html', label: 'HTML' },
  { value: 'css', label: 'CSS' },
  { value: 'scss', label: 'SCSS' },
  { value: 'json', label: 'JSON' },
  { value: 'python', label: 'Python' },
  { value: 'java', label: 'Java' },
  { value: 'csharp', label: 'C#' },
  { value: 'cpp', label: 'C++' },
  { value: 'c', label: 'C' },
  { value: 'go', label: 'Go' },
  { value: 'rust', label: 'Rust' },
  { value: 'php', label: 'PHP' },
  { value: 'ruby', label: 'Ruby' },
  { value: 'kotlin', label: 'Kotlin' },
  { value: 'swift', label: 'Swift' },
  { value: 'sql', label: 'SQL' },
  { value: 'bash', label: 'Bash / Shell' },
  { value: 'powershell', label: 'PowerShell' },
  { value: 'yaml', label: 'YAML' },
  { value: 'xml', label: 'XML' },
  { value: 'markdown', label: 'Markdown' },
  { value: 'dockerfile', label: 'Dockerfile' },
] as const;

export type SnippetLanguage = (typeof SNIPPET_LANGUAGES)[number]['value'];

// Falls back to the raw value so an unexpected language still renders a sensible badge.
export const languageLabel = (value: string): string =>
  SNIPPET_LANGUAGES.find((lang) => lang.value === value)?.label ?? value;

export interface Snippet {
  _id: string;
  title: string;
  description: string;
  code: string;
  language: SnippetLanguage;
  folder: BookmarkFolderRef | null;
  tags: BookmarkTagRef[];
  favorite: boolean;
  user: string;
  createdAt: string;
  updatedAt: string;
}

export interface SnippetPayload {
  title: string;
  description: string;
  code: string;
  language: SnippetLanguage;
  folder?: string | null;
  tags?: string[];
}

export interface SnippetQueryParams {
  search?: string;
  language?: SnippetLanguage;
  folder?: string;
  tags?: string[];
  favorite?: boolean;
  sort?: BookmarkSort;
  page?: number;
  limit?: number;
}

export interface SnippetPage {
  snippets: Snippet[];
  pagination: BookmarkPagination;
}
