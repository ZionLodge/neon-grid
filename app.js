const supabaseUrl = 'https://mkrkiawrvnbugzyocxqe.supabase.co';
const supabaseKey = 'sb_publishable_Fep-b-ylEk5mSI1kiaR6bQ_f2qBVR_t';

const supabase = Supabase.createClient(supabaseUrl, supabaseKey);
const BUCKET = 'images';  // confirmă în dashboard că este exact 'images' (lowercase)

const gallery = document.getElementById('gallery');
const fileInput = document.getElementById('fileInput');
const modal = document.getElementById('modal');
const modalImg = document.getElementById('modalImg');
const closeModal = document.getElementById('closeModal');
const copyLinkBtn = document.getElementById('copyLink');
const directLink = document.getElementById('directLink');
const deleteFromModal = document.getElementById('deleteFromModal');
const copyFeedback = document.getElementById('copyFeedback');

let currentImageName = null;

async function loadImages() {
  gallery.innerHTML = '<p class="loading">Încarc imagini...</p>';

  try {
    // Încercare normală
    let { data: files, error } = await supabase.storage
      .from(BUCKET)
      .list('', { limit: 200, sortBy: { column: 'name', order: 'desc' } });

    if (error) throw error;

    // Dacă lista e goală, așteptăm puțin și încercăm din nou (pentru propagare delay)
    if (!files || files.length === 0) {
      console.log('Lista goală la prima încercare → retry după 2 secunde...');
      await new Promise(resolve => setTimeout(resolve, 2000));
      const retry = await supabase.storage
        .from(BUCKET)
        .list('', { limit: 200, sortBy: { column: 'name', order: 'desc' } });
      files = retry.data || [];
    }

    gallery.innerHTML = '';

    if (files.length === 0) {
      gallery.innerHTML = '<p>Nicio imagine găsită în bucket.</p>';
      return;
    }

    for (const file of files) {
      if (!file.name) continue;

      const { data: { publicUrl } } = supabase.storage
        .from(BUCKET)
        .getPublicUrl(file.name);

      const card = document.createElement('div');
      card.className = 'card';
      card.innerHTML = `<img src="${publicUrl}" alt="${file.name}" loading="lazy">`;

      card.onclick = () => openModal(file.name, publicUrl);

      gallery.appendChild(card);
    }
  } catch (err) {
    console.error('Eroare la încărcarea imaginilor:', err);
    gallery.innerHTML = `<p>Eroare: ${err.message || 'Necunoscută'}</p>`;
  }
}

function openModal(name, url) {
  currentImageName = name;
  modalImg.src = url;
  directLink.href = url;
  modal.classList.remove('hidden');
  copyFeedback.classList.add('hidden');
}

closeModal.onclick = () => modal.classList.add('hidden');

modal.onclick = (e) => {
  if (e.target === modal) modal.classList.add('hidden');
};

copyLinkBtn.onclick = async () => {
  try {
    await navigator.clipboard.writeText(directLink.href);
    copyFeedback.classList.remove('hidden');
    setTimeout(() => copyFeedback.classList.add('hidden'), 3000);
  } catch (err) {
    alert('Nu am putut copia link-ul :(');
    console.error('Clipboard error:', err);
  }
};

deleteFromModal.onclick = async () => {
  if (!currentImageName || !confirm('Sigur ștergi imaginea?')) return;

  const { error } = await supabase.storage
    .from(BUCKET)
    .remove([currentImageName]);

  if (error) {
    alert('Eroare la ștergere: ' + error.message);
    console.error('Delete error:', error);
  } else {
    modal.classList.add('hidden');
    loadImages();
  }
};

fileInput.onchange = async (e) => {
  const files = e.target.files;
  if (!files.length) return;

  for (const file of files) {
    const fileName = `${Date.now()}-${file.name.replace(/\s+/g, '_')}`;

    try {
      const { data, error } = await supabase.storage
        .from(BUCKET)
        .upload(fileName, file, {
          cacheControl: '3600',
          upsert: false
        });

      if (error) {
        console.error('Upload error pentru', file.name, ':', error);
        alert(`Eroare upload ${file.name}: ${error.message}`);
      } else {
        console.log('Upload reușit:', fileName);
      }
    } catch (err) {
      console.error('Excepție upload:', err);
    }
  }

  fileInput.value = '';
  await loadImages();  // reîncarcă grid-ul după upload
};

document.getElementById('cleanAll').onclick = async () => {
  if (!confirm('Ștergi TOATE imaginile din bucket?')) return;

  try {
    const { data: files } = await supabase.storage.from(BUCKET).list();
    if (!files?.length) {
      alert('Nicio imagine de șters.');
      return;
    }

    const paths = files.map(f => f.name);
    const { error } = await supabase.storage.from(BUCKET).remove(paths);

    if (error) {
      alert('Eroare la clean: ' + error.message);
      console.error('Clean error:', error);
    } else {
      alert('Toate imaginile au fost șterse.');
      loadImages();
    }
  } catch (err) {
    console.error('Excepție clean:', err);
  }
};

// Pornire inițială + debug log
console.log('Supabase client inițializat. Bucket:', BUCKET);
loadImages();
