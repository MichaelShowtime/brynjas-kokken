// Husker om en bruger har set (eller sprunget over) rundvisningen.
// Primært på brugerens Appwrite-konto (account prefs), så den ikke vises igen på en ny enhed.
// localStorage er reserve, hvis kontoen ikke kan nås (fx uden net).

import { account } from '../lib/appwrite'

const PREF_NØGLE = 'rundvisning_set'
const lokalNøgle = (brugerId) => `brynjas_rundvisning_set_${brugerId}`

function harSetLokalt(brugerId) {
  try { return localStorage.getItem(lokalNøgle(brugerId)) === '1' } catch { return false }
}

function sætSetLokalt(brugerId) {
  try { localStorage.setItem(lokalNøgle(brugerId), '1') } catch { /* ignorer */ }
}

export async function skalViseRundvisning(brugerId) {
  if (!brugerId) return false
  if (harSetLokalt(brugerId)) return false
  try {
    const prefs = await account.getPrefs()
    if (prefs?.[PREF_NØGLE]) {
      sætSetLokalt(brugerId)
      return false
    }
  } catch { /* kontoen kan ikke nås — gå ud fra localStorage */ }
  return true
}

export async function markerRundvisningSet(brugerId) {
  if (!brugerId) return
  sætSetLokalt(brugerId)
  try {
    // updatePrefs erstatter hele objektet, så vi henter de eksisterende værdier først
    const prefs = await account.getPrefs()
    await account.updatePrefs({ ...prefs, [PREF_NØGLE]: true })
  } catch { /* localStorage-reserven dækker */ }
}
