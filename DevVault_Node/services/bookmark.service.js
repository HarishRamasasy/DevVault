import Bookmark, { BOOKMARK_SORTS, BOOKMARK_COLLATION } from '../models/Bookmark.js';
import Tag from '../models/Tag.js';
import { escapeRegex } from '../utils/sanitize.js';
import {
  findOwnedDocument,
  FOLDER_POPULATE,
  TAG_POPULATE,
  dedupeIds,
  normalizeFolderId,
  assertOwnedFolder,
  assertOwnedTags,
} from '../utils/ownership.js';

const findOwnedBookmark = (id, userId) =>
  findOwnedDocument(Bookmark, id, userId, 'Bookmark', [FOLDER_POPULATE, TAG_POPULATE]);

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
  const { search, favorite, archived, type, folder, tags, sort = 'newest', page = 1, limit = 12 } = filters;

  const query = { user: userId };

  query.archived = archived !== undefined ? archived === 'true' || archived === true : false;

  if (favorite !== undefined) {
    query.favorite = favorite === 'true' || favorite === true;
  }

  if (type) {
    query.type = type;
  }

  if (folder) {
    query.folder = folder;
  }

  // Multiple tags narrow the result: a bookmark must carry every selected tag.
  if (tags) {
    query.tags = { $all: String(tags).split(',') };
  }

  const term = search?.trim();
  if (term) {
    // ponytail: unanchored regex scans the user's bookmarks; move to a $text/Atlas Search index if per-user volume grows large.
    const regex = new RegExp(escapeRegex(term), 'i');
    const matchingTagIds = await Tag.find({ user: userId, name: regex }).distinct('_id');
    query.$or = [{ title: regex }, { description: regex }, { url: regex }, { tags: { $in: matchingTagIds } }];
  }

  const pageNumber = Number(page);
  const pageSize = Number(limit);

  // Only title sorts need the case-insensitive collation; applying it to date sorts would stop the
  // (default-collation) date indexes from serving the sort.
  const cursor = Bookmark.find(query);
  if ('title' in BOOKMARK_SORTS[sort]) {
    cursor.collation(BOOKMARK_COLLATION);
  }

  const [total, bookmarks] = await Promise.all([
    Bookmark.countDocuments(query),
    cursor
      .sort(BOOKMARK_SORTS[sort])
      .skip((pageNumber - 1) * pageSize)
      .limit(pageSize)
      .populate([FOLDER_POPULATE, TAG_POPULATE]),
  ]);

  return {
    bookmarks: bookmarks.map((bookmark) => bookmark.toJSON()),
    pagination: { page: pageNumber, limit: pageSize, total, totalPages: Math.ceil(total / pageSize) },
  };
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
