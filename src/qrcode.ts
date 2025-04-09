const VALID_ALGOS = ["SHA-1", "SHA-224", "SHA-256", "SHA-384", "SHA-512", "SHA3-224", "SHA3-256", "SHA3-384", "SHA3-512"]
const ALGO_MAP = VALID_ALGOS.reduce((acc, algo) => ({ ...acc, [algo.replace("-", "")]: algo }), {} as Record<string, string>)

export interface QRCodeParams {
  secret: string
  issuer: string
  algorithm: "SHA-1" | "SHA-224" | "SHA-256" | "SHA-384" | "SHA-512" | "SHA3-224" | "SHA3-256" | "SHA3-384" | "SHA3-512"
  digits: number
  period: number
}

export function parseQRCode(qrCode: string): QRCodeParams {
  const url = new URL(qrCode)
  const queryParams = new URLSearchParams(url.search)
  const secret = queryParams.get('secret') || ""
  const issuer = queryParams.get('issuer') || ""
  const algorithm = queryParams.get('algorithm') || 'SHA-1'
  const digits = parseInt(queryParams.get('digits') || '6', 10)
  const period = parseInt(queryParams.get('period') || '30', 10)
  const parsedAlgo = ALGO_MAP[algorithm] || algorithm
  const params = {
    secret,
    issuer,
    algorithm: parsedAlgo,
    digits,
    period,
  } as QRCodeParams
  return params
}