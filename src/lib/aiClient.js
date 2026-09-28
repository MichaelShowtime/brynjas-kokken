import { account } from './appwrite'

// Kalder /api/claude med en frisk Appwrite-session-JWT, så endpointet kan
// verificere at kaldet kommer fra en logget ind bruger.
export async function kaldClaude({ model, max_tokens, system, messages }) {
  const { jwt } = await account.createJWT()
  const res = await fetch('/api/claude', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${jwt}`,
    },
    body: JSON.stringify({ model, max_tokens, system, messages }),
  })
  if (!res.ok) {
    const body = await res.json().catch(() => ({}))
    throw new Error(body.error ?? `HTTP ${res.status}`)
  }
  return res.json()
}
