const express = require('express');
const router = express.Router();
const authController = require('../controllers/authController');
const { requireAuth0User } = require('../middleware/auth');
const { sensitiveOpLimiter } = require('../middleware/rateLimiter');

// All auth profile routes require a verified Auth0 JWT
router.use(requireAuth0User);

router.get('/me', authController.getMe);
router.post('/invitations/accept', sensitiveOpLimiter, authController.acceptInvitation);

module.exports = router;
