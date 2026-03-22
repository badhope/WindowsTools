import html2canvas from 'html2canvas'
import { saveAs } from 'file-saver'

export interface ScreenshotOptions {
  element?: HTMLElement
  format?: 'png' | 'jpeg' | 'webp'
  quality?: number
  scale?: number
  backgroundColor?: string
  captureArea?: 'viewport' | 'fullpage' | 'element'
}

export interface RegionSelector {
  startX: number
  startY: number
  endX: number
  endY: number
}

let isSelecting = false
let startX = 0
let startY = 0
let selectionOverlay: HTMLDivElement | null = null
let selectionRect: HTMLDivElement | null = null

export async function captureScreenshot(options: ScreenshotOptions = {}): Promise<Blob> {
  const {
    element = document.body,
    format = 'png',
    quality = 1,
    scale = window.devicePixelRatio || 2,
    backgroundColor = '#ffffff'
  } = options

  if (!element) {
    throw new Error('No element provided for screenshot')
  }

  const canvas = await html2canvas(element, {
    scale,
    backgroundColor,
    useCORS: true,
    allowTaint: true,
    logging: false
  })

  return new Promise((resolve, reject) => {
    canvas.toBlob(
      (blob) => {
        if (blob) resolve(blob)
        else reject(new Error('Failed to create blob'))
      },
      `image/${format}`,
      quality
    )
  })
}

export async function downloadScreenshot(
  options: ScreenshotOptions = {},
  fileName = `screenshot-${Date.now()}`
): Promise<void> {
  const { format = 'png' } = options

  const blob = await captureScreenshot(options)
  saveAs(blob, `${fileName}.${format}`)
}

export async function captureFullPage(): Promise<Blob> {
  const scrollHeight = document.documentElement.scrollHeight
  const viewportHeight = window.innerHeight
  const viewportWidth = window.innerWidth

  const canvas = document.createElement('canvas')
  canvas.width = viewportWidth * (window.devicePixelRatio || 2)
  canvas.height = scrollHeight * (window.devicePixelRatio || 2)

  const ctx = canvas.getContext('2d')!
  const scale = window.devicePixelRatio || 2

  ctx.fillStyle = '#ffffff'
  ctx.fillRect(0, 0, canvas.width, canvas.height)

  let currentPosition = 0
  while (currentPosition < scrollHeight) {
    window.scrollTo(0, currentPosition)

    await new Promise(resolve => setTimeout(resolve, 100))

    const tempCanvas = await html2canvas(document.body, {
      scale,
      backgroundColor: '#ffffff',
      useCORS: true,
      allowTaint: true,
      logging: false,
      windowHeight: viewportHeight,
      y: currentPosition
    })

    const yOffset = currentPosition * scale
    ctx.drawImage(tempCanvas, 0, yOffset, viewportWidth * scale, viewportHeight * scale)

    currentPosition += viewportHeight
  }

  window.scrollTo(0, 0)

  return new Promise((resolve, reject) => {
    canvas.toBlob(
      (blob) => {
        if (blob) resolve(blob)
        else reject(new Error('Failed to create full page screenshot'))
      },
      'image/png'
    )
  })
}

export async function captureElement(element: HTMLElement): Promise<Blob> {
  if (!element) {
    throw new Error('No element provided')
  }

  const canvas = await html2canvas(element, {
    scale: window.devicePixelRatio || 2,
    backgroundColor: '#ffffff',
    useCORS: true,
    allowTaint: true,
    logging: false
  })

  return new Promise((resolve, reject) => {
    canvas.toBlob(
      (blob) => {
        if (blob) resolve(blob)
        else reject(new Error('Failed to create element screenshot'))
      },
      'image/png'
    )
  })
}

export function createRegionSelector(): Promise<RegionSelector | null> {
  return new Promise((resolve) => {
    if (isSelecting) {
      resolve(null)
      return
    }

    isSelecting = true

    selectionOverlay = document.createElement('div')
    selectionOverlay.style.cssText = `
      position: fixed;
      top: 0;
      left: 0;
      width: 100%;
      height: 100%;
      background: rgba(0, 0, 0, 0.3);
      z-index: 99999;
      cursor: crosshair;
    `

    selectionRect = document.createElement('div')
    selectionRect.style.cssText = `
      position: absolute;
      border: 2px dashed #667eea;
      background: rgba(102, 126, 234, 0.1);
      pointer-events: none;
    `

    selectionOverlay.appendChild(selectionRect)
    document.body.appendChild(selectionOverlay)

    const rect = selectionRect

    function onMouseDown(e: MouseEvent) {
      startX = e.clientX
      startY = e.clientY
      rect.style.left = `${startX}px`
      rect.style.top = `${startY}px`
      rect.style.width = '0px'
      rect.style.height = '0px'
    }

    function onMouseMove(e: MouseEvent) {
      const currentX = e.clientX
      const currentY = e.clientY

      const left = Math.min(startX, currentX)
      const top = Math.min(startY, currentY)
      const width = Math.abs(currentX - startX)
      const height = Math.abs(currentY - startY)

      rect.style.left = `${left}px`
      rect.style.top = `${top}px`
      rect.style.width = `${width}px`
      rect.style.height = `${height}px`
    }

    function onMouseUp(e: MouseEvent) {
      const endX = e.clientX
      const endY = e.clientY

      cleanup()

      if (Math.abs(endX - startX) < 10 || Math.abs(endY - startY) < 10) {
        resolve(null)
        return
      }

      resolve({
        startX: Math.min(startX, endX),
        startY: Math.min(startY, endY),
        endX: Math.max(startX, endX),
        endY: Math.max(startY, endY)
      })
    }

    function onKeyDown(e: KeyboardEvent) {
      if (e.key === 'Escape') {
        cleanup()
        resolve(null)
      }
    }

    function cleanup() {
      isSelecting = false
      if (selectionOverlay) {
        selectionOverlay.removeEventListener('mousedown', onMouseDown)
        selectionOverlay.removeEventListener('mousemove', onMouseMove)
        selectionOverlay.removeEventListener('mouseup', onMouseUp)
        selectionOverlay.removeEventListener('keydown', onKeyDown)
        selectionOverlay.remove()
        selectionOverlay = null
        selectionRect = null
      }
    }

    selectionOverlay.addEventListener('mousedown', onMouseDown)
    selectionOverlay.addEventListener('mousemove', onMouseMove)
    selectionOverlay.addEventListener('mouseup', onMouseUp)
    selectionOverlay.addEventListener('keydown', onKeyDown)
  })
}

export async function captureRegion(region: RegionSelector): Promise<Blob> {
  const { startX, startY, endX, endY } = region

  const canvas = await html2canvas(document.body, {
    scale: window.devicePixelRatio || 2,
    backgroundColor: '#ffffff',
    useCORS: true,
    allowTaint: true,
    logging: false,
    x: startX,
    y: startY,
    width: endX - startX,
    height: endY - startY
  })

  return new Promise((resolve, reject) => {
    canvas.toBlob(
      (blob) => {
        if (blob) resolve(blob)
        else reject(new Error('Failed to create region screenshot'))
      },
      'image/png'
    )
  })
}

export async function downloadFullPage(fileName = `fullpage-${Date.now()}`): Promise<void> {
  const blob = await captureFullPage()
  saveAs(blob, `${fileName}.png`)
}

export async function downloadElementScreenshot(
  element: HTMLElement,
  fileName = `element-${Date.now()}`
): Promise<void> {
  const blob = await captureElement(element)
  saveAs(blob, `${fileName}.png`)
}

export async function downloadRegionScreenshot(
  region: RegionSelector,
  fileName = `region-${Date.now()}`
): Promise<void> {
  const blob = await captureRegion(region)
  saveAs(blob, `${fileName}.png`)
}

export async function captureWithAnnotations(
  options: ScreenshotOptions & {
    annotations?: Array<{
      type: 'rect' | 'arrow' | 'text'
      x: number
      y: number
      width?: number
      height?: number
      endX?: number
      endY?: number
      text?: string
      color?: string
    }>
  }
): Promise<Blob> {
  const { element = document.body, annotations = [] } = options

  const baseCanvas = await html2canvas(element, {
    scale: window.devicePixelRatio || 2,
    backgroundColor: '#ffffff',
    useCORS: true,
    allowTaint: true,
    logging: false
  })

  const canvas = document.createElement('canvas')
  canvas.width = baseCanvas.width
  canvas.height = baseCanvas.height

  const ctx = canvas.getContext('2d')!
  ctx.drawImage(baseCanvas, 0, 0)

  if (annotations.length > 0) {
    const scale = window.devicePixelRatio || 2

    for (const annotation of annotations) {
      ctx.strokeStyle = annotation.color || '#ff0000'
      ctx.lineWidth = 3

      if (annotation.type === 'rect' && annotation.width && annotation.height) {
        ctx.strokeRect(
          annotation.x * scale,
          annotation.y * scale,
          annotation.width * scale,
          annotation.height * scale
        )
      } else if (annotation.type === 'arrow' && annotation.endX !== undefined && annotation.endY !== undefined) {
        ctx.beginPath()
        ctx.moveTo(annotation.x * scale, annotation.y * scale)
        ctx.lineTo(annotation.endX * scale, annotation.endY * scale)
        ctx.stroke()

        const angle = Math.atan2(annotation.endY - annotation.y, annotation.endX - annotation.x)
        const headLength = 15

        ctx.beginPath()
        ctx.moveTo(annotation.endX * scale, annotation.endY * scale)
        ctx.lineTo(
          annotation.endX * scale - headLength * Math.cos(angle - Math.PI / 6),
          annotation.endY * scale - headLength * Math.sin(angle - Math.PI / 6)
        )
        ctx.moveTo(annotation.endX * scale, annotation.endY * scale)
        ctx.lineTo(
          annotation.endX * scale - headLength * Math.cos(angle + Math.PI / 6),
          annotation.endY * scale - headLength * Math.sin(angle + Math.PI / 6)
        )
        ctx.stroke()
      } else if (annotation.type === 'text' && annotation.text) {
        ctx.font = `${16 * scale}px Arial`
        ctx.fillStyle = annotation.color || '#ff0000'
        ctx.fillText(annotation.text, annotation.x * scale, annotation.y * scale)
      }
    }
  }

  return new Promise((resolve, reject) => {
    canvas.toBlob(
      (blob) => {
        if (blob) resolve(blob)
        else reject(new Error('Failed to create annotated screenshot'))
      },
      'image/png'
    )
  })
}
