import { databases, DB_ID, COL, Query, ID } from '../lib/appwrite'
import { hentAktivBruger } from './auth'

const LS_KEY = (id) => `brynjas_noter_${id}`

export async function hentNote(recipeId) {
  const bruger = hentAktivBruger()
  if (!bruger?.id) {
    try { return localStorage.getItem(LS_KEY(recipeId)) ?? '' } catch { return '' }
  }
  try {
    const res = await databases.listDocuments(DB_ID, COL.noter, [
      Query.equal('user_id', bruger.id),
      Query.equal('recipe_id', recipeId),
      Query.limit(1),
    ])
    return res.documents[0]?.indhold ?? ''
  } catch {
    try { return localStorage.getItem(LS_KEY(recipeId)) ?? '' } catch { return '' }
  }
}

export async function gemNote(recipeId, indhold) {
  const bruger = hentAktivBruger()
  if (!bruger?.id) {
    try { localStorage.setItem(LS_KEY(recipeId), indhold) } catch {}
    return
  }
  try {
    const res = await databases.listDocuments(DB_ID, COL.noter, [
      Query.equal('user_id', bruger.id),
      Query.equal('recipe_id', recipeId),
      Query.limit(1),
    ])
    const eksisterende = res.documents[0]

    if (!indhold.trim()) {
      if (eksisterende) await databases.deleteDocument(DB_ID, COL.noter, eksisterende.$id)
      return
    }

    if (eksisterende) {
      await databases.updateDocument(DB_ID, COL.noter, eksisterende.$id, { indhold })
    } else {
      await databases.createDocument(DB_ID, COL.noter, ID.unique(), {
        user_id: bruger.id, recipe_id: recipeId, indhold,
      })
    }
  } catch {
    try { localStorage.setItem(LS_KEY(recipeId), indhold) } catch {}
  }
}
