import Bookmark from '../models/Bookmark.js';
import Folder from '../models/Folder.js';
import { ApiError } from '../utils/ApiError.js';

const FOLDER_POPULATE = { path: 'folder', select: 'name color icon' };

const normalizeTags = (tags = []) => [...new Set(tags.map((tag) => tag.trim().toLowerCase()).filter(Boolean))];

const findOwnedBookmark = async (id, userId) => {
  const bookmark = await Bookmark.findById(id).populate(FOLDER_POPULATE);
  if (!bookmark) {
    throw new ApiError(404, 'Bookmark not found');
  }

  if (bookmark.user.toString() !== userId.toString()) {
    throw new ApiError(403, 'You are not allowed to access this bookmark');
  }

  return bookmark;
};

const assertOwnedFolder = async (folderId, userId) => {
  if (!folderId) return;

  const folder = await Folder.findById(folderId);
  if (!folder || folder.user.toString() !== userId.toString()) {
    throw new ApiError(404, 'Folder not found');
  }
};

export const createBookmark = async (userId, payload) => {
  await assertOwnedFolder(payload.folder, userId);

  const bookmark = await Bookmark.create({
    ...payload,
    tags: normalizeTags(payload.tags),
    user: userId,
  });

  await bookmark.populate(FOLDER_POPULATE);

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
    query.tags = tag.trim().toLowerCase();
  }

  if (search) {
    const regex = new RegExp(search.trim(), 'i');
    query.$or = [{ title: regex }, { description: regex }, { url: regex }, { tags: regex }];
  }

  const sort = { [sortBy]: sortOrder === 'asc' ? 1 : -1 };

  const total = await Bookmark.countDocuments(query);

  const pageNumber = page !== undefined ? Number(page) : undefined;
  const pageSize = limit !== undefined ? Number(limit) : undefined;
  const isPaginated = pageNumber !== undefined || pageSize !== undefined;

  let cursor = Bookmark.find(query).sort(sort).populate(FOLDER_POPULATE);

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

  if (payload.folder) {
    await assertOwnedFolder(payload.folder, userId);
  }

  const updates = { ...payload };
  if (updates.tags) {
    updates.tags = normalizeTags(updates.tags);
  }

  Object.assign(bookmark, updates);
  await bookmark.save();
  await bookmark.populate(FOLDER_POPULATE);

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
