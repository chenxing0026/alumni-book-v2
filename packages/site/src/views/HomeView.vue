<template>
  <div class="home-page">
    <section class="hero-band">
      <div class="hero-inner container">
        <div class="hero-content">
          <p class="hero-label">· CLASS OF MEMORIES ·</p>
          <h1 class="hero-title display-xl">时光荏苒<br>很高兴再次见到你</h1>
          <p class="hero-subtitle">每一段岁月都值得被铭记，让我们一起打开那本尘封的同学录</p>
          <div class="hero-form">
            <div class="input-group">
              <input
                v-model="name"
                type="text"
                class="text-input hero-input"
                placeholder="请输入你的真实姓名"
                maxlength="20"
                autocomplete="off"
                @keydown.enter="handleEnter"
              />
              <p v-if="error" class="error-text">{{ error }}</p>
            </div>
            <button class="btn-primary hero-btn" @click="handleEnter" :disabled="loading">
              {{ loading ? '验证中...' : '开启回忆' }}
            </button>
          </div>
        </div>
      </div>
    </section>
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue'
import { useRouter } from 'vue-router'
import { setSessionName } from '@alumni/shared'
import { getClassmates } from '@/api/client'

const router = useRouter()
const name = ref('')
const error = ref('')
const loading = ref(false)

async function handleEnter() {
  const trimmed = name.value.trim()
  error.value = ''

  if (!trimmed) {
    error.value = '请输入你的姓名'
    return
  }

  loading.value = true
  try {
    const classmates = await getClassmates()
    const found = classmates.find(c => c.name === trimmed)
    if (!found) {
      error.value = '姓名未在同学录中找到，请确认后重试'
      return
    }
    setSessionName(trimmed)
    router.push('/preface')
  } catch {
    error.value = '验证失败，请稍后重试'
  } finally {
    loading.value = false
  }
}
</script>

<style scoped>
.home-page {
  min-height: 100vh;
  display: flex;
  align-items: center;
  padding-top: var(--nav-height);
}

.hero-band {
  width: 100%;
  padding: var(--spacing-section) 0;
}

.hero-inner {
  max-width: 640px;
  text-align: center;
}

.hero-content {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: var(--spacing-lg);
}

.hero-label {
  font-family: var(--font-body);
  font-size: var(--type-caption-uppercase-size);
  font-weight: var(--type-caption-uppercase-weight);
  letter-spacing: var(--type-caption-uppercase-letter-spacing);
  color: var(--color-muted);
}

.hero-title {
  font-size: var(--type-display-xl-size);
}

.hero-subtitle {
  font-family: var(--font-display);
  font-size: 18px;
  color: var(--color-muted);
  letter-spacing: 0.05em;
  max-width: 480px;
  line-height: 1.8;
}

.hero-form {
  width: 100%;
  max-width: 400px;
  display: flex;
  flex-direction: column;
  gap: var(--spacing-md);
  margin-top: var(--spacing-lg);
}

.input-group {
  display: flex;
  flex-direction: column;
  gap: var(--spacing-xs);
}

.hero-input {
  text-align: center;
  font-size: 16px;
  height: 48px;
}

.hero-btn {
  height: 48px;
  font-size: 16px;
  letter-spacing: 0.15em;
}

.error-text {
  font-size: var(--type-body-sm-size);
  color: var(--color-error);
  text-align: center;
}

@media (max-width: 768px) {
  .hero-title {
    font-size: 32px;
  }

  .hero-subtitle {
    font-size: 15px;
  }
}
</style>
