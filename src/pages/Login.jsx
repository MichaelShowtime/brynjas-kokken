import { useState } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import { logInd } from '../data/auth'
import { colors, shadow, radius, font } from '../data/theme'
import { useLang } from '../lib/lang'

export default function Login() {
  const navigate = useNavigate()
  const { t } = useLang()
  const [visning, setVisning] = useState('login') // 'login' | 'glemt' | 'sendt' | 'nulstil'
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [nyPw, setNyPw] = useState('')
  const [nyPw2, setNyPw2] = useState('')
  const [fejl, setFejl] = useState('')
  const [loading, setLoading] = useState(false)
  const [visPassword, setVisPassword] = useState(false)

  async function håndterLogin(e) {
    e.preventDefault()
    setFejl('')
    setLoading(true)
    const res = await logInd({ email, password })
    setLoading(false)
    if (!res.ok) return setFejl(res.fejl)
    navigate(res.bruger.onboardingFærdig ? '/hjem' : '/onboarding', { replace: true })
  }

  async function håndterGlemt(e) {
    e.preventDefault()
    setFejl('')
    setLoading(true)
    setLoading(false)
    setVisning('sendt')
  }

  function håndterNulstil(e) {
    e.preventDefault()
    setVisning('login')
    setPassword('')
    setFejl('')
  }

  return (
    <div style={s.page}>
      <div style={s.inner}>

        {/* Brand */}
        <div style={s.brand}>
          <span style={s.brandEmoji}>🔥</span>
          <span style={s.brandNavn}>Brynjas Køkken</span>
        </div>

        {/* Login */}
        {visning === 'login' && (
          <>
            <h1 style={s.overskrift}>{t('li.velkomst')}</h1>
            <p style={s.underoverskrift}>{t('li.undertitel')}</p>

            {fejl && <div style={s.fejlboks}>{fejl}</div>}

            <form onSubmit={håndterLogin} style={s.form}>
              <label style={s.label}>{t('li.email')}</label>
              <input type="email" value={email} onChange={(e) => setEmail(e.target.value)}
                placeholder="din@mail.dk" style={s.input} autoComplete="email" required />

              <label style={s.label}>{t('li.adgangskode')}</label>
              <div style={s.pwWrap}>
                <input type={visPassword ? 'text' : 'password'} value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder={t('li.nyAdgPh')} style={{ ...s.input, marginBottom: 0 }}
                  autoComplete="current-password" required />
                <button type="button" style={s.visBtn} onClick={() => setVisPassword(!visPassword)}>
                  {visPassword ? '🙈' : '👁️'}
                </button>
              </div>

              <button type="button" style={s.glemtLink} onClick={() => { setVisning('glemt'); setFejl('') }}>
                {t('li.glemt')}
              </button>

              <button type="submit" style={{ ...s.primærBtn, opacity: loading ? 0.7 : 1 }} disabled={loading}>
                {loading ? t('li.loggerInd') : t('li.logInd')}
              </button>
            </form>

            <p style={s.skiftTekst}>
              {t('li.ingenKonto')}{' '}
              <Link to="/register" style={s.link}>{t('li.opretHer')}</Link>
            </p>
          </>
        )}

        {/* Glemt adgangskode */}
        {visning === 'glemt' && (
          <>
            <button style={s.tilbageBtn} onClick={() => { setVisning('login'); setFejl('') }}>
              {t('li.tilbage')}
            </button>
            <h1 style={s.overskrift}>{t('li.glemtTitel')}</h1>
            <p style={s.underoverskrift}>{t('li.glemtTekst')}</p>

            {fejl && <div style={s.fejlboks}>{fejl}</div>}

            <form onSubmit={håndterGlemt} style={s.form}>
              <label style={s.label}>{t('li.email')}</label>
              <input type="email" value={email} onChange={(e) => setEmail(e.target.value)}
                placeholder="din@mail.dk" style={s.input} required />
              <button type="submit" style={{ ...s.primærBtn, opacity: loading ? 0.7 : 1 }} disabled={loading}>
                {loading ? t('li.sender') : t('li.sendLink')}
              </button>
            </form>
          </>
        )}

        {/* Afsendt */}
        {visning === 'sendt' && (
          <>
            <div style={s.ikonCirkel}>📬</div>
            <h1 style={s.overskrift}>{t('li.tjekMail')}</h1>
            <p style={s.underoverskrift}>
              {t('li.mailSendt1')} <strong>{email}</strong>{t('li.mailSendt2')}
            </p>

            <button style={s.sekundærBtn} onClick={() => { setVisning('login'); setFejl('') }}>
              {t('li.tilbageLogin')}
            </button>
          </>
        )}

        {/* Nulstil adgangskode */}
        {visning === 'nulstil' && (
          <>
            <div style={s.ikonCirkel}>🔐</div>
            <h1 style={s.overskrift}>{t('li.nyAdg')}</h1>

            {fejl && <div style={s.fejlboks}>{fejl}</div>}

            <form onSubmit={håndterNulstil} style={s.form}>
              <label style={s.label}>{t('li.nyAdg')}</label>
              <input type="password" value={nyPw} onChange={(e) => setNyPw(e.target.value)}
                placeholder={t('li.nyAdgPh')} style={s.input} required />
              <label style={s.label}>{t('li.gentagAdg')}</label>
              <input type="password" value={nyPw2} onChange={(e) => setNyPw2(e.target.value)}
                placeholder={t('li.gentagPh')} style={s.input} required />
              <button type="submit" style={s.primærBtn}>{t('li.gemNy')}</button>
            </form>
          </>
        )}

      </div>
    </div>
  )
}

const s = {
  page: { minHeight: '100vh', background: colors.bg, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '24px 20px' },
  inner: { width: '100%', maxWidth: 400 },

  brand: { display: 'flex', alignItems: 'center', gap: 10, marginBottom: 36, justifyContent: 'center' },
  brandEmoji: { fontSize: 32 },
  brandNavn: { fontFamily: font.display, fontWeight: 600, fontSize: 30, color: colors.green, letterSpacing: -1 },

  overskrift: { fontFamily: font.display, fontWeight: 600, fontSize: 26, color: colors.text, margin: '0 0 6px', letterSpacing: -0.4 },
  underoverskrift: { fontFamily: font.body, fontSize: 15, color: colors.muted, margin: '0 0 24px', lineHeight: 1.5 },

  fejlboks: { background: '#FDECEA', border: '1px solid #F5C9C4', borderRadius: 12, padding: '11px 14px', fontFamily: font.body, fontSize: 14, color: colors.red, marginBottom: 16 },

  form: { display: 'flex', flexDirection: 'column' },
  label: { fontFamily: font.body, fontSize: 12.5, fontWeight: 700, color: colors.mutedLight, marginBottom: 7, letterSpacing: 0.3 },
  input: { padding: '13px 14px', fontFamily: font.body, fontSize: 15, color: colors.text, background: colors.card, border: `1.5px solid ${colors.border}`, borderRadius: 13, outline: 'none', marginBottom: 16, boxSizing: 'border-box', width: '100%' },

  pwWrap: { position: 'relative', marginBottom: 8 },
  visBtn: { position: 'absolute', right: 12, top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', fontSize: 18, cursor: 'pointer' },

  glemtLink: { background: 'none', border: 'none', fontFamily: font.body, fontSize: 13.5, fontWeight: 700, color: colors.green, padding: '4px 0 16px', textAlign: 'right', cursor: 'pointer' },

  primærBtn: { padding: '14px', fontFamily: font.body, fontWeight: 700, fontSize: 15, color: '#fff', background: colors.green, border: 'none', borderRadius: radius.button, marginTop: 4, boxShadow: shadow.fab, cursor: 'pointer' },
  sekundærBtn: { padding: '13px', fontFamily: font.body, fontWeight: 700, fontSize: 15, color: colors.muted, background: 'transparent', border: `1px solid ${colors.border}`, borderRadius: radius.button, marginTop: 10, cursor: 'pointer' },

  skiftTekst: { fontFamily: font.body, fontSize: 14, color: colors.muted, textAlign: 'center', marginTop: 24 },
  link: { color: colors.green, fontWeight: 700, textDecoration: 'none' },

  tilbageBtn: { background: 'none', border: 'none', fontFamily: font.body, fontSize: 14, fontWeight: 700, color: colors.green, padding: '0 0 16px', cursor: 'pointer' },
  ikonCirkel: { fontSize: 48, textAlign: 'center', margin: '0 0 16px' },
}
