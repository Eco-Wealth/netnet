import { test, expect } from '@playwright/test';

test('Proof page loads', async ({ page }) => {
  await page.goto('/proof');
  // If the UI changes, keep this intentionally loose: we just want a "page is alive" signal.
  await expect(page).toHaveURL(/\/proof/);
  await expect(page.locator('body')).toContainText(/proof/i);
});
