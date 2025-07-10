// edit-tools.js - Herramientas de edición para el editor de criaturas

class EditTools {
  constructor(gridElement) {
    this.gridElement = gridElement;
    this.draggingItem = null;
    this.dragOffsetX = 0;
    this.dragOffsetY = 0;
    this.isDragging = false;
    this.dragStartX = 0;
    this.dragStartY = 0;
    this.DRAG_THRESHOLD = 5;
    this.currentEditingText = null;
    this.currentEditingImage = null;
    
    this.init();
    // Listener mouseup con contexto correcto
    window.addEventListener('mouseup', (e) => {
      if (!this.draggingItem) return;
      if (this.draggingItem.isContentEditable) {
        this.draggingItem.contentEditable = 'false';
      }
      if (this.isDragging) {
        const trash = document.getElementById('trash');
        if (trash) {
          const trashRect = trash.getBoundingClientRect();
          if (e.clientX >= trashRect.left && e.clientX <= trashRect.right &&
              e.clientY >= trashRect.top && e.clientY <= trashRect.bottom) {
            this.draggingItem.remove();
            this.saveState();
          } else {
            this.draggingItem.style.zIndex = 1;
            this.saveState();
            this.expandCanvas();
          }
          trash.style.background = '#e74c3c';
        }
      }
      this.draggingItem = null;
      this.isDragging = false;
    });
  }
  
  init() {
    this.setupDragAndDrop();
    this.setupGlobalEvents();
  }
  
  setupDragAndDrop() {
    // Eventos de drag and drop para el grid
    this.gridElement.addEventListener('dragover', (e) => {
      e.preventDefault();
      e.dataTransfer.dropEffect = 'copy';
    });

    this.gridElement.addEventListener('drop', (e) => {
      e.preventDefault();
      try {
        const data = e.dataTransfer.getData('text/plain');
        const item = JSON.parse(data);
        const rect = this.gridElement.getBoundingClientRect();
        const x = e.clientX - rect.left;
        const y = e.clientY - rect.top;
        
        if (item.type === 'art') {
          this.addArtToGrid(item, x, y);
        } else {
          this.addCreatureToGrid(item, x, y);
        }
      } catch (error) {
        console.error('Error adding element to grid:', error);
      }
    });
  }
  
  setupGlobalEvents() {
    // Evento global de mousemove para drag
    window.addEventListener('mousemove', (e) => {
      if (!this.draggingItem) return;
      if (!this.isDragging) {
        if (Math.abs(e.clientX - this.dragStartX) > this.DRAG_THRESHOLD || 
            Math.abs(e.clientY - this.dragStartY) > this.DRAG_THRESHOLD) {
          this.isDragging = true;
        } else {
          return;
        }
      }
      
      const gridRect = this.gridElement.getBoundingClientRect();
      const newX = e.clientX - gridRect.left - this.dragOffsetX;
      const newY = e.clientY - gridRect.top - this.dragOffsetY;
      
      this.draggingItem.style.left = `${newX}px`;
      this.draggingItem.style.top = `${newY}px`;
      
      // Verificar si está sobre el bote de basura
      const trash = document.getElementById('trash');
      if (trash) {
        const trashRect = trash.getBoundingClientRect();
        if (e.clientX >= trashRect.left && e.clientX <= trashRect.right &&
            e.clientY >= trashRect.top && e.clientY <= trashRect.bottom) {
          trash.style.background = '#c0392b';
        } else {
          trash.style.background = '#e74c3c';
        }
      }
    });
  }
  
  makeInteractive(el) {
    el.addEventListener('mousedown', (e) => {
      // Solo permite drag si no está en modo edición
      if (el.isContentEditable && document.activeElement === el) return;
      if (this.draggingItem) return;
      this.draggingItem = el;
      const rect = el.getBoundingClientRect();
      const gridRect = this.gridElement.getBoundingClientRect();
      this.dragOffsetX = e.clientX - rect.left;
      this.dragOffsetY = e.clientY - rect.top;
      this.dragStartX = e.clientX;
      this.dragStartY = e.clientY;
      this.isDragging = false;
      el.style.zIndex = 1000;
      e.preventDefault();
    });

    // Doble clic para editar
    el.addEventListener('dblclick', (e) => {
      if (e.target.tagName === 'TEXTAREA') return;
      if (el.classList.contains('item')) {
        this.openImageFontControls(el);
      } else if (el.classList.contains('text-item')) {
        this.openTextControls(el);
      }
    });

    // Escalar y rotar con rueda del mouse
    el.addEventListener('wheel', (e) => {
      if (e.shiftKey) {
        e.preventDefault();
        const scale = parseFloat(el.dataset.scale || '1');
        const delta = e.deltaY < 0 ? 0.1 : -0.1;
        const newScale = Math.max(0.1, scale + delta);
        el.dataset.scale = newScale;
        el.style.transform = `scale(${newScale}) rotate(${el.dataset.rotate || '0'}deg)`;
        this.saveState();
      } else if (e.altKey) {
        e.preventDefault();
        const rotate = parseFloat(el.dataset.rotate || '0');
        const delta = e.deltaY < 0 ? 5 : -5;
        const newRotate = rotate + delta;
        el.dataset.rotate = newRotate;
        el.style.transform = `scale(${el.dataset.scale || '1'}) rotate(${newRotate}deg)`;
        this.saveState();
      }
    });

    el.addEventListener('contextmenu', (e) => {
      e.preventDefault();
      if (window.showTextContextMenu) {
        window.showTextContextMenu(el, e.clientX, e.clientY);
      }
    });

    // Mouseup directo en el elemento para liberar dragging de textos
    el.addEventListener('mouseup', (e) => {
      if (this.draggingItem) {
        if (this.draggingItem.isContentEditable) {
          this.draggingItem.contentEditable = 'false';
        }
        this.draggingItem = null;
        this.isDragging = false;
      }
    });
  }
  
  makeTextInteractive(el) {
    el.addEventListener('mousedown', (e) => {
      if (e.target.tagName === 'TEXTAREA') return;
      if (this.draggingItem) return;
      this.draggingItem = el;
      const rect = el.getBoundingClientRect();
      const gridRect = this.gridElement.getBoundingClientRect();
      this.dragOffsetX = e.clientX - rect.left;
      this.dragOffsetY = e.clientY - rect.top;
      this.dragStartX = e.clientX;
      this.dragStartY = e.clientY;
      this.isDragging = false;
      el.style.zIndex = 1000;
      e.preventDefault();
    });
    
    el.addEventListener('wheel', (e) => {
      if (e.shiftKey) {
        e.preventDefault();
        const scale = parseFloat(el.dataset.scale || '1');
        const delta = e.deltaY < 0 ? 0.1 : -0.1;
        const newScale = Math.max(0.1, scale + delta);
        el.dataset.scale = newScale;
        el.style.transform = `scale(${newScale}) rotate(${el.dataset.rotate || '0'}deg)`;
        this.saveState();
      } else if (e.altKey) {
        e.preventDefault();
        const rotate = parseFloat(el.dataset.rotate || '0');
        const delta = e.deltaY < 0 ? 5 : -5;
        const newRotate = rotate + delta;
        el.dataset.rotate = newRotate;
        el.style.transform = `scale(${el.dataset.scale || '1'}) rotate(${newRotate}deg)`;
        this.saveState();
      }
    });
  }
  
  addCreatureToGrid(creature, x, y) {
    const item = document.createElement('div');
    item.classList.add('item');
    item.style.left = `${x}px`;
    item.style.top = `${y}px`;
    item.dataset.scale = '1';
    item.dataset.rotate = '0';
    
    // Manejar tanto URLs como base64
    let imgSrc = creature.img;
    if (!imgSrc.startsWith('data:') && !imgSrc.startsWith('img/')) {
      imgSrc = 'img/' + imgSrc.replace(/^.*[\\\/]/, '');
    }
    
    const fontSelector = document.getElementById('fontSelector');
    const fontSizeSlider = document.getElementById('fontSize');
    const fontColorPicker = document.getElementById('fontColor');
    item.innerHTML = `
      <div class="item-content">
        <img src="${imgSrc}" alt="${creature.name}" />
        <div class="item-title" style="font-family: ${fontSelector.value}; font-size: ${fontSizeSlider.value}px; color: ${fontColorPicker.value};">${creature.name}</div>
      </div>`;
    this.makeInteractive(item);
    this.gridElement.appendChild(item);
    this.saveState();
    this.expandCanvas();
  }
  
  addArtToGrid(art, x, y) {
    const item = document.createElement('div');
    item.classList.add('item');
    item.style.left = `${x}px`;
    item.style.top = `${y}px`;
    item.dataset.scale = '1';
    item.dataset.rotate = '0';
    
    // Manejar tanto URLs como base64
    let imgSrc = art.img;
    if (!imgSrc.startsWith('data:') && !imgSrc.startsWith('imgart/')) {
      imgSrc = 'imgart/' + imgSrc.replace(/^.*[\\\/]/, '');
    }
    
    item.innerHTML = `
      <div class="item-content">
        <img src="${imgSrc}" alt="art" />
      </div>`;
    this.makeInteractive(item);
    this.gridElement.appendChild(item);
    this.saveState();
    this.expandCanvas();
  }
  
  expandCanvas() {
    const items = document.querySelectorAll('.item, .text-item');
    let maxX = 0, maxY = 0;
    let minX = Infinity, minY = Infinity;
    items.forEach(item => {
      const left = parseFloat(item.style.left) || 0;
      const top = parseFloat(item.style.top) || 0;
      const scale = parseFloat(item.dataset.scale || '1');
      const width = item.offsetWidth * scale;
      const height = item.offsetHeight * scale;
      maxX = Math.max(maxX, left + width);
      maxY = Math.max(maxY, top + height);
      minX = Math.min(minX, left);
      minY = Math.min(minY, top);
    });
    if (minX === Infinity) {
      minX = 0;
      minY = 0;
      maxX = 800;
      maxY = 600;
    }
    const contentWidth = maxX - minX;
    const contentHeight = maxY - minY;
    const minContentSize = 400;
    this.gridElement.style.width = `${Math.max(contentWidth, minContentSize)}px`;
    this.gridElement.style.height = `${Math.max(contentHeight, minContentSize)}px`;
    // Centrar solo si el contenido es más pequeño que el viewport
    const vw = window.innerWidth;
    const vh = window.innerHeight;
    if (contentWidth < vw && contentHeight < vh) {
      this.gridElement.style.position = 'absolute';
      this.gridElement.style.left = '50%';
      this.gridElement.style.top = '50%';
      this.gridElement.style.transform = 'translate(-50%, -50%)';
    } else {
      this.gridElement.style.position = 'absolute';
      this.gridElement.style.left = '0';
      this.gridElement.style.top = '0';
      this.gridElement.style.transform = 'none';
    }
  }
  
  saveState() {
    const fullLayout = {
      images: Array.from(document.querySelectorAll('.item')).map(el => ({
        name: el.querySelector('.item-title')?.textContent || 'art',
        img: el.querySelector('img')?.src || '',
        left: el.style.left,
        top: el.style.top,
        scale: el.dataset.scale || '1',
        rotate: el.dataset.rotate || '0',
        fontFamily: el.querySelector('.item-title')?.style.fontFamily || 'sans-serif',
        fontSize: el.querySelector('.item-title')?.style.fontSize || '14px',
        color: el.querySelector('.item-title')?.style.color || '#111111'
      })),
      texts: Array.from(document.querySelectorAll('.text-item')).map(el => ({
        content: el.querySelector('textarea')?.value || '',
        left: el.style.left,
        top: el.style.top,
        scale: el.dataset.scale || '1',
        rotate: el.dataset.rotate || '0',
        fontFamily: el.style.fontFamily,
        fontSize: el.style.fontSize,
        color: el.style.color,
        textId: el.dataset.textId
      })),
      backgroundColor: localStorage.getItem('backgroundColor') || '#ffffff',
      fontSettings: {
        family: localStorage.getItem('currentFont') || 'sans-serif',
        size: localStorage.getItem('fontSize') || '14',
        color: localStorage.getItem('fontColor') || '#111111'
      }
    };
    
    localStorage.setItem('creaturePositions', JSON.stringify(fullLayout));
  }
  
  openImageFontControls(imageElement) {
    this.currentEditingImage = imageElement;
    const title = imageElement.querySelector('.item-title');
    const panel = document.getElementById('textControlsPanel');
    const overlay = document.getElementById('textControlsOverlay');
    
    document.querySelector('#textControlsPanel h3').textContent = 'Edit Image Font';
    
    document.getElementById('textContent').value = title ? title.textContent : '';
    document.getElementById('textFontSize').value = parseInt(title ? title.style.fontSize : '14') || 14;
    document.getElementById('textFontSizeDisplay').textContent = `${document.getElementById('textFontSize').value}px`;
    document.getElementById('textFontColor').value = title ? title.style.color || '#111111' : '#111111';
    document.getElementById('textFontFamily').value = title ? title.style.fontFamily || 'sans-serif' : 'sans-serif';
    
    // --- Botón Mirror ---
    let mirrorBtn = document.getElementById('mirrorImageBtn');
    if (!mirrorBtn) {
      mirrorBtn = document.createElement('button');
      mirrorBtn.id = 'mirrorImageBtn';
      mirrorBtn.textContent = 'Mirror';
      mirrorBtn.style.width = '100%';
      mirrorBtn.style.background = '#007bff';
      mirrorBtn.style.color = 'white';
      mirrorBtn.style.border = 'none';
      mirrorBtn.style.padding = '4px 0';
      mirrorBtn.style.marginTop = '2px';
      mirrorBtn.style.marginBottom = '4px';
      mirrorBtn.style.borderRadius = '4px';
      mirrorBtn.style.cursor = 'pointer';
      // Insertar debajo del selector de fuente
      const fontGroup = panel.querySelector('label[for="textFontFamily"]').parentElement;
      fontGroup.insertAdjacentElement('afterend', mirrorBtn);
    } else {
      mirrorBtn.style.display = '';
    }
    mirrorBtn.onclick = () => {
      const img = imageElement.querySelector('img');
      if (!img) return;
      const flipped = imageElement.dataset.flipped === 'true';
      if (flipped) {
        img.style.transform = (img.style.transform || '').replace('scaleX(-1)', '').trim();
        imageElement.dataset.flipped = 'false';
      } else {
        img.style.transform = (img.style.transform || '') + ' scaleX(-1)';
        imageElement.dataset.flipped = 'true';
      }
    };
    // Aplicar el estado flipped al abrir el panel
    const img = imageElement.querySelector('img');
    if (img && imageElement.dataset.flipped === 'true') {
      if (!img.style.transform.includes('scaleX(-1)')) {
        img.style.transform = (img.style.transform || '') + ' scaleX(-1)';
      }
    } else if (img) {
      img.style.transform = (img.style.transform || '').replace('scaleX(-1)', '').trim();
    }

    panel.style.display = 'block';
    overlay.style.display = 'block';
  }
  
  openTextControls(textElement) {
    this.currentEditingText = textElement;
    this.currentEditingImage = null;
    const textarea = textElement.querySelector('textarea');
    const panel = document.getElementById('textControlsPanel');
    const overlay = document.getElementById('textControlsOverlay');
    
    document.querySelector('#textControlsPanel h3').textContent = 'Edit Text';
    
    document.getElementById('textContent').value = textarea.value;
    document.getElementById('textFontSize').value = parseInt(textElement.style.fontSize) || 14;
    document.getElementById('textFontSizeDisplay').textContent = `${document.getElementById('textFontSize').value}px`;
    document.getElementById('textFontColor').value = textElement.style.color || '#111111';
    document.getElementById('textFontFamily').value = textElement.style.fontFamily || 'sans-serif';
    
    // Ocultar el botón Mirror si existe
    const mirrorBtn = document.getElementById('mirrorImageBtn');
    if (mirrorBtn) mirrorBtn.style.display = 'none';

    panel.style.display = 'block';
    overlay.style.display = 'block';
  }
}

// Exportar para uso global
window.EditTools = EditTools; 