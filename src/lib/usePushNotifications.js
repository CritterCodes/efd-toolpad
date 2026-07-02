'use client';

/**
 * usePushNotifications — client hook for enabling/disabling Web Push in efd-admin.
 *
 * The PWA/Workbox worker is gated behind ENABLE_PWA, so this hook registers a dedicated
 * standalone worker (/push-sw.js) itself rather than relying on navigator.serviceWorker.ready
 * (which never resolves when no SW is registered). Auth is the NextAuth session cookie
 * (same-origin fetch), so no bearer token is needed. Uses the shared VAPID public key.
 */

import { useCallback, useEffect, useState } from 'react';

const VAPID_PUBLIC_KEY = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;
const SW_URL = '/push-sw.js';

function urlBase64ToUint8Array(base64String) {
  const padding = '='.repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/');
  const raw = atob(base64);
  const output = new Uint8Array(raw.length);
  for (let i = 0; i < raw.length; i += 1) output[i] = raw.charCodeAt(i);
  return output;
}

async function getPushRegistration() {
  // Register (idempotent) our dedicated push worker and wait until it's active.
  const reg = await navigator.serviceWorker.register(SW_URL);
  if (reg.active) return reg;
  await navigator.serviceWorker.ready.catch(() => {});
  return navigator.serviceWorker.getRegistration(SW_URL) || reg;
}

export function usePushNotifications() {
  const [supported, setSupported] = useState(false);
  const [permission, setPermission] = useState('default');
  const [subscribed, setSubscribed] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    const isSupported =
      typeof window !== 'undefined' &&
      'serviceWorker' in navigator &&
      'PushManager' in window &&
      'Notification' in window &&
      Boolean(VAPID_PUBLIC_KEY);
    setSupported(isSupported);
    if (!isSupported) return;

    setPermission(Notification.permission);
    (async () => {
      try {
        const reg = await navigator.serviceWorker.getRegistration(SW_URL);
        if (reg) {
          const sub = await reg.pushManager.getSubscription();
          setSubscribed(Boolean(sub));
        }
      } catch { /* ignore */ }
    })();
  }, []);

  const subscribe = useCallback(async () => {
    if (!supported) return { success: false, error: 'Push not supported' };
    setBusy(true);
    setError(null);
    try {
      const perm = await Notification.requestPermission();
      setPermission(perm);
      if (perm !== 'granted') {
        setBusy(false);
        return { success: false, error: 'Permission denied' };
      }

      const reg = await getPushRegistration();
      let sub = await reg.pushManager.getSubscription();
      if (!sub) {
        sub = await reg.pushManager.subscribe({
          userVisibleOnly: true,
          applicationServerKey: urlBase64ToUint8Array(VAPID_PUBLIC_KEY),
        });
      }

      const res = await fetch('/api/push/subscribe', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ subscription: sub.toJSON() }),
      });
      if (!res.ok) throw new Error('Failed to register subscription');

      setSubscribed(true);
      setBusy(false);
      return { success: true };
    } catch (e) {
      setError(e.message);
      setBusy(false);
      return { success: false, error: e.message };
    }
  }, [supported]);

  const unsubscribe = useCallback(async () => {
    if (!supported) return { success: false };
    setBusy(true);
    setError(null);
    try {
      const reg = await navigator.serviceWorker.getRegistration(SW_URL);
      const sub = reg ? await reg.pushManager.getSubscription() : null;
      if (sub) {
        await fetch('/api/push/subscribe', {
          method: 'DELETE',
          headers: { 'Content-Type': 'application/json' },
          credentials: 'include',
          body: JSON.stringify({ endpoint: sub.endpoint }),
        }).catch(() => {});
        await sub.unsubscribe();
      }
      setSubscribed(false);
      setBusy(false);
      return { success: true };
    } catch (e) {
      setError(e.message);
      setBusy(false);
      return { success: false, error: e.message };
    }
  }, [supported]);

  return { supported, permission, subscribed, busy, error, subscribe, unsubscribe };
}

export default usePushNotifications;
