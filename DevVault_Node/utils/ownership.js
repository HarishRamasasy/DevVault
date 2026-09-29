import { ApiError } from './ApiError.js';

export const findOwnedDocument = async (Model, id, userId, resourceLabel, populate) => {
  const query = Model.findById(id);
  if (populate) {
    query.populate(populate);
  }

  const doc = await query;
  if (!doc) {
    throw new ApiError(404, `${resourceLabel} not found`);
  }

  if (doc.user.toString() !== userId.toString()) {
    throw new ApiError(403, `You are not allowed to access this ${resourceLabel.toLowerCase()}`);
  }

  return doc;
};
