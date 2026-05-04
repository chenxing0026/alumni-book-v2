<template>
  <div class="student-edit">
    <div class="page-header">
      <h1 class="page-title">编辑学生: {{ student.name }}</h1>
      <div class="header-actions">
        <button class="btn-secondary" @click="router.back()">返回</button>
        <button class="btn-primary" @click="handleSave" :disabled="saving">
          {{ saving ? '保存中...' : '保存' }}
        </button>
      </div>
    </div>

    <div class="edit-grid">
      <!-- 基础信息 -->
      <div class="card">
        <h2 class="title-md section-heading">基础信息</h2>
        <div class="form-group">
          <label class="form-label">姓名</label>
          <input v-model="student.name" type="text" class="text-input" />
        </div>
        <div class="form-group">
          <label class="form-label">Slug</label>
          <input v-model="student.slug" type="text" class="text-input" disabled />
        </div>
        <div class="form-group">
          <label class="form-label">头像</label>
          <input type="file" accept="image/*" @change="handleAvatarUpload" />
          <img v-if="student.avatarUrl" :src="student.avatarUrl" class="avatar-preview" />
        </div>
      </div>

      <!-- 个人资料 -->
      <div class="card">
        <h2 class="title-md section-heading">个人资料</h2>
        <div class="form-row">
          <div class="form-group">
            <label class="form-label">昵称</label>
            <input v-model="student.info.nickname" type="text" class="text-input" />
          </div>
          <div class="form-group">
            <label class="form-label">性别</label>
            <input v-model="student.info.gender" type="text" class="text-input" />
          </div>
          <div class="form-group">
            <label class="form-label">出生日期</label>
            <input v-model="student.info.birthday" type="date" class="text-input" />
          </div>
        </div>
        <div class="form-row">
          <div class="form-group">
            <label class="form-label">学校</label>
            <input v-model="student.info.school" type="text" class="text-input" />
          </div>
          <div class="form-group">
            <label class="form-label">班级</label>
            <input v-model="student.info.class" type="text" class="text-input" />
          </div>
          <div class="form-group">
            <label class="form-label">毕业年份</label>
            <input v-model="student.info.graduationYear" type="text" class="text-input" />
          </div>
        </div>
        <div class="form-group">
          <label class="form-label">座右铭</label>
          <input v-model="student.info.motto" type="text" class="text-input" />
        </div>
      </div>

      <!-- 联系方式 -->
      <div class="card">
        <h2 class="title-md section-heading">联系方式</h2>
        <div class="form-row">
          <div class="form-group">
            <label class="form-label">QQ</label>
            <input v-model="student.info.qq" type="text" class="text-input" />
          </div>
          <div class="form-group">
            <label class="form-label">微信</label>
            <input v-model="student.info.wechat" type="text" class="text-input" />
          </div>
          <div class="form-group">
            <label class="form-label">手机</label>
            <input v-model="student.info.phone" type="text" class="text-input" />
          </div>
        </div>
        <div class="form-row">
          <div class="form-group">
            <label class="form-label">邮箱</label>
            <input v-model="student.info.email" type="text" class="text-input" />
          </div>
          <div class="form-group">
            <label class="form-label">常住地</label>
            <input v-model="student.info.address" type="text" class="text-input" />
          </div>
        </div>
      </div>

      <!-- 背景音乐 -->
      <div class="card">
        <h2 class="title-md section-heading">背景音乐</h2>
        <div class="form-group">
          <label class="form-label">音乐文件</label>
          <input type="file" accept="audio/*" @change="handleMusicUpload" />
        </div>
        <div class="form-group">
          <label class="form-label">音乐标题</label>
          <input v-model="student.musicTitle" type="text" class="text-input" />
        </div>
        <div class="form-group">
          <label>
            <input type="checkbox" v-model="student.musicAutoplay" />
            自动播放
          </label>
        </div>
      </div>
    </div>

    <div v-if="toast" class="toast" :class="'toast-' + toast.type">{{ toast.message }}</div>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { adminFetch } from '@/api/client'
import type { Student, StudentInfo, ApiResponse } from '@alumni/shared'

const route = useRoute()
const router = useRouter()
const saving = ref(false)
const toast = ref<{ type: 'success' | 'error'; message: string } | null>(null)

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
  photos: [],
  createdAt: '',
  updatedAt: '',
})

function showToast(type: 'success' | 'error', message: string) {
  toast.value = { type, message }
  setTimeout(() => { toast.value = null }, 3000)
}

async function handleAvatarUpload(e: Event) {
  const file = (e.target as HTMLInputElement).files?.[0]
  if (!file) return
  const formData = new FormData()
  formData.append('file', file)
  formData.append('type', 'avatar')
  formData.append('slug', student.value.slug)
  try {
    const res = await adminFetch<ApiResponse<{ url: string }>>('/api/upload', {
      method: 'POST',
      body: formData,
      headers: {},
    })
    if (res.data?.url) student.value.avatarUrl = res.data.url
    showToast('success', '头像上传成功')
  } catch (e: any) {
    showToast('error', e.message || '上传失败')
  }
}

async function handleMusicUpload(e: Event) {
  const file = (e.target as HTMLInputElement).files?.[0]
  if (!file) return
  const formData = new FormData()
  formData.append('file', file)
  formData.append('type', 'music')
  formData.append('slug', student.value.slug)
  try {
    const res = await adminFetch<ApiResponse<{ url: string }>>('/api/upload', {
      method: 'POST',
      body: formData,
      headers: {},
    })
    if (res.data?.url) student.value.musicUrl = res.data.url
    showToast('success', '音乐上传成功')
  } catch (e: any) {
    showToast('error', e.message || '上传失败')
  }
}

async function handleSave() {
  saving.value = true
  try {
    await adminFetch(`/api/students/${student.value.slug}`, {
      method: 'PUT',
      body: JSON.stringify(student.value),
    })
    showToast('success', '保存成功')
  } catch (e: any) {
    showToast('error', e.message || '保存失败')
  } finally {
    saving.value = false
  }
}

onMounted(async () => {
  const id = route.params.id as string
  try {
    const res = await adminFetch<ApiResponse<Student>>(`/api/students/${id}`)
    if (res.data) student.value = res.data
  } catch {
    router.replace('/admin/students')
  }
})
</script>

<style scoped>
.header-actions {
  display: flex;
  gap: var(--spacing-sm);
}

.edit-grid {
  display: flex;
  flex-direction: column;
  gap: var(--spacing-lg);
}

.section-heading {
  margin-bottom: var(--spacing-lg);
  padding-bottom: var(--spacing-sm);
  border-bottom: 1px solid var(--color-hairline);
}

.form-row {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(200px, 1fr));
  gap: var(--spacing-md);
}

.avatar-preview {
  width: 80px;
  height: 80px;
  border-radius: 50%;
  object-fit: cover;
  margin-top: var(--spacing-sm);
  border: 2px solid var(--color-hairline);
}
</style>
