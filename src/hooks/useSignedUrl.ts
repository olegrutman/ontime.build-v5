import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';

/**
 * Storage buckets holding jobsite media are private. Files must be read through
 * short-lived signed URLs instead of public URLs.
 */

/** Accepts either a storage path or a legacy public/signed URL and returns the object path. */
export function storagePathFromUrl(value: string, bucket: string): string {
  if (!value) return value;
  if (!value.startsWith('http')) return value.replace(/^\/+/, '');
  const marker = `/${bucket}/`;
  const idx = value.indexOf(marker);
  if (idx === -1) return value;
  return value.slice(idx + marker.length).split('?')[0];
}

export async function getSignedStorageUrl(
  bucket: string,
  pathOrUrl: string,
  expiresIn = 3600,
): Promise<string | null> {
  if (!pathOrUrl) return null;
  const path = storagePathFromUrl(pathOrUrl, bucket);
  const { data, error } = await supabase.storage.from(bucket).createSignedUrl(path, expiresIn);
  if (error) return null;
  return data?.signedUrl ?? null;
}

export function useSignedUrl(
  bucket: string,
  pathOrUrl: string | null | undefined,
  expiresIn = 3600,
): string | null {
  const [url, setUrl] = useState<string | null>(null);

  useEffect(() => {
    let active = true;
    if (!pathOrUrl) {
      setUrl(null);
      return;
    }
    getSignedStorageUrl(bucket, pathOrUrl, expiresIn).then(signed => {
      if (active) setUrl(signed);
    });
    return () => {
      active = false;
    };
  }, [bucket, pathOrUrl, expiresIn]);

  return url;
}
