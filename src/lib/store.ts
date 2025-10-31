export type StoredFileMeta = { name: string; size: number; type?: string; storageKey: string };

export type UploadRecord = {
  id: string;
  tokenHash: string;
  expiry: number | null;
  maxDownloads: number | null;
  downloadCount: number;
  passwordProtected: boolean;
  clientEncrypted: boolean;
  createdAt: number;
  files: StoredFileMeta[];
};

import { createClient } from "@supabase/supabase-js";

function getServiceClient() {
  const url = process.env.SUPABASE_URL as string;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY as string;
  if (!url || !key) throw new Error("Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY");
  return createClient(url, key, { auth: { persistSession: false } });
}

export async function putUpload(record: UploadRecord): Promise<void> {
  const supabase = getServiceClient();
  const { id, tokenHash, expiry, maxDownloads, passwordProtected, clientEncrypted, createdAt } = record;
  const { error: upErr } = await supabase.from("uploads").insert({
    id,
    token_hash: tokenHash,
    expiry,
    max_downloads: maxDownloads,
    download_count: record.downloadCount,
    password_protected: passwordProtected,
    client_encrypted: clientEncrypted,
    created_at: new Date(createdAt).toISOString(),
  });
  if (upErr) throw upErr;

  if (record.files?.length) {
    const filesRows = record.files.map((f) => ({
      upload_id: id,
      name: f.name,
      size: f.size,
      type: f.type ?? null,
      storage_key: f.storageKey,
    }));
    const { error: filesErr } = await supabase.from("files").insert(filesRows);
    if (filesErr) throw filesErr;
  }
}

export async function findByTokenHash(tokenHash: string): Promise<UploadRecord | undefined> {
  const supabase = getServiceClient();
  const { data, error } = await supabase
    .from("uploads")
    .select("id, token_hash, expiry, max_downloads, download_count, password_protected, client_encrypted, created_at, files:files(name, size, type, storage_key)")
    .eq("token_hash", tokenHash)
    .limit(1)
    .maybeSingle();
  if (error) throw error;
  if (!data) return undefined;
  return {
    id: data.id,
    tokenHash: data.token_hash,
    expiry: data.expiry,
    maxDownloads: data.max_downloads,
    downloadCount: data.download_count,
    passwordProtected: data.password_protected,
    clientEncrypted: data.client_encrypted,
    createdAt: Date.parse(data.created_at),
    files: (data.files ?? []).map((f: any) => ({ name: f.name, size: f.size, type: f.type ?? undefined, storageKey: f.storage_key })),
  };
}

export async function incrementDownload(id: string): Promise<void> {
  const supabase = getServiceClient();
  const { error } = await supabase.rpc("increment_download", { p_upload_id: id });
  if (error) throw error;
}

export async function purgeExpired(now = Date.now()): Promise<void> {
  const supabase = getServiceClient();
  const { error } = await supabase.from("uploads").delete().lt("expiry", now).neq("expiry", null);
  if (error) throw error;
}

