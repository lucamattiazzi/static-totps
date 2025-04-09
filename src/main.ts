import { BarcodeDetector, DetectedBarcode } from "barcode-detector/ponyfill"

import { wrap } from 'comlink'
import { generateBook } from "./epub"
import { parseQRCode, QRCodeParams } from "./qrcode"
import './style.css'
import { Chapter } from "./totp"

const video = document.querySelector('#video') as HTMLVideoElement
const loadImgBtn = document.querySelector('#load-img-btn') as HTMLButtonElement
const takePicBtn = document.querySelector('#take-pic-btn') as HTMLButtonElement
takePicBtn.addEventListener('click', takePicClickHandler)
loadImgBtn.addEventListener('click', loadImgClickHandler)

const barcodeDetector = new BarcodeDetector({ formats: ['qr_code'] })

type TOTPWorkerAPI = {
  getTOTPHTML: (params: QRCodeParams) => Chapter[]
}

const worker = new Worker(
  new URL('./totp.ts', import.meta.url),
  { type: 'module' }
)
const workerApi = wrap<TOTPWorkerAPI>(worker)

function closeVideo() {
  const userMedia = video.srcObject as MediaStream
  if (!userMedia) return
  if (document.fullscreenElement === video) document.exitFullscreen()
  userMedia.getVideoTracks().forEach(track => track.stop())
  video.srcObject = null
  video.style.display = 'none'
}

async function takePicClickHandler() {
  const userMediaConf = {
    audio: false,
    video: {
      facingMode: 'environment'
    }
  }
  const userMedia = await navigator.mediaDevices.getUserMedia(userMediaConf)
  video.srcObject = userMedia
  video.play()
  video.style.display = 'block'
  getBarcodeLoop()
}

async function loadImgClickHandler() {
  const file = await new Promise<File | null>((resolve) => {
    const input = document.createElement('input')
    input.type = 'file'
    input.accept = 'image/*'
    input.addEventListener('change', () => {
      const file = input.files?.[0] ?? null
      resolve(file)
    })
    input.click()
  })
  if (!file) return
  const img = document.createElement('img')
  img.src = URL.createObjectURL(file)
  const barcodes = await new Promise<DetectedBarcode[]>((resolve) => {
    img.addEventListener('load', async () => {
      const barcodes = await barcodeDetector.detect(img)
      resolve(barcodes)
    })
  })
  if (barcodes.length === 0) return alert('No QR code found')
  const barcodeValue = barcodes[0].rawValue
  const params = parseQRCode(barcodeValue)
  closeVideo()
  const html = await workerApi.getTOTPHTML(params)
  generateBook(params, html)
}

async function getBarcodeLoop() {
  try {
    const barcodes = await barcodeDetector.detect(video)
    if (barcodes.length === 0) return requestAnimationFrame(getBarcodeLoop)
    const barcodeValue = barcodes[0].rawValue
    const params = parseQRCode(barcodeValue)
    closeVideo()
    const html = await workerApi.getTOTPHTML(params)
    generateBook(params, html)
  } catch (e) {
    requestAnimationFrame(getBarcodeLoop)
  }
}