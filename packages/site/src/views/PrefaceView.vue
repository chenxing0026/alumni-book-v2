<template>
  <div class="preface-page section">
    <div class="container">
      <div class="preface-header fade-in" ref="headerRef">
        <p class="preface-label">· PREFACE ·</p>
        <h1 class="preface-title display-lg">{{ config.preface.title }}</h1>
        <p class="preface-subtitle">{{ config.preface.subtitle }}</p>
      </div>

      <div class="preface-body fade-in" ref="bodyRef">
        <p class="preface-text" v-html="formattedContent"></p>
      </div>

      <hr class="hairline" style="margin: var(--spacing-xxl) 0;" />

      <div class="acknowledgment fade-in" ref="ackRef">
        <h2 class="ack-title display-sm">特别致谢</h2>
        <div class="ack-grid">
          <div
            v-for="(ack, i) in validAcknowledgments"
            :key="i"
            class="ack-person"
          >
            <div class="ack-avatar">
              <img v-if="ack.avatarUrl" :src="ack.avatarUrl" :alt="ack.name" />
              <span v-else class="avatar-placeholder">{{ ack.name.charAt(0) }}</span>
            </div>
            <div class="ack-name title-sm">{{ ack.name }}</div>
            <div class="ack-role">{{ ack.role }}</div>
          </div>
        </div>
      </div>

      <div class="bottom-actions fade-in" ref="actionsRef">
        <router-link to="/album" class="btn-primary">进入班级相册</router-link>
        <router-link to="/roster" class="btn-secondary">进入同学录主页</router-link>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { getSessionName } from '@alumni/shared'
import type { SiteConfig } from '@alumni/shared'
import { getConfig } from '@/api/client'
import { useRouter } from 'vue-router'

const router = useRouter()
const config = ref<SiteConfig>({
  particles: {},
  footer: { copyright: '', beian: '', beianUrl: '' },
  preface: { title: '致青春岁月', subtitle: '写在翻开同学录之前', content: '' },
  acknowledgments: [],
  typography: { fontFamily: 'default', fontSize: 15 },
})

const headerRef = ref<HTMLElement>()
const bodyRef = ref<HTMLElement>()
const ackRef = ref<HTMLElement>()
const actionsRef = ref<HTMLElement>()

const formattedContent = computed(() => {
  return config.value.preface.content.replace(/\n/g, '<br>')
})

const validAcknowledgments = computed(() => {
  return config.value.acknowledgments.filter(a => a.name && a.name.trim())
})

onMounted(async () => {
  if (!getSessionName()) {
    router.replace('/')
    return
  }

  try {
    config.value = await getConfig()
  } catch {
    // 使用默认值
  }

  // 淡入动画
  const els = [headerRef.value, bodyRef.value, ackRef.value, actionsRef.value]
  els.forEach((el, i) => {
    if (el) {
      setTimeout(() => el.classList.add('visible'), 200 + i * 180)
    }
  })
})
</script>

<style scoped>
.preface-page {
  padding-top: calc(var(--nav-height) + var(--spacing-section));
}

.preface-header {
  text-align: center;
  margin-bottom: var(--spacing-xxl);
}

.preface-label {
  font-size: var(--type-caption-uppercase-size);
  font-weight: var(--type-caption-uppercase-weight);
  letter-spacing: var(--type-caption-uppercase-letter-spacing);
  color: var(--color-muted);
  margin-bottom: var(--spacing-md);
}

.preface-subtitle {
  font-family: var(--font-display);
  font-size: 16px;
  color: var(--color-muted);
  letter-spacing: 0.1em;
  margin-top: var(--spacing-sm);
}

.preface-body {
  max-width: 680px;
  margin: 0 auto;
}

.preface-text {
  font-size: 16px;
  color: var(--color-body-strong);
  line-height: 2.2;
  text-indent: 2em;
  text-align: justify;
  padding: var(--spacing-lg);
  background-color: rgba(255, 255, 255, 0.4);
  border-radius: var(--rounded-md);
}

.acknowledgment {
  text-align: center;
}

.ack-title {
  margin-bottom: var(--spacing-xl);
}

.ack-grid {
  display: flex;
  justify-content: center;
  flex-wrap: wrap;
  gap: var(--spacing-xl);
}

.ack-person {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: var(--spacing-xs);
}

.ack-avatar {
  width: 58px;
  height: 58px;
  border-radius: 50%;
  overflow: hidden;
  background: linear-gradient(135deg, var(--color-surface-card), var(--color-surface-cream-strong));
  display: flex;
  align-items: center;
  justify-content: center;
  border: 2px solid var(--color-hairline);
}

.ack-avatar img {
  width: 100%;
  height: 100%;
  object-fit: cover;
}

.avatar-placeholder {
  font-family: var(--font-display);
  font-size: 24px;
  font-weight: 500;
  color: var(--color-muted);
}

.ack-name {
  font-size: var(--type-title-sm-size);
}

.ack-role {
  font-size: var(--type-body-sm-size);
  color: var(--color-muted);
}

.bottom-actions {
  display: flex;
  justify-content: center;
  gap: var(--spacing-md);
  margin-top: var(--spacing-xxl);
  padding-top: var(--spacing-xxl);
  border-top: 1px solid var(--color-hairline);
}

@media (max-width: 768px) {
  .bottom-actions {
    flex-direction: column;
    align-items: center;
  }
}
</style>
