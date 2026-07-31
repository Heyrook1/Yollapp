/**
 * Signed URL helper for courier vetting documents.
 * Full upload UI is deferred until Supabase Storage is configured.
 */
export function buildVettingDocumentPath(userId: string, fileName: string): string {
  const safeName = fileName.replace(/[^a-zA-Z0-9._-]/g, "_");
  return `courier-vetting/${userId}/${Date.now()}-${safeName}`;
}
