import mongoose from 'mongoose';

export const FOLDER_ICONS = [
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

export const FOLDER_COLORS = [
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

const folderSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: [true, 'Folder name is required'],
      trim: true,
      maxlength: [50, 'Folder name cannot exceed 50 characters'],
    },
    description: {
      type: String,
      trim: true,
      maxlength: [500, 'Description cannot exceed 500 characters'],
      default: '',
    },
    color: {
      type: String,
      trim: true,
      default: FOLDER_COLORS[0],
    },
    icon: {
      type: String,
      trim: true,
      default: FOLDER_ICONS[0],
    },
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
  },
  { timestamps: true }
);

folderSchema.index({ user: 1, name: 1 }, { unique: true, collation: { locale: 'en', strength: 2 } });

folderSchema.set('toJSON', {
  transform: (_doc, ret) => {
    delete ret.__v;
    return ret;
  },
});

const Folder = mongoose.model('Folder', folderSchema);

export default Folder;
