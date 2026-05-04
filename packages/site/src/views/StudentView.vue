<template>
  <div class="student-page">
    <!-- Hero 区域 -->
    <section class="student-hero">
      <div class="hero-bg" :style="bgStyle"></div>
      <div class="hero-content container">
        <div class="hero-avatar">
          <img v-if="student.avatarUrl" :src="student.avatarUrl" :alt="student.name" />
          <span v-else class="avatar-char">{{ student.name.charAt(0) }}</span>
        </div>
        <h1 class="hero-name display-md">{{ student.name }}</h1>
        <p v-if="student.info.nickname" class="hero-nickname">「 {{ student.info.nickname }} 」</p>
        <p v-if="student.info.motto" class="hero-motto">「 {{ student.info.motto }} 」</p>
      </div>
    </section>

    <!-- 内容区块 -->
    <div class="student-body container">
      <!-- 基础信息 -->
      <section class="profile-section fade-in" v-if="hasBasicInfo">
        <h2 class="section-title display-sm">基础信息</h2>
        <div class="info-grid">
          <div v-for="field in basicFields" :key="field.key" class="info-item">
            <span class="info-label">{{ field.label }}</span>
            <span class="info-value">{{ field.value }}</span>
          </div>
        </div>
      </section>

      <!-- 联系方式 -->
      <section class="profile-section fade-in" v-if="hasContactInfo">
        <h2 class="section-title display-sm">联系方式</h2>
        <div class="info-grid">
          <div v-for="field in contactFields" :key="field.key" class="info-item">
            <span class="info-label">{{ field.label }}</span>
            <span class="info-value">{{ field.value }}</span>
          </div>
        </div>
      </section>

      <!-- 个性标签 -->
      <section class="profile-section fade-in" v-if="hasPersonality">
        <h2 class="section-title display-sm">个性标签</h2>
        <div class="info-grid">
          <div v-for="field in personalityFields" :key="field.key" class="info-item">
            <span class="info-label">{{ field.label }}</span>
            <span class="info-value">{{ field.value }}</span>
          </div>
        </div>
        <div v-if="student.info.motto" class="info-item motto-full">
          <span class="info-label">座右铭</span>
          <span class="info-value">{{ student.info.motto }}</span>
        </div>
      </section>

      <!-- 兴趣爱好 -->
      <section class="profile-section fade-in" v-if="hasInterests">
        <h2 class="section-title display-sm">兴趣爱好</h2>
        <div class="info-grid">
          <div v-for="field in interestFields" :key="field.key" class="info-item">
            <span class="info-label">{{ field.label }}</span>
            <span class="info-value">{{ field.value }}</span>
          </div>
        </div>
      </section>

      <!-- 校园回忆 -->
      <section class="profile-section fade-in" v-if="hasMemories">
        <h2 class="section-title display-sm">校园回忆</h2>
        <div class="memory-list">
          <div v-for="field in memoryFields" :key="field.key" class="info-item memory-item">
            <span class="info-label">{{ field.label }}</span>
            <span class="info-value">{{ field.value }}</span>
          </div>
        </div>
      </section>

      <!-- 未来规划 -->
      <section class="profile-section fade-in" v-if="hasFuture">
        <h2 class="section-title display-sm">未来规划</h2>
        <div class="info-grid">
          <div v-for="field in futureFields" :key="field.key" class="info-item">
            <span class="info-label">{{ field.label }}</span>
            <span class="info-value">{{ field.value }}</span>
          </div>
        </div>
      </section>

      <!-- 照片墙 -->
      <section class="profile-section fade-in" v-if="student.photos && student.photos.length > 0">
        <h2 class="section-title display-sm">照片墙</h2>
        <div class="photo-wall">
          <div v-for="photo in student.photos" :key="photo" class="photo-item">
            <img :src="photo" alt="" />
          </div>
        </div>
      </section>

      <!-- 印章 -->
      <div class="seal-area">
        <span class="seal">留念</span>
      </div>
    </div>

    <!-- 背景音乐 -->
    <audio
      v-if="student.musicUrl && student.musicAutoplay"
      ref="audioRef"
      :src="student.musicUrl"
      loop
      preload="auto"
    ></audio>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { getSessionName } from '@alumni/shared'
import type { Student, StudentInfo } from '@alumni/shared'
import { getStudent } from '@/api/client'

const route = useRoute()
const router = useRouter()
const student = ref<Student>({
  id: '',
  name: '',
  slug: '',
  isOwner: false,
  avatarUrl: null,
  musicUrl: null,
  musicTitle: null,
  musicAutoplay: false,
  backgroundUrl: null,
  backgroundColor: null,
  info: {} as StudentInfo,
  photos: [] as string[],
  createdAt: '',
  updatedAt: '',
})

const bgStyle = computed(() => {
  if (student.value.backgroundUrl) {
    return {
      backgroundImage: `url(${student.value.backgroundUrl})`,
      backgroundSize: 'cover',
      backgroundPosition: 'center',
    }
  }
  if (student.value.backgroundColor) {
    return { backgroundColor: student.value.backgroundColor }
  }
  return {}
})

interface FieldDef {
  key: string
  label: string
  value: string
}

function getFields(keys: [string, string][]): FieldDef[] {
  return keys
    .map(([key, label]) => ({
      key,
      label,
      value: (student.value.info as any)[key] || '',
    }))
    .filter(f => f.value)
}

const basicFields = computed(() => getFields([
  ['name', '姓名'], ['nickname', '昵称'], ['gender', '性别'],
  ['birthday', '出生日期'], ['school', '学校'], ['class', '班级'],
  ['graduationYear', '毕业年份'],
]))

const contactFields = computed(() => getFields([
  ['qq', 'QQ'], ['wechat', '微信'], ['weibo', '微博'],
  ['phone', '手机'], ['email', '邮箱'], ['address', '常住地'],
]))

const personalityFields = computed(() => getFields([
  ['mbti', 'MBTI'], ['bloodType', '血型'], ['astro', '星座'],
  ['strengths', '擅长的事'], ['weaknesses', '不擅长的事'],
  ['bestSubject', '最喜欢科目'], ['worstSubject', '最讨厌科目'],
]))

const interestFields = computed(() => getFields([
  ['favoriteIdol', '喜欢明星'], ['favoriteAnime', '喜欢动漫'],
  ['favoriteMovie', '喜欢电影'], ['favoriteSong', '喜欢歌曲'],
  ['favoriteGame', '喜欢游戏'], ['favoriteFood', '喜欢食物'],
  ['favoriteColor', '喜欢颜色'], ['favoriteSport', '喜欢运动'],
]))

const memoryFields = computed(() => getFields([
  ['bestMemory', '最难忘的一件事'], ['bestLesson', '最难忘的一节课'],
  ['deskmateFun', '同桌趣事'], ['classMeme', '班级经典梗'],
  ['embarrassingMoment', '最社死瞬间'], ['proudestAchievement', '学生时代最骄傲的事'],
]))

const futureFields = computed(() => getFields([
  ['targetUniversity', '目标大学'], ['targetMajor', '目标专业'],
  ['futureCareer', '未来职业'], ['futureCity', '未来城市'],
  ['futureSelf', '十年后的自己'], ['letterToFuture', '给未来自己的话'],
]))

const hasBasicInfo = computed(() => basicFields.value.length > 0)
const hasContactInfo = computed(() => contactFields.value.length > 0)
const hasPersonality = computed(() => personalityFields.value.length > 0)
const hasInterests = computed(() => interestFields.value.length > 0)
const hasMemories = computed(() => memoryFields.value.length > 0)
const hasFuture = computed(() => futureFields.value.length > 0)

onMounted(async () => {
  if (!getSessionName()) {
    router.replace('/')
    return
  }

  const slug = route.params.slug as string
  try {
    student.value = await getStudent(slug)
  } catch {
    router.replace('/roster')
    return
  }

  // 淡入动画
  setTimeout(() => {
    document.querySelectorAll('.fade-in').forEach((el, i) => {
      setTimeout(() => el.classList.add('visible'), i * 120)
    })
  }, 300)
})
</script>

<style scoped>
.student-page {
  padding-top: var(--nav-height);
}

.student-hero {
  position: relative;
  padding: var(--spacing-xxl) 0;
  text-align: center;
  background-color: var(--color-surface-soft);
  overflow: hidden;
}

.hero-bg {
  position: absolute;
  inset: 0;
  z-index: 0;
  opacity: 0.15;
}

.hero-content {
  position: relative;
  z-index: 1;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: var(--spacing-sm);
}

.hero-avatar {
  width: 96px;
  height: 96px;
  border-radius: 50%;
  overflow: hidden;
  background: linear-gradient(135deg, var(--color-surface-card), var(--color-hairline));
  display: flex;
  align-items: center;
  justify-content: center;
  border: 3px solid var(--color-hairline);
  margin-bottom: var(--spacing-sm);
}

.hero-avatar img {
  width: 100%;
  height: 100%;
  object-fit: cover;
}

.avatar-char {
  font-family: var(--font-display);
  font-size: 40px;
  font-weight: 500;
  color: var(--color-muted);
}

.hero-nickname {
  font-size: var(--type-body-md-size);
  color: var(--color-muted);
  font-style: italic;
}

.hero-motto {
  font-size: var(--type-body-md-size);
  color: var(--color-muted);
  font-style: italic;
}

.student-body {
  max-width: 800px;
  padding: var(--spacing-section) var(--spacing-lg);
}

.profile-section {
  margin-bottom: var(--spacing-section);
}

.section-title {
  margin-bottom: var(--spacing-xl);
  padding-bottom: var(--spacing-sm);
  border-bottom: 1px solid var(--color-hairline);
}

.info-grid {
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: var(--spacing-md);
}

.info-item {
  padding: var(--spacing-sm) 0;
}

.info-label {
  display: block;
  font-size: var(--type-body-sm-size);
  font-weight: 500;
  color: var(--color-muted);
  margin-bottom: var(--spacing-xxs);
}

.info-value {
  font-size: var(--type-body-md-size);
  color: var(--color-ink);
}

.motto-full {
  margin-top: var(--spacing-md);
}

.memory-list {
  display: flex;
  flex-direction: column;
  gap: var(--spacing-md);
}

.photo-wall {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: var(--spacing-sm);
}

.photo-item {
  aspect-ratio: 1;
  border-radius: var(--rounded-sm);
  overflow: hidden;
  cursor: pointer;
  transition: transform 0.2s ease;
}

.photo-item:hover {
  transform: translateY(-2px);
}

.photo-item img {
  width: 100%;
  height: 100%;
  object-fit: cover;
}

.seal-area {
  text-align: right;
  padding: var(--spacing-lg) 0;
  opacity: 0.5;
}

.seal {
  font-family: var(--font-display);
  font-size: 24px;
  color: var(--color-primary);
  border: 2px solid var(--color-primary);
  border-radius: var(--rounded-sm);
  padding: 4px 12px;
  transform: rotate(-5deg);
  display: inline-block;
}

@media (max-width: 768px) {
  .info-grid {
    grid-template-columns: 1fr;
  }

  .photo-wall {
    grid-template-columns: repeat(2, 1fr);
  }
}
</style>
