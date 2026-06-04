import { test as base } from '@playwright/test';
import { connectTestDB, clearTestDB } from './support/db';

type MyFixtures = {
  dbState: void;
};

export const test = base.extend<MyFixtures>({
  // Ao definir esta fixture como automática, ela roda sem precisarmos chamá-la explicitamente
  dbState: [async ({}, use, testInfo) => {
    const workerIndex = testInfo.workerIndex.toString();
    
    // Setup: Conecta no DB do Worker
    await connectTestDB(workerIndex);
    
    // Executa o teste
    await use();
    
    // Teardown: Limpa o banco pós-teste para o próximo no mesmo worker
    await clearTestDB();
  }, { auto: true }],
});

export { expect, Page, Browser, BrowserContext } from '@playwright/test';
