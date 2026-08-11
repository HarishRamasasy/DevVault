import { ApiError } from './ApiError.js';

export const assertUniqueName = async (Model, userId, name, resourceLabel, excludeId) => {
  const query = Model.findOne({ user: userId, name }).collation({ locale: 'en', strength: 2 });
  if (excludeId) {
    query.where('_id').ne(excludeId);
  }

  const existing = await query;
  if (existing) {
    throw new ApiError(409, `A ${resourceLabel.toLowerCase()} with this name already exists`);
  }
};
