/**
 * Browser-side direct upload: ask the server to sign a PUT, then send the file straight to MinIO.
 *
 * The whole point is that the bytes never touch a serverless function, whose request body is capped at
 * ~4.5 MB. A design's or CAD work order's STL is the MANUFACTURING file that goes to Carrera to cast
 * from — one real file is 91 MB — so shrinking it isn't an option and the transport had to change.
 *
 * Returns `{ url, key }` — the public url that design/piece records store, AND the storage key the
 * server chose.
 *
 * RETURNING THE KEY IS THE POINT. It used to return the url alone, so callers reconstructed the key by
 * string surgery: `new URL(url).pathname.split('/').slice(2).join('/')`. That hardcodes "exactly one
 * path segment precedes the key", which only holds when MINIO_PUBLIC_URL has no path of its own —
 * storageUrl() builds `${MINIO_PUBLIC_URL}/${BUCKET}/${key}`, so any base with a path shifts every
 * segment and the derived key comes out wrong. attach-stl then correctly refuses it with "That file
 * does not belong to this work order", and a 91 MB upload that actually succeeded looks like a failure.
 *
 * The presign response already carries the exact key. Passing it through removes the guess.
 */
export async function directUpload(file, { scope, id, onProgress } = {}) {
  if (!file) throw new Error('No file selected.');

  const presignRes = await fetch('/api/uploads/presign', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      scope, id,
      filename: file.name,
      contentType: file.type || 'application/octet-stream',
      size: file.size,
    }),
  });
  const signed = await presignRes.json().catch(() => ({}));
  if (!presignRes.ok) throw new Error(signed.error || 'Could not prepare the upload.');

  await putWithProgress(signed.uploadUrl, file, signed.headers || {}, onProgress);
  return { url: signed.publicUrl, key: signed.key };
}

/**
 * XHR rather than fetch: fetch gives no upload-progress events, and a 91 MB file with no feedback looks
 * indistinguishable from a hang. Resolves on 2xx, rejects with the server's text otherwise.
 */
function putWithProgress(url, file, headers, onProgress) {
  return new Promise((resolve, reject) => {
    const xhr = new XMLHttpRequest();
    xhr.open('PUT', url, true);
    // Only the headers that were SIGNED may be sent — anything extra breaks the signature.
    for (const [k, v] of Object.entries(headers)) xhr.setRequestHeader(k, v);

    if (typeof onProgress === 'function') {
      xhr.upload.onprogress = (e) => {
        if (e.lengthComputable) onProgress(Math.round((e.loaded / e.total) * 100));
      };
    }
    xhr.onload = () => {
      if (xhr.status >= 200 && xhr.status < 300) resolve();
      // MinIO returns XML on failure; surface a trimmed hint rather than a bare status.
      else reject(new Error(`Upload failed (${xhr.status}). ${String(xhr.responseText || '').slice(0, 200)}`));
    };
    xhr.onerror = () => reject(new Error(
      'Upload failed — the storage server could not be reached, or blocked the request (CORS).',
    ));
    xhr.onabort = () => reject(new Error('Upload cancelled.'));
    xhr.send(file);
  });
}
