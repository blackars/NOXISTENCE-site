import Lenis from '@studio-freight/lenis';
import gsap from 'gsap';
import { init3DShape } from './3dshape.js';

// Variables globales
let lenis;
let sections;
let currentSection = 0;
let isScrolling = false;

// Inicializar enjambre 3D
init3DShape();

// Inicializar Lenis para scroll suave
function initLenis() {
  lenis = new Lenis({
    autoRaf: true
  });

  // Conectar Lenis al loop de animación
  function raf(time) {
    lenis.raf(time);
    requestAnimationFrame(raf);
  }
  requestAnimationFrame(raf);
}

// Divide el texto en palabras y las envuelve en spans
function splitTextToWordSpans(selector) {
  document.querySelectorAll(selector).forEach(el => {
    const words = el.textContent.split(' ');
    el.innerHTML = '';
    words.forEach((word, i) => {
      const span = document.createElement('span');
      span.textContent = word + (i < words.length - 1 ? ' ' : '');
      el.appendChild(span);
    });
  });
}

// Efecto de aparición de palabras tipo humo con GSAP
function animateSmokeText(el) {
  gsap.set(el.querySelectorAll('span'), { opacity: 0, y: 40, filter: 'blur(8px)' });
  gsap.to(el.querySelectorAll('span'), {
    opacity: 1,
    y: 0,
    filter: 'blur(0px)',
    stagger: {
      amount: 1.2,
      from: 'random'
    },
    duration: 1.2,
    ease: 'power2.out'
  });
}

// Efecto de aparición de secciones con IntersectionObserver
function revealSections() {
  const sections = document.querySelectorAll('.section');
  const observer = new IntersectionObserver((entries, obs) => {
    entries.forEach(entry => {
      if (entry.isIntersecting) {
        entry.target.classList.add('visible');
        // Animar los textos de la sección
        entry.target.querySelectorAll('.smoke-text').forEach(animateSmokeText);
      } else {
        // Reiniciar el estado de las palabras al salir del viewport
        entry.target.classList.remove('visible');
        entry.target.querySelectorAll('.smoke-text').forEach(el => {
          gsap.set(el.querySelectorAll('span'), { opacity: 0, y: 40, filter: 'blur(8px)' });
        });
      }
    });
  }, {
    threshold: 0.2
  });
  sections.forEach(section => observer.observe(section));
}

function scrollToSection(index) {
  if (index < 0 || index >= sections.length) return;
  isScrolling = true;
  lenis.scrollTo(sections[index], {
    duration: 1.2,
    easing: t => 1 - Math.pow(1 - t, 3), // easeOutCubic
    immediate: false
  });
  currentSection = index;
  setTimeout(() => { isScrolling = false; }, 1300); // Bloquea scroll hasta terminar animación
}

// Función para inicializar todo cuando el DOM esté listo
function initApp() {
  console.log('Initializing app...');
  
  // Inicializar Lenis
  initLenis();
  
  // Buscar secciones después de que el DOM esté listo
  sections = Array.from(document.querySelectorAll('.section'));
  console.log('Sections found:', sections.length);
  
  // Dividir texto en palabras
  splitTextToWordSpans('.smoke-text');
  
  // Configurar event listeners
  setupEventListeners();
  
  // Revelar secciones
  revealSections();
  
  // Cargar footer
  fetch('footer.html')
    .then(r => r.text())
    .then(html => { document.getElementById('footer-container').innerHTML = html; });
  
  // Al cargar, encaja en la primera sección
  if (sections.length > 0) {
    lenis.scrollTo(sections[0], { immediate: true });
    currentSection = 0;
  }
  
  // Animación del icono The Creator
  const creatorIcon = document.querySelector('.creator-icon');
  if (creatorIcon) {
    gsap.to(creatorIcon, {
      opacity: 1,
      duration: 1.5,
      ease: 'power2.inOut',
      onComplete: function() {
        gsap.to(creatorIcon, {
          x: 40,
          yoyo: true,
          repeat: -1,
          duration: 2,
          ease: 'sine.inOut'
        });
        gsap.to(creatorIcon, {
          scale: 1.3,
          yoyo: true,
          repeat: -1,
          duration: 1.8,
          ease: 'sine.inOut'
        });
        gsap.to(creatorIcon, {
          rotation: 15,
          yoyo: true,
          repeat: -1,
          duration: 1.2,
          ease: 'sine.inOut'
        });
        gsap.to(creatorIcon, {
          opacity: 0.5,
          yoyo: true,
          repeat: -1,
          duration: 2.5,
          ease: 'sine.inOut'
        });
      }
    });
  }
}

// Configurar event listeners
function setupEventListeners() {
  // Detecta scroll de rueda
  window.addEventListener('wheel', (e) => {
    console.log('Wheel event, isScrolling:', isScrolling, 'deltaY:', e.deltaY);
    if (isScrolling) return;
    if (e.deltaY > 0) {
      scrollToSection(currentSection + 1);
    } else if (e.deltaY < 0) {
      scrollToSection(currentSection - 1);
    }
  }, { passive: false });

  // Detecta flechas del teclado
  window.addEventListener('keydown', (e) => {
    if (isScrolling) return;
    if (e.key === 'ArrowDown' || e.key === 'PageDown') {
      scrollToSection(currentSection + 1);
    } else if (e.key === 'ArrowUp' || e.key === 'PageUp') {
      scrollToSection(currentSection - 1);
    }
  });

  // Opcional: Detecta swipe en móvil
  let touchStartY = null;
  window.addEventListener('touchstart', e => {
    touchStartY = e.touches[0].clientY;
  });
  window.addEventListener('touchend', e => {
    if (touchStartY === null) return;
    const touchEndY = e.changedTouches[0].clientY;
    if (isScrolling) return;
    if (touchStartY - touchEndY > 50) {
      scrollToSection(currentSection + 1);
    } else if (touchEndY - touchStartY > 50) {
      scrollToSection(currentSection - 1);
    }
    touchStartY = null;
  });
}

// Inicializar cuando el DOM esté listo
window.addEventListener('DOMContentLoaded', initApp); 