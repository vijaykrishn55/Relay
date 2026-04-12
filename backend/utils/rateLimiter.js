/**
 * Rate Limiter : Hive Mind
 * 
 * Tracks per-model API usage with sliding windows for RPM and RPD.
 * Used by the Strategy phase to avoid assigning rate-limited models.
 */

class RateLimiter {
  constructor() {
    // modelId → { minuteCount, dayCount, lastMinuteReset, lastDayReset }
    this.usage = new Map()
  }

  /**
   * Check if a model can accept another request without exceeding rate limits.
   * @param {number} modelId
   * @param {object} rateLimit - The model's rate limit config { rpm, rpd, tpm, tpd }
   * @returns {boolean}
   */
  canUse(modelId, rateLimit) {
    if (!rateLimit) return true

    const now = Date.now()
    const usage = this._getUsage(modelId, now)

    const rpm = rateLimit.rpm || Infinity
    const rpd = rateLimit.rpd || Infinity

    return usage.minuteCount < rpm && usage.dayCount < rpd
  }

  /**
   * Record a successful request to a model.
   * @param {number} modelId
   */
  record(modelId) {
    const now = Date.now()
    const usage = this._getUsage(modelId, now)
    usage.minuteCount++
    usage.dayCount++
    this.usage.set(modelId, usage)
  }

  /**
   * Get remaining capacity for a model.
   * Returns { rpm: remaining, rpd: remaining }
   */
  getRemaining(modelId, rateLimit) {
    if (!rateLimit) return { rpm: Infinity, rpd: Infinity }

    const now = Date.now()
    const usage = this._getUsage(modelId, now)

    const rpm = rateLimit.rpm || Infinity
    const rpd = rateLimit.rpd || Infinity

    return {
      rpm: Math.max(0, rpm - usage.minuteCount),
      rpd: Math.max(0, rpd - usage.dayCount)
    }
  }

  /**
   * Get usage data with window resets applied.
   * @private
   */
  _getUsage(modelId, now) {
    let usage = this.usage.get(modelId)

    if (!usage) {
      usage = {
        minuteCount: 0,
        dayCount: 0,
        lastMinuteReset: now,
        lastDayReset: now
      }
      this.usage.set(modelId, usage)
      return usage
    }

    // Reset minute window if >60 seconds
    if (now - usage.lastMinuteReset > 60000) {
      usage.minuteCount = 0
      usage.lastMinuteReset = now
    }

    // Reset day window if >24 hours
    if (now - usage.lastDayReset > 86400000) {
      usage.dayCount = 0
      usage.lastDayReset = now
    }

    return usage
  }

  /**
   * Reset all tracking data (useful for testing).
   */
  reset() {
    this.usage.clear()
  }
}

// Export singleton instance — shared across all services
module.exports = new RateLimiter()
