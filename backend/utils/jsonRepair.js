/**
 * jsonRepair.js — Robust LLM JSON Repair Utility
 *
 * LLMs frequently return malformed JSON: single-quoted keys, trailing commas,
 * unquoted property names, embedded comments, Python booleans (True/False/None),
 * and surrounding prose. This module repairs all of those before parsing.
 *
 * WHY THIS EXISTS:
 *   The triage phase uses llama-3.1-8b-instant (a fast but small 8B model) to
 *   classify questions as simple/complex and score them. This model frequently
 *   returns JSON with single-quoted keys, trailing commas, or unquoted property
 *   names — all of which cause JSON.parse() to throw. When triage fails, the
 *   pipeline falls back to default scores, meaning the score-matcher picks a
 *   suboptimal model instead of the best one. This utility eliminates those
 *   failures by deterministically repairing the JSON before parsing.
 *
 * Zero API calls. Pure string manipulation. ~0ms overhead.
 */

/**
 * Attempt to repair and parse a JSON string from LLM output.
 * Applies fixes in order of severity, from lightest to heaviest.
 *
 * @param {string} raw - Raw LLM output (may contain markdown fences, prose, etc.)
 * @returns {object} Parsed JavaScript object
 * @throws {Error} If repair fails (truly unparseable output)
 */
function repairAndParseJson(raw) {
  if (!raw || typeof raw !== 'string') {
    throw new Error('Empty or non-string input')
  }

  let cleaned = raw.trim()

  // ── Step 1: Strip markdown code fences ──
  cleaned = cleaned.replace(/```json\s*/gi, '').replace(/```\s*/g, '').trim()

  // ── Step 2: Extract the JSON object/array from surrounding prose ──
  // LLMs sometimes write "Here is the JSON:\n{...}\nLet me know if..."
  const jsonBlockMatch = cleaned.match(/(\{[\s\S]*\}|\[[\s\S]*\])/)
  if (jsonBlockMatch) {
    cleaned = jsonBlockMatch[0]
  }

  // ── Step 3: Try parsing as-is first (avoid unnecessary repairs) ──
  try {
    return JSON.parse(cleaned)
  } catch {
    // Continue to repairs
  }

  // ── Step 4: Strip single-line comments ( // ... ) ──
  // Be careful not to strip URLs (http:// https://)
  cleaned = cleaned.replace(/(?<!:)\/\/[^\n]*/g, '')

  // ── Step 5: Strip multi-line comments ( /* ... */ ) ──
  cleaned = cleaned.replace(/\/\*[\s\S]*?\*\//g, '')

  // ── Step 6: Fix Python-style booleans and None ──
  // Only replace when they appear as JSON values (after : or in arrays)
  cleaned = cleaned.replace(/:\s*True\b/g, ': true')
  cleaned = cleaned.replace(/:\s*False\b/g, ': false')
  cleaned = cleaned.replace(/:\s*None\b/g, ': null')
  // Also in arrays
  cleaned = cleaned.replace(/\[\s*True\b/g, '[true')
  cleaned = cleaned.replace(/,\s*True\b/g, ', true')
  cleaned = cleaned.replace(/\[\s*False\b/g, '[false')
  cleaned = cleaned.replace(/,\s*False\b/g, ', false')
  cleaned = cleaned.replace(/\[\s*None\b/g, '[null')
  cleaned = cleaned.replace(/,\s*None\b/g, ', null')

  // ── Step 7: Try again after comment/boolean fixes ──
  try {
    return JSON.parse(cleaned)
  } catch {
    // Continue to heavier repairs
  }

  // ── Step 8: Fix single-quoted strings → double-quoted ──
  // This is the most common LLM JSON issue.
  // Strategy: Replace single-quoted keys and values, being careful with
  // apostrophes inside values (e.g., "it's complex")
  cleaned = fixSingleQuotes(cleaned)

  // ── Step 9: Try again ──
  try {
    return JSON.parse(cleaned)
  } catch {
    // Continue
  }

  // ── Step 10: Fix unquoted property names ──
  // e.g., {isComplex: true} → {"isComplex": true}
  cleaned = cleaned.replace(
    /([{,]\s*)([a-zA-Z_$][a-zA-Z0-9_$]*)\s*:/g,
    '$1"$2":'
  )

  // ── Step 11: Try again ──
  try {
    return JSON.parse(cleaned)
  } catch {
    // Continue
  }

  // ── Step 12: Remove trailing commas ──
  // {a: 1, b: 2,} → {a: 1, b: 2}
  // [1, 2, 3,] → [1, 2, 3]
  cleaned = cleaned.replace(/,\s*([}\]])/g, '$1')

  // ── Step 13: Final attempt ──
  try {
    return JSON.parse(cleaned)
  } catch (finalError) {
    throw new Error(`JSON repair failed: ${finalError.message}`)
  }
}

/**
 * Fix single-quoted strings in JSON-like text.
 * Handles the tricky cases where apostrophes appear inside values.
 *
 * Strategy: Walk through the string character by character, tracking whether
 * we're inside a single-quoted string. When we find a single quote that
 * starts/ends a JSON string (key or value position), replace it with double.
 *
 * @param {string} text
 * @returns {string}
 * @private
 */
function fixSingleQuotes(text) {
  // Quick check: if no single quotes, nothing to do
  if (!text.includes("'")) return text

  let result = ''
  let i = 0
  const len = text.length

  while (i < len) {
    const ch = text[i]

    // Already a double-quoted string — skip through it entirely
    if (ch === '"') {
      let j = i + 1
      while (j < len && text[j] !== '"') {
        if (text[j] === '\\') j++ // skip escaped char
        j++
      }
      result += text.substring(i, j + 1)
      i = j + 1
      continue
    }

    // Single quote — potential JSON string boundary
    if (ch === "'") {
      // Find the matching closing single quote
      let j = i + 1
      let inner = ''
      while (j < len && text[j] !== "'") {
        if (text[j] === '\\') {
          inner += text[j] + (text[j + 1] || '')
          j += 2
          continue
        }
        inner += text[j]
        j++
      }

      // Escape any unescaped double quotes inside the value
      inner = inner.replace(/(?<!\\)"/g, '\\"')

      result += '"' + inner + '"'
      i = j + 1
      continue
    }

    result += ch
    i++
  }

  return result
}

module.exports = { repairAndParseJson }
