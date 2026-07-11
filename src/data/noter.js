import { supabase } from '../lib/supabase'
import { hentAktivBruger } from './auth'

const LS_KEY = (id) => `brynjas_noter_${id}`

export async function hentNote(recipeId) {
  const bruger = hentAktivBruger()
  if (!bruger?.id) {
    try { return localStorage.getItem(LS_KEY(recipeId)) ?? '' } catch { return '' }
  }
  const { data, error } = await supabase
    .from('noter')
    .select('indhold')
    .eq('user_id', bruger.id)
    .eq('recipe_id', recipeId)
    .maybeSingle()
  if (error) {
    // Tabellen mangler endnu — fallback til localStorage
    try { return localStorage.getItem(LS_KEY(recipeId)) ?? '' } catch { return '' }
  }
  return data?.indhold ?? ''
}

export async function gemNote(recipeId, indhold) {
  const bruger = hentAktivBruger()
  if (!bruger?.id) {
    try { localStorage.setItem(LS_KEY(recipeId), indhold) } catch {}
    return
  }
  if (!indhold.trim()) {
    await supabase.from('noter').delete()
      .eq('user_id', bruger.id)
      .eq('recipe_id', recipeId)
    return
  }
  const { error } = await supabase.from('noter').upsert(
    { user_id: bruger.id, recipe_id: recipeId, indhold, opdateret_at: new Date().toISOString() },
    { onConflict: 'user_id,recipe_id' },
  )
  if (error) {
    // Tabellen mangler — gem lokalt som fallback
    try { localStorage.setItem(LS_KEY(recipeId), indhold) } catch {}
  }
}
