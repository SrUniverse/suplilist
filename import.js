import { S, save, setItemCheck, setItemNote } from './state.js';
import { renderAll } from './list.js';
import { toast } from './utils.js';
import { announceToScreenReader } from './accessibility.js';
import { invalidateSearchCache } from './search.js';

/**
 * Abre o seletor de arquivos nativo do sistema para importar dados.
 */
export function importJSON() {
  document.getElementById('import-file')?.click();
}

/**
 * Processa o arquivo JSON selecionado e sincroniza com o estado global.
 * [SL-16] Lógica migrada de scripts.js para garantir persistência íntegra.
 * @param {HTMLInputElement} input - O elemento input file que disparou o evento.
 */
export function handleImport(input) {
  const file = input.files?.[0];
  if (!file) return;

  const reader = new FileReader();
  
  reader.onerror = () => {
    toast('🚨', 'Erro ao ler o arquivo.', 'error');
    input.value = '';
  };

  reader.onload = (e) => {
    try {
      const data = JSON.parse(e.target.result);
      
      // Validação de Schema básico (Bug Hunting)
      if (!data || typeof data !== 'object') throw new Error('Formato inválido');

      if (Array.isArray(data.items)) {
        data.items.forEach(item => {
          if (item.comprado) setItemCheck(item.id, true);
          if (item.nota)     setItemNote(item.id, item.nota);
        });
      }
      if (Array.isArray(data.history)) {
        // Mescla o histórico atual com o importado removendo duplicatas por UID
        S.history = [...S.history, ...data.history].filter((h, i, arr) => 
          arr.findIndex(x => x.uid === h.uid) === i
        );
      }
      invalidateSearchCache();
      save();
      renderAll();
      announceToScreenReader('Dados importados com sucesso.');
      toast('✅', 'Dados importados com sucesso!', 'success', { duration: 3200 });
    } catch (err) {
      toast('⚠️', 'Arquivo inválido — verifique o .json exportado', 'error', { duration: 3600 });
      announceToScreenReader('Erro ao importar dados. Arquivo inválido.');
    }
    input.value = ''; 
  };
  reader.readAsText(file);
}