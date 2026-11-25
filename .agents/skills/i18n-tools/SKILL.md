---
name: i18n-tools
description: >
  Auditoria, sincronização e adição de chaves de internacionalização (i18n) no projeto Animatch.
  Use ao adicionar novos textos na UI, traduzir strings, verificar chaves faltantes ou sincronizar
  pt-BR, en e ja.
---

# i18n Tools — Animatch

Guia de padronização e automação de internacionalização para o projeto **Animatch**.

---

## 1. Estrutura de Arquivos

As traduções residem em [src/locales/](file:///C:/Sistemas/Projetos/animes/src/locales/):

```
src/
├── i18n.js                 # Inicialização do i18next e detecção de idioma
└── locales/
    ├── pt-BR.json          # Português do Brasil (Padrão de desenvolvimento)
    ├── en.json             # Inglês (Fallback global)
    ├── ja.json             # Japonês
    └── legalContent.jsx    # Conteúdo legal/termos com formatação JSX
```

---

## 2. Regras Mandatórias de Internacionalização

1. **Nunca usar strings literais em componentes JSX**:
   Qualquer texto visível para o usuário deve obrigatoriamente usar o hook `useTranslation()`:
   ```jsx
   import { useTranslation } from 'react-i18next'

   export function MeuComponente() {
     const { t } = useTranslation()
     return <h2>{t('dashboard.meuTitulo')}</h2>
   }
   ```

2. **Paridade Obrigatória**:
   Toda nova chave criada no [pt-BR.json](file:///C:/Sistemas/Projetos/animes/src/locales/pt-BR.json) deve ser imediatamente adicionada também ao [en.json](file:///C:/Sistemas/Projetos/animes/src/locales/en.json) e [ja.json](file:///C:/Sistemas/Projetos/animes/src/locales/ja.json).

3. **Interpolação de Variáveis**:
   Utilizar a convenção do i18next `{{variavel}}`:
   ```json
   "genreCount": "Exibindo {{count}} de {{total}} animes"
   ```
   No JSX:
   ```jsx
   t('genreCount', { count: filtered.length, total: allEntries.length })
   ```

---

## 3. Validação e Auditoria

Para auditar se há chaves faltantes ou dessincronizadas entre os três idiomas:

```bash
node scripts/check-i18n.mjs
```

O script reportará a lista exata de chaves ausentes em cada arquivo de locale.

---

## 4. Adição de Novos Idiomas

Para registrar um novo idioma:
1. Criar o arquivo `src/locales/<codigo>.json`.
2. Importar e adicionar ao objeto `resources` em [src/i18n.js](file:///C:/Sistemas/Projetos/animes/src/i18n.js).
3. Atualizar a lista de idiomas suportados no componente [SettingsPage.jsx](file:///C:/Sistemas/Projetos/animes/src/components/SettingsPage.jsx).
