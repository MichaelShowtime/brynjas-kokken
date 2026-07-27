import { databases, DB_ID, COL, Query, ID } from '../lib/appwrite'
import { Permission, Role } from 'appwrite'

export async function hentRatingsForOpskrift(recipeId) {
  const res = await databases.listDocuments(DB_ID, COL.ratings, [
    Query.equal('recipe_id', recipeId),
    Query.limit(500),
  ])
  return res.documents
}

export async function gemRating(recipeId, rating, note, brugerId) {
  const res = await databases.listDocuments(DB_ID, COL.ratings, [
    Query.equal('user_id', brugerId),
    Query.equal('recipe_id', recipeId),
    Query.limit(1),
  ])
  const existing = res.documents[0]
  const now = new Date().toISOString()

  if (existing) {
    return databases.updateDocument(DB_ID, COL.ratings, existing.$id, {
      rating,
      note: note ?? '',
      updated_at: now,
    })
  }

  return databases.createDocument(DB_ID, COL.ratings, ID.unique(), {
    user_id:    brugerId,
    recipe_id:  recipeId,
    rating,
    note:       note ?? '',
    created_at: now,
    updated_at: now,
  }, [
    Permission.read(Role.any()),
    Permission.update(Role.user(brugerId)),
    Permission.delete(Role.user(brugerId)),
  ])
}
