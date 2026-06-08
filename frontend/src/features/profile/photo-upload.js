/**
 * Photo Upload Component — User profile photo management
 */

import { stateManager } from '../../state/state-manager.js';
import logger from '../../platform/logger.js';

export class PhotoUpload {
  constructor(container) {
    this.container = container;
    this.apiUrl = '/api';
    this.maxFileSize = 5 * 1024 * 1024; // 5MB
    this.allowedTypes = ['image/jpeg', 'image/png', 'image/webp', 'image/gif'];
  }

  /**
   * Mount component
   */
  mount(userPhoto = null) {
    this.render(userPhoto);
    this.attachListeners();
  }

  /**
   * Render upload UI
   */
  render(userPhoto) {
    const html = `
      <div class="photo-upload-container">
        <div class="photo-section">
          <!-- Current Photo -->
          <div class="photo-display">
            ${userPhoto ? `
              <img
                src="${userPhoto}"
                alt="Profile Photo"
                class="profile-photo"
                id="profilePhotoDisplay"
              >
              <button class="btn-delete-photo" id="deletePhotoBtn">
                🗑️ Remover Foto
              </button>
            ` : `
              <div class="photo-placeholder">
                <span class="photo-icon">📷</span>
                <p>Sem foto de perfil</p>
              </div>
            `}
          </div>

          <!-- Upload Form -->
          <div class="photo-upload-form">
            <div class="file-input-wrapper">
              <input
                type="file"
                id="photoInput"
                accept="image/jpeg,image/png,image/webp,image/gif"
                style="display: none"
              >
              <button class="btn-upload-photo" id="selectPhotoBtn">
                📤 Escolher Foto
              </button>
            </div>

            <!-- File Info -->
            <div class="file-info" id="fileInfo" style="display: none">
              <p id="fileName"></p>
              <p id="fileSize"></p>
              <div class="progress-bar">
                <div class="progress" id="uploadProgress" style="width: 0%"></div>
              </div>
            </div>

            <!-- Upload Button -->
            <button class="btn-confirm-upload" id="uploadBtn" style="display: none">
              ✅ Fazer Upload
            </button>
          </div>

          <!-- Status Messages -->
          <div class="upload-status" id="uploadStatus"></div>

          <!-- Guidelines -->
          <div class="guidelines">
            <p><strong>Requisitos:</strong></p>
            <ul>
              <li>✅ Formatos: JPG, PNG, WebP, GIF</li>
              <li>✅ Tamanho máximo: 5MB</li>
              <li>✅ Resolução recomendada: 400x400px</li>
              <li>✅ Somente usuários logados</li>
            </ul>
          </div>
        </div>
      </div>

      <style>
        .photo-upload-container {
          max-width: 400px;
          margin: 20px 0;
        }

        .photo-section {
          background: #f8f9fa;
          border-radius: 8px;
          padding: 20px;
        }

        .photo-display {
          text-align: center;
          margin-bottom: 20px;
        }

        .profile-photo {
          width: 150px;
          height: 150px;
          border-radius: 50%;
          object-fit: cover;
          border: 3px solid #007AFF;
          display: block;
          margin: 0 auto 15px;
        }

        .photo-placeholder {
          width: 150px;
          height: 150px;
          margin: 0 auto;
          background: #e0e0e0;
          border-radius: 50%;
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          color: #999;
        }

        .photo-icon {
          font-size: 48px;
          margin-bottom: 10px;
        }

        .btn-delete-photo {
          background: #FF3B30;
          color: white;
          border: none;
          padding: 8px 16px;
          border-radius: 4px;
          cursor: pointer;
          font-size: 14px;
        }

        .btn-delete-photo:hover {
          background: #D32F2F;
        }

        .photo-upload-form {
          margin: 20px 0;
        }

        .file-input-wrapper {
          margin-bottom: 15px;
        }

        .btn-upload-photo,
        .btn-confirm-upload {
          background: #007AFF;
          color: white;
          border: none;
          padding: 10px 20px;
          border-radius: 4px;
          cursor: pointer;
          font-size: 14px;
          width: 100%;
        }

        .btn-upload-photo:hover {
          background: #0051BA;
        }

        .btn-confirm-upload {
          background: #34C759;
        }

        .btn-confirm-upload:hover {
          background: #28A745;
        }

        .file-info {
          background: white;
          padding: 12px;
          border-radius: 4px;
          margin-bottom: 15px;
        }

        .file-info p {
          margin: 5px 0;
          font-size: 12px;
          color: #666;
        }

        .progress-bar {
          width: 100%;
          height: 4px;
          background: #e0e0e0;
          border-radius: 2px;
          overflow: hidden;
          margin-top: 10px;
        }

        .progress {
          height: 100%;
          background: #34C759;
          transition: width 0.3s ease;
        }

        .upload-status {
          padding: 10px;
          border-radius: 4px;
          margin: 10px 0;
          display: none;
        }

        .upload-status.success {
          background: #D4EDDA;
          color: #155724;
          border: 1px solid #C3E6CB;
          display: block;
        }

        .upload-status.error {
          background: #F8D7DA;
          color: #721C24;
          border: 1px solid #F5C6CB;
          display: block;
        }

        .upload-status.loading {
          background: #D1ECF1;
          color: #0C5460;
          border: 1px solid #BEE5EB;
          display: block;
        }

        .guidelines {
          background: white;
          padding: 15px;
          border-radius: 4px;
          font-size: 12px;
          color: #666;
        }

        .guidelines ul {
          margin: 10px 0;
          padding-left: 20px;
        }

        .guidelines li {
          margin: 5px 0;
        }
      </style>
    `;

    this.container.innerHTML = html;
  }

  /**
   * Attach event listeners
   */
  attachListeners() {
    const selectBtn = this.container.querySelector('#selectPhotoBtn');
    const fileInput = this.container.querySelector('#photoInput');
    const uploadBtn = this.container.querySelector('#uploadBtn');
    const deleteBtn = this.container.querySelector('#deletePhotoBtn');

    selectBtn?.addEventListener('click', () => {
      fileInput.click();
    });

    fileInput?.addEventListener('change', (e) => {
      this.onFileSelected(e);
    });

    uploadBtn?.addEventListener('click', () => {
      this.uploadPhoto();
    });

    deleteBtn?.addEventListener('click', () => {
      this.deletePhoto();
    });
  }

  /**
   * Handle file selection
   */
  onFileSelected(event) {
    const file = event.target.files?.[0];

    if (!file) {
      return;
    }

    // Validation
    const validation = this.validateFile(file);
    if (!validation.valid) {
      this.showStatus(validation.error, 'error');
      return;
    }

    // Show file info
    const fileInfo = this.container.querySelector('#fileInfo');
    const fileName = this.container.querySelector('#fileName');
    const fileSize = this.container.querySelector('#fileSize');
    const uploadBtn = this.container.querySelector('#uploadBtn');

    fileName.textContent = `📄 ${file.name}`;
    fileSize.textContent = `💾 ${(file.size / 1024).toFixed(2)} KB`;
    fileInfo.style.display = 'block';
    uploadBtn.style.display = 'block';

    // Store file for upload
    this.selectedFile = file;

    logger.info(`File selected: ${file.name} (${file.size} bytes)`);
  }

  /**
   * Upload photo to server
   */
  async uploadPhoto() {
    if (!this.selectedFile) {
      this.showStatus('Nenhum arquivo selecionado', 'error');
      return;
    }

    const uploadBtn = this.container.querySelector('#uploadBtn');
    const progress = this.container.querySelector('#uploadProgress');

    try {
      uploadBtn.disabled = true;
      this.showStatus('Enviando foto...', 'loading');

      // Create form data
      const formData = new FormData();
      formData.append('photo', this.selectedFile);

      // Get auth token
      const token = stateManager.select(s => s.auth?.token) ||
                   localStorage.getItem('authToken');

      if (!token) {
        throw new Error('Você precisa estar logado para fazer upload');
      }

      // Upload
      const response = await fetch(`${this.apiUrl}/profile/photo`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`
        },
        body: formData
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Falha no upload');
      }

      const result = await response.json();

      if (result.success) {
        // Update profile photo in state
        const profile = stateManager.select(s => s.profile);
        stateManager.dispatch('UPDATE_PROFILE', {
          ...profile,
          photo: result.photo.url
        });

        // Update UI
        progress.style.width = '100%';
        this.showStatus('✅ Foto enviada com sucesso!', 'success');
        this.selectedFile = null;

        // Reset form after delay
        setTimeout(() => {
          this.remountWithNewPhoto(result.photo.url);
        }, 1500);

        logger.info('Photo uploaded successfully');
      } else {
        throw new Error(result.error || 'Erro desconhecido');
      }
    } catch (error) {
      logger.error('Photo upload failed', error);
      this.showStatus(`❌ Erro: ${error.message}`, 'error');
      uploadBtn.disabled = false;
    }
  }

  /**
   * Delete photo
   */
  async deletePhoto() {
    if (!confirm('Tem certeza que deseja remover sua foto de perfil?')) {
      return;
    }

    try {
      const token = stateManager.select(s => s.auth?.token) ||
                   localStorage.getItem('authToken');

      const response = await fetch(`${this.apiUrl}/profile/photo`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Falha ao remover');
      }

      // Update state
      const profile = stateManager.select(s => s.profile);
      stateManager.dispatch('UPDATE_PROFILE', {
        ...profile,
        photo: null
      });

      this.showStatus('✅ Foto removida com sucesso', 'success');
      this.remountWithNewPhoto(null);

      logger.info('Photo deleted successfully');
    } catch (error) {
      logger.error('Photo deletion failed', error);
      this.showStatus(`❌ Erro: ${error.message}`, 'error');
    }
  }

  /**
   * Validate file
   */
  validateFile(file) {
    if (!file) {
      return { valid: false, error: 'Nenhum arquivo selecionado' };
    }

    if (!this.allowedTypes.includes(file.type)) {
      return {
        valid: false,
        error: `Tipo de arquivo inválido. Permitidos: ${this.allowedTypes.join(', ')}`
      };
    }

    if (file.size > this.maxFileSize) {
      return {
        valid: false,
        error: `Arquivo muito grande. Máximo: 5MB (seu arquivo: ${(file.size / 1024 / 1024).toFixed(2)}MB)`
      };
    }

    return { valid: true };
  }

  /**
   * Show status message
   */
  showStatus(message, type) {
    const status = this.container.querySelector('#uploadStatus');

    status.textContent = message;
    status.className = `upload-status ${type}`;

    if (type === 'success' || type === 'error') {
      setTimeout(() => {
        status.className = 'upload-status';
      }, 4000);
    }
  }

  /**
   * Remount component with new photo
   */
  remountWithNewPhoto(photoUrl) {
    this.render(photoUrl);
    this.attachListeners();
  }

  unmount() {
    this.container.innerHTML = '';
  }
}

export default PhotoUpload;
