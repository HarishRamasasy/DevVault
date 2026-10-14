import Snippet from '../models/Snippet.js';
import Tag from '../models/Tag.js';
import { BOOKMARK_SORTS, BOOKMARK_COLLATION } from '../models/Bookmark.js';
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

const POPULATE = [FOLDER_POPULATE, TAG_POPULATE];
const EDITABLE_FIELDS = ['title', 'description', 'code', 'language', 'folder', 'tags', 'favorite'];

const findOwnedSnippet = (id, userId) => findOwnedDocument(Snippet, id, userId, 'Snippet', POPULATE);

// Whitelist the body so user/_id/timestamps can never be set by the client,
// then validate any folder/tag references against the caller's own documents.
const pickSnippetFields = async (payload, userId) => {
  const fields = {};
  for (const key of EDITABLE_FIELDS) {
    if (key in payload) fields[key] = payload[key];
  }

  if ('description' in fields) {
    fields.description = fields.description ?? '';
  }

  if ('folder' in fields) {
    fields.folder = normalizeFolderId(fields.folder) ?? null;
    await assertOwnedFolder(fields.folder, userId);
  }

  if ('tags' in fields) {
    fields.tags = dedupeIds(fields.tags ?? []);
    await assertOwnedTags(fields.tags, userId);
  }

  return fields;
};

export const createSnippet = async (userId, payload) => {
  const snippet = await Snippet.create({ ...(await pickSnippetFields(payload, userId)), user: userId });
  await snippet.populate(POPULATE);
  return snippet.toJSON();
};

export const listSnippets = async (userId, filters) => {
  const { search, language, favorite, folder, tags, sort = 'newest', page = 1, limit = 12 } = filters;

  const query = { user: userId };

  if (language) {
    query.language = language;
  }

  if (favorite !== undefined) {
    query.favorite = favorite === 'true' || favorite === true;
  }

  if (folder) {
    query.folder = folder;
  }

  // Multiple tags narrow the result: a snippet must carry every selected tag.
  if (tags) {
    query.tags = { $all: String(tags).split(',') };
  }

  const term = search?.trim();
  if (term) {
    // ponytail: unanchored regex scans the user's snippets (incl. code); move to a $text index if per-user volume grows large.
    const regex = new RegExp(escapeRegex(term), 'i');
    const matchingTagIds = await Tag.find({ user: userId, name: regex }).distinct('_id');
    query.$or = [
      { title: regex },
      { description: regex },
      { code: regex },
      { language: regex },
      { tags: { $in: matchingTagIds } },
    ];
  }

  const pageNumber = Number(page);
  const pageSize = Number(limit);

  const cursor = Snippet.find(query);
  if ('title' in BOOKMARK_SORTS[sort]) {
    cursor.collation(BOOKMARK_COLLATION);
  }

  const [total, snippets] = await Promise.all([
    Snippet.countDocuments(query),
    cursor
      .sort(BOOKMARK_SORTS[sort])
      .skip((pageNumber - 1) * pageSize)
      .limit(pageSize)
      .populate(POPULATE),
  ]);

  return {
    snippets: snippets.map((snippet) => snippet.toJSON()),
    pagination: { page: pageNumber, limit: pageSize, total, totalPages: Math.ceil(total / pageSize) },
  };
};

export const getSnippetById = async (id, userId) => {
  const snippet = await findOwnedSnippet(id, userId);
  return snippet.toJSON();
};

export const updateSnippet = async (id, userId, payload) => {
  const snippet = await findOwnedSnippet(id, userId);
  Object.assign(snippet, await pickSnippetFields(payload, userId));
  await snippet.save();
  await snippet.populate(POPULATE);
  return snippet.toJSON();
};

export const deleteSnippet = async (id, userId) => {
  const snippet = await findOwnedSnippet(id, userId);
  await snippet.deleteOne();
};

export const toggleFavorite = async (id, userId) => {
  const snippet = await findOwnedSnippet(id, userId);
  snippet.favorite = !snippet.favorite;
  await snippet.save();
  return snippet.toJSON();
};
