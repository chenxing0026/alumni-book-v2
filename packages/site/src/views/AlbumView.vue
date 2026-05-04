<template>
  <div class="album-page section">
    <div class="container">
      <div class="album-header fade-in" ref="headerRef">
        <p class="album-label">· CLASS ALBUM ·</p>
        <h1 class="album-title display-lg">我们的时光</h1>
        <p class="album-subtitle">每一张照片，都是一段珍贵的回忆</p>
      </div>

      <div v-if="albums.length === 0" class="empty-state">
        <div class="empty-icon">📷</div>
        <p>暂无照片</p>
        <p>请前往管理后台上传</p>
      </div>

      <div v-for="album in albums" :key="album.id" class="album-section fade-in">
        <h2 class="album-name title-lg">{{ album.title }}</h2>
        <p v-if="album.description" class="album-desc">{{ album.description }}</p>

        <div class="photo-grid" :class="'frame-' + album.frameStyle">
          <div
            v-for="(photo, i) in album.photos"
            :key="photo.id"
            class="photo-item"
            @click="openLightbox(album.photos, i)"
          >
            <img :src="getPhotoUrl(photo.r2Key)" :alt="photo.caption" loading="lazy" />
            <div v-if="photo.caption" class="photo-caption">{{ photo.caption }}</div>
          </div>
        </div>
      </div>
    </div>

    <!-- 灯箱 -->
    <Teleport to="body">
      <div v-if="lightbox.open" class="lightbox" @click.self="closeLightbox">
        <button class="lightbox-close" @click="closeLightbox">✕</button>
        <button v-if="lightbox.index > 0" class="lightbox-nav prev" @click="prevPhoto">‹</button>
        <img :src="getPhotoUrl(lightbox.photos[lightbox.index]?.r2Key)" class="lightbox-img" />
        <button v-if="lightbox.index < lightbox.photos.length - 1" class="lightbox-nav next" @click="nextPhoto">›</button>
        <div class="lightbox-caption">{{ lightbox.photos[lightbox.index]?.caption }}</div>
        <div class="lightbox-counter">{{ lightbox.index + 1 }} / {{ lightbox.photos.length }}</div>
      </div>
    </Teleport>
  </div>
</template>

<script setup lang="ts">
import { ref, reactive, onMounted, onUnmounted } from 'vue'
import { getSessionName } from '@alumni/shared'
import type { Album, Photo } from '@alumni/shared'
import { getAlbums } from '@/api/client'
import { useRouter } from 'vue-router'

const router = useRouter()
const albums = ref<Album[]>([])
const headerRef = ref<HTMLElement>()

const lightbox = reactive({
  open: false,
  photos: [] as Photo[],
  index: 0,
})

const API_BASE = import.meta.env.VITE_API_BASE_URL || ''

function getPhotoUrl(r2Key: string): string {
  if (r2Key.startsWith('http')) return r2Key
  return `${API_BASE}/api/files/${r2Key}`
}

function openLightbox(photos: Photo[], index: number) {
  lightbox.photos = photos
  lightbox.index = index
  lightbox.open = true
  document.body.style.overflow = 'hidden'
}

function closeLightbox() {
  lightbox.open = false
  document.body.style.overflow = ''
}

function prevPhoto() {
  if (lightbox.index > 0) lightbox.index--
}

function nextPhoto() {
  if (lightbox.index < lightbox.photos.length - 1) lightbox.index++
}

function handleKeydown(e: KeyboardEvent) {
  if (!lightbox.open) return
  if (e.key === 'Escape') closeLightbox()
  if (e.key === 'ArrowLeft') prevPhoto()
  if (e.key === 'ArrowRight') nextPhoto()
}

onMounted(async () => {
  if (!getSessionName()) {
    router.replace('/')
    return
  }

  try {
    albums.value = await getAlbums()
  } catch {
    albums.value = []
  }

  if (headerRef.value) {
    setTimeout(() => headerRef.value!.classList.add('visible'), 200)
  }

  setTimeout(() => {
    document.querySelectorAll('.album-section').forEach((el, i) => {
      setTimeout(() => el.classList.add('visible'), 400 + i * 200)
    })
  }, 500)

  document.addEventListener('keydown', handleKeydown)
})

onUnmounted(() => {
  document.removeEventListener('keydown', handleKeydown)
})
</script>

<style scoped>
.album-page {
  padding-top: calc(var(--nav-height) + var(--spacing-section));
}

.album-header {
  text-align: center;
  margin-bottom: var(--spacing-xl);
}

.album-label {
  font-size: var(--type-caption-uppercase-size);
  font-weight: var(--type-caption-uppercase-weight);
  letter-spacing: var(--type-caption-uppercase-letter-spacing);
  color: var(--color-muted);
  margin-bottom: var(--spacing-md);
}

.album-subtitle {
  font-size: var(--type-body-sm-size);
  color: var(--color-muted);
  margin-top: var(--spacing-sm);
}

.album-section {
  margin-bottom: var(--spacing-section);
}

.album-name {
  margin-bottom: var(--spacing-xs);
}

.album-desc {
  font-size: var(--type-body-sm-size);
  color: var(--color-muted);
  margin-bottom: var(--spacing-lg);
}

.photo-grid {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: var(--spacing-sm);
}

.photo-item {
  position: relative;
  aspect-ratio: 1;
  border-radius: var(--rounded-sm);
  overflow: hidden;
  cursor: pointer;
  transition: transform 0.2s ease, box-shadow 0.2s ease;
}

.photo-item:hover {
  transform: translateY(-3px);
  box-shadow: 0 8px 24px rgba(80, 40, 10, 0.15);
}

.photo-item img {
  width: 100%;
  height: 100%;
  object-fit: cover;
}

.photo-caption {
  position: absolute;
  bottom: 0;
  left: 0;
  right: 0;
  padding: 6px 10px;
  background: linear-gradient(to top, rgba(0, 0, 0, 0.5), transparent);
  color: var(--color-on-dark);
  font-size: var(--type-caption-size);
  opacity: 0;
  transition: opacity 0.2s ease;
}

.photo-item:hover .photo-caption {
  opacity: 1;
}

/* 相框样式 */
.frame-retro .photo-item {
  border: 6px solid #e8d5a8;
  box-shadow: 0 0 0 2px #b8903a;
  border-radius: 2px;
}

.frame-film .photo-item {
  border: 5px solid #1c1c1c;
  box-shadow: inset 0 0 0 2px #2e2e2e;
  border-radius: 2px;
}

.frame-polaroid .photo-item {
  border: 8px solid #fff;
  border-bottom: 32px solid #fff;
  box-shadow: 0 2px 14px rgba(0, 0, 0, 0.12);
  border-radius: 1px;
}

/* 灯箱 */
.lightbox {
  position: fixed;
  inset: 0;
  z-index: 200;
  background: rgba(0, 0, 0, 0.92);
  display: flex;
  align-items: center;
  justify-content: center;
}

.lightbox-close {
  position: absolute;
  top: 20px;
  right: 24px;
  color: rgba(240, 210, 150, 0.6);
  font-size: 28px;
  background: none;
  border: none;
  cursor: pointer;
}

.lightbox-close:hover {
  color: var(--color-on-dark);
}

.lightbox-img {
  max-width: 90vw;
  max-height: 85vh;
  border-radius: 2px;
  box-shadow: 0 10px 60px rgba(0, 0, 0, 0.5);
}

.lightbox-nav {
  position: absolute;
  top: 50%;
  transform: translateY(-50%);
  color: rgba(240, 210, 150, 0.5);
  font-size: 36px;
  background: rgba(0, 0, 0, 0.3);
  border: none;
  border-radius: 50%;
  width: 48px;
  height: 48px;
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
}

.lightbox-nav:hover {
  background: rgba(0, 0, 0, 0.6);
  color: var(--color-on-dark);
}

.lightbox-nav.prev {
  left: 16px;
}

.lightbox-nav.next {
  right: 16px;
}

.lightbox-caption {
  position: absolute;
  bottom: 28px;
  left: 50%;
  transform: translateX(-50%);
  color: rgba(240, 210, 150, 0.7);
  font-size: var(--type-body-sm-size);
  letter-spacing: 0.1em;
}

.lightbox-counter {
  position: absolute;
  top: 20px;
  left: 50%;
  transform: translateX(-50%);
  color: rgba(240, 210, 150, 0.4);
  font-size: var(--type-caption-size);
}

.empty-state {
  text-align: center;
  padding: 80px 20px;
  color: var(--color-muted);
}

.empty-icon {
  font-size: 48px;
  margin-bottom: var(--spacing-md);
  opacity: 0.3;
}

@media (max-width: 768px) {
  .photo-grid {
    grid-template-columns: repeat(2, 1fr);
  }
}
</style>
