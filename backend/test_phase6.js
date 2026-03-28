// Quick validation of all Phase 6 modules
const modules = [
  ['data/modelScores', './data/modelScores'],
  ['utils/rateLimiter', './utils/rateLimiter'],
  ['services/scoreMatcher', './services/scoreMatcher'],
  ['services/modelConversation', './services/modelConversation'],
  ['services/decomposerService', './services/decomposerService'],
  ['services/strategistService', './services/strategistService'],
  ['services/executorService', './services/executorService'],
  ['services/assemblerService', './services/assemblerService'],
  ['services/hiveOrchestrator', './services/hiveOrchestrator'],
]

let passed = 0
let failed = 0

for (const [name, path] of modules) {
  try {
    require(path)
    console.log(`  OK: ${name}`)
    passed++
  } catch (e) {
    console.log(`FAIL: ${name} — ${e.message}`)
    failed++
  }
}

// Test score matcher
const { matchScore, selectBestModel } = require('./services/scoreMatcher')
const codeScores = { reasoning: 0.3, code: 0.95, creativity: 0.1, speed: 0.5, multilingual: 0.0, analysis: 0.2, instruction: 0.7, knowledge: 0.3 }
const { MODEL_SCORES } = require('./data/modelScores')
const codestralScores = MODEL_SCORES[2].scores
const scoutScores = MODEL_SCORES[8].scores
const codeMatch = matchScore(codeScores, codestralScores)
const scoutMatch = matchScore(codeScores, scoutScores)
console.log(`\nScore test: Code question → Codestral=${(codeMatch*100).toFixed(0)}%, Scout=${(scoutMatch*100).toFixed(0)}%`)
console.log(`  Expected: Codestral > Scout for code task: ${codeMatch > scoutMatch ? 'PASS' : 'FAIL'}`)

// Test rate limiter
const rl = require('./utils/rateLimiter')
rl.reset()
console.log(`  canUse before: ${rl.canUse(9, {rpm: 2})}`)
rl.record(9)
rl.record(9)
console.log(`  canUse after 2 records (limit 2): ${rl.canUse(9, {rpm: 2})}`)
console.log(`  Expected: true then false: ${rl.canUse(9, {rpm: 2}) === false ? 'PASS' : 'FAIL'}`)

console.log(`\n${passed}/${modules.length} modules loaded, ${failed} failures`)
process.exit(failed)
