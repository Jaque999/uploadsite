import { createClient } from "@supabase/supabase-js";

function getServiceClient() {
  const url = process.env.SUPABASE_URL as string;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY as string;
  if (!url || !key) throw new Error("Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY");
  return createClient(url, key, { auth: { persistSession: false } });
}

export async function createSignedUploadUrls(bucket: string, objects: { path: string }[]) {
  const supabase = getServiceClient();
  const results: { path: string; url: string }[] = [];
  for (const obj of objects) {
    const { data, error } = await supabase.storage.from(bucket).createSignedUploadUrl(obj.path);
    if (error || !data) throw error ?? new Error("Failed to create signed upload URL");
    results.push({ path: obj.path, url: data.signedUrl });
  }
  return results;
}

export async function createSignedDownloadUrls(bucket: string, objects: { path: string; expiresIn?: number }[], defaultExpires = 60 * 10) {
  const supabase = getServiceClient();
  const results: { path: string; url: string }[] = [];
  for (const obj of objects) {
    const { data, error } = await supabase.storage.from(bucket).createSignedUrl(obj.path, obj.expiresIn ?? defaultExpires);
    if (error || !data) throw error ?? new Error("Failed to create signed download URL");
    results.push({ path: obj.path, url: data.signedUrl });
  }
  return results;
}


