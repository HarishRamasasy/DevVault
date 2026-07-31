import User from '../models/User.js';
import generateToken from '../utils/generateToken.js';
import { ApiError } from '../utils/ApiError.js';

export const registerUser = async ({ name, email, password }) => {
  const user = await User.create({ name, email, password });
  const token = generateToken(user._id);

  return { user: user.toJSON(), token };
};

export const loginUser = async ({ email, password }) => {
  const user = await User.findOne({ email }).select('+password');
  if (!user) {
    throw new ApiError(401, 'Invalid email or password');
  }

  const isPasswordValid = await user.comparePassword(password);
  if (!isPasswordValid) {
    throw new ApiError(401, 'Invalid email or password');
  }

  const token = generateToken(user._id);

  return { user: user.toJSON(), token };
};

export const getUserById = async (userId) => {
  const user = await User.findById(userId);
  if (!user) {
    throw new ApiError(404, 'User not found');
  }

  return user.toJSON();
};
