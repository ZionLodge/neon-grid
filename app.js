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

  const preview = document.getElementById("preview");
  const previewImg = document.getElementById("previewImg");

  let images = [];
  let selected = new Set();
  let dragSrc = null;

  function render() {
    grid.innerHTML = "";

    images.forEach((img, index) => {
      const slot = document.createElement("div");
      slot.className = "slot";
      slot.draggable = true;

      if (selected.has(img.name)) slot.classList.add("selected");

      const image = document.createElement("img");
      image.src = img.url;

      image.ondblclick = () => {
        previewImg.src = img.url;
        preview.classList.remove("hidden");
      };

      slot.onclick = () => {
        selected.has(img.name)
          ? selected.delete(img.name)
          : selected.add(img.name);
        render();
      };

      /* Drag & Drop */
      slot.ondragstart = () => dragSrc = index;
      slot.ondragover = e => e.preventDefault();
      slot.ondrop = () => {
        const temp = images[dragSrc];
        images[dragSrc] = images[index];
        images[index] = temp;
        render();
      };

      slot.appendChild(image);
      grid.appendChild(slot);
    });
  }

  preview.onclick = () => preview.classList.add("hidden");

  async function loadImages() {
    const { data } = await supabase
      .storage
      .from("images")
      .list("", { limit: 100 });

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
      await supabase.storage.from("images").upload(name, file);
    }
    fileInput.value = "";
    loadImages();
  };

  deleteBtn.onclick = async () => {
    if (!selected.size) return;
    await supabase.storage.from("images").remove([...selected]);
    selected.clear();
    loadImages();
  };

  resetBtn.onclick = async () => {
    await supabase.storage.from("images").remove(images.map(i => i.name));
    selected.clear();
    loadImages();
  };

  downloadBtn.onclick = async () => {
    if (!selected.size) return;

    const zip = new JSZip();
    const folder = zip.folder("neon-grid");

    for (const img of images) {
      if (!selected.has(img.name)) continue;
      const res = await fetch(img.url);
      folder.file(img.name, await res.blob());
    }

    const blob = await zip.generateAsync({ type: "blob" });
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = "gallery.zip";
    a.click();
  };

  loadImages();
});
