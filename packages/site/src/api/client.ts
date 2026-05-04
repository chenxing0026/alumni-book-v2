import { apiFetch, type Student, type ClassmateEntry, type SiteConfig, type Album, type ApiResponse } from '@alumni/shared'

export async function getClassmates(): Promise<ClassmateEntry[]> {
  const res = await apiFetch<ApiResponse<ClassmateEntry[]>>('/api/classmates')
  return res.data || []
}

export async function getStudents(): Promise<Student[]> {
  const res = await apiFetch<ApiResponse<Student[]>>('/api/students')
  return res.data || []
}

export async function getStudent(slug: string): Promise<Student> {
  const res = await apiFetch<ApiResponse<Student>>(`/api/students/${slug}`)
  return res.data!
}

export async function getConfig(): Promise<SiteConfig> {
  const res = await apiFetch<ApiResponse<SiteConfig>>('/api/config')
  return res.data!
}

export async function getAlbums(): Promise<Album[]> {
  const res = await apiFetch<ApiResponse<Album[]>>('/api/albums')
  return res.data || []
}
