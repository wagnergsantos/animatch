# Spec: Hook Customizado useLocalStorage (Issue #6)

## Objetivo
Centralizar a lógica de verificação de disponibilidade do `window.localStorage`, parse/serialização e tratamento de exceções (como `QuotaExceededError` ou desabilitação de storage no navegador) através do hook customizado `useLocalStorage`.

## Design do Hook (`src/hooks/useLocalStorage.js`)
- **Assinatura:** `useLocalStorage(key, initialValue)`
- **Retorno:** `[storedValue, setValue]`
- **Comportamentos:**
  - Segura para ambiente SSR / sem window (`typeof window !== 'undefined' && window.localStorage`).
  - Lê o valor inicial de forma *lazy* na inicialização do estado.
  - Suporta valores simples e objetos/arrays (via `JSON.parse` / `JSON.stringify`).
  - Permite passar valor direto ou callback de atualização em `setValue(valOrFn)`.
  - Captura e trata exceções em `getItem` e `setItem` com fallback gracioso.

## Arquivos Afetados
1. **Novo:** `src/hooks/useLocalStorage.js`
2. **Novo:** `src/hooks/useLocalStorage.test.js`
3. **Modificado:** `src/App.jsx`
4. **Modificado:** `src/App.test.jsx`

## Critérios de Aceite
- 100% de cobertura de testes no novo hook `useLocalStorage`.
- Remoção do boilerplate `typeof window !== 'undefined' && window.localStorage` em `App.jsx`.
- Todos os testes existentes do projeto continuam passando (`npm run test` e `npm run lint`).
