import User from '../models/User.js';
import { ApiError } from '../utils/ApiError.js';

// Only these fields are user-editable; anything else in the body (password, _id, role, ...) is ignored.
export const updateProfile = async (userId, { name, email }) => {
  const updates = {};
  if (name !== undefined) updates.name = name;
  if (email !== undefined) updates.email = email;

  if (!Object.keys(updates).length) {
    throw new ApiError(400, 'Validation failed', ['Provide a name or email to update']);
  }

  try {
    const user = await User.findByIdAndUpdate(userId, { $set: updates }, { new: true, runValidators: true });
    if (!user) {
      throw new ApiError(404, 'User not found');
    }
    return user.toJSON();
  } catch (error) {
    if (error.code === 11000) {
      throw new ApiError(409, 'Email is already in use', ['email already in use']);
    }
    throw error;
  }
};

export const changePassword = async (userId, { currentPassword, newPassword }) => {
  const user = await User.findById(userId).select('+password');
  if (!user) {
    throw new ApiError(404, 'User not found');
  }

  // 400 rather than 401: the session is valid, only the submitted password is wrong.
  if (!(await user.comparePassword(currentPassword))) {
    throw new ApiError(400, 'Current password is incorrect');
  }

  if (await user.comparePassword(newPassword)) {
    throw new ApiError(400, 'New password must be different from the current password');
  }

  user.password = newPassword; // hashed by the pre-save hook
  await user.save();
};
