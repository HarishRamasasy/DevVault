export interface Folder {
  _id: string;
  name: string;
  description: string;
  color: string;
  icon: string;
  user: string;
  bookmarkCount: number;
  createdAt: string;
  updatedAt: string;
}

export interface FolderPayload {
  name: string;
  description?: string;
  color?: string;
  icon?: string;
}

export const FOLDER_COLORS: string[] = [
  '#2563EB',
  '#7C3AED',
  '#DB2777',
  '#DC2626',
  '#EA580C',
  '#D97706',
  '#65A30D',
  '#059669',
  '#0891B2',
  '#4B5563',
];

export const FOLDER_ICONS: string[] = [
  'folder',
  'code',
  'terminal',
  'web',
  'storage',
  'api',
  'bug_report',
  'school',
  'work',
  'star',
  'lightbulb',
  'psychology',
];
