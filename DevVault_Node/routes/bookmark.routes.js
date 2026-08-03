import { Router } from 'express';
import {
  createBookmark,
  listBookmarks,
  getBookmark,
  updateBookmark,
  deleteBookmark,
  toggleFavorite,
} from '../controllers/bookmark.controller.js';
import {
  createBookmarkValidator,
  updateBookmarkValidator,
  bookmarkIdValidator,
  listBookmarksValidator,
} from '../validators/bookmark.validator.js';
import protect from '../middleware/auth.middleware.js';
import validate from '../middleware/validate.middleware.js';

const router = Router();

router.use(protect);

router.post('/', createBookmarkValidator, validate, createBookmark);
router.get('/', listBookmarksValidator, validate, listBookmarks);
router.get('/:id', bookmarkIdValidator, validate, getBookmark);
router.put('/:id', bookmarkIdValidator, updateBookmarkValidator, validate, updateBookmark);
router.delete('/:id', bookmarkIdValidator, validate, deleteBookmark);
router.patch('/:id/favorite', bookmarkIdValidator, validate, toggleFavorite);

export default router;
