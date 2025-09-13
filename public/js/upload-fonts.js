// Función para subir fuentes a Cloudinary desde un input file
export async function uploadFontsFromInput(input, isLocalMode) {
  if (isLocalMode) {
    alert('Font upload not available in local mode.');
    input.value = '';
    return;
  }
  const files = Array.from(input.files);
  if (!files.length) return;

  for (const file of files) {
    try {
      // Usa 'raw' como resource_type para fuentes y mantiene el nombre original
      const fontUrl = await window.uploadToCloudinary(file, 'raw', 'noxistence/fonts', file.name);
      window.uploadedFonts = window.uploadedFonts || [];
      window.uploadedFonts.push({ name: file.name, url: fontUrl });
      alert(`Fuente subida: ${file.name}`);
    } catch (err) {
      alert('Error subiendo fuente: ' + file.name);
    }
  }
  input.value = '';
}