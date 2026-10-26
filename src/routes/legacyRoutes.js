const express = require('express');
const router = express.Router();
const requestController = require('../controllers/requestController');

// Provide backwards compatibility for legacy PHP endpoint URLs
router.post('/request.php', (req, res, next) => {
  // If request expects JSON or is AJAX, forward to createRequest
  if (req.xhr || req.headers.accept?.includes('application/json')) {
    return requestController.createRequest(req, res);
  }
  // Otherwise forward to controller and redirect to success page on portal
  requestController.createRequest(req, {
    status(code) {
      this.statusCode = code;
      return this;
    },
    json(data) {
      if (data.success) {
        return res.redirect(`/?success=1&requestId=${encodeURIComponent(data.requestId)}&status=${encodeURIComponent(data.data.status)}`);
      } else {
        return res.redirect(`/?error=${encodeURIComponent(data.message || 'Submission failed')}`);
      }
    }
  });
});

router.get('/admin.php', (req, res) => {
  res.redirect('/admin');
});

router.get('/index.php', (req, res) => {
  res.redirect('/');
});

module.exports = router;
