const validateRequest = (schema) => (req, res, next) => {
  try {
    const result = schema.parse({
      body: req.body,
      query: req.query,
      params: req.params,
    });
    
    // Apply transformations back to req (only if defined in result)
    if (result.body !== undefined) req.body = result.body;
    if (result.query !== undefined) req.query = result.query;
    if (result.params !== undefined) req.params = result.params;
    
    next();
  } catch (err) {
    next(err);
  }
};

module.exports = validateRequest;
