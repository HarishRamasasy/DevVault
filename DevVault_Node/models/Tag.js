import mongoose from 'mongoose';
import { RESOURCE_COLORS } from '../utils/colorPalette.js';

export const TAG_COLORS = RESOURCE_COLORS;

const tagSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: [true, 'Tag name is required'],
      trim: true,
      maxlength: [30, 'Tag name cannot exceed 30 characters'],
    },
    color: {
      type: String,
      trim: true,
      default: TAG_COLORS[0],
    },
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
  },
  { timestamps: true }
);

tagSchema.index({ user: 1, name: 1 }, { unique: true, collation: { locale: 'en', strength: 2 } });

tagSchema.set('toJSON', {
  transform: (_doc, ret) => {
    delete ret.__v;
    return ret;
  },
});

const Tag = mongoose.model('Tag', tagSchema);

export default Tag;
