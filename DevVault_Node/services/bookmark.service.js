import Bookmark from '../models/Bookmark.js';
import { ApiError } from '../utils/ApiError.js';

const normalizeTags = (tags = []) => [...new Set(tags.map((tag) => tag.trim().toLowerCase()).filter(Boolean))];

const findOwnedBookmark = async (id, userId) => {
  const bookmark = await Bookmark.findById(id);
  if (!bookmark) {
    throw new ApiError(404, 'Bookmark not found');
  }

  if (bookmark.user.toString() !== userId.toString()) {
    throw new ApiError(403, 'You are not allowed to access this bookmark');
  }

  return bookmark;
};

export const createBookmark = async (userId, payload) => {
  const bookmark = await Bookmark.create({
    ...payload,
    tags: normalizeTags(payload.tags),
    user: userId,
  });

  return bookmark.toJSON();
};

export const listBookmarks = async (userId, filters) => {
  const { search, favorite, archived, type, tag, sortBy = 'createdAt', sortOrder = 'desc' } = filters;

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

  const bookmarks = await Bookmark.find(query).sort(sort);
  return bookmarks.map((bookmark) => bookmark.toJSON());
};

export const getBookmarkById = async (id, userId) => {
  const bookmark = await findOwnedBookmark(id, userId);
  return bookmark.toJSON();
};

export const updateBookmark = async (id, userId, payload) => {
  const bookmark = await findOwnedBookmark(id, userId);

  const updates = { ...payload };
  if (updates.tags) {
    updates.tags = normalizeTags(updates.tags);
  }

  Object.assign(bookmark, updates);
  await bookmark.save();

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
