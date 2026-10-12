import mongoose from 'mongoose';
import Tag from '../models/Tag.js';
import Bookmark from '../models/Bookmark.js';
import Note from '../models/Note.js';
import { findOwnedDocument } from '../utils/ownership.js';
import { assertUniqueName } from '../utils/uniqueName.js';
import { stripEmptyStrings } from '../utils/sanitize.js';

const OPTIONAL_STYLE_FIELDS = ['color'];

const findOwnedTag = (id, userId) => findOwnedDocument(Tag, id, userId, 'Tag');

export const createTag = async (userId, payload) => {
  await assertUniqueName(Tag, userId, payload.name, 'Tag');

  const tag = await Tag.create({
    ...stripEmptyStrings(payload, OPTIONAL_STYLE_FIELDS),
    user: userId,
  });

  return tag.toJSON();
};

export const listTags = async (userId) => {
  const tags = await Tag.find({ user: userId }).sort({ name: 1 });

  const counts = await Bookmark.aggregate([
    { $match: { user: new mongoose.Types.ObjectId(userId) } },
    { $unwind: '$tags' },
    { $group: { _id: '$tags', count: { $sum: 1 } } },
  ]);
  const countsByTag = new Map(counts.map((entry) => [entry._id.toString(), entry.count]));

  return tags.map((tag) => ({
    ...tag.toJSON(),
    bookmarkCount: countsByTag.get(tag._id.toString()) ?? 0,
  }));
};

export const getTagById = async (id, userId) => {
  const tag = await findOwnedTag(id, userId);
  const bookmarkCount = await Bookmark.countDocuments({ tags: tag._id, user: userId });

  return { ...tag.toJSON(), bookmarkCount };
};

export const updateTag = async (id, userId, payload) => {
  const tag = await findOwnedTag(id, userId);

  if (payload.name && payload.name !== tag.name) {
    await assertUniqueName(Tag, userId, payload.name, 'Tag', tag._id);
  }

  Object.assign(tag, stripEmptyStrings(payload, OPTIONAL_STYLE_FIELDS));
  await tag.save();

  return tag.toJSON();
};

export const deleteTag = async (id, userId) => {
  const tag = await findOwnedTag(id, userId);

  await Bookmark.updateMany({ tags: tag._id, user: userId }, { $pull: { tags: tag._id } });
  await Note.updateMany({ tags: tag._id, user: userId }, { $pull: { tags: tag._id } });
  await tag.deleteOne();
};
