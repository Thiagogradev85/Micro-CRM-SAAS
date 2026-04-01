/**
 * In-memory store for the current WhatsApp bulk send progress.
 * Only one job runs at a time (single WhatsApp connection).
 */

let _job = null

export const progressStore = {
  /** Start a new job */
  start(total) {
    _job = {
      total,
      current: 0,
      sent: 0,
      failed: 0,
      status: 'sending', // 'sending' | 'done'
      startedAt: Date.now(),
      finishedAt: null,
    }
  },

  /** Update progress after each message */
  update({ current, sent, failed }) {
    if (!_job) return
    _job.current = current
    _job.sent    = sent
    _job.failed  = failed
  },

  /** Mark job as completed */
  finish({ sent, failed }) {
    if (!_job) return
    _job.status     = 'done'
    _job.sent       = sent
    _job.failed     = failed
    _job.current    = _job.total
    _job.finishedAt = Date.now()
  },

  /** Returns current job or null */
  get() {
    return _job
  },

  /** Clear after frontend acknowledges completion */
  clear() {
    _job = null
  },
}
