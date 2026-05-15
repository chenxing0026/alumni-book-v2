/**
 * 前端 Canvas 缩略图生成工具
 * 将图片文件缩放为指定宽度的缩略图
 */
export function createThumbnail(file: File, maxWidth = 200, quality = 0.8): Promise<Blob> {
  return new Promise((resolve, reject) => {
    const img = new Image()
    const url = URL.createObjectURL(file)
    img.onload = () => {
      URL.revokeObjectURL(url)
      const ratio = maxWidth / img.width
      const canvas = document.createElement('canvas')
      canvas.width = maxWidth
      canvas.height = Math.round(img.height * ratio)
      const ctx = canvas.getContext('2d')!
      ctx.drawImage(img, 0, 0, canvas.width, canvas.height)
      canvas.toBlob(blob => {
        if (blob) resolve(blob)
        else reject(new Error('Canvas toBlob failed'))
      }, file.type, quality)
    }
    img.onerror = () => reject(new Error('Image load failed'))
    img.src = url
  })
}
