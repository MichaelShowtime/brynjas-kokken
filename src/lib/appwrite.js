import { Client, Databases, Account, Storage, Query, ID } from 'appwrite'

const client = new Client()
  .setEndpoint(import.meta.env.VITE_APPWRITE_ENDPOINT)
  .setProject(import.meta.env.VITE_APPWRITE_PROJECT_ID)

export const account  = new Account(client)
export const databases = new Databases(client)
export const storage  = new Storage(client)
export { Query, ID, client }

// Database + collection IDs
export const DB_ID = import.meta.env.VITE_APPWRITE_DATABASE_ID

export const COL = {
  recipes:         import.meta.env.VITE_APPWRITE_COL_RECIPES,
  customers:       import.meta.env.VITE_APPWRITE_COL_CUSTOMERS,
  venner:          import.meta.env.VITE_APPWRITE_COL_VENNER,
  posts:           import.meta.env.VITE_APPWRITE_COL_POSTS,
  post_likes:      import.meta.env.VITE_APPWRITE_COL_POST_LIKES,
  post_kommentarer:import.meta.env.VITE_APPWRITE_COL_POST_KOMMENTARER,
  saved_recipes:   import.meta.env.VITE_APPWRITE_COL_SAVED_RECIPES,
  noter:           import.meta.env.VITE_APPWRITE_COL_NOTER,
  user_badges:     import.meta.env.VITE_APPWRITE_COL_USER_BADGES,
}

export const BUCKET_ID = import.meta.env.VITE_APPWRITE_BUCKET_ID
