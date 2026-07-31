import jwt from 'jsonwebtoken';
import { ApiError } from '../utils/ApiError.js';

const protect = (req, res, next) => {
  const authHeader = req.headers.authorization;

  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return next(new ApiError(401, 'Not authorized, no token provided'));
  }

  const token = authHeader.split(' ')[1];

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    req.user = { id: decoded.id };
    next();
  } catch (error) {
    if (error.name === 'TokenExpiredError') {
      return next(new ApiError(401, 'Session expired, please log in again'));
    }
    return next(new ApiError(401, 'Not authorized, invalid token'));
  }
};

export default protect;
