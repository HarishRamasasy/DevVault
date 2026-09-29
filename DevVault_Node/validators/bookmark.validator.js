import mongoose from 'mongoose';
import { body, param, query } from 'express-validator';
import { BOOKMARK_TYPES, BOOKMARK_SORTS } from '../models/Bookmark.js';
import { descriptionValidator } from './shared.validator.js';

const titleValidator = body('title')
  .trim()
  .notEmpty()
  .withMessage('Title is required')
  .isLength({ max: 150 })
  .withMessage('Title cannot exceed 150 characters');

const urlValidator = body('url')
  .trim()
  .notEmpty()
  .withMessage('URL is required')
  .isURL({ require_protocol: true })
  .withMessage('Provide a valid URL including http:// or https://');

const typeValidator = body('type')
  .optional({ values: 'falsy' })
  .isIn(BOOKMARK_TYPES)
  .withMessage(`Type must be one of: ${BOOKMARK_TYPES.join(', ')}`);

const folderValidator = body('folder').optional({ values: 'falsy' }).isMongoId().withMessage('Folder must be a valid id');

const tagsValidator = [
  body('tags').optional().isArray().withMessage('Tags must be an array'),
  body('tags.*').optional().isMongoId().withMessage('Each tag must be a valid id'),
];

const favoriteValidator = body('favorite').optional().isBoolean().withMessage('Favorite must be a boolean');

export const createBookmarkValidator = [
  titleValidator,
  urlValidator,
  descriptionValidator,
  typeValidator,
  folderValidator,
  ...tagsValidator,
  favoriteValidator,
];

export const updateBookmarkValidator = [
  body('title')
    .optional()
    .trim()
    .notEmpty()
    .withMessage('Title cannot be empty')
    .isLength({ max: 150 })
    .withMessage('Title cannot exceed 150 characters'),
  body('url')
    .optional()
    .trim()
    .notEmpty()
    .withMessage('URL cannot be empty')
    .isURL({ require_protocol: true })
    .withMessage('Provide a valid URL including http:// or https://'),
  descriptionValidator,
  typeValidator,
  folderValidator,
  ...tagsValidator,
  favoriteValidator,
  body('archived').optional().isBoolean().withMessage('Archived must be a boolean'),
];

export const bookmarkIdValidator = [param('id').isMongoId().withMessage('Invalid bookmark id')];

export const listBookmarksValidator = [
  query('search')
    .optional()
    .isString()
    .withMessage('Search must be a single value')
    .isLength({ max: 100 })
    .withMessage('Search cannot exceed 100 characters'),
  query('favorite').optional().isBoolean().withMessage('Favorite must be a boolean'),
  query('archived').optional().isBoolean().withMessage('Archived must be a boolean'),
  query('type').optional().isIn(BOOKMARK_TYPES).withMessage(`Type must be one of: ${BOOKMARK_TYPES.join(', ')}`),
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
