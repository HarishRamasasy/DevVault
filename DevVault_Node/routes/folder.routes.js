import { Router } from 'express';
import { createFolder, listFolders, getFolder, updateFolder, deleteFolder } from '../controllers/folder.controller.js';
import { createFolderValidator, updateFolderValidator, folderIdValidator } from '../validators/folder.validator.js';
import protect from '../middleware/auth.middleware.js';
import validate from '../middleware/validate.middleware.js';

const router = Router();

router.use(protect);

router.post('/', createFolderValidator, validate, createFolder);
router.get('/', listFolders);
router.get('/:id', folderIdValidator, validate, getFolder);
router.put('/:id', folderIdValidator, updateFolderValidator, validate, updateFolder);
router.delete('/:id', folderIdValidator, validate, deleteFolder);

export default router;
