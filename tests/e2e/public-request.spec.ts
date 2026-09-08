import { expect, test } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';

test.describe('public service request page', () => {
  test('shows only the public form and prepares a reviewable email', async ({ page }) => {
    await page.goto('/request');
    await expect(page.getByRole('heading', { name: 'Tell Saj what needs attention.' })).toBeVisible();
    await expect(page.getByRole('navigation', { name: 'Primary navigation' })).toHaveCount(0);
    await expect(page.getByText('Good morning, Saj')).toHaveCount(0);
    await expect(page.getByRole('img', { name: 'QR code for the Saj Service Desk public request form' })).toBeVisible();

    await page.getByLabel('Service category').selectOption({ label: 'Websites and software' });
    await page.getByLabel('Support preference').selectOption({ label: 'Remote' });
    await page.getByLabel('Your name').fill('Public Test');
    await page.getByLabel('Email address').fill('public@example.test');
    await page.getByLabel('Describe the problem').fill('The website request form needs verification.');
    await page.getByRole('button', { name: 'Prepare email request' }).click();

    await expect(page.getByRole('heading', { name: 'Your request is ready' })).toBeVisible();
    const emailHref = await page.getByRole('link', { name: 'Open email draft' }).getAttribute('href');
    expect(emailHref).toContain('mailto:sajeevanveeriah@gmail.com');
    expect(emailHref).toContain('Public%20Test');
  });

  test('has no automated accessibility violations or horizontal page overflow', async ({ page }) => {
    await page.goto('/request');
    const results = await new AxeBuilder({ page }).analyze();
    expect(results.violations).toEqual([]);
    const overflow = await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
    expect(overflow).toBeLessThanOrEqual(0);
  });
});
