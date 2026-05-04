<template>
  <footer class="app-footer">
    <div class="footer-inner container">
      <div class="footer-brand">
        <span class="brand-mark">✦</span>
        <span class="brand-text">同学录</span>
      </div>
      <div class="footer-copyright">{{ copyright }}</div>
      <a v-if="beian" :href="beianUrl" target="_blank" rel="noopener" class="footer-beian">
        {{ beian }}
      </a>
    </div>
  </footer>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { apiFetch } from '@alumni/shared'
import type { SiteConfig } from '@alumni/shared'

const copyright = ref('同学录 · 青春回忆')
const beian = ref('')
const beianUrl = ref('https://beian.miit.gov.cn/')

onMounted(async () => {
  try {
    const config = await apiFetch<SiteConfig>('/api/config')
    if (config.footer) {
      copyright.value = config.footer.copyright || copyright.value
      beian.value = config.footer.beian || ''
      beianUrl.value = config.footer.beianUrl || beianUrl.value
    }
  } catch {
    // 使用默认值
  }
})
</script>

<style scoped>
.app-footer {
  background-color: var(--color-surface-dark);
  color: var(--color-on-dark-soft);
  padding: 64px 0;
}

.footer-inner {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: var(--spacing-sm);
}

.footer-brand {
  display: flex;
  align-items: center;
  gap: var(--spacing-xs);
  margin-bottom: var(--spacing-sm);
}

.footer-brand .brand-mark {
  color: var(--color-primary);
  font-size: 16px;
}

.footer-brand .brand-text {
  font-family: var(--font-display);
  font-size: 18px;
  font-weight: 500;
  color: var(--color-on-dark);
}

.footer-copyright {
  font-size: var(--type-body-sm-size);
  color: var(--color-on-dark-soft);
  text-align: center;
  line-height: 1.8;
}

.footer-beian {
  font-size: var(--type-body-sm-size);
  color: var(--color-on-dark-soft);
  text-decoration: none;
  opacity: 0.7;
}

.footer-beian:hover {
  opacity: 1;
  text-decoration: underline;
}
</style>
