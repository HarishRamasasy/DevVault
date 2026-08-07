import mongoose from 'mongoose';
import Folder from '../models/Folder.js';
import Bookmark from '../models/Bookmark.js';
import { ApiError } from '../utils/ApiError.js';

const findOwnedFolder = async (id, userId) => {
  const folder = await Folder.findById(id);
  if (!folder) {
    throw new ApiError(404, 'Folder not found');
  }

  if (folder.user.toString() !== userId.toString()) {
    throw new ApiError(403, 'You are not allowed to access this folder');
  }

  return folder;
};

const assertUniqueName = async (userId, name, excludeId) => {
  const query = Folder.findOne({ user: userId, name }).collation({ locale: 'en', strength: 2 });
  if (excludeId) {
    query.where('_id').ne(excludeId);
  }

  const existing = await query;
  if (existing) {
    throw new ApiError(409, 'A folder with this name already exists');
  }
};

export const createFolder = async (userId, payload) => {
  await assertUniqueName(userId, payload.name);

  const folder = await Folder.create({
    ...payload,
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
    await assertUniqueName(userId, payload.name, folder._id);
  }

  Object.assign(folder, payload);
  await folder.save();

  return folder.toJSON();
};

export const deleteFolder = async (id, userId) => {
  const folder = await findOwnedFolder(id, userId);

  await Bookmark.updateMany({ folder: folder._id, user: userId }, { $set: { folder: null } });
  await folder.deleteOne();
};
