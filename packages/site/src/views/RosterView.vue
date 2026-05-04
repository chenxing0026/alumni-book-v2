<template>
  <div class="roster-page section">
    <div class="container">
      <div class="roster-header fade-in" ref="headerRef">
        <p class="roster-label">· CLASSMATE ROSTER ·</p>
        <h1 class="roster-title display-lg">我们的同学</h1>
        <p class="roster-subtitle">点击同学头像，进入 TA 的专属主页</p>
      </div>

      <div class="search-box fade-in" ref="searchRef">
        <input
          v-model="keyword"
          type="text"
          class="text-input search-input"
          placeholder="搜索同学姓名…"
          autocomplete="off"
          @input="doSearch"
        />
        <p v-if="keyword" class="search-count">找到 {{ filtered.length }} 位同学</p>
      </div>

      <div class="classmate-grid">
        <router-link
          v-for="mate in filtered"
          :key="mate.slug"
          :to="mate.hasPage ? `/student/${mate.slug}` : '#'"
          class="classmate-card fade-in"
          :class="{ 'no-page': !mate.hasPage }"
        >
          <div class="card-avatar">
            <img v-if="mate.avatarUrl" :src="mate.avatarUrl" :alt="mate.name" />
            <span v-else class="avatar-char">{{ mate.name.charAt(0) }}</span>
          </div>
          <div class="card-name title-sm">{{ mate.name }}</div>
          <div class="card-motto">{{ mate.hasPage ? (mate.motto || '点击查看 TA 的故事') : '页面待建' }}</div>
        </router-link>
      </div>

      <div v-if="keyword && filtered.length === 0" class="no-result">
        <p>未找到匹配的同学</p>
        <p>请尝试其他关键词</p>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { getSessionName } from '@alumni/shared'
import type { ClassmateEntry } from '@alumni/shared'
import { getClassmates } from '@/api/client'
import { useRouter } from 'vue-router'

const router = useRouter()
const classmates = ref<ClassmateEntry[]>([])
const keyword = ref('')
const headerRef = ref<HTMLElement>()
const searchRef = ref<HTMLElement>()

const filtered = computed(() => {
  const kw = keyword.value.trim().toLowerCase()
  if (!kw) return classmates.value
  return classmates.value.filter(c => c.name.toLowerCase().includes(kw))
})

function doSearch() {
  // 由 computed 自动处理
}

onMounted(async () => {
  if (!getSessionName()) {
    router.replace('/')
    return
  }

  try {
    classmates.value = await getClassmates()
  } catch {
    classmates.value = []
  }

  // 淡入动画
  ;[headerRef.value, searchRef.value].forEach((el, i) => {
    if (el) setTimeout(() => el.classList.add('visible'), 200 + i * 150)
  })

  // 卡片交错淡入
  setTimeout(() => {
    document.querySelectorAll('.classmate-card').forEach((el, i) => {
      setTimeout(() => el.classList.add('visible'), 360 + i * 55)
    })
  }, 500)
})
</script>

<style scoped>
.roster-page {
  padding-top: calc(var(--nav-height) + var(--spacing-section));
}

.roster-header {
  text-align: center;
  margin-bottom: var(--spacing-xl);
}

.roster-label {
  font-size: var(--type-caption-uppercase-size);
  font-weight: var(--type-caption-uppercase-weight);
  letter-spacing: var(--type-caption-uppercase-letter-spacing);
  color: var(--color-muted);
  margin-bottom: var(--spacing-md);
}

.roster-subtitle {
  font-size: var(--type-body-sm-size);
  color: var(--color-muted);
  margin-top: var(--spacing-sm);
}

.search-box {
  max-width: 480px;
  margin: 0 auto var(--spacing-xl);
  text-align: center;
}

.search-input {
  text-align: center;
}

.search-count {
  margin-top: var(--spacing-xs);
  font-size: var(--type-body-sm-size);
  color: var(--color-muted);
}

.classmate-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(200px, 1fr));
  gap: var(--spacing-lg);
}

.classmate-card {
  display: flex;
  flex-direction: column;
  align-items: center;
  padding: var(--spacing-lg) var(--spacing-md);
  background-color: var(--color-surface-card);
  border-radius: var(--rounded-lg);
  text-decoration: none;
  color: inherit;
  transition: transform 0.2s ease, box-shadow 0.2s ease;
}

.classmate-card:hover {
  transform: translateY(-4px);
  box-shadow: var(--shadow-subtle);
  text-decoration: none;
}

.classmate-card.no-page {
  opacity: 0.55;
  pointer-events: none;
}

.card-avatar {
  width: 72px;
  height: 72px;
  border-radius: 50%;
  overflow: hidden;
  background: linear-gradient(135deg, var(--color-surface-cream-strong), var(--color-hairline));
  display: flex;
  align-items: center;
  justify-content: center;
  margin-bottom: var(--spacing-sm);
  border: 2px solid var(--color-hairline);
}

.card-avatar img {
  width: 100%;
  height: 100%;
  object-fit: cover;
}

.avatar-char {
  font-family: var(--font-display);
  font-size: 28px;
  font-weight: 500;
  color: var(--color-muted);
}

.card-name {
  margin-bottom: var(--spacing-xxs);
  text-align: center;
}

.card-motto {
  font-size: var(--type-body-sm-size);
  color: var(--color-muted);
  text-align: center;
  font-style: italic;
}

.no-result {
  text-align: center;
  padding: var(--spacing-xxl);
  color: var(--color-muted);
  line-height: 2;
}

@media (max-width: 768px) {
  .classmate-grid {
    grid-template-columns: repeat(2, 1fr);
    gap: var(--spacing-md);
  }

  .card-avatar {
    width: 58px;
    height: 58px;
  }
}
</style>
