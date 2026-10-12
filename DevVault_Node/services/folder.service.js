import mongoose from 'mongoose';
import Folder from '../models/Folder.js';
import Bookmark from '../models/Bookmark.js';
import Note from '../models/Note.js';
import { findOwnedDocument } from '../utils/ownership.js';
import { assertUniqueName } from '../utils/uniqueName.js';
import { stripEmptyStrings } from '../utils/sanitize.js';

const OPTIONAL_STYLE_FIELDS = ['color', 'icon'];

const findOwnedFolder = (id, userId) => findOwnedDocument(Folder, id, userId, 'Folder');

export const createFolder = async (userId, payload) => {
  await assertUniqueName(Folder, userId, payload.name, 'Folder');

  const folder = await Folder.create({
    ...stripEmptyStrings(payload, OPTIONAL_STYLE_FIELDS),
    user: userId,
  });

  return folder.toJSON();
};

export const listFolders = async (userId) => {
  const folders = await Folder.find({ user: userId }).sort({ name: 1 });

  const counts = await Bookmark.aggregate([
    { $match: { user: new mongoose.Types.ObjectId(userId), folder: { $ne: null } } },
    { $group: { _id: '$folder', count: { $sum: 1 } } },
  ]);
  const countsByFolder = new Map(counts.map((entry) => [entry._id.toString(), entry.count]));

  return folders.map((folder) => ({
    ...folder.toJSON(),
    bookmarkCount: countsByFolder.get(folder._id.toString()) ?? 0,
  }));
};

export const getFolderById = async (id, userId) => {
  const folder = await findOwnedFolder(id, userId);
  const bookmarkCount = await Bookmark.countDocuments({ folder: folder._id, user: userId });

  return { ...folder.toJSON(), bookmarkCount };
};

export const updateFolder = async (id, userId, payload) => {
  const folder = await findOwnedFolder(id, userId);

  if (payload.name && payload.name !== folder.name) {
    await assertUniqueName(Folder, userId, payload.name, 'Folder', folder._id);
  }

  Object.assign(folder, stripEmptyStrings(payload, OPTIONAL_STYLE_FIELDS));
  await folder.save();

  return folder.toJSON();
};

export const deleteFolder = async (id, userId) => {
  const folder = await findOwnedFolder(id, userId);

  await Bookmark.updateMany({ folder: folder._id, user: userId }, { $set: { folder: null } });
  await Note.updateMany({ folder: folder._id, user: userId }, { $set: { folder: null } });
  await folder.deleteOne();
};
