# Impostore V2

Applicazione React con Worker Cloudflare, Durable Objects e catalogo domande D1.

## Modalità classica e categorie

Dopo aver creato una stanza classica, l'host può scegliere una o più categorie
dalle impostazioni nella lobby:

- **Testuali**: domande con risposte libere;
- **Numeriche**: domande che richiedono valori o quantità;
- **Extra**: contenuti più espliciti o particolari.

Per impostazione predefinita sono attive **Testuali** e **Numeriche**. **Extra non è
attiva automaticamente** e deve essere selezionata esplicitamente. Deve rimanere
selezionata almeno una categoria.

La selezione viene validata e salvata nello stato della stanza. Il mazzo contiene
soltanto domande attive delle categorie selezionate e viene ricreato se la selezione
cambia. Le stanze salvate con il formato precedente usano Testuali e Numeriche,
senza Extra. La modalità manuale non usa il catalogo e non cambia comportamento.

## Catalogo D1 e fallback locale

Il Worker usa il binding D1 `QUESTIONS_DB` configurato in `wrangler.jsonc`. Il
database contiene il catalogo completo gestito da `migrations/seed_questions.sql`.

Se il binding non è disponibile, `createQuestionRepository` seleziona un piccolo
catalogo locale dimostrativo. Il fallback contiene solo sei coppie, copre tutte e
tre le categorie e serve a mantenere funzionante lo sviluppo senza D1: non è una
copia delle 126 domande ufficiali e non va considerato equivalente al catalogo D1.

## Preparazione di D1

Per applicare schema, migration e seed al database locale configurato:

```sh
npx wrangler d1 migrations apply impostore-v2-questions --local
npx wrangler d1 execute impostore-v2-questions --local --file migrations/seed_questions.sql
```

La semplice modifica di un file SQL non aggiorna un database già esistente: dopo
aver aggiornato il codice occorre eseguire esplicitamente migration e seed.

Per aggiornare il database remoto, **solo dopo autorizzazione esplicita**:

```sh
npx wrangler d1 migrations apply impostore-v2-questions --remote
npx wrangler d1 execute impostore-v2-questions --remote --file migrations/seed_questions.sql
```

Il seed è ripetibile: rimuove i vecchi ID `A001` e `A002` e usa gli ID stabili
`T001`–`T069`, `N001`–`N025` e `X001`–`X007`.

## Sviluppo e verifiche

```sh
npm run worker:dev
npm run dev
node scripts/verify-question-categories.mjs
python scripts/verify_seed.py
npm run lint
npm run build
```

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
