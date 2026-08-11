import Bookmark from '../models/Bookmark.js';
import Folder from '../models/Folder.js';
import Tag from '../models/Tag.js';
import { ApiError } from '../utils/ApiError.js';
import { findOwnedDocument } from '../utils/ownership.js';

const FOLDER_POPULATE = { path: 'folder', select: 'name color icon' };
const TAG_POPULATE = { path: 'tags', select: 'name color' };

const dedupeIds = (ids = []) => [...new Set(ids.map((id) => id.toString()))];

// A cleared <select>/autocomplete submits folder: '' to mean "no folder" —
// normalize that to null so it means the same thing here as an omitted field,
// instead of reaching Mongoose as an invalid ObjectId cast.
const normalizeFolderId = (folderId) => (folderId === '' ? null : folderId);

const findOwnedBookmark = (id, userId) =>
  findOwnedDocument(Bookmark, id, userId, 'Bookmark', [FOLDER_POPULATE, TAG_POPULATE]);

const assertOwnedFolder = async (folderId, userId) => {
  if (!folderId) return;

  const folder = await Folder.findById(folderId);
  if (!folder || folder.user.toString() !== userId.toString()) {
    throw new ApiError(404, 'Folder not found');
  }
};

const assertOwnedTags = async (tagIds, userId) => {
  if (!tagIds || !tagIds.length) return;

  const tags = await Tag.find({ _id: { $in: tagIds }, user: userId });
  if (tags.length !== tagIds.length) {
    throw new ApiError(404, 'One or more tags were not found');
  }
};

export const createBookmark = async (userId, payload) => {
  const folder = normalizeFolderId(payload.folder);
  await assertOwnedFolder(folder, userId);

  const tags = dedupeIds(payload.tags);
  await assertOwnedTags(tags, userId);

  const bookmark = await Bookmark.create({
    ...payload,
    folder,
    tags,
    user: userId,
  });

  await bookmark.populate([FOLDER_POPULATE, TAG_POPULATE]);

  return bookmark.toJSON();
};

export const listBookmarks = async (userId, filters) => {
  const { search, favorite, archived, type, tag, sortBy = 'createdAt', sortOrder = 'desc', page, limit } = filters;

  const query = { user: userId };

  query.archived = archived !== undefined ? archived === 'true' || archived === true : false;

  if (favorite !== undefined) {
    query.favorite = favorite === 'true' || favorite === true;
  }

  if (type) {
    query.type = type;
  }

  if (tag) {
    query.tags = tag;
  }

  if (search) {
    const regex = new RegExp(search.trim(), 'i');
    query.$or = [{ title: regex }, { description: regex }, { url: regex }];
  }

  const sort = { [sortBy]: sortOrder === 'asc' ? 1 : -1 };

  const total = await Bookmark.countDocuments(query);

  const pageNumber = page !== undefined ? Number(page) : undefined;
  const pageSize = limit !== undefined ? Number(limit) : undefined;
  const isPaginated = pageNumber !== undefined || pageSize !== undefined;

  let cursor = Bookmark.find(query).sort(sort).populate([FOLDER_POPULATE, TAG_POPULATE]);

  let pagination = { page: 1, limit: total, total, totalPages: total > 0 ? 1 : 0 };

  if (isPaginated) {
    const resolvedPage = pageNumber ?? 1;
    const resolvedLimit = pageSize ?? 20;
    cursor = cursor.skip((resolvedPage - 1) * resolvedLimit).limit(resolvedLimit);
    pagination = {
      page: resolvedPage,
      limit: resolvedLimit,
      total,
      totalPages: Math.max(Math.ceil(total / resolvedLimit), 1),
    };
  }

  const bookmarks = await cursor;
  return { bookmarks: bookmarks.map((bookmark) => bookmark.toJSON()), pagination };
};

export const getBookmarkById = async (id, userId) => {
  const bookmark = await findOwnedBookmark(id, userId);
  return bookmark.toJSON();
};

export const updateBookmark = async (id, userId, payload) => {
  const bookmark = await findOwnedBookmark(id, userId);

  const updates = { ...payload };
  if ('folder' in updates) {
    updates.folder = normalizeFolderId(updates.folder);
  }

  if (updates.folder) {
    await assertOwnedFolder(updates.folder, userId);
  }

  if (updates.tags) {
    updates.tags = dedupeIds(updates.tags);
    await assertOwnedTags(updates.tags, userId);
  }

  Object.assign(bookmark, updates);
  await bookmark.save();
  await bookmark.populate([FOLDER_POPULATE, TAG_POPULATE]);

  return bookmark.toJSON();
};

export const deleteBookmark = async (id, userId) => {
  const bookmark = await findOwnedBookmark(id, userId);
  await bookmark.deleteOne();
};

export const toggleFavorite = async (id, userId) => {
  const bookmark = await findOwnedBookmark(id, userId);
  bookmark.favorite = !bookmark.favorite;
  await bookmark.save();

  return bookmark.toJSON();
};
