const express = require('express');
const router = express.Router();
const requestController = require('../controllers/requestController');

// Certificate Request API Routes
router.post('/requests', requestController.createRequest);
router.get('/requests', requestController.getAllRequests);
router.get('/requests/stats', requestController.getStats);
router.get('/requests/track/:query', requestController.trackRequest);
router.get('/requests/:id', requestController.getRequestById);
router.patch('/requests/:id/status', requestController.updateStatus);
router.delete('/requests/:id', requestController.deleteRequest);

module.exports = router;
