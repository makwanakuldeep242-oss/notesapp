const errorHandler = (err, req, res, next) => {
  const statusCode = err.statusCode || 500;

  // Mongoose duplicate key error
  if (err.code === 11000) {
    return res.status(400).json({ message: 'Email already registered' });
  }

  // Mongoose validation error
  if (err.name === 'ValidationError') {
    const messages = Object.values(err.errors).map((e) => e.message);
    return res.status(400).json({ message: messages.join(', ') });
  }

  res.status(statusCode).json({
    message: err.message || 'Internal Server Error',
  });
};

module.exports = errorHandler;
