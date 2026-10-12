import Note from '../models/Note.js';
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
const EDITABLE_FIELDS = ['title', 'content', 'folder', 'tags', 'favorite'];

const findOwnedNote = (id, userId) => findOwnedDocument(Note, id, userId, 'Note', POPULATE);

// Whitelist the body so user/_id/timestamps can never be set by the client,
// then validate any folder/tag references against the caller's own documents.
const pickNoteFields = async (payload, userId) => {
  const fields = {};
  for (const key of EDITABLE_FIELDS) {
    if (key in payload) fields[key] = payload[key];
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

export const createNote = async (userId, payload) => {
  const note = await Note.create({ ...(await pickNoteFields(payload, userId)), user: userId });
  await note.populate(POPULATE);
  return note.toJSON();
};

export const listNotes = async (userId, filters) => {
  const { search, favorite, folder, tags, sort = 'newest', page = 1, limit = 12 } = filters;

  const query = { user: userId };

  if (favorite !== undefined) {
    query.favorite = favorite === 'true' || favorite === true;
  }

  if (folder) {
    query.folder = folder;
  }

  // Multiple tags narrow the result: a note must carry every selected tag.
  if (tags) {
    query.tags = { $all: String(tags).split(',') };
  }

  const term = search?.trim();
  if (term) {
    // ponytail: unanchored regex scans the user's notes; move to a $text index if per-user volume grows large.
    const regex = new RegExp(escapeRegex(term), 'i');
    const matchingTagIds = await Tag.find({ user: userId, name: regex }).distinct('_id');
    query.$or = [{ title: regex }, { content: regex }, { tags: { $in: matchingTagIds } }];
  }

  const pageNumber = Number(page);
  const pageSize = Number(limit);

  const cursor = Note.find(query);
  if ('title' in BOOKMARK_SORTS[sort]) {
    cursor.collation(BOOKMARK_COLLATION);
  }

  const [total, notes] = await Promise.all([
    Note.countDocuments(query),
    cursor
      .sort(BOOKMARK_SORTS[sort])
      .skip((pageNumber - 1) * pageSize)
      .limit(pageSize)
      .populate(POPULATE),
  ]);

  return {
    notes: notes.map((note) => note.toJSON()),
    pagination: { page: pageNumber, limit: pageSize, total, totalPages: Math.ceil(total / pageSize) },
  };
};

export const getNoteById = async (id, userId) => {
  const note = await findOwnedNote(id, userId);
  return note.toJSON();
};

export const updateNote = async (id, userId, payload) => {
  const note = await findOwnedNote(id, userId);
  Object.assign(note, await pickNoteFields(payload, userId));
  await note.save();
  await note.populate(POPULATE);
  return note.toJSON();
};

export const deleteNote = async (id, userId) => {
  const note = await findOwnedNote(id, userId);
  await note.deleteOne();
};

export const toggleFavorite = async (id, userId) => {
  const note = await findOwnedNote(id, userId);
  note.favorite = !note.favorite;
  await note.save();
  return note.toJSON();
};
