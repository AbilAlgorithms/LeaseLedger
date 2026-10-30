export function applyToJSON(schema, omitFields = []) {
  schema.set('toJSON', {
    virtuals: true,
    transform: (doc, ret) => {
      ret.id = ret._id ? ret._id.toString() : undefined;
      delete ret._id;
      delete ret.__v;
      for (const field of omitFields) {
        delete ret[field];
      }
      return ret;
    },
  });
}
