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

// Renderiza sidebar completo con todas las secciones
function renderSidebar(activePage) {
  const sidebar = document.getElementById('sidebar');
  if (!sidebar) return;

  const links = [
    { section: 'Principal' },
    { href: '/platform/dashboard.html', key: 'dashboard', icon: `<rect x="1" y="1" width="6" height="6" rx="1.5" stroke="currentColor" stroke-width="1.3"/><rect x="9" y="1" width="6" height="6" rx="1.5" stroke="currentColor" stroke-width="1.3"/><rect x="1" y="9" width="6" height="6" rx="1.5" stroke="currentColor" stroke-width="1.3"/><rect x="9" y="9" width="6" height="6" rx="1.5" stroke="currentColor" stroke-width="1.3"/>`, label: 'Dashboard' },
    { href: '/platform/citas.html', key: 'citas', icon: `<rect x="1.5" y="3" width="13" height="11.5" rx="2" stroke="currentColor" stroke-width="1.3"/><path d="M5 1.5v3M11 1.5v3M1.5 7h13" stroke="currentColor" stroke-width="1.3" stroke-linecap="round"/>`, label: 'Agenda' },
    { href: '/platform/solicitudes.html', key: 'solicitudes', icon: `<circle cx="8" cy="8" r="6.5" stroke="currentColor" stroke-width="1.3"/><path d="M8 5v3.5l2 2" stroke="currentColor" stroke-width="1.3" stroke-linecap="round" stroke-linejoin="round"/>`, label: 'Solicitudes Web', badgeId: 'webBadge' },
    { href: '/platform/telemedicina.html', key: 'telemedicina', icon: `<rect x="1.5" y="4" width="10" height="8" rx="1.5" stroke="currentColor" stroke-width="1.3"/><path d="M11.5 7l3-2v6l-3-2" stroke="currentColor" stroke-width="1.3" stroke-linecap="round" stroke-linejoin="round"/>`, label: 'Telemedicina' },
    { section: 'Pacientes' },
    { href: '/platform/pacientes.html', key: 'pacientes', icon: `<circle cx="8" cy="5.5" r="3" stroke="currentColor" stroke-width="1.3"/><path d="M2 14c0-3.31 2.69-6 6-6s6 2.69 6 6" stroke="currentColor" stroke-width="1.3" stroke-linecap="round"/>`, label: 'Pacientes' },
    { href: '/platform/nueva-paciente.html', key: 'nueva-paciente', icon: `<circle cx="7" cy="5.5" r="3" stroke="currentColor" stroke-width="1.3"/><path d="M1 14c0-3.31 2.69-6 6-6M11 10v4M9 12h4" stroke="currentColor" stroke-width="1.3" stroke-linecap="round"/>`, label: 'Nueva Paciente' },
    { href: '/platform/recordatorios.html', key: 'recordatorios', icon: `<path d="M8 1.5v1M8 13.5v1M1.5 8h1M13.5 8h1M3.4 3.4l.7.7M11.9 11.9l.7.7M3.4 12.6l.7-.7M11.9 4.1l.7-.7" stroke="currentColor" stroke-width="1.3" stroke-linecap="round"/><circle cx="8" cy="8" r="3.5" stroke="currentColor" stroke-width="1.3"/>`, label: 'Recordatorios', badgeId: 'recBadge' },
    { section: 'Clínico' },
    { href: '/platform/prenatal.html', key: 'prenatal', icon: `<ellipse cx="8" cy="9" rx="4" ry="5" stroke="currentColor" stroke-width="1.3"/><circle cx="8" cy="5.5" r="2" stroke="currentColor" stroke-width="1.3"/><path d="M6 9.5c0-1.1.9-2 2-2s2 .9 2 2" stroke="currentColor" stroke-width="1.1" stroke-linecap="round"/>`, label: 'Control Prenatal' },
    { section: 'Administración' },
    { href: '/platform/cobros.html', key: 'cobros', icon: `<rect x="1.5" y="4" width="13" height="9" rx="1.5" stroke="currentColor" stroke-width="1.3"/><path d="M1.5 7.5h13M5.5 10.5h2" stroke="currentColor" stroke-width="1.3" stroke-linecap="round"/>`, label: 'Cobros' },
    { href: '/platform/reportes.html', key: 'reportes', icon: `<path d="M3 12V8M6.5 12V5M10 12V7M13.5 12V3" stroke="currentColor" stroke-width="1.3" stroke-linecap="round"/>`, label: 'Reportes' },
  ];

  const user = API.user;
  const avatar = (user.nombre || 'U')[0].toUpperCase();
  const rolLabel = user.rol === 'doctor' ? 'Médico' : 'Asistente';

  sidebar.innerHTML = `
    <div class="sidebar__brand">
      <div class="sidebar__brand-name">GYNARE</div>
      <div class="sidebar__brand-sub">Clínica de la Mujer</div>
    </div>
    <nav class="sidebar__nav">
      ${links.map(l => {
        if (l.section) return `<div class="sidebar__section">${l.section}</div>`;
        const isActive = activePage === l.key;
        const badge = l.badgeId ? `<span class="sidebar__badge" id="${l.badgeId}" style="display:none">0</span>` : '';
        return `<a href="${l.href}" class="sidebar__link${isActive ? ' active' : ''}">
          <svg width="16" height="16" viewBox="0 0 16 16" fill="none">${l.icon}</svg>
          ${l.label}${badge}
        </a>`;
      }).join('')}
    </nav>
    <div class="sidebar__user">
      <div class="sidebar__user-avatar" id="sidebarAvatar">${avatar}</div>
      <div>
        <div class="sidebar__user-name" id="sidebarUserName">${user.nombre || 'Usuario'}</div>
        <div class="sidebar__user-role" id="sidebarUserRole">${rolLabel}</div>
      </div>
      <button class="sidebar__logout" onclick="logout()" title="Cerrar sesión">
        <svg width="16" height="16" viewBox="0 0 16 16" fill="none"><path d="M6 2H3a1 1 0 00-1 1v10a1 1 0 001 1h3M10 11l3-3-3-3M13 8H6" stroke="currentColor" stroke-width="1.3" stroke-linecap="round" stroke-linejoin="round"/></svg>
      </button>
    </div>
  `;
}

// Carga badges del sidebar (web + recordatorios)
async function loadAllBadges() {
  try {
    const [web, rec] = await Promise.all([
      API.get('/citas/solicitudes-web').catch(() => []),
      API.get('/recordatorios/count').catch(() => ({ pendientes: 0 }))
    ]);
    const webB = document.getElementById('webBadge');
    if (webB && web.length > 0) { webB.textContent = web.length; webB.style.display = 'inline'; }
    const recB = document.getElementById('recBadge');
    if (recB && rec.vencidos > 0) { recB.textContent = rec.vencidos; recB.style.display = 'inline'; }
  } catch { /* silencioso */ }
}

// Formatear moneda MXN
function formatMXN(monto) {
  return new Intl.NumberFormat('es-MX', { style: 'currency', currency: 'MXN' }).format(monto || 0);
}

// Calcular semanas de gestación desde FUM
function calcSemanasGestacion(fum) {
  if (!fum) return null;
  const diff = new Date() - new Date(fum + 'T12:00:00');
  return Math.floor(diff / (1000 * 60 * 60 * 24 * 7));
}

// Obtener nombre de mes legible
function mesLabel(yyyymm) {
  if (!yyyymm) return '';
  const [y, m] = yyyymm.split('-');
  const meses = ['Ene','Feb','Mar','Abr','May','Jun','Jul','Ago','Sep','Oct','Nov','Dic'];
  return `${meses[parseInt(m) - 1]} ${y.slice(2)}`;
}
