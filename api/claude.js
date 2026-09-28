import Anthropic from '@anthropic-ai/sdk'
import { Client, Account } from 'node-appwrite'

const ALLOWED_MODELS = new Set(['claude-sonnet-4-6', 'claude-haiku-4-5-20251001'])
const MAX_TOKENS_CAP = 2048
const MAX_MESSAGES = 20
const MAX_SYSTEM_LEN = 4000
const MAX_TEXT_LEN = 8000
const MAX_IMAGE_DATA_LEN = 8 * 1024 * 1024 // base64 chars

// Best-effort rate-limit — holdes i hukommelse på den varme serverless-instans.
// Nulstilles ved cold start, så det er ikke en garanti, men lukker for grov misbrug.
const RATE_LIMIT_WINDOW_MS = 10 * 60 * 1000
const RATE_LIMIT_MAX = 20
const hits = new Map()

function erRateLimited(userId) {
  const now = Date.now()
  const seneste = (hits.get(userId) ?? []).filter((t) => now - t < RATE_LIMIT_WINDOW_MS)
  seneste.push(now)
  hits.set(userId, seneste)
  if (hits.size > 5000) hits.clear() // simpel beskyttelse mod ubegrænset hukommelsesvækst
  return seneste.length > RATE_LIMIT_MAX
}

function gyldigeBeskeder(messages) {
  if (!Array.isArray(messages) || messages.length === 0 || messages.length > MAX_MESSAGES) return false
  return messages.every((m) => {
    if (!m || (m.role !== 'user' && m.role !== 'assistant')) return false
    const { content } = m
    if (typeof content === 'string') return content.length <= MAX_TEXT_LEN
    if (!Array.isArray(content)) return false
    return content.every((block) => {
      if (block?.type === 'text') return typeof block.text === 'string' && block.text.length <= MAX_TEXT_LEN
      if (block?.type === 'image') return typeof block.source?.data === 'string' && block.source.data.length <= MAX_IMAGE_DATA_LEN
      return false
    })
  })
}

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' })
  }

  // Strip usynlige tegn (BOM, zero-width space), whitespace og omkransende citationstegn
  const key = (process.env.ANTHROPIC_KEY ?? '')
    .replace(/[^\x21-\x7E]/g, '')
    .replace(/^["']+|["']+$/g, '')
  if (!key) {
    return res.status(500).json({ error: 'Server ikke konfigureret' })
  }

  // Kræv en gyldig Appwrite-session — forhindrer at endpointet kaldes anonymt/direkte
  const authHeader = req.headers.authorization ?? ''
  const jwt = authHeader.startsWith('Bearer ') ? authHeader.slice(7) : null
  if (!jwt) {
    return res.status(401).json({ error: 'Login kræves' })
  }

  let userId
  try {
    const appwriteClient = new Client()
      .setEndpoint(process.env.VITE_APPWRITE_ENDPOINT)
      .setProject(process.env.VITE_APPWRITE_PROJECT_ID)
      .setJWT(jwt)
    const bruger = await new Account(appwriteClient).get()
    userId = bruger.$id
  } catch {
    return res.status(401).json({ error: 'Ugyldig session' })
  }

  if (erRateLimited(userId)) {
    return res.status(429).json({ error: 'For mange forespørgsler — prøv igen om lidt' })
  }

  const { model, max_tokens, system, messages } = req.body ?? {}

  if (!ALLOWED_MODELS.has(model)) {
    return res.status(400).json({ error: 'Ugyldig model' })
  }
  if (system !== undefined && (typeof system !== 'string' || system.length > MAX_SYSTEM_LEN)) {
    return res.status(400).json({ error: 'System-prompt ugyldig' })
  }
  if (!gyldigeBeskeder(messages)) {
    return res.status(400).json({ error: 'Ugyldige beskeder' })
  }

  const cappedMaxTokens = Math.min(Math.max(Number(max_tokens) || 1024, 1), MAX_TOKENS_CAP)

  try {
    const client = new Anthropic({ apiKey: key })
    const response = await client.messages.create({
      model,
      max_tokens: cappedMaxTokens,
      ...(system ? { system } : {}),
      messages,
    })

    res.json({ text: response.content[0]?.text ?? '' })
  } catch (e) {
    console.error('Claude API fejl:', e?.message ?? e)
    res.status(500).json({ error: 'Anmodning fejlede' })
  }
}
