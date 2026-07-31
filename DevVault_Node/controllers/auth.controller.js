import * as authService from '../services/auth.service.js';
import { ApiResponse } from '../utils/ApiResponse.js';

export const register = async (req, res, next) => {
  try {
    const { name, email, password } = req.body;
    const { user, token } = await authService.registerUser({ name, email, password });

    res.status(201).json(new ApiResponse('User registered successfully', { user, token }));
  } catch (error) {
    next(error);
  }
};

export const login = async (req, res, next) => {
  try {
    const { email, password } = req.body;
    const { user, token } = await authService.loginUser({ email, password });

    res.status(200).json(new ApiResponse('Login successful', { user, token }));
  } catch (error) {
    next(error);
  }
};

export const getCurrentUser = async (req, res, next) => {
  try {
    const user = await authService.getUserById(req.user.id);

    res.status(200).json(new ApiResponse('Current user fetched successfully', { user }));
  } catch (error) {
    next(error);
  }
};
