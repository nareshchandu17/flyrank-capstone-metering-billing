/**
 * Global error handling middleware
 */
function errorHandler(err, req, res, next) {
  console.error('Error:', err);
  
  // Stripe signature verification error
  if (err.type === 'StripeSignatureVerificationError') {
    return res.status(400).json({
      error: 'Invalid webhook signature'
    });
  }
  
  // Database errors
  if (err.code) {
    if (err.code === '23505') { // Unique violation
      return res.status(409).json({
        error: 'Resource already exists'
      });
    }
    if (err.code === '23503') { // Foreign key violation
      return res.status(400).json({
        error: 'Referenced resource does not exist'
      });
    }
  }
  
  // Default error response
  res.status(500).json({
    error: 'Internal server error',
    message: process.env.NODE_ENV === 'development' ? err.message : undefined
  });
}

module.exports = errorHandler;
