/**
 * @fileoverview Settings Page
 * Configurações de Perfil, Tema e Exportação de Backup
 */

import { stateManager } from '../core/state-manager.js';
import { toast } from './toast.js';

export function createSettingsPage(container) {
  const settings = stateManager.getState('settings') || { theme: 'dark', notifications: true };
  const profile = stateManager.getState('profile') || { name: 'Usuário', email: '' };

  container.innerHTML = `
    <div class="flex flex-col gap-6 animate-fade-in max-w-2xl mx-auto w-full">
      <div class="flex items-center gap-3 mb-4">
        <div class="w-12 h-12 rounded-full flex items-center justify-center" style="background: var(--shadow-glow); border: 1px solid var(--brand-primary); color: var(--brand-primary);">
          <svg width="24" height="24" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z"></path></svg>
        </div>
        <div>
          <h1 class="h2" style="color: var(--t1);">Configurações</h1>
          <p class="text-body" style="color: var(--t2);">Gerencie seu perfil e dados locais</p>
        </div>
      </div>

      <!-- Perfil -->
      <div class="card flex flex-col gap-4">
        <h2 class="text-lg font-bold" style="color: var(--t1); border-bottom: 1px solid var(--border-color); padding-bottom: 8px;">Meu Perfil</h2>
        <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div class="flex flex-col gap-2">
            <label class="text-xs font-bold uppercase tracking-wider" style="color: var(--t3);">Nome</label>
            <input type="text" id="set-name" value="${profile.name}" class="input-base" placeholder="Seu nome">
          </div>
          <div class="flex flex-col gap-2">
            <label class="text-xs font-bold uppercase tracking-wider" style="color: var(--t3);">E-mail</label>
            <input type="email" id="set-email" value="${profile.email || ''}" class="input-base" placeholder="seu@email.com">
          </div>
        </div>
        <div class="flex justify-end mt-2">
          <button id="btn-save-profile" class="btn btn-primary">Salvar Perfil</button>
        </div>
      </div>

      <!-- Preferências -->
      <div class="card flex flex-col gap-4">
        <h2 class="text-lg font-bold" style="color: var(--t1); border-bottom: 1px solid var(--border-color); padding-bottom: 8px;">Preferências</h2>
        
        <div class="flex items-center justify-between">
          <div class="flex flex-col">
            <span class="font-semibold" style="color: var(--t1);">Tema Escuro / Personalizado</span>
            <span class="text-xs" style="color: var(--t3);">Selecione o tema preferido no rodapé da barra lateral</span>
          </div>
        </div>

        <div class="flex items-center justify-between" style="border-top: 1px solid var(--border-color); padding-top: 16px;">
          <div class="flex flex-col">
            <span class="font-semibold" style="color: var(--t1);">Notificações Push</span>
            <span class="text-xs" style="color: var(--t3);">Lembretes de ciclos e horários</span>
          </div>
          <label class="relative inline-flex items-center cursor-pointer">
            <input type="checkbox" id="set-notif" class="sr-only peer" ${settings.notifications ? 'checked' : ''}>
            <div class="w-11 h-6 bg-zinc-700 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-zinc-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-purple-600"></div>
          </label>
        </div>
      </div>

      <!-- Backup de Dados -->
      <div class="card flex flex-col gap-4" style="border: 1px solid var(--brand-primary); background: var(--shadow-glow);">
        <h2 class="text-lg font-bold" style="color: var(--brand-primary); border-bottom: 1px solid var(--border-color); padding-bottom: 8px;">Backup de Segurança</h2>
        <p class="text-xs" style="color: var(--t3);">Como a aplicação roda offline no seu navegador, é altamente recomendado exportar seu histórico regularmente.</p>
        
        <div class="flex gap-4 mt-2">
          <button id="btn-export-json" class="btn btn-primary flex-1">
            📥 Exportar Backup (.json)
          </button>
          <button id="btn-import-json" class="btn btn-secondary flex-1 relative overflow-hidden">
            <input type="file" id="file-import" accept=".json" class="absolute inset-0 opacity-0 cursor-pointer">
            📤 Importar Backup
          </button>
        </div>
      </div>
    </div>
  `;

  // --- Lógica Interna ---
  const saveBtn = container.querySelector('#btn-save-profile');
  const notifTog = container.querySelector('#set-notif');
  const btnExport = container.querySelector('#btn-export-json');
  const fileImport = container.querySelector('#file-import');

  saveBtn?.addEventListener('click', () => {
    stateManager.setState('profile.name', container.querySelector('#set-name').value);
    stateManager.setState('profile.email', container.querySelector('#set-email').value);
    toast.show('Perfil atualizado com sucesso!', 'success');
  });

  notifTog?.addEventListener('change', (e) => {
    stateManager.setState('settings.notifications', e.target.checked);
  });

  btnExport?.addEventListener('click', () => {
    const data = localStorage.getItem('suplilist:state');
    if (!data) return toast.show('Nenhum dado encontrado para exportar.', 'warning');

    const blob = new Blob([data], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `suplilist-backup-${new Date().toISOString().slice(0, 10)}.json`;
    a.click();
    URL.revokeObjectURL(url);
    toast.show('Backup exportado com sucesso!', 'success');
  });

  fileImport?.addEventListener('change', (e) => {
    const file = e.target.files[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const json = JSON.parse(event.target.result);
        if (json && typeof json === 'object') {
          localStorage.setItem('suplilist:state', JSON.stringify(json));
          toast.show('Backup importado! Recarregando...', 'success');
          setTimeout(() => window.location.reload(), 1500);
        }
      } catch (err) {
        toast.show('Arquivo JSON inválido ou corrompido.', 'danger');
      }
    };
    reader.readAsText(file);
  });

  return {
    destroy: () => {
      // Limpeza de UI se necessário
    }
  };
}
