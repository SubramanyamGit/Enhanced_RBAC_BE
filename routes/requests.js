const express = require('express');
const router = express.Router();
const controller = require('../controllers/requests.controller');
const authenticate = require('../middlewares/auth.middleware');

router.use(authenticate);

// Request-related routes
router.get('/', controller.getRequests);                    // All for admin / own for user
router.post('/', controller.createRequest);                // User creates a request
router.patch('/:id/approve', controller.approveRequest);   // Admin approves
router.patch('/:id/reject', controller.rejectRequest);     // Admin rejects

module.exports = router;
