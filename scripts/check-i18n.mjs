import fs from 'node:fs'
import path from 'node:path'

const LOCALES_DIR = path.resolve('src/locales')
const TARGET_FILES = ['pt-BR.json', 'en.json', 'ja.json']

function getFlattenedKeys(obj, prefix = '') {
  let keys = []
  for (const [key, value] of Object.entries(obj)) {
    const fullKey = prefix ? `${prefix}.${key}` : key
    if (value && typeof value === 'object' && !Array.isArray(value)) {
      keys = keys.concat(getFlattenedKeys(value, fullKey))
    } else {
      keys.push(fullKey)
    }
  }
  return keys
}

function runAudit() {
  console.log('🔍 Auditando paridade de traduções (i18n)...\n')

  const localeData = {}
  for (const file of TARGET_FILES) {
    const filePath = path.join(LOCALES_DIR, file)
    if (!fs.existsSync(filePath)) {
      console.error(`❌ Arquivo não encontrado: ${file}`)
      process.exit(1)
    }
    const content = JSON.parse(fs.readFileSync(filePath, 'utf-8'))
    localeData[file] = {
      raw: content,
      keys: new Set(getFlattenedKeys(content)),
    }
  }

  // Obter união de todas as chaves
  const allKeys = new Set()
  for (const file of TARGET_FILES) {
    for (const key of localeData[file].keys) {
      allKeys.add(key)
    }
  }

  let hasErrors = false

  for (const file of TARGET_FILES) {
    const currentKeys = localeData[file].keys
    const missingKeys = []

    for (const key of allKeys) {
      if (!currentKeys.has(key)) {
        missingKeys.push(key)
      }
    }

    if (missingKeys.length > 0) {
      hasErrors = true
      console.error(`⚠️  [${file}] Chaves ausentes (${missingKeys.length}):`)
      missingKeys.forEach((k) => console.error(`    - ${k}`))
      console.log('')
    } else {
      console.log(`✅ [${file}] Todas as chaves sincronizadas (${currentKeys.size} chaves).`)
    }
  }

  if (hasErrors) {
    console.error('\n❌ Existem chaves de tradução inconsistentes entre os arquivos.')
    process.exit(1)
  } else {
    console.log('\n✨ Todas as traduções estão 100% sincronizadas!')
  }
}

runAudit()
