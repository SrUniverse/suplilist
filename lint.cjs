const fs = require('fs');
const { execSync } = require('child_process');

/**
 * Script de Linting Básico para SupliList
 * Execução: node lint.cjs
 */

const files = ['./ui.js', './main.js', './list.js', './state.js', './actions.js', './database.js'];

console.log('🔍 Iniciando auditoria de sintaxe...\n');

files.forEach(file => {
  if (!fs.existsSync(file)) return;
  
  try {
    // Verifica erros de sintaxe (como tokens 'export' inesperados)
    execSync(`node --check ${file}`);
    
    // Verifica balanço de chaves
    const content = fs.readFileSync(file, 'utf8');
    const open = (content.match(/{/g) || []).length;
    const close = (content.match(/}/g) || []).length;
    
    if (open !== close) {
      console.error(`❌ ${file}: Chaves desbalanceadas! ({: ${open}, }: ${close})`);
    } else {
      console.log(`✅ ${file}: Sintaxe íntegra.`);
    }
  } catch (e) {
    console.error(`\n❌ Erro de Sintaxe detectado em ${file}:\n`, e.stderr.toString());
  }
});