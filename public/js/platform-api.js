// GYNARE Platform — API helper

const API = {
  get token() { return localStorage.getItem('gynare_token'); },
  get user() {
    try { return JSON.parse(localStorage.getItem('gynare_user') || '{}'); }
    catch { return {}; }
  },

  headers() {
    return {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${this.token}`
    };
  },

  async request(method, path, body) {
    const opts = { method, headers: this.headers() };
    if (body) opts.body = JSON.stringify(body);

    const resp = await fetch('/api' + path, opts);

    if (resp.status === 401 || resp.status === 403) {
      logout();
      return;
    }

    const text = await resp.text();
    try {
      const data = JSON.parse(text);
      if (!resp.ok) throw new Error(data.error || `Error ${resp.status}`);
      return data;
    } catch (e) {
      if (!resp.ok) throw new Error(text || `Error ${resp.status}`);
      return text;
    }
  },

  get: (path) => API.request('GET', path),
  post: (path, body) => API.request('POST', path, body),
  put: (path, body) => API.request('PUT', path, body),
  del: (path) => API.request('DELETE', path),
};

function checkAuth() {
  if (!API.token) {
    window.location.href = '/platform/login.html';
    return false;
  }
  return true;
}

function logout() {
  localStorage.removeItem('gynare_token');
  localStorage.removeItem('gynare_user');
  window.location.href = '/platform/login.html';
}

function renderUser() {
  const user = API.user;
  const nameEl = document.getElementById('sidebarUserName');
  const roleEl = document.getElementById('sidebarUserRole');
  const avatarEl = document.getElementById('sidebarAvatar');
  if (nameEl) nameEl.textContent = user.nombre || 'Usuario';
  if (roleEl) roleEl.textContent = user.rol === 'doctor' ? 'Médico' : 'Asistente';
  if (avatarEl) avatarEl.textContent = (user.nombre || 'U')[0].toUpperCase();
}

function toast(msg, type = '') {
  let el = document.getElementById('toastEl');
  if (!el) {
    el = document.createElement('div');
    el.id = 'toastEl';
    el.className = 'toast';
    document.body.appendChild(el);
  }
  el.textContent = msg;
  el.className = `toast ${type ? 'toast--' + type : ''}`;
  setTimeout(() => el.classList.add('show'), 10);
  setTimeout(() => el.classList.remove('show'), 3200);
}

function formatDate(d) {
  if (!d) return '—';
  const date = new Date(d + (d.includes('T') ? '' : 'T12:00:00'));
  return date.toLocaleDateString('es-MX', { day: '2-digit', month: 'short', year: 'numeric' });
}

function formatDateTime(d) {
  if (!d) return '—';
  const date = new Date(d);
  return date.toLocaleDateString('es-MX', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' });
}

function formatHora(h) {
  if (!h) return '—';
  const [hh, mm] = h.split(':');
  const hora = parseInt(hh);
  const suffix = hora >= 12 ? 'pm' : 'am';
  const h12 = hora > 12 ? hora - 12 : hora === 0 ? 12 : hora;
  return `${h12}:${mm} ${suffix}`;
}

function calcEdad(fechaNac) {
  if (!fechaNac) return null;
  const hoy = new Date();
  const nac = new Date(fechaNac + 'T12:00:00');
  let edad = hoy.getFullYear() - nac.getFullYear();
  const m = hoy.getMonth() - nac.getMonth();
  if (m < 0 || (m === 0 && hoy.getDate() < nac.getDate())) edad--;
  return edad;
}

function setActiveSidebarLink(href) {
  document.querySelectorAll('.sidebar__link').forEach(a => {
    a.classList.toggle('active', a.getAttribute('href') === href);
  });
}

// Sidebar para solicitudes web badge
async function loadWebBadge() {
  try {
    const data = await API.get('/citas/solicitudes-web');
    const badge = document.getElementById('webBadge');
    if (badge && data.length > 0) {
      badge.textContent = data.length;
      badge.style.display = 'inline';
    }
  } catch { /* silencioso */ }
}
