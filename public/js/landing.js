// GYNARE Landing Page JS

// Nav scroll effect
const nav = document.getElementById('nav');
window.addEventListener('scroll', () => {
  nav.classList.toggle('scrolled', window.scrollY > 50);
});

// Mobile burger menu
const burger = document.getElementById('navBurger');
const navLinks = document.getElementById('navLinks');
burger?.addEventListener('click', () => {
  navLinks.classList.toggle('open');
});
navLinks?.querySelectorAll('a').forEach(a => {
  a.addEventListener('click', () => navLinks.classList.remove('open'));
});

// Fecha mínima = hoy
const fechaInput = document.getElementById('f_fecha');
const horaSelect = document.getElementById('f_hora');
if (fechaInput) {
  const hoy = new Date().toISOString().split('T')[0];
  fechaInput.setAttribute('min', hoy);

  fechaInput.addEventListener('change', async () => {
    const fecha = fechaInput.value;
    if (!fecha) return;

    horaSelect.innerHTML = '<option>Cargando...</option>';
    horaSelect.disabled = true;

    try {
      const resp = await fetch(`/api/publica/disponibilidad?fecha=${fecha}`);
      const data = await resp.json();

      if (data.disponibles.length === 0) {
        horaSelect.innerHTML = '<option value="">No hay horarios disponibles</option>';
      } else {
        horaSelect.innerHTML = '<option value="">Selecciona un horario</option>' +
          data.disponibles.map(h => `<option value="${h}">${formatHora(h)}</option>`).join('');
      }
      horaSelect.disabled = false;
    } catch {
      horaSelect.innerHTML = '<option value="">Error cargando horarios</option>';
      horaSelect.disabled = false;
    }
  });
}

function formatHora(h) {
  const [hh, mm] = h.split(':');
  const hora = parseInt(hh);
  const suffix = hora >= 12 ? 'pm' : 'am';
  const h12 = hora > 12 ? hora - 12 : hora === 0 ? 12 : hora;
  return `${h12}:${mm} ${suffix}`;
}

// Formulario de agendado
const form = document.getElementById('bookingForm');
const btn = document.getElementById('bookingBtn');
const msg = document.getElementById('bookingMsg');

form?.addEventListener('submit', async (e) => {
  e.preventDefault();

  const nombre = document.getElementById('f_nombre').value.trim();
  const telefono = document.getElementById('f_telefono').value.trim();
  const email = document.getElementById('f_email').value.trim();
  const fecha = document.getElementById('f_fecha').value;
  const hora = document.getElementById('f_hora').value;
  const motivo = document.getElementById('f_motivo').value.trim();
  const primera_vez = document.querySelector('input[name="primera_vez"]:checked')?.value || '1';

  if (!nombre || !telefono || !fecha || !hora) {
    showMsg('Por favor completa todos los campos requeridos.', 'err');
    return;
  }

  btn.disabled = true;
  btn.textContent = 'Enviando...';

  try {
    const resp = await fetch('/api/publica/agendar', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ nombre, telefono, email, fecha, hora, motivo, es_primera_vez: primera_vez === '1' })
    });

    const data = await resp.json();

    if (resp.ok) {
      showMsg('✓ ' + data.mensaje, 'ok');
      form.reset();
      horaSelect.innerHTML = '<option value="">Selecciona fecha primero</option>';
    } else {
      showMsg(data.error || 'Ocurrió un error. Por favor intenta de nuevo.', 'err');
    }
  } catch {
    showMsg('Error de conexión. Por favor intenta más tarde.', 'err');
  } finally {
    btn.disabled = false;
    btn.textContent = 'Solicitar mi cita';
  }
});

function showMsg(text, type) {
  msg.textContent = text;
  msg.className = `form__message form__message--${type}`;
  msg.style.display = 'block';
  msg.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
}

// Smooth scroll para nav links
document.querySelectorAll('a[href^="#"]').forEach(a => {
  a.addEventListener('click', e => {
    const id = a.getAttribute('href');
    if (id === '#') return;
    const el = document.querySelector(id);
    if (el) {
      e.preventDefault();
      el.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  });
});

// Animaciones de aparición al hacer scroll
const observer = new IntersectionObserver((entries) => {
  entries.forEach(e => {
    if (e.isIntersecting) {
      e.target.style.opacity = '1';
      e.target.style.transform = 'translateY(0)';
    }
  });
}, { threshold: 0.1 });

document.querySelectorAll('.service-card, .spec-card, .why__item, .about__stat').forEach(el => {
  el.style.opacity = '0';
  el.style.transform = 'translateY(20px)';
  el.style.transition = 'opacity .5s ease, transform .5s ease';
  observer.observe(el);
});
