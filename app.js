const supabaseUrl = 'https://mkrkiawrvnbugzyocxqe.supabase.co'          // ← schimbă cu al tău
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im1rcmtpYXdydm5idWd6eW9jeHFlIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Mzk1NzQ4MDAsImV4cCI6MjA1NTE1MDgwMH0.something'  // ← anon key tău

const supabase = Supabase.createClient(supabaseUrl, supabaseKey)
const BUCKET = 'images'   // schimbă dacă e 'IMAGES' sau alt nume

const gallery = document.getElementById('gallery')
const fileInput = document.getElementById('fileInput')
const modal = document.getElementById('modal')
const modalImg = document.getElementById('modalImg')
const closeModal = document.getElementById('closeModal')
const copyLinkBtn = document.getElementById('copyLink')
const directLink = document.getElementById('directLink')
const deleteFromModal = document.getElementById('deleteFromModal')
const copyFeedback = document.getElementById('copyFeedback')

let currentImageName = null

async function loadImages() {
  gallery.innerHTML = '<p class="loading">Încarc imagini...</p>'

  const { data: files, error } = await supabase.storage
    .from(BUCKET)
    .list('', { limit: 200, sortBy: { column: 'name', order: 'desc' } })

  if (error) {
    gallery.innerHTML = `<p class="error">Eroare: ${error.message}</p>`
    console.error(error)
    return
  }

  gallery.innerHTML = ''

  for (const file of files) {
    if (!file.name) continue

    const { data: { publicUrl } } = supabase.storage
      .from(BUCKET)
      .getPublicUrl(file.name)

    const card = document.createElement('div')
    card.className = 'card'
    card.innerHTML = `<img src="${publicUrl}" alt="${file.name}" loading="lazy">`

    card.onclick = () => openModal(file.name, publicUrl)

    gallery.appendChild(card)
  }
}

function openModal(name, url) {
  currentImageName = name
  modalImg.src = url
  directLink.href = url
  modal.classList.remove('hidden')
  copyFeedback.classList.add('hidden')
}

closeModal.onclick = () => modal.classList.add('hidden')
modal.onclick = (e) => {
  if (e.target === modal) modal.classList.add('hidden')
}

copyLinkBtn.onclick = async () => {
  try {
    await navigator.clipboard.writeText(directLink.href)
    copyFeedback.classList.remove('hidden')
    setTimeout(() => copyFeedback.classList.add('hidden'), 3000)
  } catch (err) {
    alert('Nu am putut copia link-ul :(')
  }
}

deleteFromModal.onclick = async () => {
  if (!currentImageName || !confirm('Sigur ștergi imaginea?')) return

  const { error } = await supabase.storage
    .from(BUCKET)
    .remove([currentImageName])

  if (error) {
    alert('Eroare la ștergere: ' + error.message)
  } else {
    modal.classList.add('hidden')
    loadImages()
  }
}

fileInput.onchange = async (e) => {
  const files = e.target.files
  if (!files.length) return

  for (const file of files) {
    const fileName = `${Date.now()}-${file.name.replace(/\s+/g, '_')}`

    const { error } = await supabase.storage
      .from(BUCKET)
      .upload(fileName, file, {
        cacheControl: '3600',
        upsert: false
      })

    if (error) {
      console.error('Upload error:', error)
      alert(`Eroare upload ${file.name}: ${error.message}`)
    }
  }

  fileInput.value = ''
  loadImages()
}

document.getElementById('cleanAll').onclick = async () => {
  if (!confirm('Ștergi TOATE imaginile din bucket?')) return

  const { data: files } = await supabase.storage.from(BUCKET).list()
  if (!files?.length) return

  const paths = files.map(f => f.name)
  const { error } = await supabase.storage.from(BUCKET).remove(paths)

  if (error) {
    alert('Eroare la clean: ' + error.message)
  } else {
    loadImages()
  }
}

// Pornire
loadImages()
