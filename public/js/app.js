// =============================================================================
//  AMDAN ORGANICS – Global JavaScript Utilities
// =============================================================================

const API_BASE = 'http://localhost:3000/api';

// ── Token helpers ─────────────────────────────────────────────────────────────
const Auth = {
  getToken  : ()       => localStorage.getItem('token'),
  getUser   : ()       => JSON.parse(localStorage.getItem('user') || '{}'),
  getRole   : ()       => localStorage.getItem('role'),
  setSession: (data)   => {
    localStorage.setItem('token', data.token);
    localStorage.setItem('role',  data.user.role);
    localStorage.setItem('user',  JSON.stringify(data.user));
  },
  clear     : ()       => {
    localStorage.removeItem('token');
    localStorage.removeItem('role');
    localStorage.removeItem('user');
  },
  isLoggedIn: ()       => !!localStorage.getItem('token'),
  redirect  : ()       => { window.location.href = '/pages/login.html'; },
};

// ── API request helper ────────────────────────────────────────────────────────
async function apiRequest(method, endpoint, body = null) {
  const headers = { 'Content-Type': 'application/json' };
  const token   = Auth.getToken();
  if (token) headers['Authorization'] = `Bearer ${token}`;

  const options = { method, headers };
  if (body) options.body = JSON.stringify(body);

  try {
    const res  = await fetch(`${API_BASE}${endpoint}`, options);
    const data = await res.json();

    if (res.status === 401 || res.status === 403) {
      // Token expired or invalid
      if (res.status === 401) {
        Auth.clear();
        Auth.redirect();
        return null;
      }
    }
    return { ok: res.ok, status: res.status, data };
  } catch (err) {
    console.error('API error:', err);
    showToast('Network error. Check your connection.', 'error');
    return null;
  }
}

// ── Toast notifications ───────────────────────────────────────────────────────
function showToast(message, type = 'success') {
  let container = document.getElementById('toast-container');
  if (!container) {
    container = document.createElement('div');
    container.id        = 'toast-container';
    container.className = 'toast-container';
    document.body.appendChild(container);
  }

  const icons = { success: '✅', error: '❌', warning: '⚠️', info: 'ℹ️' };
  const toast = document.createElement('div');
  toast.className = `toast ${type !== 'success' ? type : ''}`;
  toast.innerHTML = `<span>${icons[type] || '✅'}</span><span>${message}</span>`;
  container.appendChild(toast);

  setTimeout(() => {
    toast.style.opacity   = '0';
    toast.style.transform = 'translateX(100%)';
    toast.style.transition= 'all 0.3s ease';
    setTimeout(() => toast.remove(), 300);
  }, 3500);
}

// ── Modal helpers ─────────────────────────────────────────────────────────────
function openModal(id) {
  const el = document.getElementById(id);
  if (el) el.classList.add('active');
}
function closeModal(id) {
  const el = document.getElementById(id);
  if (el) el.classList.remove('active');
}

// ── Loading state helpers ─────────────────────────────────────────────────────
function showLoading(containerID, message = 'Loading...') {
  const el = document.getElementById(containerID);
  if (el) el.innerHTML = `
    <div class="spinner"></div>
    <p class="loading-text">${message}</p>`;
}
function showEmpty(containerID, message = 'No data found.', icon = 'inventory_2') {
  const el = document.getElementById(containerID);
  if (el) el.innerHTML = `
    <div class="empty-state">
      <i class="material-icons">${icon}</i>
      <p>${message}</p>
    </div>`;
}

// ── Badge helper ──────────────────────────────────────────────────────────────
function statusBadge(status) {
  const map = {
    'Approved'        : 'badge-green',
    'Published'       : 'badge-green',
    'Delivered'       : 'badge-green',
    'Completed'       : 'badge-green',
    'Harvested'       : 'badge-green',
    'In Progress'     : 'badge-blue',
    'Confirmed'       : 'badge-blue',
    'Processing'      : 'badge-blue',
    'Submitted'       : 'badge-blue',
    'Under Review'    : 'badge-blue',
    'Pending'         : 'badge-amber',
    'Pending Approval': 'badge-amber',
    'Planned'         : 'badge-amber',
    'Counter-Offered' : 'badge-amber',
    'Ready for Pickup': 'badge-amber',
    'Rejected'        : 'badge-red',
    'Cancelled'       : 'badge-red',
    'Suspended'       : 'badge-red',
    'Unavailable'     : 'badge-red',
    'Removed'         : 'badge-red',
    'Declined'        : 'badge-red',
    'Cached'          : 'badge-amber',
    'Live'            : 'badge-green',
    'Low Stock'       : 'badge-amber',
    'Critical'        : 'badge-red',
    'Warning'         : 'badge-amber',
    'Info'            : 'badge-blue',
  };
  const cls = map[status] || 'badge-gray';
  return `<span class="badge ${cls}">${status}</span>`;
}

// ── Format helpers ────────────────────────────────────────────────────────────
function formatDate(dateStr) {
  if (!dateStr) return '—';
  return new Date(dateStr).toLocaleDateString('en-GB', {
    day: '2-digit', month: 'short', year: 'numeric'
  });
}
function formatDateTime(dateStr) {
  if (!dateStr) return '—';
  return new Date(dateStr).toLocaleString('en-GB', {
    day: '2-digit', month: 'short', year: 'numeric',
    hour: '2-digit', minute: '2-digit'
  });
}
function formatCurrency(amount) {
  return `ETB ${parseFloat(amount || 0).toLocaleString('en-US', {
    minimumFractionDigits: 2, maximumFractionDigits: 2
  })}`;
}
function formatNumber(num) {
  return parseFloat(num || 0).toLocaleString('en-US', {
    minimumFractionDigits: 0, maximumFractionDigits: 3
  });
}

// ── Sidebar active link ───────────────────────────────────────────────────────
function setActiveNav() {
  const path  = window.location.pathname;
  const links = document.querySelectorAll('.nav-item');
  links.forEach(link => {
    if (link.getAttribute('href') && path.includes(link.getAttribute('href'))) {
      link.classList.add('active');
    }
  });
}

// ── Populate sidebar user info ────────────────────────────────────────────────
function populateSidebarUser() {
  const user      = Auth.getUser();
  const nameEl    = document.getElementById('sidebar-user-name');
  const roleEl    = document.getElementById('sidebar-user-role');
  const avatarEl  = document.getElementById('sidebar-avatar');

  if (nameEl)   nameEl.textContent   = user.fullName || 'User';
  if (roleEl)   roleEl.textContent   = user.role     || '';
  if (avatarEl) avatarEl.textContent = (user.fullName || 'U').charAt(0).toUpperCase();
}

// ── Logout ────────────────────────────────────────────────────────────────────
function logout() {
  Auth.clear();
  window.location.href = '/pages/login.html';
}

// ── Protect page ─────────────────────────────────────────────────────────────
// Call this at the top of every dashboard page
function requireAuth(...allowedRoles) {
  if (!Auth.isLoggedIn()) {
    Auth.redirect();
    return false;
  }
  if (allowedRoles.length > 0 && !allowedRoles.includes(Auth.getRole())) {
    showToast('Access denied for your role.', 'error');
    setTimeout(() => Auth.redirect(), 1500);
    return false;
  }
  return true;
}

// ── Run on every dashboard page ───────────────────────────────────────────────
document.addEventListener('DOMContentLoaded', () => {
  setActiveNav();
  populateSidebarUser();

  // Close modals on overlay click
  document.querySelectorAll('.modal-overlay').forEach(overlay => {
    overlay.addEventListener('click', (e) => {
      if (e.target === overlay) overlay.classList.remove('active');
    });
  });

  // Logout button
  const logoutBtn = document.getElementById('logout-btn');
  if (logoutBtn) logoutBtn.addEventListener('click', logout);
});
