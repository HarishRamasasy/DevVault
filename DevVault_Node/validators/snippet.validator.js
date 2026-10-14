import mongoose from 'mongoose';
import { body, param, query } from 'express-validator';
import { BOOKMARK_SORTS } from '../models/Bookmark.js';
import { SNIPPET_CODE_MAX, SNIPPET_DESCRIPTION_MAX, SNIPPET_LANGUAGES } from '../models/Snippet.js';

const optionalOn = (optional, chain) => (optional ? chain.optional() : chain);

const titleValidator = (optional) =>
  optionalOn(optional, body('title'))
    .isString()
    .withMessage('Title must be text')
    .trim()
    .notEmpty()
    .withMessage('Title is required')
    .isLength({ max: 150 })
    .withMessage('Title cannot exceed 150 characters');

// Code is not trimmed: leading indentation and trailing newlines are part of the snippet.
const codeValidator = (optional) =>
  optionalOn(optional, body('code'))
    .isString()
    .withMessage('Code must be text')
    .custom((value) => value.trim().length > 0)
    .withMessage('Code is required')
    .isLength({ max: SNIPPET_CODE_MAX })
    .withMessage(`Code cannot exceed ${SNIPPET_CODE_MAX} characters`);

const languageValidator = (optional) =>
  optionalOn(optional, body('language'))
    .isIn(SNIPPET_LANGUAGES)
    .withMessage(`Language must be one of: ${SNIPPET_LANGUAGES.join(', ')}`);

const sharedValidators = [
  body('description')
    .optional({ values: 'null' })
    .isString()
    .withMessage('Description must be text')
    .isLength({ max: SNIPPET_DESCRIPTION_MAX })
    .withMessage(`Description cannot exceed ${SNIPPET_DESCRIPTION_MAX} characters`),
  body('folder').optional({ values: 'falsy' }).isMongoId().withMessage('Folder must be a valid id'),
  body('tags').optional().isArray().withMessage('Tags must be an array'),
  body('tags.*').optional().isMongoId().withMessage('Each tag must be a valid id'),
  body('favorite').optional().isBoolean({ strict: true }).withMessage('Favorite must be a boolean'),
];

export const createSnippetValidator = [
  titleValidator(false),
  codeValidator(false),
  languageValidator(false),
  ...sharedValidators,
];

export const updateSnippetValidator = [
  titleValidator(true),
  codeValidator(true),
  languageValidator(true),
  ...sharedValidators,
];

export const snippetIdValidator = [param('id').isMongoId().withMessage('Invalid snippet id')];

export const listSnippetsValidator = [
  query('search')
    .optional()
    .isString()
    .withMessage('Search must be a single value')
    .isLength({ max: 100 })
    .withMessage('Search cannot exceed 100 characters'),
  query('language').optional().isIn(SNIPPET_LANGUAGES).withMessage('Unsupported language'),
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
