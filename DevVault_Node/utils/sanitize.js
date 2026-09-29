// Cleared <select>/color-picker fields submit '' to mean "leave this at its
// default/unchanged" rather than "set it to the literal empty string". Strip
// those keys entirely so Mongoose treats them as not provided (falling back
// to the schema default on create, or leaving the existing value untouched
// on update) instead of persisting an empty, invalid value.
export const stripEmptyStrings = (payload, fields) => {
  const result = { ...payload };
  for (const field of fields) {
    if (result[field] === '') {
      delete result[field];
    }
  }
  return result;
};
