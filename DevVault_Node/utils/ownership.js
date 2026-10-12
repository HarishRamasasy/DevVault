import Folder from '../models/Folder.js';
import Tag from '../models/Tag.js';
import { ApiError } from './ApiError.js';

export const findOwnedDocument = async (Model, id, userId, resourceLabel, populate) => {
  const query = Model.findById(id);
  if (populate) {
    query.populate(populate);
  }

  const doc = await query;
  if (!doc) {
    throw new ApiError(404, `${resourceLabel} not found`);
  }

  if (doc.user.toString() !== userId.toString()) {
    throw new ApiError(403, `You are not allowed to access this ${resourceLabel.toLowerCase()}`);
  }

  return doc;
};

// Folder/tag references shared by bookmarks and notes.
export const FOLDER_POPULATE = { path: 'folder', select: 'name color icon' };
export const TAG_POPULATE = { path: 'tags', select: 'name color' };

export const dedupeIds = (ids = []) => [...new Set(ids.map((id) => id.toString()))];

// A cleared <select>/autocomplete submits folder: '' to mean "no folder" —
// normalize that to null so it means the same thing here as an omitted field,
// instead of reaching Mongoose as an invalid ObjectId cast.
export const normalizeFolderId = (folderId) => (folderId === '' ? null : folderId);

export const assertOwnedFolder = async (folderId, userId) => {
  if (!folderId) return;

  const folder = await Folder.findById(folderId);
  if (!folder || folder.user.toString() !== userId.toString()) {
    throw new ApiError(404, 'Folder not found');
  }
};

export const assertOwnedTags = async (tagIds, userId) => {
  if (!tagIds || !tagIds.length) return;

  const tags = await Tag.find({ _id: { $in: tagIds }, user: userId });
  if (tags.length !== tagIds.length) {
    throw new ApiError(404, 'One or more tags were not found');
  }
};
