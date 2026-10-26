document.addEventListener('DOMContentLoaded', () => {
  const formCard = document.getElementById('formCard');
  const successCard = document.getElementById('successCard');
  const trackCard = document.getElementById('trackCard');
  const requestForm = document.getElementById('requestForm');
  const alertBox = document.getElementById('alertBox');
  const btnToggleTrack = document.getElementById('btnToggleTrack');
  const btnBackToForm = document.getElementById('btnBackToForm');
  const navTrack = document.getElementById('navTrack');
  const navStudent = document.getElementById('navStudent');
  const btnNewRequest = document.getElementById('btnNewRequest');
  const btnTrackSubmitted = document.getElementById('btnTrackSubmitted');
  const trackForm = document.getElementById('trackForm');
  const trackInput = document.getElementById('trackInput');
  const trackResult = document.getElementById('trackResult');

  let lastSubmittedRequestId = '';

  function showAlert(message, type = 'danger') {
    alertBox.textContent = message;
    alertBox.className = `alert alert-${type}`;
    alertBox.style.display = 'block';
    setTimeout(() => {
      alertBox.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
    }, 100);
  }

  function hideAlert() {
    alertBox.style.display = 'none';
  }

  function showSection(section) {
    hideAlert();
    formCard.style.display = 'none';
    successCard.style.display = 'none';
    trackCard.style.display = 'none';

    navStudent.classList.remove('active');
    navTrack.classList.remove('active');

    if (section === 'form') {
      formCard.style.display = 'block';
      navStudent.classList.add('active');
    } else if (section === 'success') {
      successCard.style.display = 'flex';
      navStudent.classList.add('active');
    } else if (section === 'track') {
      trackCard.style.display = 'block';
      navTrack.classList.add('active');
    }
  }

  // Handle URL query parameters (e.g. from legacy redirect ?success=1&requestId=CR-0042)
  const urlParams = new URLSearchParams(window.location.search);
  if (urlParams.get('success') === '1') {
    const reqId = urlParams.get('requestId') || 'CR-0042';
    const status = urlParams.get('status') || 'Pending';
    document.getElementById('displayRequestId').textContent = `Request ID: ${reqId}`;
    document.getElementById('displayRequestStatus').textContent = `Status: ${status}`;
    lastSubmittedRequestId = reqId;
    showSection('success');
  } else if (urlParams.get('error')) {
    showAlert(decodeURIComponent(urlParams.get('error')));
  }

  btnToggleTrack.addEventListener('click', () => showSection('track'));
  btnBackToForm.addEventListener('click', () => showSection('form'));
  navTrack.addEventListener('click', (e) => {
    e.preventDefault();
    showSection('track');
  });
  navStudent.addEventListener('click', (e) => {
    e.preventDefault();
    showSection('form');
  });

  btnNewRequest.addEventListener('click', () => {
    requestForm.reset();
    showSection('form');
  });

  btnTrackSubmitted.addEventListener('click', () => {
    showSection('track');
    if (lastSubmittedRequestId) {
      trackInput.value = lastSubmittedRequestId;
      performTrack(lastSubmittedRequestId);
    }
  });

  // Client-side validation + AJAX submit
  requestForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    hideAlert();

    const studentName = document.getElementById('student_name').value.trim();
    const enrollmentNo = document.getElementById('enrollment_no').value.trim();
    const email = document.getElementById('email').value.trim();
    const certType = document.getElementById('certificate_type').value;
    const purpose = document.getElementById('purpose').value.trim();

    // Client-side validation (matching script.js in original project)
    if (purpose.length < 10) {
      showAlert('Purpose should contain at least 10 characters.');
      return;
    }

    const submitBtn = document.getElementById('btnSubmit');
    submitBtn.disabled = true;
    submitBtn.textContent = 'Submitting...';

    try {
      const response = await fetch('/api/requests', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          student_name: studentName,
          enrollment_no: enrollmentNo,
          email: email,
          certificate_type: certType,
          purpose: purpose
        })
      });

      const result = await response.json();

      if (response.ok && result.success) {
        lastSubmittedRequestId = result.requestId;
        document.getElementById('displayRequestId').textContent = `Request ID: ${result.requestId}`;
        document.getElementById('displayRequestStatus').textContent = `Status: ${result.data.status || 'Pending'}`;
        showSection('success');
      } else {
        showAlert(result.message || 'Failed to submit certificate request.');
      }
    } catch (err) {
      console.error('Submission error:', err);
      showAlert('Connection error. Please ensure the Express backend is running.');
    } finally {
      submitBtn.disabled = false;
      submitBtn.textContent = 'Submit Request';
    }
  });

  // Track status lookup
  trackForm.addEventListener('submit', (e) => {
    e.preventDefault();
    const query = trackInput.value.trim();
    if (query) {
      performTrack(query);
    }
  });

  async function performTrack(query) {
    trackResult.style.display = 'block';
    trackResult.innerHTML = '<p style="color: #64748b;">Searching certificate request records...</p>';

    try {
      const response = await fetch(`/api/requests/track/${encodeURIComponent(query)}`);
      const result = await response.json();

      if (!response.ok || !result.success || result.data.length === 0) {
        trackResult.innerHTML = `
          <div style="padding: 1.5rem; background: #fff1f2; border: 1px solid #fecdd3; border-radius: 8px; color: #9f1239;">
            No certificate requests found for "<strong>${query}</strong>". Please verify your Request ID or Enrollment Number.
          </div>
        `;
        return;
      }

      let html = '<div style="display: flex; flex-direction: column; gap: 1rem;">';
      result.data.forEach(req => {
        const badgeClass = req.status === 'Approved' ? 'badge-approved' : req.status === 'Rejected' ? 'badge-rejected' : 'badge-pending';
        html += `
          <div style="border: 1px solid var(--border); border-radius: 12px; padding: 1.5rem; background: #ffffff; box-shadow: var(--shadow-sm);">
            <div style="display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 1rem; flex-wrap: wrap; gap: 0.5rem;">
              <div>
                <span style="font-family: monospace; font-size: 1.15rem; font-weight: 800; color: var(--primary);">${req.requestId}</span>
                <h3 style="font-size: 1.1rem; margin-top: 2px;">${req.student_name} <span style="font-size: 0.85rem; color: #64748b; font-weight: normal;">(${req.enrollment_no})</span></h3>
              </div>
              <span class="badge ${badgeClass}" style="font-size: 0.85rem; padding: 6px 14px;">${req.status}</span>
            </div>
            
            <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: 0.75rem; font-size: 0.9rem; color: #475569; margin-bottom: 1rem;">
              <div><strong>Certificate:</strong> ${req.certificate_type}</div>
              <div><strong>Requested Date:</strong> ${req.formattedDate || new Date(req.requested_at).toLocaleDateString()}</div>
              <div><strong>Email:</strong> ${req.email}</div>
            </div>

            <div style="background: #f8fafc; padding: 0.85rem; border-radius: 6px; font-size: 0.875rem; color: #334155;">
              <strong>Purpose:</strong> ${req.purpose}
            </div>
          </div>
        `;
      });
      html += '</div>';
      trackResult.innerHTML = html;
    } catch (err) {
      console.error('Tracking error:', err);
      trackResult.innerHTML = '<div class="alert alert-danger" style="display:block;">Error contacting server.</div>';
    }
  }
});
