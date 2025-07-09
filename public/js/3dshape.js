// 3dshape.js
// Enjambre de partículas animadas con Three.js, el centro se mueve según la sección visible

// --- Configuración de posiciones para cada sección ---
const sectionPositions = [
  { x: 0,   y: 0,   z: 0 },    // Sección 1 (centrado)
  { x: 4,   y: 0,   z: 0 },    // Sección 2 (derecha, texto a la izquierda)
  { x: -4,  y: 0,   z: 0 },    // Sección 3 (izquierda, texto a la derecha)
  { x: 4,   y: 0,   z: 0 },    // Sección 4 (derecha)
  { x: -4,  y: 0,   z: 0 },    // Sección 5 (izquierda)
  { x: 4,   y: 0,   z: 0 }     // Sección 6 (derecha)
];

// --- Crear el canvas y añadirlo al body ---
const renderer = new THREE.WebGLRenderer({ alpha: true, antialias: true });
renderer.setClearColor(0x000000, 0); // Fondo transparente
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.domElement.style.position = 'fixed';
renderer.domElement.style.top = 0;
renderer.domElement.style.left = 0;
renderer.domElement.style.width = '100vw';
renderer.domElement.style.height = '100vh';
renderer.domElement.style.pointerEvents = 'none';
renderer.domElement.style.zIndex = 1000;
document.body.appendChild(renderer.domElement);

// --- Escena y cámara ---
const scene = new THREE.Scene();
const camera = new THREE.PerspectiveCamera(90, window.innerWidth / window.innerHeight, 0.1, 1000);
camera.position.set(0, 0, 5);

// --- Partículas ---
const PARTICLE_COUNT = 2800;
const positions = new Float32Array(PARTICLE_COUNT * 3);
const velocities = [];
const spread = 30; // Reducir el spread para que sea más controlado
for (let i = 0; i < PARTICLE_COUNT; i++) {
  positions[i * 3] = (Math.random() - 0.5) * spread;
  positions[i * 3 + 1] = (Math.random() - 0.5) * spread;
  positions[i * 3 + 2] = (Math.random() - 0.5) * spread;
  velocities.push({
    x: (Math.random() - 0.5) * 0.02,
    y: (Math.random() - 0.5) * 0.02,
    z: (Math.random() - 0.5) * 0.02
  });
}
const geometry = new THREE.BufferGeometry();
geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
const material = new THREE.PointsMaterial({ color: 0x000000, size: 0.03, transparent: true, opacity: 0.6});
const points = new THREE.Points(geometry, material);
scene.add(points);

// --- Variables para animación del centro ---
let targetCenter = { ...sectionPositions[0] };
let currentCenter = { ...sectionPositions[0] };
const lerp = (a, b, t) => a + (b - a) * t;

// --- Animación principal ---
function animate() {
  requestAnimationFrame(animate);
  // Animar el centro
  currentCenter.x = lerp(currentCenter.x, targetCenter.x, 0.06);
  currentCenter.y = lerp(currentCenter.y, targetCenter.y, 0.06);
  currentCenter.z = lerp(currentCenter.z, targetCenter.z, 0.06);
  // Mover partículas en torno al centro
  const pos = geometry.attributes.position.array;
  for (let i = 0; i < PARTICLE_COUNT; i++) {
    // Movimiento aleatorio suave
    velocities[i].x += (Math.random() - 0.5) * 0.001;
    velocities[i].y += (Math.random() - 0.5) * 0.001;
    velocities[i].z += (Math.random() - 0.5) * 0.001;
    // Límite de velocidad
    velocities[i].x = Math.max(-0.03, Math.min(0.03, velocities[i].x));
    velocities[i].y = Math.max(-0.03, Math.min(0.03, velocities[i].y));
    velocities[i].z = Math.max(-0.03, Math.min(0.03, velocities[i].z));
    // Actualizar posición
    pos[i * 3] += velocities[i].x;
    pos[i * 3 + 1] += velocities[i].y;
    pos[i * 3 + 2] += velocities[i].z;
    // Tendencia a volver al centro
    pos[i * 3] += (currentCenter.x - pos[i * 3]) * 0.006;
    pos[i * 3 + 1] += (currentCenter.y - pos[i * 3 + 1]) * 0.008;
    pos[i * 3 + 2] += (currentCenter.z - pos[i * 3 + 2]) * 0.008;
  }
  geometry.attributes.position.needsUpdate = true;
  renderer.render(scene, camera);
}
animate();

// --- Actualizar tamaño del renderer al cambiar el tamaño de la ventana ---
window.addEventListener('resize', () => {
  renderer.setSize(window.innerWidth, window.innerHeight);
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
});

// --- Detectar sección visible y cambiar targetCenter ---
function getSectionIndex() {
  const sections = document.querySelectorAll('.section');
  let idx = 0;
  let minDist = Infinity;
  const vh = window.innerHeight;
  sections.forEach((sec, i) => {
    const rect = sec.getBoundingClientRect();
    // Distancia del centro de la sección al centro de la ventana
    const dist = Math.abs((rect.top + rect.bottom) / 2 - vh / 2);
    if (dist < minDist) {
      minDist = dist;
      idx = i;
    }
  });
  return idx;
}

function updateTargetBySection() {
  const idx = getSectionIndex();
  if (sectionPositions[idx]) {
    targetCenter = { ...sectionPositions[idx] };
  }
}

window.addEventListener('scroll', updateTargetBySection);
window.addEventListener('resize', updateTargetBySection);
// Llamar al inicio para fijar la posición inicial
updateTargetBySection(); 