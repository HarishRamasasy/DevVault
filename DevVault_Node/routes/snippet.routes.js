import { Router } from 'express';
import {
  createSnippet,
  listSnippets,
  getSnippet,
  updateSnippet,
  deleteSnippet,
  toggleFavorite,
} from '../controllers/snippet.controller.js';
import {
  createSnippetValidator,
  updateSnippetValidator,
  snippetIdValidator,
  listSnippetsValidator,
} from '../validators/snippet.validator.js';
import protect from '../middleware/auth.middleware.js';
import validate from '../middleware/validate.middleware.js';

const router = Router();

router.use(protect);

router.post('/', createSnippetValidator, validate, createSnippet);
router.get('/', listSnippetsValidator, validate, listSnippets);
router.get('/:id', snippetIdValidator, validate, getSnippet);
router.put('/:id', snippetIdValidator, updateSnippetValidator, validate, updateSnippet);
router.delete('/:id', snippetIdValidator, validate, deleteSnippet);
router.patch('/:id/favorite', snippetIdValidator, validate, toggleFavorite);

export default router;
