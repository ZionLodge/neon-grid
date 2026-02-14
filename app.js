document.addEventListener("DOMContentLoaded", () => {

  const SUPABASE_URL = "https://mkrkiawrvnbugzyocxqe.supabase.co";
  const SUPABASE_KEY = "sb_publishable_Fep-b-ylEk5mSI1kiaR6bQ_f2qBVR_t";

  const supabase = window.supabase.createClient(
    SUPABASE_URL,
    SUPABASE_KEY
  );

  const grid = document.getElementById("grid");
  const fileInput = document.getElementById("fileInput");

  const addBtn = document.getElementById("addBtn");
  const deleteBtn = document.getElementById("deleteBtn");
  const downloadBtn = document.getElementById("downloadBtn");
  const resetBtn = document.getElementById("resetBtn");

  let images = [];
  let selected = new Set();

  function render() {
    grid.innerHTML = "";
    images.forEach(img => {
      const slot = document.createElement("div");
      slot.className = "slot";
      if (selected.has(img.name)) slot.classList.add("selected");

      const image = document.createElement("img");
      image.src = img.url;

      slot.onclick = () => {
        if (selected.has(img.name)) {
          selected.delete(img.name);
        } else {
          selected.add(img.name);
        }
        render();
      };

      slot.appendChild(image);
      grid.appendChild(slot);
    });
  }

  async function loadImages() {
    const { data, error } = await supabase
      .storage
      .from("images")
      .list("", { limit: 100 });

    if (error) {
      console.error(error);
      return;
    }

    images = data.map(file => ({
      name: file.name,
      url: supabase
        .storage
        .from("images")
        .getPublicUrl(file.name).data.publicUrl
    }));

    render();
  }

  addBtn.onclick = () => fileInput.click();

  fileInput.onchange = async () => {
    for (const file of fileInput.files) {
      const name = `${Date.now()}-${file.name}`;

      await supabase
        .storage
        .from("images")
        .upload(name, file, { upsert: false });
    }
    fileInput.value = "";
    loadImages();
  };

  deleteBtn.onclick = async () => {
    if (selected.size === 0) return;

    await supabase
      .storage
      .from("images")
      .remove([...selected]);

    selected.clear();
    loadImages();
  };

  resetBtn.onclick = async () => {
    const names = images.map(i => i.name);
    await supabase.storage.from("images").remove(names);
    selected.clear();
    loadImages();
  };

  downloadBtn.onclick = async () => {
    if (selected.size === 0) return;

    const zip = new JSZip();
    const folder = zip.folder("neon-grid");

    for (const img of images) {
      if (!selected.has(img.name)) continue;
      const res = await fetch(img.url);
      const blob = await res.blob();
      folder.file(img.name, blob);
    }

    const content = await zip.generateAsync({ type: "blob" });
    const a = document.createElement("a");
    a.href = URL.createObjectURL(content);
    a.download = "gallery.zip";
    a.click();
  };

  loadImages();
});
