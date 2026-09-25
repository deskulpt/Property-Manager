import "server-only"
import { getDb } from "@/lib/db"

export type Notice = {
  userId: string
  title: string
  body: string
  href?: string
}

/**
 * Queue-shaped notification boundary. Callers enqueue; a worker drains.
 * The demo worker runs in-process and writes an in-app row plus demo
 * email and web-push log rows. Swap the drain target for a real broker
 * without changing call sites.
 */
export interface NotificationQueue {
  enqueue(notice: Notice): void
  drain(): number
}

class DemoNotificationQueue implements NotificationQueue {
  private pending: Notice[] = []

  enqueue(notice: Notice) {
    this.pending.push(notice)
  }

  drain() {
    const batch = this.pending.splice(0, this.pending.length)
    if (batch.length === 0) return 0
    const db = getDb()
    const insert = db.prepare(
      `INSERT INTO notifications (id, user_id, title, body, href, read_at, created_at, channel)
       VALUES (?, ?, ?, ?, ?, NULL, ?, ?)`,
    )
    const now = new Date().toISOString()
    for (const notice of batch) {
      insert.run(
        crypto.randomUUID(),
        notice.userId,
        notice.title,
        notice.body,
        notice.href ?? null,
        now,
        "in_app",
      )
      insert.run(
        crypto.randomUUID(),
        notice.userId,
        notice.title,
        notice.body,
        notice.href ?? null,
        now,
        "email_demo",
      )
      insert.run(
        crypto.randomUUID(),
        notice.userId,
        notice.title,
        notice.body,
        notice.href ?? null,
        now,
        "push_demo",
      )
    }
    return batch.length
  }
}

const globalQueue = globalThis as unknown as {
  __deskulptQueue?: DemoNotificationQueue
}

export function notificationQueue() {
  if (!globalQueue.__deskulptQueue) {
    globalQueue.__deskulptQueue = new DemoNotificationQueue()
  }
  return globalQueue.__deskulptQueue
}

export function notify(notice: Notice) {
  const queue = notificationQueue()
  queue.enqueue(notice)
  queue.drain()
}

export function notifyMany(notices: Notice[]) {
  const queue = notificationQueue()
  for (const notice of notices) queue.enqueue(notice)
  queue.drain()
}
