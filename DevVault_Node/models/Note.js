import mongoose from 'mongoose';

export const NOTE_CONTENT_MAX = 20000;

const noteSchema = new mongoose.Schema(
  {
    title: {
      type: String,
      required: [true, 'Title is required'],
      trim: true,
      maxlength: [150, 'Title cannot exceed 150 characters'],
    },
    content: {
      type: String,
      required: [true, 'Content is required'],
      maxlength: [NOTE_CONTENT_MAX, `Content cannot exceed ${NOTE_CONTENT_MAX} characters`],
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
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
  },
  { timestamps: true }
);

// Notes share the bookmark sort keys/collation (BOOKMARK_SORTS, BOOKMARK_COLLATION).
noteSchema.index({ user: 1, createdAt: -1 });
noteSchema.index({ user: 1, updatedAt: -1 });
noteSchema.index({ user: 1, folder: 1 });
noteSchema.index({ user: 1, tags: 1 });
noteSchema.index({ user: 1, title: 1, _id: 1 }, { collation: { locale: 'en' } });

noteSchema.set('toJSON', {
  transform: (_doc, ret) => {
    delete ret.__v;
    return ret;
  },
});

const Note = mongoose.model('Note', noteSchema);

export default Note;
