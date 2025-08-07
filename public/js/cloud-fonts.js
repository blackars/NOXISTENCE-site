// cloud-fonts.js - Manejo de fuentes en Cloudinary para el editor

async function fetchCloudFonts() {
  try {
    const res = await fetch('/api/cloudinary-resources?folder=fonts');
    if (!res.ok) throw new Error('No se pudo obtener la lista de fuentes en la nube');
    const data = await res.json();
    // Cloudinary entrega los recursos en data.resources
    return (data.resources || []).filter(f =>
      f.format && ['ttf','otf','woff','woff2'].includes(f.format.toLowerCase())
    );
  } catch (e) {
    return [];
  }
}

async function loadCloudFontsToSelector() {
  const select = document.getElementById('cloudFontsList');
  const status = document.getElementById('cloudFontStatus');
  if (!select) return;
  select.innerHTML = '';
  status.textContent = 'Loading...';
  const fonts = await fetchCloudFonts();
  if (!fonts.length) {
    status.textContent = 'No cloud fonts found.';
    return;
  }
  fonts.forEach(font => {
    const opt = document.createElement('option');
    // Usar public_id como value
    opt.value = font.secure_url;
    // Mostrar solo el nombre del archivo
    let display = font.public_id.split('/').pop();
    if (font.format) display += ` (.${font.format})`;
    opt.textContent = display;
    select.appendChild(opt);
  });
  status.textContent = `Loaded ${fonts.length} font(s) from Cloudinary.`;
}

// Cargar la fuente seleccionada de Cloudinary y aplicarla
async function applySelectedCloudFont() {
  const select = document.getElementById('cloudFontsList');
  const fontUrl = select && select.value;
  if (!fontUrl) return;
  // Nombre limpio sin extensión ni ruta
  const cleanName = fontUrl.split('/').pop().replace(/\.[^/.]+$/, '').replace(/[^a-zA-Z0-9_-]/g, '');
  try {
    const fontFace = new FontFace(cleanName, `url(${fontUrl})`);
    await fontFace.load();
    document.fonts.add(fontFace);
    // Agregar la opción a los selectores de fuente si no existe
    const selector = document.getElementById('fontSelector');
    const panelSelector = document.getElementById('textFontFamily');
    if (![...selector.options].some(opt => opt.value === cleanName)) {
      const opt = document.createElement('option');
      opt.value = cleanName;
      opt.textContent = cleanName + ' (cloud)';
      selector.appendChild(opt);
    }
    if (![...panelSelector.options].some(opt => opt.value === cleanName)) {
      const panelOpt = document.createElement('option');
      panelOpt.value = cleanName;
      panelOpt.textContent = cleanName + ' (cloud)';
      panelSelector.appendChild(panelOpt);
    }
    // Seleccionar la fuente en ambos selectores
    selector.value = cleanName;
    panelSelector.value = cleanName;
    document.getElementById('cloudFontStatus').textContent = `Font ${cleanName} loaded and selected!`;
  } catch (e) {
    document.getElementById('cloudFontStatus').textContent = 'Error loading font.';
  }
}

// Eventos para cargar y aplicar fuentes cloud
window.addEventListener('DOMContentLoaded', () => {
  const reloadBtn = document.getElementById('reloadCloudFontsBtn');
  const applyBtn = document.getElementById('applyCloudFontBtn');
  if (reloadBtn) reloadBtn.addEventListener('click', loadCloudFontsToSelector);
  if (applyBtn) applyBtn.addEventListener('click', applySelectedCloudFont);
  // Carga inicial
  loadCloudFontsToSelector();
});
