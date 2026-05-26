import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { createSettingsPage } from '../../src/js/components/settings-page.js';
import { settingsRepo } from '../../src/js/features/settings/settingsRepo.js';
import { stateManager } from '../../src/js/core/state-manager.js';
import { notificationScheduler } from '../../src/js/features/settings/notificationScheduler.js';
import { toast } from '../../src/js/components/toast.js';

describe('SettingsPage', () => {
  let container;
  let pageInstance;

  beforeEach(() => {
    // Mock do DOM
    document.body.innerHTML = '<main id="page-content"></main>';
    container = document.getElementById('page-content');

    // Mocks globais
    window.confirm = vi.fn().mockReturnValue(true);
    
    // Workaround para mockar window.location.reload
    const reloadMock = vi.fn();
    delete window.location;
    window.location = { reload: reloadMock };
    
    window.gtag = vi.fn();

    // Setup de estado inicial limpo
    stateManager.setState('settings', {
      theme: 'dark',
      sortBy: 'name',
      units: 'metric',
      notificationsEnabled: false
    });

    vi.spyOn(toast, 'show').mockImplementation(() => {});
    vi.spyOn(notificationScheduler, 'requestPermission').mockResolvedValue(true);
    vi.spyOn(notificationScheduler, 'triggerNotification').mockResolvedValue();
    vi.spyOn(notificationScheduler, 'checkAndNotify').mockResolvedValue();
  });

  afterEach(() => {
    if (pageInstance) pageInstance.destroy();
    document.body.innerHTML = '';
    vi.restoreAllMocks();
  });

  it('deve montar a página de configurações e renderizar botões', () => {
    pageInstance = createSettingsPage(container);

    const title = container.querySelector('h1');
    expect(title.textContent).toContain('Configurações');

    const themeBtn = container.querySelector('#toggle-theme-btn');
    expect(themeBtn).not.toBeNull();
    expect(themeBtn.textContent).toContain('Alternar');

    const resetBtn = container.querySelector('#reset-data-btn');
    expect(resetBtn).not.toBeNull();
  });

  it('deve alternar o tema escuro/claro ao clicar no botão de alternar tema', () => {
    pageInstance = createSettingsPage(container);

    const themeBtn = container.querySelector('#toggle-theme-btn');
    
    // Simula clique de alternância de tema
    themeBtn.click();

    expect(settingsRepo.getSetting('theme')).toBe('light');
    expect(toast.show).toHaveBeenCalledWith('Tema alterado para Claro!', 'success');
  });

  it('deve ativar notificações após pedir e obter permissão ao clicar no botão de ativar', async () => {
    pageInstance = createSettingsPage(container);

    const toggleBtn = container.querySelector('#toggle-notifications-btn');
    expect(toggleBtn.textContent.trim()).toBe('Ativar');

    // Clica para ativar
    await toggleBtn.click();

    expect(notificationScheduler.requestPermission).toHaveBeenCalled();
    expect(settingsRepo.getSetting('notificationsEnabled')).toBe(true);
    expect(toast.show).toHaveBeenCalledWith('🔔 Notificações de reposição ativadas!', 'success');
    expect(notificationScheduler.triggerNotification).toHaveBeenCalled();
  });

  it('deve desativar notificações se já estiverem ativas ao clicar no botão de desativar', async () => {
    settingsRepo.setSetting('notificationsEnabled', true);
    pageInstance = createSettingsPage(container);

    const toggleBtn = container.querySelector('#toggle-notifications-btn');
    expect(toggleBtn.textContent.trim()).toBe('Desativar');

    // Clica para desativar
    await toggleBtn.click();

    expect(settingsRepo.getSetting('notificationsEnabled')).toBe(false);
    expect(toast.show).toHaveBeenCalledWith('🔕 Notificações desativadas.', 'info');
  });

  it('deve disparar notificação de teste quando o botão de teste for clicado', async () => {
    settingsRepo.setSetting('notificationsEnabled', true);
    pageInstance = createSettingsPage(container);

    const testBtn = container.querySelector('#test-notify-btn');
    expect(testBtn).not.toBeNull();

    testBtn.click();

    expect(notificationScheduler.checkAndNotify).toHaveBeenCalledWith(true);
    expect(toast.show).toHaveBeenCalledWith('Enviando notificação de teste...', 'info');
  });

  it('deve pedir confirmação e resetar localStorage ao clicar em Apagar Dados', () => {
    const spyClear = vi.spyOn(Storage.prototype, 'clear');
    
    pageInstance = createSettingsPage(container);
    const resetBtn = container.querySelector('#reset-data-btn');

    resetBtn.click();

    expect(window.confirm).toHaveBeenCalled();
    expect(spyClear).toHaveBeenCalled();
    expect(toast.show).toHaveBeenCalledWith('Todos os dados locais foram excluídos com sucesso. Recarregando...', 'warning');
  });
});
