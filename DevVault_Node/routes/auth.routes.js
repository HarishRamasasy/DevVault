import { Router } from 'express';
import { register, login, getCurrentUser } from '../controllers/auth.controller.js';
import { registerValidator, loginValidator } from '../validators/auth.validator.js';
import protect from '../middleware/auth.middleware.js';
import validate from '../middleware/validate.middleware.js';

const router = Router();

router.post('/register', registerValidator, validate, register);
router.post('/login', loginValidator, validate, login);
router.get('/me', protect, getCurrentUser);

export default router;
