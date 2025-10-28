const rateLimit = require('express-rate-limit');

// Clear rate limiting data
const clearRateLimitData = () => {
  console.log('Clearing rate limiting data...');
  
  // Create a temporary rate limiter to access the store
  const tempLimiter = rateLimit({
    windowMs: 15 * 60 * 1000,
    max: 100,
    message: 'Rate limited'
  });
  
  // If there's a store, clear it
  if (tempLimiter.store && tempLimiter.store.resetAll) {
    tempLimiter.store.resetAll();
    console.log('Rate limiting data cleared successfully');
  } else {
    console.log('No rate limiting store found or no reset method available');
  }
};

// Run the clear function
clearRateLimitData();
