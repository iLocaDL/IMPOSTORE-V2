import assert from 'node:assert/strict'
import { createServer } from 'vite'

const vite = await createServer({
  appType: 'custom',
  logLevel: 'silent',
  server: { middlewareMode: true },
})

let loadedModule

try {
  loadedModule = await vite.ssrLoadModule('/scripts/question-category-test-entry.ts')
} finally {
  await vite.close()
}

const {
  DEFAULT_CLASSIC_CATEGORIES,
  D1QuestionRepository,
  LocalQuestionRepository,
  haveSameCategories,
  parseQuestionCategories,
  restoreClassicCategories,
  shouldResetQuestionDeck,
} = loadedModule

assert.deepEqual(DEFAULT_CLASSIC_CATEGORIES, ['testuali', 'numeriche'])
assert.equal(DEFAULT_CLASSIC_CATEGORIES.includes('extra'), false)
assert.deepEqual(parseQuestionCategories(['extra']), ['extra'])
assert.deepEqual(parseQuestionCategories(['extra', 'testuali', 'extra']), ['testuali', 'extra'])
assert.equal(parseQuestionCategories([]), null)
assert.equal(parseQuestionCategories(['sconosciuta']), null)
assert.deepEqual(restoreClassicCategories('classic', undefined), ['testuali', 'numeriche'])
assert.deepEqual(restoreClassicCategories('classic', ['extra']), ['testuali', 'numeriche'])
assert.deepEqual(restoreClassicCategories('classic', ['testuali']), ['testuali', 'numeriche'])
assert.deepEqual(
  restoreClassicCategories('classic', ['testuali', 'numeriche', 'extra']),
  ['testuali', 'numeriche'],
)
assert.equal(restoreClassicCategories('manual', ['extra']), null)
assert.equal(haveSameCategories(['testuali', 'extra'], ['extra', 'testuali']), true)
assert.equal(haveSameCategories(['testuali'], ['numeriche']), false)
assert.equal(shouldResetQuestionDeck(['testuali'], ['testuali']), false)
assert.equal(shouldResetQuestionDeck(['testuali'], ['numeriche']), true)
assert.equal(shouldResetQuestionDeck(undefined, ['testuali', 'numeriche']), true)

const local = new LocalQuestionRepository()
assert.equal((await local.listActiveIds(['testuali'])).length, 4)
assert.equal((await local.listActiveIds(['numeriche'])).length, 1)
assert.equal((await local.listActiveIds(['extra'])).length, 1)
assert.equal((await local.listActiveIds(['testuali', 'extra'])).length, 5)
assert.deepEqual(await local.listActiveIds([]), [])
assert.deepEqual(await local.listActiveIds(['sconosciuta']), [])

const rows = [
  { id: 'T001', normal_question: 'T', impostor_question: 'TI', category: 'testuali', active: 1 },
  { id: 'N001', normal_question: 'N', impostor_question: 'NI', category: 'numeriche', active: 1 },
  { id: 'X001', normal_question: 'X', impostor_question: 'XI', category: 'extra', active: 1 },
  { id: 'T999', normal_question: 'off', impostor_question: 'off', category: 'testuali', active: 0 },
]
const calls = []
const database = {
  prepare(sql) {
    return {
      args: [],
      bind(...args) {
        this.args = args
        return this
      },
      async all() {
        calls.push({ sql, args: this.args })
        return {
          results: rows
            .filter((row) => row.active === 1 && this.args.includes(row.category))
            .map(({ id }) => ({ id })),
        }
      },
      async first() {
        return rows.find((row) => row.id === this.args[0] && row.active === 1) ?? null
      },
    }
  },
}

const d1 = new D1QuestionRepository(database)
assert.deepEqual(await d1.listActiveIds(['testuali']), ['T001'])
assert.deepEqual(await d1.listActiveIds(['numeriche']), ['N001'])
assert.deepEqual(await d1.listActiveIds(['extra']), ['X001'])
assert.deepEqual(await d1.listActiveIds(['testuali', 'extra']), ['T001', 'X001'])

const callCountBeforeEmptyFilter = calls.length
assert.deepEqual(await d1.listActiveIds([]), [])
assert.equal(calls.length, callCountBeforeEmptyFilter)
assert.deepEqual(await d1.listActiveIds(['sconosciuta']), [])
assert.match(calls.at(-1).sql, /category IN \(\?1\)/)
assert.deepEqual(calls.at(-1).args, ['sconosciuta'])
assert.deepEqual(await d1.getById('X001'), {
  id: 'X001',
  normalQuestion: 'X',
  impostorQuestion: 'XI',
  category: 'extra',
})

console.log('Question category verification: OK')
