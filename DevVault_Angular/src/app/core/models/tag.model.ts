export interface Tag {
  _id: string;
  name: string;
  color: string;
  user: string;
  bookmarkCount: number;
  createdAt: string;
  updatedAt: string;
}

export interface TagPayload {
  name: string;
  color?: string;
}

export const TAG_COLORS: string[] = [
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
