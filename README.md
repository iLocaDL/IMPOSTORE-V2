# React + TypeScript + Vite

This template provides a minimal setup to get React working in Vite with HMR and some ESLint rules.

## Catalogo domande e futuro binding D1

Il Worker usa un `QuestionRepository`. In sviluppo, se non è configurato un database, viene selezionato automaticamente il piccolo catalogo locale in `worker/questions/localQuestionCatalog.ts`.

Il binding D1 previsto si chiama `QUESTIONS_DB`. Quando il database sarà stato creato, aggiungere a `wrangler.jsonc` il blocco seguente sostituendo i segnaposto con i valori restituiti da Wrangler:

```jsonc
"d1_databases": [
  {
    "binding": "QUESTIONS_DB",
    "database_name": "<nome-database>",
    "database_id": "<database-id-reale>"
  }
]
```

Comandi da eseguire soltanto quando si deciderà di attivare D1:

```sh
npx wrangler d1 create <nome-database>
npx wrangler d1 migrations apply <nome-database> --local
npx wrangler d1 migrations apply <nome-database> --remote
```

La migration iniziale è `migrations/0001_question_sets.sql`. Dopo aver configurato `QUESTIONS_DB`, la factory utilizza automaticamente `D1QuestionRepository`. Per rimuovere definitivamente il fallback locale, eliminare il ramo `LocalQuestionRepository` dalla factory e successivamente rimuovere i due file del catalogo locale.

Currently, two official plugins are available:

- [@vitejs/plugin-react](https://github.com/vitejs/vite-plugin-react/blob/main/packages/plugin-react) uses [Oxc](https://oxc.rs)
- [@vitejs/plugin-react-swc](https://github.com/vitejs/vite-plugin-react/blob/main/packages/plugin-react-swc) uses [SWC](https://swc.rs/)

## React Compiler

The React Compiler is not enabled on this template because of its impact on dev & build performances. To add it, see [this documentation](https://react.dev/learn/react-compiler/installation).

## Expanding the ESLint configuration

If you are developing a production application, we recommend updating the configuration to enable type-aware lint rules:

```js
export default defineConfig([
  globalIgnores(['dist']),
  {
    files: ['**/*.{ts,tsx}'],
    extends: [
      // Other configs...

      // Remove tseslint.configs.recommended and replace with this
      tseslint.configs.recommendedTypeChecked,
      // Alternatively, use this for stricter rules
      tseslint.configs.strictTypeChecked,
      // Optionally, add this for stylistic rules
      tseslint.configs.stylisticTypeChecked,

      // Other configs...
    ],
    languageOptions: {
      parserOptions: {
        project: ['./tsconfig.node.json', './tsconfig.app.json'],
        tsconfigRootDir: import.meta.dirname,
      },
      // other options...
    },
  },
])
```

You can also install [eslint-plugin-react-x](https://github.com/Rel1cx/eslint-react/tree/main/packages/plugins/eslint-plugin-react-x) and [eslint-plugin-react-dom](https://github.com/Rel1cx/eslint-react/tree/main/packages/plugins/eslint-plugin-react-dom) for React-specific lint rules:

```js
// eslint.config.js
import reactX from 'eslint-plugin-react-x'
import reactDom from 'eslint-plugin-react-dom'

export default defineConfig([
  globalIgnores(['dist']),
  {
    files: ['**/*.{ts,tsx}'],
    extends: [
      // Other configs...
      // Enable lint rules for React
      reactX.configs['recommended-typescript'],
      // Enable lint rules for React DOM
      reactDom.configs.recommended,
    ],
    languageOptions: {
      parserOptions: {
        project: ['./tsconfig.node.json', './tsconfig.app.json'],
        tsconfigRootDir: import.meta.dirname,
      },
      // other options...
    },
  },
])
```
