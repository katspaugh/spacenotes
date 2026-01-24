import { test, expect } from '@playwright/test';

test('loads about space', async ({ page }) => {
  await page.goto('/?q=about_about-9315ba924c9d16e632145116d69ae72a');

  // Wait for the page to load
  await expect(page).toHaveTitle(/SpaceNotes/);

  // Verify the board/canvas is visible
  await expect(page.locator('.Board')).toBeVisible({
    timeout: 10000,
  });
});
