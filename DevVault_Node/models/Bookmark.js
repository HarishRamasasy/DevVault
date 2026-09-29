import mongoose from 'mongoose';

export const BOOKMARK_TYPES = ['article', 'video', 'documentation', 'repository', 'tool', 'other'];

// Titles repeat, so their sorts tie-break on _id to keep pagination stable; ms timestamps don't need one.
export const BOOKMARK_SORTS = {
  newest: { createdAt: -1 },
  oldest: { createdAt: 1 },
  az: { title: 1, _id: 1 },
  za: { title: -1, _id: -1 },
  updated: { updatedAt: -1 },
};

// List queries run with this collation so A–Z sorting ignores case; the title
// index must share it to be usable for that sort.
export const BOOKMARK_COLLATION = { locale: 'en' };

const bookmarkSchema = new mongoose.Schema(
  {
    title: {
      type: String,
      required: [true, 'Title is required'],
      trim: true,
      maxlength: [150, 'Title cannot exceed 150 characters'],
    },
    url: {
      type: String,
      required: [true, 'URL is required'],
      trim: true,
    },
    description: {
      type: String,
      trim: true,
      maxlength: [500, 'Description cannot exceed 500 characters'],
      default: '',
    },
    type: {
      type: String,
      enum: BOOKMARK_TYPES,
      default: 'other',
    },
    folder: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Folder',
      default: null,
    },
    tags: {
      type: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Tag' }],
      default: [],
    },
    favorite: {
      type: Boolean,
      default: false,
    },
    archived: {
      type: Boolean,
      default: false,
    },
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
  },
  { timestamps: true }
);

bookmarkSchema.index({ user: 1, createdAt: -1 });
bookmarkSchema.index({ user: 1, favorite: 1 });
bookmarkSchema.index({ user: 1, folder: 1 });
bookmarkSchema.index({ user: 1, tags: 1 });
bookmarkSchema.index({ user: 1, updatedAt: -1 });
bookmarkSchema.index({ user: 1, title: 1, _id: 1 }, { collation: BOOKMARK_COLLATION });

bookmarkSchema.set('toJSON', {
  transform: (_doc, ret) => {
    delete ret.__v;
    return ret;
  },
});

const Bookmark = mongoose.model('Bookmark', bookmarkSchema);

export default Bookmark;
