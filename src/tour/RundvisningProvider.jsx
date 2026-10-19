import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { hentAktivBruger } from '../data/auth'
import { TRIN } from './trin'
import { RundvisningContext } from './rundvisningContext'
import { skalViseRundvisning, markerRundvisningSet } from './rundvisningStatus'
import { erFast, erÅben, find, harStørrelse, sætFeltværdi, slipFokus, stien, vent, ventPå } from './dom'
import Rundvisning from './Rundvisning'

const STANDARD_VENTETID = 4000
const GUESSTIMERET_KORTHØJDE = 300

// Kører rundvisningen: åbner siderne og vinduerne, finder elementerne og holder styr på trinene.
// `tilladt` er sand, når brugeren er logget ind og har gennemført onboarding.
export default function RundvisningProvider({ tilladt, children }) {
  const navigate = useNavigate()
  const navigateRef = useRef(navigate)
  useEffect(() => { navigateRef.current = navigate }, [navigate])

  const [aktiv, setAktiv] = useState(false)
  const [visning, setVisning] = useState(null) // { indeks, position, total } når et trin er klar
  const [optaget, setOptaget] = useState(false)

  const kørsel = useRef(0)           // bruges til at afbryde et trin, der er på vej, hvis brugeren trykker videre
  const åbentVindue = useRef(null)   // vinduet rundvisningen selv har åbnet
  const sprunget = useRef(new Set()) // trin der ikke kunne vises (element mangler)
  const aktivRef = useRef(false)
  const tjekketBrugere = useRef(new Set())

  // ── Handlinger i et trin ───────────────────────────────────────────────────

  const kørHandling = useCallback(async (h) => {
    if (h.vent) { await vent(h.vent); return true }
    if (h.medmindre && find(h.medmindre)) return true

    if (h.skriv !== undefined) {
      const felt = await ventPå(() => find(h.i), STANDARD_VENTETID)
      if (!felt) return false
      sætFeltværdi(felt, h.skriv)
      slipFokus()
      await vent(150)
      return true
    }

    if (h.klik) {
      const el = h.valgfri ? find(h.klik) : await ventPå(() => find(h.klik), STANDARD_VENTETID)
      if (!el) return !!h.valgfri
      el.click()
      slipFokus()
      await vent(250)
      return true
    }
    return true
  }, [])

  // ── Vinduer ────────────────────────────────────────────────────────────────

  const lukVindue = useCallback(async () => {
    const vindue = åbentVindue.current
    if (!vindue) return
    åbentVindue.current = null
    const knap = find(vindue.luk)
    if (knap) knap.click()
    await ventPå(() => !erÅben(find(vindue.rod)), 2000)
  }, [])

  // ── Sider ──────────────────────────────────────────────────────────────────

  const sørgForSide = useCallback(async (trin, afbrudt) => {
    const erPå = (sti) => stien().startsWith(sti)
    const gå = async (sti) => {
      navigateRef.current(sti)
      const kom = await ventPå(() => erPå(sti), 3000)
      if (kom) window.scrollTo(0, 0)
      return !!kom
    }

    if (erPå(trin.side)) return true

    if (!trin.åbnVia) return gå(trin.side)

    // Siden har et id i stien (fx en opskrift) og kan kun nås via et tryk. Find hvor i kæden vi er.
    const kæde = trin.åbnVia
    let fra = 0
    for (let i = kæde.length - 1; i >= 0; i--) {
      if (erPå(kæde[i].side)) { fra = i; break }
    }
    for (let i = fra; i < kæde.length; i++) {
      const led = kæde[i]
      if (!erPå(led.side) && !(await gå(led.side))) return false
      if (afbrudt()) return false
      const knap = await ventPå(() => find(led.klik), trin.ventMaks ?? 8000)
      if (!knap || afbrudt()) return false
      const næsteSide = kæde[i + 1]?.side ?? trin.side
      knap.click()
      if (!(await ventPå(() => erPå(næsteSide), 4000))) return false
      window.scrollTo(0, 0)
    }
    return erPå(trin.side)
  }, [])

  // ── Scroll målet ind i billedet og giv plads til forklaringsboksen ────────

  const rulTilSyne = useCallback(async (el) => {
    const justér = () => {
      el.scrollIntoView({ block: 'center', inline: 'nearest', behavior: 'instant' })
      if (erFast(el)) return
      const vh = window.innerHeight
      const r = el.getBoundingClientRect()
      if (r.height + GUESSTIMERET_KORTHØJDE + 48 < vh) {
        const ønsketTop = Math.max(72, (vh - r.height - GUESSTIMERET_KORTHØJDE - 24) / 2)
        window.scrollBy({ top: r.top - ønsketTop, behavior: 'instant' })
      } else {
        el.scrollIntoView({ block: 'start', inline: 'nearest', behavior: 'instant' })
      }
    }

    // Siden kan flytte sig lidt efter første scroll (billeder og lister der indlæses). Justér igen, til den står stille.
    let sidstTop = null
    for (let forsøg = 0; forsøg < 4; forsøg++) {
      justér()
      await vent(120)
      const top = el.getBoundingClientRect().top
      if (sidstTop !== null && Math.abs(top - sidstTop) < 2) break
      sidstTop = top
    }
  }, [])

  // ── Gør ét trin klar. Giver false, hvis det ikke kan vises ────────────────

  const forberedTrin = useCallback(async (trin, afbrudt) => {
    const ønsket = trin.dialog ?? null
    const åbent = åbentVindue.current
    if (åbent && (!ønsket || ønsket.rod !== åbent.rod)) {
      await lukVindue()
      if (afbrudt()) return false
    }

    if (!(await sørgForSide(trin, afbrudt)) || afbrudt()) return false

    if (ønsket && !erÅben(find(ønsket.rod))) {
      const knap = await ventPå(() => find(ønsket.åbn), trin.ventMaks ?? STANDARD_VENTETID)
      if (!knap || afbrudt()) return false
      knap.click()
      åbentVindue.current = ønsket
      const rod = await ventPå(() => (erÅben(find(ønsket.rod)) ? find(ønsket.rod) : null), 3000)
      if (!rod) { åbentVindue.current = null; return false }
      slipFokus()
      await vent(450)
      if (afbrudt()) return false
    } else if (ønsket) {
      åbentVindue.current = ønsket
    }

    for (const h of trin.før ?? []) {
      if (!(await kørHandling(h)) || afbrudt()) return false
    }

    if (trin.mål) {
      const ventetid = trin.valgfri ? (trin.ventMaks ?? 800) : (trin.ventMaks ?? STANDARD_VENTETID)
      const el = await ventPå(() => {
        const e = find(trin.mål)
        return harStørrelse(e) ? e : null
      }, ventetid)
      if (!el || afbrudt()) return false
      await rulTilSyne(el)
    } else {
      window.scrollTo(0, 0)
    }
    return !afbrudt()
  }, [kørHandling, lukVindue, rulTilSyne, sørgForSide])

  // ── Gå til et trin (springer over trin, der ikke kan vises) ───────────────

  const afslut = useCallback(async () => {
    kørsel.current++
    aktivRef.current = false
    await lukVindue()
    setAktiv(false)
    setVisning(null)
    setOptaget(false)
    markerRundvisningSet(hentAktivBruger()?.id)
  }, [lukVindue])

  const gåTil = useCallback(async (fraIndeks, startRetning) => {
    const token = ++kørsel.current
    const afbrudt = () => token !== kørsel.current
    setOptaget(true)

    let i = fraIndeks
    let retning = startRetning
    let vendtOm = false
    for (;;) {
      if (i < 0 || i >= TRIN.length) {
        // Ingen flere trin i den retning. Fremad = færdig. Bagud = prøv forfra, én gang.
        if (retning > 0 || vendtOm) { afslut(); return }
        vendtOm = true
        retning = 1
        i = 0
        continue
      }
      const ok = await forberedTrin(TRIN[i], afbrudt).catch(() => false)
      if (afbrudt()) return
      if (ok) {
        sprunget.current.delete(i)
        let antalSprungetFør = 0
        sprunget.current.forEach((s) => { if (s < i) antalSprungetFør++ })
        setVisning({
          indeks: i,
          position: i + 1 - antalSprungetFør,
          total: TRIN.length - sprunget.current.size,
          erSidste: i === TRIN.length - 1,
        })
        setOptaget(false)
        return
      }
      sprunget.current.add(i)
      i += retning
    }
  }, [afslut, forberedTrin])

  const start = useCallback(() => {
    if (aktivRef.current) return
    aktivRef.current = true
    sprunget.current = new Set()
    setAktiv(true)
    gåTil(0, 1)
  }, [gåTil])

  const næste = useCallback(() => {
    if (!visning) return
    if (visning.erSidste) afslut()
    else gåTil(visning.indeks + 1, 1)
  }, [visning, afslut, gåTil])

  const tilbage = useCallback(() => {
    if (!visning || visning.indeks === 0) return
    gåTil(visning.indeks - 1, -1)
  }, [visning, gåTil])

  // ── Start automatisk for nye brugere ───────────────────────────────────────

  useEffect(() => {
    if (!tilladt) return
    const bruger = hentAktivBruger()
    if (!bruger?.id || tjekketBrugere.current.has(bruger.id)) return
    tjekketBrugere.current.add(bruger.id)
    skalViseRundvisning(bruger.id).then((skal) => { if (skal) start() })
  }, [tilladt, start])

  // ── Mens rundvisningen kører: lås siden, så der ikke kan trykkes eller rulles bagved ──

  useEffect(() => {
    if (!aktiv) return undefined
    const rod = document.getElementById('root')
    const før = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    if (rod) rod.inert = true
    return () => {
      document.body.style.overflow = før
      if (rod) rod.inert = false
    }
  }, [aktiv])

  const værdi = useMemo(() => ({ start, aktiv }), [start, aktiv])

  return (
    <RundvisningContext.Provider value={værdi}>
      {children}
      {aktiv && (
        <Rundvisning
          trin={visning ? TRIN[visning.indeks] : null}
          visning={visning}
          optaget={optaget}
          onNæste={næste}
          onTilbage={tilbage}
          onLuk={afslut}
        />
      )}
    </RundvisningContext.Provider>
  )
}
