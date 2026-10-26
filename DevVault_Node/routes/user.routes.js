import { Router } from 'express';
import { getProfile, updateProfile, changePassword } from '../controllers/user.controller.js';
import { updateProfileValidator, changePasswordValidator } from '../validators/user.validator.js';
import protect from '../middleware/auth.middleware.js';
import validate from '../middleware/validate.middleware.js';

const router = Router();

router.use(protect);

router.get('/me', getProfile);
router.put('/me', updateProfileValidator, validate, updateProfile);
router.put('/me/password', changePasswordValidator, validate, changePassword);

export default router;
