const KEY = 'simmer_indkøbsliste'

export function hentIndkøbsliste() {
  try { return JSON.parse(localStorage.getItem(KEY)) ?? [] } catch { return [] }
}

export function gemIndkøbsliste(liste) {
  try { localStorage.setItem(KEY, JSON.stringify(liste)) } catch {}
}

// Tilføj array af varer — deduplicerer på navn (samme enhedstype slås sammen)
export function tilføjTilIndkøbsliste(nyeVarer) {
  const liste = hentIndkøbsliste()
  const opdateret = [...liste]
  for (const ny of nyeVarer) {
    const eksIdx = opdateret.findIndex(
      (v) => v.navn.toLowerCase() === ny.navn.toLowerCase() && !v.tjekket
    )
    if (eksIdx >= 0) {
      // Eksisterende — tilføj opskrift-reference hvis ikke allerede der
      const eks = opdateret[eksIdx]
      const refs = eks.opskriftRefs ?? (eks.opskriftTitel ? [{ titel: eks.opskriftTitel, id: eks.opskriftId }] : [])
      if (ny.opskriftTitel && !refs.some((r) => r.id === ny.opskriftId)) {
        refs.push({ titel: ny.opskriftTitel, id: ny.opskriftId })
      }
      opdateret[eksIdx] = { ...eks, opskriftRefs: refs }
    } else {
      opdateret.push({
        id: `${Date.now()}-${Math.random().toString(36).slice(2)}`,
        navn: ny.navn,
        mængde: ny.mængde ?? null,
        enhed: ny.enhed ?? null,
        emoji: ny.emoji ?? '🥄',
        kategori: ny.kategori ?? 'tørvarer',
        opskriftTitel: ny.opskriftTitel ?? null,
        opskriftId: ny.opskriftId ?? null,
        opskriftRefs: ny.opskriftTitel ? [{ titel: ny.opskriftTitel, id: ny.opskriftId }] : [],
        tjekket: false,
      })
    }
  }
  gemIndkøbsliste(opdateret)
  return opdateret
}

export function toggleTjekket(id) {
  const liste = hentIndkøbsliste().map((v) =>
    v.id === id ? { ...v, tjekket: !v.tjekket } : v
  )
  gemIndkøbsliste(liste)
  return liste
}

export function fjernFraIndkøbsliste(id) {
  const liste = hentIndkøbsliste().filter((v) => v.id !== id)
  gemIndkøbsliste(liste)
  return liste
}

export function rydTjekkede() {
  const liste = hentIndkøbsliste().filter((v) => !v.tjekket)
  gemIndkøbsliste(liste)
  return liste
}

// Returnerer de tjekkede varer som lager-format, og rydder dem fra listen
export function flytTjekkede() {
  const alle = hentIndkøbsliste()
  const tjekkede = alle.filter((v) => v.tjekket)
  const resten = alle.filter((v) => !v.tjekket)
  gemIndkøbsliste(resten)
  return {
    ryddet: resten,
    lagerVarer: tjekkede.map((v) => ({
      id: Date.now() + Math.random(),
      navn: v.navn,
      mængde: v.mængde ?? '',
      enhed: v.enhed ?? 'stk',
      kategori: v.kategori ?? 'tørvarer',
      emoji: v.emoji ?? '🥄',
      udløb: null,
      snartTom: false,
    })),
  }
}
