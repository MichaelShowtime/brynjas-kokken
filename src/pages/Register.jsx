import { useState } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import { registrerBruger } from '../data/auth'
import { colors, shadow, radius, font } from '../data/theme'
import { useLang } from '../lib/lang'

export default function Register() {
  const navigate = useNavigate()
  const { t } = useLang()
  const [trin, setTrin] = useState(1)
  const [navn, setNavn] = useState('')
  const [efternavn, setEfternavn] = useState('')
  const [telefon, setTelefon] = useState('')
  const [email, setEmail] = useState('')
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [password2, setPassword2] = useState('')
  const [visPassword, setVisPassword] = useState(false)
  const [fejl, setFejl] = useState('')
  const [loading, setLoading] = useState(false)

  function næsteTrin(e) {
    e.preventDefault()
    setFejl('')
    if (!navn.trim() || !efternavn.trim() || !email.trim() || !username.trim())
      return setFejl(t('reg.fejlAllefelter'))
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim()))
      return setFejl(t('reg.fejlEmail'))
    if (username.trim().length < 3)
      return setFejl(t('reg.fejlBrugernavn'))
    setTrin(2)
  }

  async function håndterOpret(e) {
    e.preventDefault()
    setFejl('')
    if (password !== password2) return setFejl(t('reg.fejlMatch'))
    setLoading(true)
    const res = await registrerBruger({ email, navn, efternavn, telefon, username, password })
    setLoading(false)
    if (!res.ok) return setFejl(res.fejl)
    navigate('/onboarding', { replace: true })
  }

  return (
    <div style={s.page}>
      <div style={s.inner}>

        {/* Brand */}
        <div style={s.brand}>
          <span style={{ fontSize: 28 }}>🔥</span>
          <span style={s.brandNavn}>{t('reg.brand')}</span>
        </div>

        {/* Fremgang */}
        <div style={s.fremgang}>
          <div style={{ ...s.fremgangBar, width: trin === 1 ? '50%' : '100%' }} />
        </div>
        <p style={s.fremgangTekst}>{t('reg.trin')} {trin} {t('reg.af')} 2</p>

        {/* Trin 1 */}
        {trin === 1 && (
          <>
            <h1 style={s.overskrift}>{t('reg.opret')}</h1>
            <p style={s.underoverskrift}>{t('reg.underT')}</p>

            {fejl && <div style={s.fejlboks}>{fejl}</div>}

            <form onSubmit={næsteTrin} style={s.form}>
              <div style={s.rækkeInput}>
                <div style={{ flex: 1 }}>
                  <label style={s.label}>{t('reg.fornavn')}</label>
                  <input value={navn} onChange={(e) => setNavn(e.target.value)}
                    placeholder="Anna" style={s.input} autoComplete="given-name" required />
                </div>
                <div style={{ flex: 1 }}>
                  <label style={s.label}>{t('reg.efternavn')}</label>
                  <input value={efternavn} onChange={(e) => setEfternavn(e.target.value)}
                    placeholder="Jensen" style={s.input} autoComplete="family-name" required />
                </div>
              </div>

              <label style={s.label}>{t('reg.email')}</label>
              <input type="email" value={email} onChange={(e) => setEmail(e.target.value)}
                placeholder="anna@mail.dk" style={s.input} autoComplete="email" required />

              <label style={s.label}>{t('reg.brugernavn')}</label>
              <div style={s.usernameWrap}>
                <span style={s.usernameAt}>@</span>
                <input
                  value={username}
                  onChange={(e) => setUsername(e.target.value.toLowerCase().replace(/[^a-z0-9_]/g, ''))}
                  placeholder="annakok"
                  style={{ ...s.input, paddingLeft: 28, marginBottom: 0 }}
                  autoComplete="username"
                  required
                />
              </div>
              <p style={s.usernameTip}>Kun bogstaver, tal og _ — bruges når venner finder dig</p>

              <label style={{ ...s.label, marginTop: 8 }}>
                {t('reg.telefon')}
              </label>
              <input type="tel" value={telefon} onChange={(e) => setTelefon(e.target.value)}
                placeholder="+45 12 34 56 78" style={s.input} autoComplete="tel" />

              <button type="submit" style={s.primærBtn}>{t('reg.næste')} →</button>
            </form>
          </>
        )}

        {/* Trin 2 */}
        {trin === 2 && (
          <>
            <button style={s.tilbageBtn} onClick={() => { setTrin(1); setFejl('') }}>
              {t('reg.tilbage')}
            </button>
            <h1 style={s.overskrift}>{t('reg.adgangskode')}</h1>
            <p style={s.underoverskrift}>Mindst 6 tegn. Vi gemmer den sikkert.</p>

            {fejl && <div style={s.fejlboks}>{fejl}</div>}

            <form onSubmit={håndterOpret} style={s.form}>
              <label style={s.label}>{t('reg.adgangskode')}</label>
              <div style={s.pwWrap}>
                <input type={visPassword ? 'text' : 'password'} value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder={t('reg.adgPh')} style={{ ...s.input, marginBottom: 0 }}
                  autoComplete="new-password" required />
                <button type="button" style={s.visBtn} onClick={() => setVisPassword(!visPassword)}>
                  {visPassword ? '🙈' : '👁️'}
                </button>
              </div>

              <label style={{ ...s.label, marginTop: 16 }}>{t('reg.gentag')}</label>
              <input type={visPassword ? 'text' : 'password'} value={password2}
                onChange={(e) => setPassword2(e.target.value)}
                placeholder={t('reg.gentagPh')} style={s.input}
                autoComplete="new-password" required />

              {password.length > 0 && (
                <div style={s.styrkeWrap}>
                  {[1,2,3,4].map((n) => (
                    <div key={n} style={{
                      ...s.styrkeBar,
                      background: password.length >= n * 3
                        ? (password.length >= 10 ? colors.green : colors.terracotta)
                        : colors.border,
                    }} />
                  ))}
                  <span style={s.styrkeTekst}>
                    {password.length < 6 ? 'For kort' : password.length < 10 ? 'Ok' : 'Stærk'}
                  </span>
                </div>
              )}

              <button type="submit"
                style={{ ...s.primærBtn, marginTop: 8, opacity: loading ? 0.7 : 1 }}
                disabled={loading}>
                {loading ? t('reg.opretter') : t('reg.opretKnap')}
              </button>
            </form>

            <p style={s.juridisk}>
              Ved at oprette en konto accepterer du vores{' '}
              <span style={{ color: colors.green }}>vilkår</span> og{' '}
              <span style={{ color: colors.green }}>privatlivspolitik</span>.
            </p>
          </>
        )}

        <p style={s.skiftTekst}>
          {t('reg.harKonto')}{' '}
          <Link to="/login" style={s.link}>{t('reg.logIndHer')}</Link>
        </p>
      </div>
    </div>
  )
}

const s = {
  page: { minHeight: '100vh', background: colors.bg, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '24px 20px' },
  inner: { width: '100%', maxWidth: 400 },

  brand: { display: 'flex', alignItems: 'center', gap: 8, marginBottom: 28, justifyContent: 'center' },
  brandNavn: { fontFamily: font.display, fontWeight: 800, fontSize: 26, color: colors.green, letterSpacing: -1 },

  fremgang: { height: 4, background: colors.border, borderRadius: 999, marginBottom: 6, overflow: 'hidden' },
  fremgangBar: { height: '100%', background: colors.green, borderRadius: 999, transition: 'width 0.3s ease' },
  fremgangTekst: { fontFamily: font.body, fontSize: 12, color: colors.mutedLight, margin: '0 0 20px', fontWeight: 600 },

  overskrift: { fontFamily: font.display, fontWeight: 800, fontSize: 24, color: colors.text, margin: '0 0 6px', letterSpacing: -0.4 },
  underoverskrift: { fontFamily: font.body, fontSize: 14.5, color: colors.muted, margin: '0 0 22px', lineHeight: 1.5 },
  fejlboks: { background: '#FDECEA', border: '1px solid #F5C9C4', borderRadius: 12, padding: '11px 14px', fontFamily: font.body, fontSize: 14, color: colors.red, marginBottom: 16 },

  form: { display: 'flex', flexDirection: 'column' },
  rækkeInput: { display: 'flex', gap: 10, marginBottom: 0 },
  label: { display: 'block', fontFamily: font.body, fontSize: 12.5, fontWeight: 700, color: colors.mutedLight, marginBottom: 7, letterSpacing: 0.3 },
  input: { padding: '13px 14px', fontFamily: font.body, fontSize: 15, color: colors.text, background: colors.card, border: `1.5px solid ${colors.border}`, borderRadius: 13, outline: 'none', marginBottom: 16, boxSizing: 'border-box', width: '100%' },

  pwWrap: { position: 'relative' },
  visBtn: { position: 'absolute', right: 12, top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', fontSize: 18, cursor: 'pointer' },

  styrkeWrap: { display: 'flex', alignItems: 'center', gap: 6, margin: '10px 0 4px' },
  styrkeBar: { flex: 1, height: 4, borderRadius: 999, transition: 'background 0.3s' },
  styrkeTekst: { fontFamily: font.body, fontSize: 12, fontWeight: 700, color: colors.muted, flexShrink: 0 },

  usernameWrap: { position: 'relative', marginBottom: 4 },
  usernameAt: { position: 'absolute', left: 13, top: '50%', transform: 'translateY(-50%)', fontFamily: font.body, fontSize: 15, color: colors.mutedLight, pointerEvents: 'none' },
  usernameTip: { fontFamily: font.body, fontSize: 12, color: colors.mutedLight, margin: '0 0 14px' },

  primærBtn: { padding: '14px', fontFamily: font.body, fontWeight: 700, fontSize: 15, color: '#fff', background: colors.green, border: 'none', borderRadius: radius.button, boxShadow: shadow.fab, cursor: 'pointer' },
  tilbageBtn: { background: 'none', border: 'none', fontFamily: font.body, fontSize: 14, fontWeight: 700, color: colors.green, padding: '0 0 14px', cursor: 'pointer' },

  skiftTekst: { fontFamily: font.body, fontSize: 14, color: colors.muted, textAlign: 'center', marginTop: 24 },
  link: { color: colors.green, fontWeight: 700, textDecoration: 'none' },
  juridisk: { fontFamily: font.body, fontSize: 12, color: colors.mutedLight, textAlign: 'center', marginTop: 16, lineHeight: 1.5 },
}
