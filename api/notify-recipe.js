// Sender en admin-mail via Resend når en bruger indsender en ny opskrift til godkendelse.
// Kræver RESEND_API_KEY i Vercel env vars (aldrig VITE_-prefix — den må ikke ende i browser-bundlen).

const ADMIN_EMAIL = 'mikbjorns@gmail.com'
const APP_URL = 'https://brynjaskoekken.vercel.app'

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' })
  }

  const key = process.env.RESEND_API_KEY
  if (!key) {
    console.warn('RESEND_API_KEY mangler — springer admin-mail over')
    return res.status(200).json({ sent: false, reason: 'not configured' })
  }

  try {
    const { titel, recipeId } = req.body ?? {}
    if (!titel) return res.status(400).json({ error: 'titel mangler' })

    const link = recipeId ? `${APP_URL}/admin/opskrifter?highlight=${encodeURIComponent(recipeId)}` : `${APP_URL}/admin/opskrifter`

    const resendRes = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${key}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        from: 'Brynjas Køkken <onboarding@resend.dev>',
        to: [ADMIN_EMAIL],
        subject: `Ny opskrift afventer godkendelse: ${titel}`,
        html: `<p>En bruger har indsendt en ny opskrift til godkendelse:</p>
<p><strong>${escapeHtml(titel)}</strong></p>
<p><a href="${link}">Gå til godkendelsessiden →</a></p>`,
      }),
    })

    if (!resendRes.ok) {
      const body = await resendRes.text()
      console.error('Resend-fejl:', resendRes.status, body)
      return res.status(200).json({ sent: false, reason: 'resend error' })
    }

    res.json({ sent: true })
  } catch (e) {
    console.error('notify-recipe fejl:', e)
    res.status(200).json({ sent: false, reason: 'exception' })
  }
}

function escapeHtml(str) {
  return String(str).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]))
}
