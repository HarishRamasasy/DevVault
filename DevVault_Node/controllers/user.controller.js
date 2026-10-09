import * as userService from '../services/user.service.js';
import { getUserById } from '../services/auth.service.js';
import { ApiResponse } from '../utils/ApiResponse.js';

export const getProfile = async (req, res, next) => {
  try {
    const user = await getUserById(req.user.id);
    res.status(200).json(new ApiResponse('Profile fetched successfully', { user }));
  } catch (error) {
    next(error);
  }
};

export const updateProfile = async (req, res, next) => {
  try {
    const { name, email } = req.body;
    const user = await userService.updateProfile(req.user.id, { name, email });
    res.status(200).json(new ApiResponse('Profile updated successfully', { user }));
  } catch (error) {
    next(error);
  }
};

export const changePassword = async (req, res, next) => {
  try {
    const { currentPassword, newPassword } = req.body;
    await userService.changePassword(req.user.id, { currentPassword, newPassword });
    res.status(200).json(new ApiResponse('Password changed successfully'));
  } catch (error) {
    next(error);
  }
};
