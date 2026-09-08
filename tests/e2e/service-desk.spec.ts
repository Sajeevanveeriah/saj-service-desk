import { test, expect } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';

test.describe('Saj Service Desk frontend workflow', () => {
  test('job queue filters, reset and keyboard navigation', async ({ page }) => {
    await page.goto('/');
    await expect(page.getByRole('heading', { name: 'The work that needs you' })).toBeVisible();
    await page.getByRole('button', { name: 'Jobs & requests' }).click();
    await page.getByLabel('Filter by status').selectOption('Quoted');
    await expect(page.getByText('Cedar & Co')).toBeVisible();
    await page.getByRole('button', { name: 'Reset filters' }).click();
    await expect(page.getByText('Northside Robotics')).toBeVisible();
    await page.keyboard.press('Tab');
    await expect(page.locator(':focus')).toBeVisible();
  });

  test('request form validation and success state', async ({ page }) => {
    await page.goto('/');
    await page.getByRole('button', { name: 'Public request form' }).click();
    await page.getByRole('button', { name: 'Send request' }).click();
    await expect(page.locator('select:invalid, textarea:invalid, input:invalid').first()).toBeVisible();
    await page.getByLabel('What do you need help with?').selectOption({ label: 'Websites and software' });
    await page.getByLabel('Preferred support').selectOption({ label: 'Remote' });
    await page.getByLabel('Describe the problem').fill('Contact form does not deliver mail.');
    await page.getByLabel('Your name').fill('Test Customer');
    await page.getByLabel('Email address').fill('test@example.com');
    await page.getByRole('button', { name: 'Send request' }).click();
    await expect(page.getByRole('heading', { name: 'Thanks, your request is in the queue.' })).toBeVisible();
  });

  test('desktop accessibility baseline', async ({ page }) => {
    await page.goto('/');
    const results = await new AxeBuilder({ page }).analyze();
    expect(results.violations).toEqual([]);
  });

  test('mobile layout keeps the navigation and request action usable', async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    await page.goto('/');
    await expect(page.getByRole('button', { name: 'Public request form' })).toBeVisible();
    await expect(page.getByRole('button', { name: 'New request' })).toBeVisible();
  });
});
