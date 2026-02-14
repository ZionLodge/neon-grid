const supabaseUrl = 'https://mkrkiawrvnbugzyocxqe.supabase.co';
const supabaseKey = 'sb_publishable_Fep-b-ylEk5mSI1kiaR6bQ_f2qBVR_t';

// Folosește global-ul 'supabase' din CDN (lowercase!)
const supabase = supabase.createClient(supabaseUrl, supabaseKey);

const BUCKET = 'images';  // confirmă exact numele în dashboard

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
    let { data: files, error } = await supabase.storage
      .from(BUCKET)
      .list('', { limit: 200, sortBy: { column: 'name', order: 'desc' } });

    if (error) throw error;

    // Retry mic pentru delay propagare policy/list
    if (!files || files.length === 0) {
      console.log('Lista goală → retry după 2s...');
      await new Promise(r => setTimeout(r, 2000));
      const retryRes = await supabase.storage.from(BUCKET).list('', { limit: 200, sortBy: { column: 'name', order: 'desc' } });
      files = retryRes.data || [];
    }

    gallery.innerHTML = '';

    if (files.length === 0) {
      gallery.innerHTML = '<p>Nicio imagine găsită.</p>';
      return;
    }

    files.forEach(file => {
      if (!file.name) return;

      const { data: { publicUrl } } = supabase.storage.from(BUCKET).getPublicUrl(file.name);

      const card = document.createElement('div');
      card.className = 'card';
      card.innerHTML = `<img src="${publicUrl}" alt="${file.name}" loading="lazy">`;

      card.onclick = () => openModal(file.name, publicUrl);

      gallery.appendChild(card);
    });
  } catch (err) {
    console.error('Eroare loadImages:', err);
    gallery.innerHTML = `<p>Eroare: ${err.message || 'Necunoscută'}</p>`;
  }
}

// Restul funcțiilor rămân la fel, dar cu 'supabase' lowercase peste tot
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
    alert('Nu am putut copia :(');
  }
};

deleteFromModal.onclick = async () => {
  if (!currentImageName || !confirm('Ștergi?')) return;

  const { error } = await supabase.storage.from(BUCKET).remove([currentImageName]);

  if (error) {
    alert('Eroare ștergere: ' + error.message);
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

    const { error } = await supabase.storage
      .from(BUCKET)
      .upload(fileName, file, { cacheControl: '3600', upsert: false });

    if (error) {
      console.error('Upload error:', error);
      alert(`Eroare upload: ${error.message}`);
    } else {
      console.log('Upload ok:', fileName);
    }
  }

  fileInput.value = '';
  loadImages();  // refresh grid
};

document.getElementById('cleanAll').onclick = async () => {
  if (!confirm('Ștergi TOT?')) return;

  const { data: files } = await supabase.storage.from(BUCKET).list();
  if (!files?.length) return;

  const paths = files.map(f => f.name);
  const { error } = await supabase.storage.from(BUCKET).remove(paths);

  if (error) {
    alert('Eroare clean: ' + error.message);
  } else {
    loadImages();
  }
};

// Pornire + log debug
console.log('Supabase client creat cu succes. Bucket:', BUCKET);
loadImages();
