import mongoose from 'mongoose';
import { body, param, query } from 'express-validator';
import { BOOKMARK_SORTS } from '../models/Bookmark.js';
import { NOTE_CONTENT_MAX } from '../models/Note.js';

const titleValidator = (optional) =>
  (optional ? body('title').optional() : body('title'))
    .isString()
    .withMessage('Title must be text')
    .trim()
    .notEmpty()
    .withMessage('Title is required')
    .isLength({ max: 150 })
    .withMessage('Title cannot exceed 150 characters');

// Content is not trimmed: leading indentation matters in code-heavy notes.
const contentValidator = (optional) =>
  (optional ? body('content').optional() : body('content'))
    .isString()
    .withMessage('Content must be text')
    .custom((value) => value.trim().length > 0)
    .withMessage('Content is required')
    .isLength({ max: NOTE_CONTENT_MAX })
    .withMessage(`Content cannot exceed ${NOTE_CONTENT_MAX} characters`);

const referenceValidators = [
  body('folder').optional({ values: 'falsy' }).isMongoId().withMessage('Folder must be a valid id'),
  body('tags').optional().isArray().withMessage('Tags must be an array'),
  body('tags.*').optional().isMongoId().withMessage('Each tag must be a valid id'),
  body('favorite').optional().isBoolean({ strict: true }).withMessage('Favorite must be a boolean'),
];

export const createNoteValidator = [titleValidator(false), contentValidator(false), ...referenceValidators];

export const updateNoteValidator = [titleValidator(true), contentValidator(true), ...referenceValidators];

export const noteIdValidator = [param('id').isMongoId().withMessage('Invalid note id')];

export const listNotesValidator = [
  query('search')
    .optional()
    .isString()
    .withMessage('Search must be a single value')
    .isLength({ max: 100 })
    .withMessage('Search cannot exceed 100 characters'),
  query('favorite').optional().isBoolean().withMessage('Favorite must be a boolean'),
  query('folder').optional().isMongoId().withMessage('Folder must be a valid id'),
  query('tags')
    .optional()
    .custom((value) => String(value).split(',').every((id) => mongoose.isObjectIdOrHexString(id)))
    .withMessage('Tags must be a comma-separated list of valid ids'),
  query('sort')
    .optional()
    .isIn(Object.keys(BOOKMARK_SORTS))
    .withMessage(`Sort must be one of: ${Object.keys(BOOKMARK_SORTS).join(', ')}`),
  query('page').optional().isInt({ min: 1 }).withMessage('Page must be a positive integer'),
  query('limit').optional().isInt({ min: 1, max: 100 }).withMessage('Limit must be between 1 and 100'),
];
