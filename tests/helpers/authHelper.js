const crypto = require('crypto');
const jwt = require('jsonwebtoken');

// Generate RSA key pair for testing Auth0 RS256 token verification
const { publicKey, privateKey } = crypto.generateKeyPairSync('rsa', {
  modulusLength: 2048,
  publicKeyEncoding: { type: 'spki', format: 'pem' },
  privateKeyEncoding: { type: 'pkcs8', format: 'pem' }
});

const TEST_AUTH0_ISSUER = process.env.AUTH0_ISSUER_BASE_URL || (process.env.AUTH0_DOMAIN ? `https://${process.env.AUTH0_DOMAIN}/` : 'https://flyrank-test.us.auth0.com/');
const TEST_AUTH0_AUDIENCE = process.env.AUTH0_AUDIENCE || 'https://api.flyrank-metering';

/**
 * Generate a signed Auth0 access token
 */
function createTestToken(claims = {}) {
  const payload = {
    iss: TEST_AUTH0_ISSUER,
    aud: TEST_AUTH0_AUDIENCE,
    sub: claims.sub || 'auth0|test-user-123',
    email: claims.email || 'user@tenant-a.com',
    name: claims.name || 'Test User',
    ...claims
  };

  return jwt.sign(payload, privateKey, {
    algorithm: 'RS256',
    expiresIn: claims.expiresIn || '1h'
  });
}

/**
 * Generate an expired Auth0 token
 */
function createExpiredToken(claims = {}) {
  return createTestToken({
    ...claims,
    expiresIn: '-10s'
  });
}

/**
 * Generate token with wrong issuer
 */
function createWrongIssuerToken(claims = {}) {
  const payload = {
    iss: 'https://malicious-issuer.com/',
    aud: TEST_AUTH0_AUDIENCE,
    sub: 'auth0|hacker',
    ...claims
  };
  return jwt.sign(payload, privateKey, { algorithm: 'RS256', expiresIn: '1h' });
}

/**
 * Generate token with wrong audience
 */
function createWrongAudienceToken(claims = {}) {
  const payload = {
    iss: TEST_AUTH0_ISSUER,
    aud: 'https://wrong-audience.com',
    sub: 'auth0|wrong-aud',
    ...claims
  };
  return jwt.sign(payload, privateKey, { algorithm: 'RS256', expiresIn: '1h' });
}

module.exports = {
  publicKey,
  privateKey,
  TEST_AUTH0_ISSUER,
  TEST_AUTH0_AUDIENCE,
  createTestToken,
  createExpiredToken,
  createWrongIssuerToken,
  createWrongAudienceToken
};
