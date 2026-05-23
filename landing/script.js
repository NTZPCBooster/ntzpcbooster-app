// ═══════════════════════════════════════════════════
// NTZ PCBooster Landing — Script
// Particles.js + Scroll Reveal + Interactions
// ═══════════════════════════════════════════════════

// ═══ Config ═══
const SUPABASE_URL = 'https://ntuqzkirmskfznhsogqx.supabase.co/functions/v1';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im50dXF6a2lybXNrZnpuaHNvZ3F4Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3Nzk0Njk2NzQsImV4cCI6MjA5NTA0NTY3NH0.pOap21iX3UMLodaysapvJ70rU7JiJCiKuW7nT9w3Jqg';

// Prices in centavos
const PRICES = {
  vitalicio: 7990,
  mensal: 1990,
};

let activeCoupon = null;
let discountPct = 0;

// ═══════════════════════════════════════════════════
// PARTICLES.JS INITIALIZATION
// ═══════════════════════════════════════════════════

function initParticles() {
  if (typeof particlesJS === 'undefined') return;

  particlesJS('particles-js', {
    particles: {
      number: {
        value: 120,
        density: {
          enable: true,
          value_area: 1800
        }
      },
      color: {
        value: '#00ff41'
      },
      shape: {
        type: 'circle',
        stroke: {
          width: 0,
          color: '#000000'
        }
      },
      opacity: {
        value: 0.35,
        random: true,
        anim: {
          enable: true,
          speed: 0.4,
          opacity_min: 0.08,
          sync: false
        }
      },
      size: {
        value: 3,
        random: true,
        anim: {
          enable: true,
          speed: 0.5,
          size_min: 0.5,
          sync: false
        }
      },
      line_linked: {
        enable: true,
        distance: 120,
        color: '#00ff41',
        opacity: 0.12,
        width: 0.8
      },
      move: {
        enable: true,
        speed: 0.8,
        direction: 'none',
        random: true,
        straight: false,
        out_mode: 'out',
        bounce: false,
        attract: {
          enable: false,
          rotateX: 600,
          rotateY: 1200
        }
      }
    },
    interactivity: {
      detect_on: 'window',
      events: {
        onhover: {
          enable: true,
          mode: 'grab'
        },
        onclick: {
          enable: true,
          mode: 'push'
        },
        resize: true
      },
      modes: {
        grab: {
          distance: 220,
          line_linked: {
            opacity: 0.5
          }
        },
        push: {
          particles_nb: 4
        },
        repulse: {
          distance: 150,
          duration: 0.4
        }
      }
    },
    retina_detect: true
  });
}

// ═══════════════════════════════════════════════════
// SCROLL REVEAL (IntersectionObserver)
// ═══════════════════════════════════════════════════

function initScrollReveal() {
  const reveals = document.querySelectorAll('.reveal');

  // Assign stagger delays to children with .reveal--stagger
  const staggerGroups = new Map();
  reveals.forEach(el => {
    if (el.classList.contains('reveal--stagger')) {
      const parent = el.parentElement;
      if (!staggerGroups.has(parent)) {
        staggerGroups.set(parent, []);
      }
      staggerGroups.get(parent).push(el);
    }
  });

  staggerGroups.forEach((children) => {
    children.forEach((child, i) => {
      child.style.transitionDelay = `${i * 0.1}s`;
    });
  });

  const observer = new IntersectionObserver(
    (entries) => {
      entries.forEach(entry => {
        if (entry.isIntersecting) {
          entry.target.classList.add('is-visible');
          // Once revealed, stop observing for performance
          observer.unobserve(entry.target);
        }
      });
    },
    {
      threshold: 0.1,
      rootMargin: '0px 0px -60px 0px'
    }
  );

  reveals.forEach(el => observer.observe(el));
}

// ═══════════════════════════════════════════════════
// HERO GLOW — follows mouse subtly
// ═══════════════════════════════════════════════════

function initHeroGlow() {
  const glow = document.querySelector('.hero__glow');
  if (!glow) return;

  let targetX = 0;
  let targetY = 0;
  let currentX = 0;
  let currentY = 0;

  document.addEventListener('mousemove', (e) => {
    const x = (e.clientX / window.innerWidth - 0.5) * 80;
    const y = (e.clientY / window.innerHeight - 0.5) * 40;
    targetX = x;
    targetY = y;
  });

  function animate() {
    // Smooth lerp
    currentX += (targetX - currentX) * 0.03;
    currentY += (targetY - currentY) * 0.03;
    glow.style.transform = `translateX(calc(-50% + ${currentX}px)) translateY(${currentY}px)`;
    requestAnimationFrame(animate);
  }
  animate();
}

// ═══════════════════════════════════════════════════
// COUNTERS — animate numbers on reveal
// ═══════════════════════════════════════════════════

function initCounters() {
  const statNums = document.querySelectorAll('.stat__num');

  const observer = new IntersectionObserver(
    (entries) => {
      entries.forEach(entry => {
        if (!entry.isIntersecting) return;

        const el = entry.target;
        const text = el.textContent.trim();
        const match = text.match(/^(\d+)/);

        if (match) {
          const target = parseInt(match[1], 10);
          const suffix = text.replace(match[1], '');
          const duration = 1500;
          const start = performance.now();

          function tick(now) {
            const elapsed = now - start;
            const progress = Math.min(elapsed / duration, 1);
            // Ease out cubic
            const eased = 1 - Math.pow(1 - progress, 3);
            const current = Math.round(target * eased);
            el.textContent = current + suffix;

            if (progress < 1) {
              requestAnimationFrame(tick);
            }
          }

          requestAnimationFrame(tick);
        }

        observer.unobserve(el);
      });
    },
    { threshold: 0.5 }
  );

  statNums.forEach(el => observer.observe(el));
}

// ═══════════════════════════════════════════════════
// COUPON
// ═══════════════════════════════════════════════════

async function applyCoupon() {
  const input = document.getElementById('couponInput');
  const msg = document.getElementById('couponMsg');
  const btn = document.getElementById('couponBtn');
  const code = input.value.trim().toUpperCase();

  if (!code) {
    msg.textContent = 'Digite um codigo.';
    msg.className = 'coupon-bar__msg coupon-bar__msg--error';
    return;
  }

  btn.disabled = true;
  btn.textContent = '...';

  try {
    const res = await fetch(`${SUPABASE_URL}/admin`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'apikey': SUPABASE_ANON_KEY,
      },
      body: JSON.stringify({ action: 'coupon.check', code }),
    });

    activeCoupon = code;
    msg.textContent = `Cupom "${code}" sera aplicado no checkout!`;
    msg.className = 'coupon-bar__msg coupon-bar__msg--ok';
    input.disabled = true;
  } catch {
    activeCoupon = code;
    msg.textContent = `Cupom "${code}" sera validado no checkout.`;
    msg.className = 'coupon-bar__msg coupon-bar__msg--ok';
    input.disabled = true;
  } finally {
    btn.disabled = false;
    btn.textContent = 'Aplicar';
  }
}

// ═══════════════════════════════════════════════════
// CHECKOUT
// ═══════════════════════════════════════════════════

async function checkout(plan) {
  const btn = event.currentTarget;
  const originalText = btn.innerHTML;
  btn.disabled = true;
  btn.innerHTML = '<span class="spinner"></span> Redirecionando...';

  try {
    const res = await fetch(`${SUPABASE_URL}/create-checkout`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'apikey': SUPABASE_ANON_KEY,
      },
      body: JSON.stringify({
        plan,
        couponCode: activeCoupon || undefined,
        successUrl: window.location.origin + '/success.html',
        cancelUrl: window.location.origin + '#pricing',
      }),
    });

    const data = await res.json();

    if (data.url) {
      window.location.href = data.url;
    } else {
      throw new Error(data.error || 'Erro ao criar sessao.');
    }
  } catch (err) {
    alert('Erro ao iniciar o pagamento. Tente novamente.\n\n' + (err.message || ''));
    btn.disabled = false;
    btn.innerHTML = originalText;
  }
}

// ═══════════════════════════════════════════════════
// SMOOTH SCROLL
// ═══════════════════════════════════════════════════

document.querySelectorAll('a[href^="#"]').forEach(link => {
  link.addEventListener('click', (e) => {
    const target = document.querySelector(link.getAttribute('href'));
    if (target) {
      e.preventDefault();
      target.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  });
});

// ═══════════════════════════════════════════════════
// NAV SCROLL EFFECT
// ═══════════════════════════════════════════════════

const nav = document.querySelector('.nav');
let lastScroll = 0;

window.addEventListener('scroll', () => {
  const scrollY = window.scrollY;
  nav.classList.toggle('nav--scrolled', scrollY > 50);
  lastScroll = scrollY;
}, { passive: true });

// ═══════════════════════════════════════════════════
// FAQ ACCORDION
// ═══════════════════════════════════════════════════

document.querySelectorAll('.faq__item').forEach(item => {
  item.addEventListener('toggle', () => {
    if (item.open) {
      document.querySelectorAll('.faq__item').forEach(other => {
        if (other !== item) other.open = false;
      });
    }
  });
});

// ═══════════════════════════════════════════════════
// COUPON ENTER KEY
// ═══════════════════════════════════════════════════

document.getElementById('couponInput')?.addEventListener('keydown', (e) => {
  if (e.key === 'Enter') applyCoupon();
});

// ═══════════════════════════════════════════════════
// INIT ALL
// ═══════════════════════════════════════════════════

document.addEventListener('DOMContentLoaded', () => {
  initParticles();
  initScrollReveal();
  initHeroGlow();
  initCounters();
});
