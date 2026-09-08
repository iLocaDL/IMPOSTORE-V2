import assert from 'node:assert/strict'
import { createServer } from 'vite'

const vite = await createServer({
  appType: 'custom',
  logLevel: 'silent',
  server: { middlewareMode: true },
})

let buildRoundResults

try {
  ({ buildRoundResults } = await vite.ssrLoadModule('/src/shared/roundResults.ts'))
} finally {
  await vite.close()
}

const players = [
  { id: 'host', name: 'Host' },
  { id: 'player-1', name: 'Player 1' },
  { id: 'player-2', name: 'Player 2' },
]
const answersInSubmissionOrder = [
  { playerId: 'player-2', playerName: 'Player 2', answer: 'Terza' },
  { playerId: 'host', playerName: 'Host', answer: 'Prima' },
  { playerId: 'player-1', playerName: 'Player 1', answer: 'Seconda' },
]
const assignments = [
  { playerId: 'host', question: 'Domanda comune', isImpostor: false },
  { playerId: 'player-1', question: 'Domanda comune', isImpostor: false },
  { playerId: 'player-2', question: 'Domanda diversa', isImpostor: true },
]

const classicResults = buildRoundResults(players, answersInSubmissionOrder, assignments)
assert.deepEqual(
  classicResults.map((result) => result.playerId),
  ['host', 'player-1', 'player-2'],
)
assert.equal(classicResults[2].isImpostor, true)

const manualPlayers = players.slice(1)
const manualResults = buildRoundResults(manualPlayers, answersInSubmissionOrder, assignments)
assert.deepEqual(
  manualResults.map((result) => result.playerId),
  ['player-1', 'player-2'],
)
assert.equal(manualResults[1].isImpostor, true)

console.log('Round result order verification: OK')
