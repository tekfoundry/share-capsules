import AxeBuilder from '@axe-core/playwright';
import { expect, test, type Page } from '@playwright/test';

const publicPages = [
    '/',
    '/how-it-works',
    '/instructions',
    '/technical',
    '/viewer/install',
    '/terms',
    '/privacy',
] as const;
const mobilePrimaryNavigationLinkCount = 6;

const viewports = [
    { name: 'mobile', width: 390, height: 844 },
    { name: 'desktop', width: 1280, height: 900 },
] as const;

async function expectCoreLandmarks(page: Page): Promise<void> {
    await expect(page.locator('html')).toHaveAttribute('lang', /.+/);
    await expect(page.locator('header')).toHaveCount(1);
    await expect(page.locator('main#main-content')).toHaveCount(1);
    await expect(page.locator('main#main-content h1')).toHaveCount(1);
    await expect(page.locator('footer')).toHaveCount(1);
    await expect(page.getByRole('navigation', { name: 'Footer navigation' })).toHaveCount(1);
}

for (const viewport of viewports) {
    test.describe(`${viewport.name} public pages`, () => {
        test.use({ viewport });

        for (const path of publicPages) {
            test(`${path} has an accessible overflow-free layout`, async ({ page }) => {
                const response = await page.goto(path);
                expect(response?.ok()).toBe(true);

                await expectCoreLandmarks(page);

                const horizontalOverflow = await page.evaluate(
                    () =>
                        document.documentElement.scrollWidth - document.documentElement.clientWidth,
                );
                expect(horizontalOverflow).toBe(0);

                const mobileNavigation = page.getByRole('navigation', {
                    name: 'Mobile primary navigation',
                });
                const desktopNavigation = page.getByRole('navigation', {
                    name: 'Primary navigation',
                    exact: true,
                });

                if (viewport.name === 'mobile') {
                    await expect(mobileNavigation).toBeVisible();
                    await expect(desktopNavigation).toBeHidden();
                    await expect(mobileNavigation.getByRole('link')).toHaveCount(
                        mobilePrimaryNavigationLinkCount,
                    );
                } else {
                    await expect(mobileNavigation).toBeHidden();
                    await expect(desktopNavigation).toBeVisible();
                }

                const accessibility = await new AxeBuilder({ page })
                    .withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa'])
                    .analyze();

                expect(accessibility.violations).toEqual([]);
            });
        }
    });
}

test('keyboard users reach and activate the skip link first', async ({ page }) => {
    await page.goto('/');
    const skipLink = page.getByRole('link', { name: 'Skip to content' });

    await page.keyboard.press('Tab');
    await expect(skipLink).toBeFocused();
    await page.keyboard.press('Enter');
    await expect(page.locator('main#main-content')).toBeFocused();
});

test('public metadata references a reachable social image', async ({ page, request }) => {
    await page.goto('/');

    const canonical = await page.locator('link[rel="canonical"]').getAttribute('href');
    const socialImage = await page.locator('meta[property="og:image"]').getAttribute('content');

    expect(canonical).toBeTruthy();
    expect(socialImage).toBeTruthy();
    expect((await request.get(socialImage!)).ok()).toBe(true);
});
