import { ApiError } from '../utils/ApiError.js';

export const notFound = (req, res, next) => {
  next(new ApiError(404, `Route not found: ${req.originalUrl}`));
};

export const errorHandler = (err, req, res, next) => {
  let { statusCode, message, errors } = err;

  if (err.name === 'ValidationError') {
    statusCode = 400;
    message = 'Validation failed';
    errors = Object.values(err.errors).map((e) => e.message);
  }

  if (err.code === 11000) {
    statusCode = 409;
    message = 'Duplicate field value entered';
    errors = [`${Object.keys(err.keyValue)[0]} already in use`];
  }

  statusCode = statusCode || 500;

  if (statusCode === 500) {
    // Always log unexpected errors server-side so production incidents stay observable.
    console.error(err);
  }

  if (statusCode === 500 && process.env.NODE_ENV === 'production') {
    // Never leak internal exception details (stack traces, cast/driver errors) to clients.
    message = 'Internal server error';
    errors = [];
  } else {
    message = message || 'Internal server error';
  }

  res.status(statusCode).json({
    success: false,
    message,
    errors: errors || [],
  });
};
