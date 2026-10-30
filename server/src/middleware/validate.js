import { ApiError } from '../utils/ApiError.js';

export const validate = (schema) => (req, res, next) => {
  try {
    const validated = schema.parse({
      body: req.body,
      query: req.query,
      params: req.params,
    });
    req.body = validated.body || req.body;
    req.query = validated.query || req.query;
    req.params = validated.params || req.params;
    next();
  } catch (error) {
    if (error.errors) {
      const details = error.errors.map((err) => ({
        path: err.path.join('.').replace(/^(body|query|params)\./, ''),
        message: err.message,
      }));
      return next(new ApiError(422, 'Validation failed', 'VALIDATION_ERROR', details));
    }
    next(error);
  }
};
