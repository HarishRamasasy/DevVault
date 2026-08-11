import { body, param } from 'express-validator';
import { FOLDER_ICONS, FOLDER_COLORS } from '../models/Folder.js';
import { descriptionValidator } from './shared.validator.js';

const nameValidator = body('name')
  .trim()
  .notEmpty()
  .withMessage('Folder name is required')
  .isLength({ max: 50 })
  .withMessage('Folder name cannot exceed 50 characters');

const colorValidator = body('color')
  .optional({ values: 'falsy' })
  .isIn(FOLDER_COLORS)
  .withMessage(`Color must be one of: ${FOLDER_COLORS.join(', ')}`);

const iconValidator = body('icon')
  .optional({ values: 'falsy' })
  .isIn(FOLDER_ICONS)
  .withMessage(`Icon must be one of: ${FOLDER_ICONS.join(', ')}`);

export const createFolderValidator = [nameValidator, descriptionValidator, colorValidator, iconValidator];

export const updateFolderValidator = [
  body('name')
    .optional()
    .trim()
    .notEmpty()
    .withMessage('Folder name cannot be empty')
    .isLength({ max: 50 })
    .withMessage('Folder name cannot exceed 50 characters'),
  descriptionValidator,
  colorValidator,
  iconValidator,
];

export const folderIdValidator = [param('id').isMongoId().withMessage('Invalid folder id')];
