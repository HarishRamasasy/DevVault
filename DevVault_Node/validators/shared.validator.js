import { body } from 'express-validator';

export const descriptionValidator = body('description')
  .optional({ values: 'falsy' })
  .trim()
  .isLength({ max: 500 })
  .withMessage('Description cannot exceed 500 characters');
