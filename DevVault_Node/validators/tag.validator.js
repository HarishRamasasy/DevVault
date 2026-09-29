import { body, param } from 'express-validator';
import { TAG_COLORS } from '../models/Tag.js';

const nameValidator = body('name')
  .trim()
  .notEmpty()
  .withMessage('Tag name is required')
  .isLength({ max: 30 })
  .withMessage('Tag name cannot exceed 30 characters');

const colorValidator = body('color')
  .optional({ values: 'falsy' })
  .isIn(TAG_COLORS)
  .withMessage(`Color must be one of: ${TAG_COLORS.join(', ')}`);

export const createTagValidator = [nameValidator, colorValidator];

export const updateTagValidator = [
  body('name')
    .optional()
    .trim()
    .notEmpty()
    .withMessage('Tag name cannot be empty')
    .isLength({ max: 30 })
    .withMessage('Tag name cannot exceed 30 characters'),
  colorValidator,
];

export const tagIdValidator = [param('id').isMongoId().withMessage('Invalid tag id')];
