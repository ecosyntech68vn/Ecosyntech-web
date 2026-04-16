require('dotenv').config();

const requiredEnvVars = ['HMAC_SECRET'];
const warningEnvVars = ['JWT_SECRET', 'WEBHOOK_SECRET'];

function validateEnvironment() {
  const errors = [];
  const warnings = [];
  
  for (const varName of requiredEnvVars) {
    if (!process.env[varName]) {
      errors.push(`${varName} is required`);
    }
  }
  
  for (const varName of warningEnvVars) {
    if (!process.env[varName]) {
      warnings.push(`${varName} not set, using default (not secure for production)`);
    }
  }
  
  if (process.env.NODE_ENV === 'production') {
    if (process.env.JWT_SECRET === 'dev-secret-change-me') {
      errors.push('JWT_SECRET must be changed from default in production');
    }
    if (!process.env.CORS_ORIGIN || process.env.CORS_ORIGIN === '*') {
      warnings.push('CORS_ORIGIN is set to * in production, consider restricting');
    }
  }
  
  if (errors.length > 0) {
    console.error('Environment validation failed:');
    errors.forEach(e => console.error('  ERROR:', e));
    process.exit(1);
  }
  
  if (warnings.length > 0 && process.env.NODE_ENV !== 'test') {
    console.warn('Environment validation warnings:');
    warnings.forEach(w => console.warn('  WARNING:', w));
  }
  
  return { errors, warnings };
}

if (process.env.NODE_ENV !== 'test') {
  validateEnvironment();
}

module.exports = { validateEnvironment };
