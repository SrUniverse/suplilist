import { test } from '@playwright/test';
import { CatalogPage } from './pages/CatalogPage';
import { FavoritesPage } from './pages/FavoritesPage';

test.describe('Favorites Flow', () => {
  // Test relies on global auth state setup (auth.setup.ts) so we don't need to re-login
  // Assuming auth.setup saves state to storageState.json
  test.use({ storageState: 'e2e/support/storageState.json' });

  test('should favorite an item in the catalog and verify it appears in favorites', async ({ page }) => {
    const catalog = new CatalogPage(page);
    const favorites = new FavoritesPage(page);

    // 1. Vai para o Catálogo e favorita a Creatina (exemplo de ID: creatina)
    await catalog.goto();
    const testItemId = 'creatina-monohidratada';
    await catalog.search('Creatina');
    await catalog.toggleFavorite(testItemId);

    // 2. Vai para a página de favoritos e verifica se o card apareceu
    await favorites.goto();
    await favorites.verifyCardVisible(testItemId);

    // 3. (Opcional) Limpa o estado removendo dos favoritos
    await favorites.removeFavorite(testItemId);
  });
});
