import { Router } from 'express';
import {
  createNote,
  listNotes,
  getNote,
  updateNote,
  deleteNote,
  toggleFavorite,
} from '../controllers/note.controller.js';
import {
  createNoteValidator,
  updateNoteValidator,
  noteIdValidator,
  listNotesValidator,
} from '../validators/note.validator.js';
import protect from '../middleware/auth.middleware.js';
import validate from '../middleware/validate.middleware.js';

const router = Router();

router.use(protect);

router.post('/', createNoteValidator, validate, createNote);
router.get('/', listNotesValidator, validate, listNotes);
router.get('/:id', noteIdValidator, validate, getNote);
router.put('/:id', noteIdValidator, updateNoteValidator, validate, updateNote);
router.delete('/:id', noteIdValidator, validate, deleteNote);
router.patch('/:id/favorite', noteIdValidator, validate, toggleFavorite);

export default router;
