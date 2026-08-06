const dropzone = document.getElementById('dropzone');
const fileInput = document.getElementById('fileInput');
const vfEmpty = document.getElementById('vfEmpty');
const previewImg = document.getElementById('previewImg');
const readout = document.getElementById('readout');
const readoutDims = document.getElementById('readoutDims');
const readoutSize = document.getElementById('readoutSize');
const controlsPanel = document.getElementById('controlsPanel');
const widthInput = document.getElementById('widthInput');
const heightInput = document.getElementById('heightInput');
const lockBtn = document.getElementById('lockBtn');
const formatSelect = document.getElementById('formatSelect');
const qualityInput = document.getElementById('qualityInput');
const qualityValue = document.getElementById('qualityValue');
const developBtn = document.getElementById('developBtn');
const statusMsg = document.getElementById('statusMsg');

let currentFile = null;
let originalWidth = 0;
let originalHeight = 0;
let aspectLocked = true;
lockBtn.classList.add('active');

function formatBytes(bytes){
  if (bytes < 1024) return bytes + ' B';
  if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
  return (bytes / (1024 * 1024)).toFixed(2) + ' MB';
}

function handleFile(file){
  if (!file || !file.type.startsWith('image/')) {
    setStatus('That doesn\'t look like an image file.', 'error');
    return;
  }
  currentFile = file;
  const url = URL.createObjectURL(file);
  previewImg.src = url;
  previewImg.hidden = false;
  vfEmpty.hidden = true;
  controlsPanel.hidden = false;
  setStatus('');

  previewImg.onload = () => {
    originalWidth = previewImg.naturalWidth;
    originalHeight = previewImg.naturalHeight;
    widthInput.value = originalWidth;
    heightInput.value = originalHeight;
    readoutDims.textContent = `${originalWidth} × ${originalHeight}`;
    readoutSize.textContent = formatBytes(file.size);
    readout.hidden = false;
  };
}

dropzone.addEventListener('click', () => fileInput.click());
fileInput.addEventListener('change', (e) => handleFile(e.target.files[0]));

['dragenter', 'dragover'].forEach(evt => {
  dropzone.addEventListener(evt, (e) => {
    e.preventDefault();
    dropzone.classList.add('drag-over');
  });
});
['dragleave', 'drop'].forEach(evt => {
  dropzone.addEventListener(evt, (e) => {
    e.preventDefault();
    dropzone.classList.remove('drag-over');
  });
});
dropzone.addEventListener('drop', (e) => {
  const file = e.dataTransfer.files[0];
  handleFile(file);
});

lockBtn.addEventListener('click', () => {
  aspectLocked = !aspectLocked;
  lockBtn.classList.toggle('active', aspectLocked);
});

widthInput.addEventListener('input', () => {
  if (aspectLocked && originalWidth) {
    const ratio = originalHeight / originalWidth;
    heightInput.value = Math.round(widthInput.value * ratio);
  }
});
heightInput.addEventListener('input', () => {
  if (aspectLocked && originalHeight) {
    const ratio = originalWidth / originalHeight;
    widthInput.value = Math.round(heightInput.value * ratio);
  }
});

qualityInput.addEventListener('input', () => {
  qualityValue.textContent = qualityInput.value;
});

document.querySelectorAll('.preset').forEach(btn => {
  btn.addEventListener('click', () => {
    widthInput.value = btn.dataset.w;
    heightInput.value = btn.dataset.h;
  });
});

function setStatus(msg, type){
  statusMsg.textContent = msg;
  statusMsg.className = 'status' + (type ? ' ' + type : '');
}

developBtn.addEventListener('click', async () => {
  if (!currentFile) return;
  const width = parseInt(widthInput.value, 10);
  const height = parseInt(heightInput.value, 10);
  if (!width && !height) {
    setStatus('Enter a width or height first.', 'error');
    return;
  }

  developBtn.disabled = true;
  setStatus('Developing…');

  const formData = new FormData();
  formData.append('image', currentFile);
  if (width) formData.append('width', width);
  if (height) formData.append('height', height);
  formData.append('keepAspect', aspectLocked);
  formData.append('format', formatSelect.value);
  formData.append('quality', qualityInput.value);

  try {
    const res = await fetch('/resize', { method: 'POST', body: formData });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.error || 'Something went wrong.');
    }
    const blob = await res.blob();
    const outW = res.headers.get('X-Output-Width');
    const outH = res.headers.get('X-Output-Height');

    const url = URL.createObjectURL(blob);
    const ext = blob.type.split('/')[1] || 'jpg';
    const a = document.createElement('a');
    a.href = url;
    a.download = `resized-${outW || width}x${outH || height}.${ext}`;
    document.body.appendChild(a);
    a.click();
    a.remove();

    setStatus(`Done — ${outW}×${outH}px, ${formatBytes(blob.size)}.`, 'ok');
  } catch (err) {
    setStatus(err.message, 'error');
  } finally {
    developBtn.disabled = false;
  }
});
