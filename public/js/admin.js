document.addEventListener('DOMContentLoaded', () => {
  const statTotal = document.getElementById('statTotal');
  const statPending = document.getElementById('statPending');
  const statApproved = document.getElementById('statApproved');
  const statRejected = document.getElementById('statRejected');
  const tableBody = document.getElementById('tableBody');
  const searchInput = document.getElementById('searchInput');
  const btnRefresh = document.getElementById('btnRefresh');
  const filterTabs = document.querySelectorAll('.filter-tab');
  const chartContainer = document.getElementById('chartContainer');

  // Modal elements
  const detailModal = document.getElementById('detailModal');
  const modalClose = document.getElementById('modalClose');
  const modalRequestId = document.getElementById('modalRequestId');
  const modalStudentName = document.getElementById('modalStudentName');
  const modalEnrollment = document.getElementById('modalEnrollment');
  const modalEmail = document.getElementById('modalEmail');
  const modalCertType = document.getElementById('modalCertType');
  const modalDate = document.getElementById('modalDate');
  const modalStatusBadge = document.getElementById('modalStatusBadge');
  const modalPurpose = document.getElementById('modalPurpose');
  const modalBtnPending = document.getElementById('modalBtnPending');
  const modalBtnApprove = document.getElementById('modalBtnApprove');
  const modalBtnReject = document.getElementById('modalBtnReject');

  let currentActiveId = null;
  let activeFilter = 'All';
  let searchQuery = '';
  let cachedRequests = [];

  // Load stats and requests
  async function loadStats() {
    try {
      const res = await fetch('/api/requests/stats');
      const data = await res.json();
      if (data.success && data.stats) {
        statTotal.textContent = data.stats.total;
        statPending.textContent = data.stats.pending;
        statApproved.textContent = data.stats.approved;
        statRejected.textContent = data.stats.rejected;

        if (data.stats.monthly) {
          renderChart(data.stats.monthly);
        }
      }
    } catch (err) {
      console.error('Error fetching stats:', err);
    }
  }

  function renderChart(monthlyData) {
    chartContainer.innerHTML = '';
    const maxVal = Math.max(...monthlyData.map(m => m.requests), 40);

    monthlyData.forEach(item => {
      const heightPercent = Math.round((item.requests / maxVal) * 100);
      const col = document.createElement('div');
      col.className = 'chart-bar-col';
      col.innerHTML = `
        <span class="chart-bar-val">${item.requests}</span>
        <div class="chart-bar" style="height: ${heightPercent}%;"></div>
        <span class="chart-bar-label">${item.month}</span>
      `;
      chartContainer.appendChild(col);
    });
  }

  async function loadRequests() {
    tableBody.innerHTML = `
      <tr>
        <td colspan="6" style="text-align: center; color: #94a3b8; padding: 2rem;">Loading certificate requests...</td>
      </tr>
    `;

    try {
      let url = `/api/requests?status=${encodeURIComponent(activeFilter)}`;
      if (searchQuery) {
        url += `&search=${encodeURIComponent(searchQuery)}`;
      }

      const res = await fetch(url);
      const json = await res.json();

      if (json.success) {
        cachedRequests = json.data;
        renderTable(json.data);
      } else {
        tableBody.innerHTML = `<tr><td colspan="6" style="text-align:center; color: #dc2626; padding: 2rem;">${json.message || 'Error loading requests'}</td></tr>`;
      }
    } catch (err) {
      console.error('Error loading requests:', err);
      tableBody.innerHTML = `<tr><td colspan="6" style="text-align:center; color: #dc2626; padding: 2rem;">Failed to connect to backend server.</td></tr>`;
    }
  }

  function renderTable(requests) {
    if (requests.length === 0) {
      tableBody.innerHTML = `
        <tr>
          <td colspan="6" style="text-align: center; color: #94a3b8; padding: 2.5rem;">
            No certificate requests found matching your filter.
          </td>
        </tr>
      `;
      return;
    }

    let rowsHtml = '';
    requests.forEach(req => {
      const badgeClass = req.status === 'Approved' ? 'badge-approved' : req.status === 'Rejected' ? 'badge-rejected' : 'badge-pending';
      const formattedDate = req.formattedDate || new Date(req.requested_at).toLocaleDateString('en-GB');

      rowsHtml += `
        <tr>
          <td><span class="table-id">${req.requestId}</span></td>
          <td>
            <div class="table-student-name">${escapeHtml(req.student_name)}</div>
            <div class="table-student-sub">${escapeHtml(req.enrollment_no)}</div>
          </td>
          <td>${escapeHtml(req.certificate_type)}</td>
          <td><span class="badge ${badgeClass}">${req.status}</span></td>
          <td style="color: #64748b;">${formattedDate}</td>
          <td style="text-align: right;">
            <div style="display: inline-flex; gap: 6px; align-items: center;">
              <button class="btn btn-sm btn-secondary" onclick="window.viewDetails(${req.id})" title="View Details">👁 Details</button>
              ${req.status !== 'Approved' ? `<button class="btn btn-sm btn-success" onclick="window.updateStatus(${req.id}, 'Approved')" title="Approve Request">✓ Approve</button>` : ''}
              ${req.status !== 'Rejected' ? `<button class="btn btn-sm btn-danger" onclick="window.updateStatus(${req.id}, 'Rejected')" title="Reject Request">✕ Reject</button>` : ''}
              <button class="btn btn-sm btn-secondary" onclick="window.deleteRequest(${req.id})" title="Delete Request" style="color: #94a3b8; padding: 4px 8px;">🗑</button>
            </div>
          </td>
        </tr>
      `;
    });

    tableBody.innerHTML = rowsHtml;
  }

  function escapeHtml(str) {
    if (!str) return '';
    return String(str)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;');
  }

  // Filter tabs
  filterTabs.forEach(tab => {
    tab.addEventListener('click', () => {
      filterTabs.forEach(t => t.classList.remove('active'));
      tab.classList.add('active');
      activeFilter = tab.getAttribute('data-filter');
      loadRequests();
    });
  });

  // Debounced search
  let debounceTimer;
  searchInput.addEventListener('input', (e) => {
    clearTimeout(debounceTimer);
    debounceTimer = setTimeout(() => {
      searchQuery = e.target.value.trim();
      loadRequests();
    }, 250);
  });

  btnRefresh.addEventListener('click', () => {
    loadStats();
    loadRequests();
  });

  // Status updates
  window.updateStatus = async function(id, newStatus) {
    try {
      const res = await fetch(`/api/requests/${id}/status`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: newStatus })
      });
      const data = await res.json();
      if (data.success) {
        await loadStats();
        await loadRequests();
        if (detailModal.classList.contains('active') && currentActiveId === id) {
          window.viewDetails(id);
        }
      } else {
        alert(data.message || 'Status update failed');
      }
    } catch (err) {
      console.error('Status update failed:', err);
      alert('Error updating status');
    }
  };

  // Delete request
  window.deleteRequest = async function(id) {
    if (!confirm('Are you sure you want to delete this certificate request?')) return;
    try {
      const res = await fetch(`/api/requests/${id}`, { method: 'DELETE' });
      const data = await res.json();
      if (data.success) {
        await loadStats();
        await loadRequests();
      } else {
        alert(data.message || 'Delete failed');
      }
    } catch (err) {
      console.error('Delete failed:', err);
      alert('Error deleting request');
    }
  };

  // Details Modal
  window.viewDetails = function(id) {
    currentActiveId = id;
    const req = cachedRequests.find(r => r.id === id);
    if (!req) return;

    modalRequestId.textContent = req.requestId;
    modalStudentName.textContent = req.student_name;
    modalEnrollment.textContent = req.enrollment_no;
    modalEmail.textContent = req.email;
    modalCertType.textContent = req.certificate_type;
    modalDate.textContent = req.formattedDate || new Date(req.requested_at).toLocaleDateString('en-GB');
    modalPurpose.textContent = req.purpose;

    const badgeClass = req.status === 'Approved' ? 'badge-approved' : req.status === 'Rejected' ? 'badge-rejected' : 'badge-pending';
    modalStatusBadge.innerHTML = `<span class="badge ${badgeClass}">${req.status}</span>`;

    detailModal.classList.add('active');
  };

  modalClose.addEventListener('click', () => {
    detailModal.classList.remove('active');
  });

  detailModal.addEventListener('click', (e) => {
    if (e.target === detailModal) {
      detailModal.classList.remove('active');
    }
  });

  modalBtnPending.addEventListener('click', () => {
    if (currentActiveId) window.updateStatus(currentActiveId, 'Pending');
  });
  modalBtnApprove.addEventListener('click', () => {
    if (currentActiveId) window.updateStatus(currentActiveId, 'Approved');
  });
  modalBtnReject.addEventListener('click', () => {
    if (currentActiveId) window.updateStatus(currentActiveId, 'Rejected');
  });

  // Initial fetch
  loadStats();
  loadRequests();
});
