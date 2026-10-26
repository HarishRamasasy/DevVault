import mongoose from 'mongoose';

export const SNIPPET_CODE_MAX = 50000;
export const SNIPPET_DESCRIPTION_MAX = 500;

// Keep in sync with SNIPPET_LANGUAGES in the Angular snippet model; 'plaintext' is the fallback.
export const SNIPPET_LANGUAGES = [
  'plaintext', 'javascript', 'typescript', 'html', 'css', 'scss', 'json', 'python', 'java', 'csharp',
  'cpp', 'c', 'go', 'rust', 'php', 'ruby', 'kotlin', 'swift', 'sql', 'bash', 'powershell', 'yaml',
  'xml', 'markdown', 'dockerfile',
];

const snippetSchema = new mongoose.Schema(
  {
    title: {
      type: String,
      required: [true, 'Title is required'],
      trim: true,
      maxlength: [150, 'Title cannot exceed 150 characters'],
    },
    description: {
      type: String,
      trim: true,
      default: '',
      maxlength: [SNIPPET_DESCRIPTION_MAX, `Description cannot exceed ${SNIPPET_DESCRIPTION_MAX} characters`],
    },
    // Stored verbatim (never trimmed) so indentation and line breaks survive.
    code: {
      type: String,
      required: [true, 'Code is required'],
      maxlength: [SNIPPET_CODE_MAX, `Code cannot exceed ${SNIPPET_CODE_MAX} characters`],
    },
    language: {
      type: String,
      required: [true, 'Language is required'],
      enum: { values: SNIPPET_LANGUAGES, message: 'Unsupported language' },
      default: 'plaintext',
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

// Snippets share the bookmark sort keys/collation (BOOKMARK_SORTS, BOOKMARK_COLLATION).
snippetSchema.index({ user: 1, createdAt: -1 });
snippetSchema.index({ user: 1, updatedAt: -1 });
snippetSchema.index({ user: 1, folder: 1 });
snippetSchema.index({ user: 1, tags: 1 });
snippetSchema.index({ user: 1, title: 1, _id: 1 }, { collation: { locale: 'en' } });

snippetSchema.set('toJSON', {
  transform: (_doc, ret) => {
    delete ret.__v;
    return ret;
  },
});

const Snippet = mongoose.model('Snippet', snippetSchema);

export default Snippet;
