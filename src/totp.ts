import { expose } from "comlink"
import { TOTP } from "totp-generator"
import { QRCodeParams } from "./qrcode"

export interface Chapter {
  title: string
  content: string
}

function getTOTPHTML(params: QRCodeParams): Chapter[] {
  const otps = [] as { timestamp: number, otp: string }[]
  const fromTs = Date.now()
  const to = new Date(fromTs)
  to.setMonth(to.getMonth() + 1)
  const toTs = Math.floor(to.getTime())
  const totalIntervals = Math.floor((toTs - fromTs) / 30_000)
  const startDate = new Date(fromTs).toLocaleString()
  const firstChapterContent = [
    `<h1>1 month of TOTPs for ${params.issuer}</h1>`,
    `<h2>From: ${startDate}</h2>`,
    `<h2>To: ${new Date(toTs).toLocaleString()}</h2>`,
    '<div style="page-break-after: always" />',
    `<h4>${new Date(fromTs).toLocaleDateString()}</h4>`
  ].join('\n')
  const firstChapter: Chapter = {
    title: 'Metadata',
    content: firstChapterContent,
  }
  const chapters: Chapter[] = [
    firstChapter,
    {
      title: new Date(fromTs).toISOString().slice(0, 10),
      content: `<h4>${startDate}</h4>`
    }
  ]
  for (let i = 0; i < totalIntervals; i++) {
    const timestamp = fromTs + i * 30_000 as number
    const dayHasChanged = new Date(timestamp).getDate() !== new Date(fromTs + (i - 1) * 30_000).getDate()
    if (i >= 0 && (dayHasChanged)) {
      const date = new Date(timestamp).toISOString().slice(0, 10)
      chapters[chapters.length - 1].content += '\n<div style="page-break-after: always" />'
      const newChapter = {
        title: date,
        content: `<h4>${date}</h4>`,
      }
      chapters.push(newChapter)
    }
    const { otp } = TOTP.generate(params.secret, { timestamp, algorithm: params.algorithm, digits: params.digits, period: params.period })
    otps.push({
      timestamp,
      otp,
    })
    const currentTime = new Date(timestamp).toLocaleTimeString()
    const nextTime = new Date(timestamp + 30_000).toLocaleTimeString()
    const line = `<div>from ${currentTime} to ${nextTime}: <b>${otp}</b></div>`
    chapters[chapters.length - 1].content += `\n${line}`
  }
  return chapters
}

const workerApi = { getTOTPHTML }

expose(workerApi)