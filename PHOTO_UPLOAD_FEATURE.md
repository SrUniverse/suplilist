# 📸 Feature: Upload de Foto de Perfil

## Overview
Feature completa de upload e gerenciamento de foto de perfil para usuários autenticados.

---

## ✅ Implementado

### Backend (Node.js + Express)

#### 1. **Model: User Profile** 
`backend/models/user-profile.js` (95 LOC)
- Schema MongoDB com campo `photo`
- Armazena: URL, publicId, tamanho, tipo MIME, data de upload
- Suporta base64 como fallback
- Índices para performance

#### 2. **Service: Photo Storage**
`backend/services/photo-storage.js` (280 LOC)
- Interface para múltiplos backends: Local, S3, Cloudinary
- Validação de arquivo (tipo, tamanho)
- Upload e delete
- Geração de filename único com timestamp
- Configurável via `PHOTO_STORAGE_TYPE`

#### 3. **Routes: Profile API**
`backend/routes/profile.js` (320 LOC)

**Endpoints:**
```
POST   /api/profile/photo       → Upload foto (multipart/form-data)
DELETE /api/profile/photo       → Remover foto
GET    /api/profile             → Get profile info
PUT    /api/profile             → Update profile (nome, bio, phone)
GET    /api/profile/:userId/photo → Get foto pública (sem auth)
```

**Features:**
- ✅ Autenticação JWT obrigatória para upload
- ✅ Rate limiting (10 uploads/hora)
- ✅ Sanitização de arquivo (tipo + tamanho)
- ✅ Armazenamento em DB com metadata
- ✅ Delete anterior ao upload novo

### Frontend (Vanilla JS)

#### 1. **Component: Photo Upload**
`frontend/src/features/profile/photo-upload.js` (350 LOC)

**Features:**
- Drag & drop support
- File preview (circular)
- Validation: tipo, tamanho (5MB max)
- Progress bar durante upload
- Delete button
- Guidelines com requisitos
- Status messages (sucesso/erro)

**HTML:**
```html
<input type="file" accept="image/*">
<button class="upload">📤 Escolher Foto</button>
<img class="profile-photo" alt="Perfil">
```

#### 2. **Component: Profile Page**
`frontend/src/features/profile/profile-page.js` (200 LOC)

**Sections:**
- 📸 Photo Upload (integrado)
- 👤 Personal Info (name, email, bio, phone)
- ⚙️ Preferences (notifications, frequency)
- 📊 Account Info (created, updated, onboarding status)

---

## 🔐 Segurança

✅ **Autenticação:**
- JWT token obrigatório para upload/delete
- Token verificado em cada request

✅ **Validação:**
- Apenas tipos permitidos: JPEG, PNG, WebP, GIF
- Tamanho máximo: 5MB
- Filename gerado pelo server (previne LFI)

✅ **Rate Limiting:**
- 10 uploads por hora (previne abuse)
- 30 requisições/min para atualizações de perfil

✅ **Data Privacy:**
- Foto anterior deletada ao fazer upload novo
- Foto pública via endpoint sem auth (but URL obfuscado)
- DB encryption recomendado

---

## 💾 Armazenamento

### Opção 1: Local (Padrão)
```
public/uploads/photos/
  └── {userId}_{timestamp}_{random}.jpg
```
Ideal para: Desenvolvimento, testing

### Opção 2: AWS S3
```
s3://{bucket}/photos/{filename}
```
Configure:
```bash
AWS_S3_BUCKET=seu-bucket
AWS_ACCESS_KEY_ID=...
AWS_SECRET_ACCESS_KEY=...
```

### Opção 3: Cloudinary
```
https://res.cloudinary.com/{cloud}/image/upload/...
```
Configure:
```bash
CLOUDINARY_CLOUD_NAME=...
CLOUDINARY_API_KEY=...
CLOUDINARY_API_SECRET=...
```

---

## 📋 API Endpoints

### Upload Foto
```bash
curl -X POST http://localhost:3000/api/profile/photo \
  -H "Authorization: Bearer {token}" \
  -F "photo=@profile.jpg"

# Response:
{
  "success": true,
  "photo": {
    "url": "/uploads/photos/user123_1717686332_a1b2c3d4.jpg",
    "uploadedAt": "2026-06-06T15:45:32.123Z",
    "size": "2.45 MB",
    "mimetype": "image/jpeg"
  }
}
```

### Get Profile
```bash
curl -X GET http://localhost:3000/api/profile \
  -H "Authorization: Bearer {token}"

# Response:
{
  "success": true,
  "profile": {
    "id": "...",
    "name": "João Silva",
    "email": "joao@example.com",
    "photo": "/uploads/photos/user123_1717686332_a1b2c3d4.jpg",
    "bio": "Apaixonado por saúde",
    "phone": "+55 11 99999-9999",
    "onboardingComplete": true,
    "preferences": {
      "emailNotifications": true,
      "pushNotifications": true,
      "reportFrequency": "monthly"
    }
  }
}
```

### Delete Foto
```bash
curl -X DELETE http://localhost:3000/api/profile/photo \
  -H "Authorization: Bearer {token}"

# Response:
{
  "success": true,
  "message": "Photo deleted successfully"
}
```

### Update Profile
```bash
curl -X PUT http://localhost:3000/api/profile \
  -H "Authorization: Bearer {token}" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "João da Silva",
    "bio": "Fitness lover",
    "phone": "+55 11 99999-9999"
  }'

# Response:
{
  "success": true,
  "profile": {
    "name": "João da Silva",
    "bio": "Fitness lover",
    "phone": "+55 11 99999-9999",
    "photo": "/uploads/photos/..."
  }
}
```

---

## 🧪 Testes

### Testes a implementar:
```javascript
// backend/routes/profile.test.js
✅ POST /api/profile/photo
   - Upload válido
   - Arquivo muito grande
   - Tipo inválido
   - Rate limit exceeded
   - Sem autenticação

✅ DELETE /api/profile/photo
   - Delete com sucesso
   - Sem foto para deletar
   - Sem autenticação

✅ PUT /api/profile
   - Update nome, bio, phone
   - Validação de tamanho
   - Sem autenticação

✅ GET /api/profile
   - Get profile com sucesso
   - Sem autenticação → erro
```

---

## 📱 Frontend Integration

### Usage:
```javascript
import { PhotoUpload, ProfilePage } from '../features/profile/index.js';

// Mount photo upload component
const photoContainer = document.getElementById('photoSection');
const photoUpload = new PhotoUpload(photoContainer);
photoUpload.mount(userPhoto);

// Mount full profile page
const profileContainer = document.getElementById('profileSection');
const profilePage = new ProfilePage(profileContainer);
profilePage.mount();

// Update on photo change
window.addEventListener('photo-updated', (event) => {
  console.log('Photo updated:', event.detail.photoUrl);
});
```

---

## 🚀 Deployment

### Environment Variables
```bash
# .env.production
PHOTO_STORAGE_TYPE=s3  # or 'cloudinary' or 'local'
AWS_S3_BUCKET=my-bucket
REACT_APP_API_URL=https://api.suplilist.app
```

### Directories (Local Storage)
```bash
mkdir -p public/uploads/photos
chmod 755 public/uploads/photos
```

### Database Setup
```bash
# Ensure UserProfile collection exists
db.user_profiles.createIndex({ userId: 1 })
```

---

## 📊 Database Schema

```javascript
{
  _id: ObjectId,
  userId: ObjectId,           // reference to User
  email: String,              // cached email
  name: String,               // required
  photo: {
    url: String,              // /uploads/photos/... or https://...
    publicId: String,         // filename or cloudinary ID
    uploadedAt: Date,         // when uploaded
    size: Number,             // bytes
    mimetype: String          // image/jpeg, etc
  },
  bio: String,                // optional, max 500
  phone: String,              // optional
  preferences: {
    emailNotifications: Boolean,
    pushNotifications: Boolean,
    reportFrequency: 'daily'|'weekly'|'monthly'
  },
  createdAt: Date,            // profile creation
  updatedAt: Date             // last update
}
```

---

## ✨ Funcionalidades Futuras

- 🎨 Image cropping before upload
- 🌅 Automatic thumbnail generation
- 🖼️ Gallery of past photos
- 📐 Avatar generator (default)
- 🔗 Social media profile pictures sync
- 📊 Photo analytics (views, clicks)

---

## 📝 Testing Checklist

- [ ] Upload válido (JPG, PNG, WebP, GIF)
- [ ] Reject arquivo > 5MB
- [ ] Reject tipo inválido
- [ ] Rate limit funciona
- [ ] Photo anterior deletada ao upload novo
- [ ] Foto apareça no perfil
- [ ] Endpoint público sem auth
- [ ] Cleanup ao delete
- [ ] Permissões de arquivo OK
- [ ] DB entry criada corretamente

---

## 🎯 Status

**Backend**: ✅ COMPLETO  
**Frontend**: ⚠️ Estrutura pronta, needs final polish  
**Tests**: ⏳ Pronto para implementar  
**Docs**: ✅ COMPLETO  

**Ready for**: Development & Testing

---

**Last Updated**: 2026-06-06  
**Estimated Implementation Time**: 2-3 hours  
**Complexity**: Medium
