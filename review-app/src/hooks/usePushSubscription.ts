import { useState, useEffect, useCallback } from 'react'
import {
  getPushPublicKey,
  subscribePush,
  unsubscribePush,
  type PushSubscriptionJSON,
} from '../lib/api'

type PushStatus = 'unsupported' | 'idle' | 'subscribing' | 'subscribed' | 'denied' | 'error'

function urlBase64ToUint8Array(base64String: string): Uint8Array {
  const padding = '='.repeat((4 - (base64String.length % 4)) % 4)
  const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/')
  const rawData = window.atob(base64)
  const outputArray = new Uint8Array(rawData.length)
  for (let i = 0; i < rawData.length; ++i) {
    outputArray[i] = rawData.charCodeAt(i)
  }
  return outputArray
}

function subscriptionToJSON(sub: PushSubscription): PushSubscriptionJSON {
  const json = sub.toJSON()
  return {
    endpoint: json.endpoint!,
    keys: {
      p256dh: json.keys!.p256dh,
      auth: json.keys!.auth,
    },
  }
}

function getInitialPushStatus(): PushStatus {
  if (!('serviceWorker' in navigator) || !('PushManager' in window)) {
    return 'unsupported'
  }
  if (Notification.permission === 'denied') {
    return 'denied'
  }
  return 'idle'
}

export function usePushSubscription() {
  const [status, setStatus] = useState<PushStatus>(getInitialPushStatus)
  const [error, setError] = useState<string | null>(null)

  // Check for existing subscription on mount via lazy initialization
  useEffect(() => {
    let cancelled = false

    async function checkExisting() {
      try {
        const reg = await navigator.serviceWorker.ready
        const existing = await reg.pushManager.getSubscription()
        if (!cancelled && existing) {
          setStatus('subscribed')
        }
      } catch {
        // SW not ready yet, keep idle
      }
    }

    if (status === 'idle') {
      void checkExisting()
    }

    return () => {
      cancelled = true
    }
  }, [status])

  const subscribe = useCallback(async (): Promise<boolean> => {
    setError(null)

    if (!('serviceWorker' in navigator) || !('PushManager' in window)) {
      setError('此瀏覽器不支援推播通知')
      setStatus('unsupported')
      return false
    }

    if (Notification.permission === 'denied') {
      setError('通知權限已被拒絕，請在瀏覽器設定中重新啟用')
      setStatus('denied')
      return false
    }

    try {
      setStatus('subscribing')

      const permission = await Notification.requestPermission()
      if (permission !== 'granted') {
        setError('通知權限未授予')
        setStatus(permission === 'denied' ? 'denied' : 'idle')
        return false
      }

      const publicKey = await getPushPublicKey()
      if (!publicKey) {
        setError('推播服務尚未配置，請聯繫管理員設定 VAPID 金鑰')
        setStatus('error')
        return false
      }

      const reg = await navigator.serviceWorker.ready
      const applicationServerKey = urlBase64ToUint8Array(publicKey) as BufferSource

      const existing = await reg.pushManager.getSubscription()
      const subscription = existing || await reg.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey,
      })

      const subJSON = subscriptionToJSON(subscription)
      const result = await subscribePush(subJSON)

      if (result.success) {
        setStatus('subscribed')
        return true
      } else {
        setError(result.message || '訂閱推播失敗')
        setStatus('error')
        return false
      }
    } catch (err) {
      const msg = err instanceof Error ? err.message : '訂閱推播時發生錯誤'
      setError(msg)
      setStatus('error')
      return false
    }
  }, [])

  const unsubscribe = useCallback(async (): Promise<boolean> => {
    setError(null)

    try {
      const reg = await navigator.serviceWorker.ready
      const subscription = await reg.pushManager.getSubscription()

      if (subscription) {
        const endpoint = subscription.endpoint
        await subscription.unsubscribe()
        await unsubscribePush(endpoint)
      }

      setStatus('idle')
      return true
    } catch (err) {
      const msg = err instanceof Error ? err.message : '取消訂閱時發生錯誤'
      setError(msg)
      setStatus('error')
      return false
    }
  }, [])

  return {
    status,
    error,
    isSubscribed: status === 'subscribed',
    isSubscribing: status === 'subscribing',
    isUnsupported: status === 'unsupported',
    isDenied: status === 'denied',
    subscribe,
    unsubscribe,
  }
}
