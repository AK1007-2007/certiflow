const db = require('../config/db');

function formatRequestId(id) {
  return `CR-${String(id).padStart(4, '0')}`;
}

function formatDate(date) {
  if (!date) return '';
  const d = new Date(date);
  const day = String(d.getDate()).padStart(2, '0');
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const year = d.getFullYear();
  return `${day}-${month}-${year}`;
}

function enrichRequest(item) {
  if (!item) return null;
  return {
    ...item,
    requestId: formatRequestId(item.id),
    formattedDate: formatDate(item.requested_at)
  };
}

const requestController = {
  // POST /api/requests - Submit a new certificate request
  async createRequest(req, res) {
    try {
      const {
        student_name,
        enrollment_no,
        email,
        certificate_type,
        purpose
      } = req.body;

      // Validation
      const errors = [];
      if (!student_name || typeof student_name !== 'string' || student_name.trim().length < 2) {
        errors.push('Student name is required and must be at least 2 characters.');
      }
      if (!enrollment_no || typeof enrollment_no !== 'string' || enrollment_no.trim().length < 3) {
        errors.push('Enrollment number is required.');
      }
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!email || !emailRegex.test(email.trim())) {
        errors.push('A valid email address is required.');
      }
      if (!certificate_type || typeof certificate_type !== 'string' || certificate_type.trim().length < 2) {
        errors.push('Please select a certificate type.');
      }
      if (!purpose || typeof purpose !== 'string' || purpose.trim().length < 10) {
        errors.push('Purpose must contain at least 10 characters.');
      }

      if (errors.length > 0) {
        return res.status(400).json({
          success: false,
          message: errors.join(' '),
          errors
        });
      }

      const cleanName = student_name.trim();
      const cleanEnrollment = enrollment_no.trim().toUpperCase();
      const cleanEmail = email.trim().toLowerCase();
      const cleanType = certificate_type.trim();
      const cleanPurpose = purpose.trim();

      const newRecord = await db.createRequest({
        student_name: cleanName,
        enrollment_no: cleanEnrollment,
        email: cleanEmail,
        certificate_type: cleanType,
        purpose: cleanPurpose
      });

      const enriched = enrichRequest(newRecord);

      return res.status(201).json({
        success: true,
        message: 'Your certificate request has been registered.',
        requestId: enriched.requestId,
        data: enriched
      });
    } catch (err) {
      console.error('Error creating certificate request:', err);
      return res.status(500).json({
        success: false,
        message: 'Internal server error while processing request.'
      });
    }
  },

  // GET /api/requests - Get all requests with optional status filter and search query
  async getAllRequests(req, res) {
    try {
      const { status, search } = req.query;
      const records = await db.getAllRequests({ status, search });
      const enriched = records.map(enrichRequest);

      return res.json({
        success: true,
        count: enriched.length,
        data: enriched
      });
    } catch (err) {
      console.error('Error fetching certificate requests:', err);
      return res.status(500).json({
        success: false,
        message: 'Failed to retrieve certificate requests.'
      });
    }
  },

  // GET /api/requests/stats - Dashboard analytics & counts
  async getStats(req, res) {
    try {
      const stats = await db.getStats();
      // Provide monthly distribution data (for charts)
      const monthlyDistribution = [
        { month: 'Jan', requests: 18 },
        { month: 'Feb', requests: 24 },
        { month: 'Mar', requests: 21 },
        { month: 'Apr', requests: 29 },
        { month: 'May', requests: 35 },
        { month: 'Jun', requests: 31 }
      ];

      return res.json({
        success: true,
        stats: {
          ...stats,
          monthly: monthlyDistribution
        }
      });
    } catch (err) {
      console.error('Error fetching statistics:', err);
      return res.status(500).json({
        success: false,
        message: 'Failed to retrieve system statistics.'
      });
    }
  },

  // GET /api/requests/:id - Single request lookup
  async getRequestById(req, res) {
    try {
      const { id } = req.params;
      const record = await db.getRequestById(id);
      if (!record) {
        return res.status(404).json({
          success: false,
          message: 'Certificate request not found.'
        });
      }
      return res.json({
        success: true,
        data: enrichRequest(record)
      });
    } catch (err) {
      console.error('Error fetching request by ID:', err);
      return res.status(500).json({
        success: false,
        message: 'Failed to retrieve request details.'
      });
    }
  },

  // GET /api/requests/track/:query - Search by Request ID or Enrollment Number
  async trackRequest(req, res) {
    try {
      const { query } = req.params;
      if (!query || !query.trim()) {
        return res.status(400).json({
          success: false,
          message: 'Please provide a valid Request ID or Enrollment Number.'
        });
      }

      const results = await db.findByEnrollmentOrId(query.trim());
      const enriched = results.map(enrichRequest);

      return res.json({
        success: true,
        count: enriched.length,
        data: enriched
      });
    } catch (err) {
      console.error('Error tracking request:', err);
      return res.status(500).json({
        success: false,
        message: 'Failed to search certificate requests.'
      });
    }
  },

  // PATCH /api/requests/:id/status - Update status (Pending, Approved, Rejected)
  async updateStatus(req, res) {
    try {
      const { id } = req.params;
      const { status } = req.body;

      const validStatuses = ['Pending', 'Approved', 'Rejected'];
      if (!status || !validStatuses.includes(status)) {
        return res.status(400).json({
          success: false,
          message: `Invalid status. Status must be one of: ${validStatuses.join(', ')}`
        });
      }

      const updated = await db.updateStatus(id, status);
      if (!updated) {
        return res.status(404).json({
          success: false,
          message: 'Certificate request not found.'
        });
      }

      return res.json({
        success: true,
        message: `Request status updated to ${status}.`,
        data: enrichRequest(updated)
      });
    } catch (err) {
      console.error('Error updating status:', err);
      return res.status(500).json({
        success: false,
        message: 'Failed to update request status.'
      });
    }
  },

  // DELETE /api/requests/:id - Delete a request
  async deleteRequest(req, res) {
    try {
      const { id } = req.params;
      const success = await db.deleteRequest(id);
      if (!success) {
        return res.status(404).json({
          success: false,
          message: 'Certificate request not found.'
        });
      }

      return res.json({
        success: true,
        message: 'Certificate request deleted successfully.'
      });
    } catch (err) {
      console.error('Error deleting request:', err);
      return res.status(500).json({
        success: false,
        message: 'Failed to delete certificate request.'
      });
    }
  }
};

module.exports = requestController;
