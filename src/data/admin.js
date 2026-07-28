// Admin-adgang til opskrift-godkendelse.
// Simpel hardkodet e-mail-tjek — appen har ikke et rolle-system endnu.
export const ADMIN_EMAIL = 'mikbjorns@gmail.com'

export function erAdmin(bruger) {
  return bruger?.email?.toLowerCase() === ADMIN_EMAIL
}
