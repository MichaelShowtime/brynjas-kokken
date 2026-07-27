import Anthropic from '@anthropic-ai/sdk'

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

  try {
    const { model, max_tokens, system, messages } = req.body
    const client = new Anthropic({ apiKey: key })

    const response = await client.messages.create({
      model:      model      ?? 'claude-sonnet-4-6',
      max_tokens: max_tokens ?? 1024,
      ...(system ? { system } : {}),
      messages,
    })

    res.json({ text: response.content[0]?.text ?? '' })
  } catch (e) {
    console.error('Claude API fejl:', e)
    res.status(500).json({ error: 'Anmodning fejlede' })
  }
}
