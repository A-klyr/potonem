// ========================================
// KONFIGURASI SUPABASE
// ========================================
const SUPABASE_URL = "https://gvyhhtpaaahuzfvhvxwp.supabase.co";
const SUPABASE_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imd2eWhodHBhYWFodXpmdmh2eHdwIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjE5MDc1MzksImV4cCI6MjA3NzQ4MzUzOX0.s3_1g5U2rvcWk-auJf73YTA5FpXfYk5lmy_00cHZ52Y";
const BUCKET = "POTO";

// Initialize Supabase Client
const supabase = window.supabase.createClient(SUPABASE_URL, SUPABASE_KEY);

// ========================================
// DOM ELEMENTS
// ========================================
const fileInput = document.getElementById("fileInput");
const uploadArea = document.getElementById("uploadArea");
const uploadBtn = document.getElementById("uploadBtn");
const selectedFile = document.getElementById("selectedFile");
const galleryContainer = document.getElementById("galleryContainer");

// ========================================
// STATE MANAGEMENT
// ========================================
let selectedFileData = null;

// ========================================
// EVENT LISTENERS
// ========================================

// Click to select file
uploadArea.addEventListener("click", () => {
  fileInput.click();
});

// File selected via input
fileInput.addEventListener("change", (e) => {
  const file = e.target.files[0];
  if (file) {
    handleFileSelect(file);
  }
});

// Drag and drop events
uploadArea.addEventListener("dragover", (e) => {
  e.preventDefault();
  uploadArea.classList.add("dragover");
});

uploadArea.addEventListener("dragleave", () => {
  uploadArea.classList.remove("dragover");
});

uploadArea.addEventListener("drop", (e) => {
  e.preventDefault();
  uploadArea.classList.remove("dragover");
  
  const file = e.dataTransfer.files[0];
  if (file && file.type.startsWith("image/")) {
    handleFileSelect(file);
  } else {
    showNotification("⚠️ Hanya file gambar yang diperbolehkan!", "error");
  }
});

// Upload button click
uploadBtn.addEventListener("click", handleUpload);

// ========================================
// FILE HANDLING FUNCTIONS
// ========================================

/**
 * Handle file selection
 * @param {File} file - Selected file
 */
function handleFileSelect(file) {
  selectedFileData = file;
  selectedFile.innerHTML = `📁 ${file.name}`;
  selectedFile.classList.add("show");
  uploadBtn.classList.add("show");
}

/**
 * Handle file upload to Supabase
 */
async function handleUpload() {
  if (!selectedFileData) {
    showNotification("⚠️ Pilih file terlebih dahulu!", "error");
    return;
  }

  // Disable button and show loading
  uploadBtn.disabled = true;
  uploadBtn.textContent = "⏳ Uploading...";
  showNotification("⏳ Sedang mengupload...", "info");

  try {
    // Generate unique filename
    const timestamp = Date.now();
    const fileName = `${timestamp}_${selectedFileData.name}`;

    // Upload to Supabase
    const { data, error } = await supabase.storage
      .from(BUCKET)
      .upload(fileName, selectedFileData);

    if (error) throw error;

    // Success
    showNotification("✅ Foto berhasil diupload!", "success");
    resetUploadForm();
    loadGallery();

  } catch (error) {
    console.error("Upload error:", error);
    showNotification("❌ Upload gagal: " + error.message, "error");
  } finally {
    // Re-enable button
    uploadBtn.disabled = false;
    uploadBtn.textContent = "🚀 Upload Sekarang!";
  }
}

/**
 * Reset upload form
 */
function resetUploadForm() {
  selectedFileData = null;
  fileInput.value = "";
  selectedFile.classList.remove("show");
  uploadBtn.classList.remove("show");
}

// ========================================
// GALLERY FUNCTIONS
// ========================================

/**
 * Load gallery from Supabase
 */
async function loadGallery() {
  // Show loading state
  galleryContainer.innerHTML = '<div class="loading">⏳ Memuat galeri...</div>';

  try {
    // Fetch files from Supabase
    const { data, error } = await supabase.storage
      .from(BUCKET)
      .list('', { 
        limit: 100, 
        sortBy: { column: 'created_at', order: 'desc' } 
      });

    if (error) throw error;

    // Check if gallery is empty
    if (!data || data.length === 0) {
      showEmptyState();
      return;
    }

    // Render gallery
    renderGallery(data);

  } catch (error) {
    console.error("Load gallery error:", error);
    galleryContainer.innerHTML = `
      <div class="empty-state">
        <div class="empty-state-icon">😢</div>
        <div>Gagal memuat galeri: ${error.message}</div>
      </div>
    `;
  }
}

/**
 * Show empty state
 */
function showEmptyState() {
  galleryContainer.innerHTML = `
    <div class="empty-state">
      <div class="empty-state-icon">📷</div>
      <div>Belum ada foto. Upload foto pertama Anda!</div>
    </div>
  `;
}

/**
 * Render gallery with photos
 * @param {Array} files - Array of file objects
 */
function renderGallery(files) {
  const gallery = document.createElement("div");
  gallery.className = "gallery";

  files.forEach((file, index) => {
    // Get public URL
    const { data } = supabase.storage.from(BUCKET).getPublicUrl(file.name);
    const url = data.publicUrl;

    // Create photo card
    const card = createPhotoCard(url, file.name, index);
    gallery.appendChild(card);
  });

  galleryContainer.innerHTML = "";
  galleryContainer.appendChild(gallery);
}

/**
 * Create photo card element
 * @param {string} url - Photo URL
 * @param {string} fileName - File name
 * @param {number} index - Index for animation delay
 * @returns {HTMLElement} Photo card element
 */
function createPhotoCard(url, fileName, index) {
  const card = document.createElement("div");
  card.className = "photo-card";
  card.style.animationDelay = `${index * 0.1}s`;

  card.innerHTML = `
    <img src="${url}" alt="${fileName}" loading="lazy" />
    <div class="photo-overlay">
      <div class="photo-actions">
        <button class="action-btn" data-action="download" data-url="${url}" data-filename="${fileName}" title="Download">💾</button>
        <button class="action-btn" data-action="delete" data-filename="${fileName}" title="Hapus">🗑️</button>
      </div>
    </div>
  `;

  // Add click event for image preview
  const img = card.querySelector("img");
  img.addEventListener("click", () => {
    window.open(url, "_blank");
  });

  // Add click events for action buttons
  const downloadBtn = card.querySelector('[data-action="download"]');
  const deleteBtn = card.querySelector('[data-action="delete"]');

  downloadBtn.addEventListener("click", (e) => {
    e.stopPropagation();
    downloadPhoto(url, fileName);
  });

  deleteBtn.addEventListener("click", (e) => {
    e.stopPropagation();
    deletePhoto(fileName);
  });

  return card;
}

// ========================================
// PHOTO ACTION FUNCTIONS
// ========================================

/**
 * Download photo
 * @param {string} url - Photo URL
 * @param {string} fileName - File name
 */
async function downloadPhoto(url, fileName) {
  try {
    showNotification("⏳ Mendownload...", "info");

    const response = await fetch(url);
    const blob = await response.blob();
    
    const link = document.createElement("a");
    link.href = URL.createObjectURL(blob);
    link.download = fileName;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    
    URL.revokeObjectURL(link.href);
    showNotification("✅ Foto berhasil didownload!", "success");

  } catch (error) {
    console.error("Download error:", error);
    showNotification("❌ Download gagal: " + error.message, "error");
  }
}

/**
 * Delete photo
 * @param {string} fileName - File name to delete
 */
async function deletePhoto(fileName) {
  // Confirm deletion
  if (!confirm(`Yakin ingin menghapus foto "${fileName}"?`)) {
    return;
  }

  try {
    showNotification("⏳ Menghapus...", "info");

    const { error } = await supabase.storage
      .from(BUCKET)
      .remove([fileName]);

    if (error) throw error;

    showNotification("✅ Foto berhasil dihapus!", "success");
    loadGallery();

  } catch (error) {
    console.error("Delete error:", error);
    showNotification("❌ Gagal menghapus: " + error.message, "error");
  }
}

// ========================================
// NOTIFICATION SYSTEM
// ========================================

/**
 * Show notification
 * @param {string} message - Notification message
 * @param {string} type - Notification type (success, error, info)
 */
function showNotification(message, type = "info") {
  // Remove existing notification
  const existing = document.querySelector(".notification");
  if (existing) {
    existing.remove();
  }

  // Create new notification
  const notification = document.createElement("div");
  notification.className = `notification ${type}`;
  notification.textContent = message;
  
  document.body.appendChild(notification);

  // Auto remove after 3 seconds
  setTimeout(() => {
    if (notification.parentElement) {
      notification.remove();
    }
  }, 3000);
}

// ========================================
// INITIALIZATION
// ========================================

/**
 * Initialize app on page load
 */
function init() {
  console.log("🚀 Photo Gallery App initialized");
  loadGallery();
}

// Run initialization when DOM is ready
if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", init);
} else {
  init();
}