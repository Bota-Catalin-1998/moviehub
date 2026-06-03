import { test, expect } from '@playwright/test';

test.describe('MovieHub E2E', () => {
  test('adds a movie', async ({ page }) => {
    await page.goto('http://localhost:5173/movies');

    await page.fill('input[name="title"]', 'Gladiator');
    await page.fill('input[name="genre"]', 'Action');
    await page.fill('input[name="rating"]', '9');
    await page.fill('input[name="year"]', '2000');
    await page.fill('textarea[name="description"]', 'A Roman general seeks revenge.');

    await page.click('button:has-text("Add movie")');

    await expect(page.getByRole('cell', { name: 'Gladiator' })).toBeVisible();
  });

  test('edits a movie', async ({ page }) => {
    await page.goto('http://localhost:5173/movies');

    await page.getByRole('button', { name: 'Edit' }).first().click();

    await page.locator('input[name="title"]').clear();
    await page.fill('input[name="title"]', 'Updated Movie');

    await page.click('button:has-text("Save changes")');

    await expect(page.getByRole('cell', { name: 'Updated Movie' })).toBeVisible();
  });

  test('deletes a movie', async ({ page }) => {
    await page.goto('http://localhost:5173/movies');

    await expect(page.getByRole('cell', { name: 'Titanic' })).toBeVisible();

    await page.getByRole('button', { name: 'Delete' }).nth(1).click();

    await expect(page.getByRole('cell', { name: 'Titanic' })).not.toBeVisible();
  });
});