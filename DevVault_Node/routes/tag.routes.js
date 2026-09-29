import { Router } from 'express';
import { createTag, listTags, getTag, updateTag, deleteTag } from '../controllers/tag.controller.js';
import { createTagValidator, updateTagValidator, tagIdValidator } from '../validators/tag.validator.js';
import protect from '../middleware/auth.middleware.js';
import validate from '../middleware/validate.middleware.js';

const router = Router();

router.use(protect);

router.post('/', createTagValidator, validate, createTag);
router.get('/', listTags);
router.get('/:id', tagIdValidator, validate, getTag);
router.put('/:id', tagIdValidator, updateTagValidator, validate, updateTag);
router.delete('/:id', tagIdValidator, validate, deleteTag);

export default router;
