import { test, expect, type Page } from '@playwright/test'

/**
 * The demo and the real app are the same origin, so they share one localStorage. These are the
 * two bugs that arrangement produced, both caught by driving a real browser rather than by unit
 * tests — the pure logic looked correct in isolation in both cases.
 *
 * 1. The demo reseeds every session. On a shared key that silently destroyed the tasks of anyone
 *    using the app at /app.html. Fixed by namespacing demo storage (`storageKeyFor`).
 * 2. `markDemoSeeded` stamped the session from an unconditional effect, so loading /app.html
 *    first marked the tab as already-seeded and the demo then loaded EMPTY — no backlog, no
 *    reckoning — for the rest of that tab's life.
 *
 * Both need one browser context across two pages, which is exactly what unit tests cannot do.
 */

const REAL_KEY = '9days-todo/v1'
const DEMO_KEY = '9days-todo/demo/v1'
const REAL_TASK = 'MY REAL IRREPLACEABLE TASK'

const read = (page: Page, key: string) =>
  page.evaluate((k) => localStorage.getItem(k), key)

async function addTask(page: Page, title: string) {
  await page.locator('#qa').fill(title)
  await page.locator('.quickadd button[type="submit"]').click()
  await expect(page.locator('.taskrow__title', { hasText: title })).toBeVisible()
}

test.describe('demo / real-app storage isolation', () => {
  test('a visit to /demo cannot touch real tasks', async ({ page }) => {
    await page.goto('/app.html')
    await page.evaluate(() => {
      localStorage.clear()
      sessionStorage.clear()
    })
    await page.reload()

    await addTask(page, REAL_TASK)
    expect(await read(page, REAL_KEY)).toContain(REAL_TASK)
    expect(await read(page, DEMO_KEY)).toBeNull()

    // Same tab, same origin — the conditions the bug needed.
    await page.goto('/demo')
    await expect(page.locator('[aria-labelledby="reckoning-heading"]')).toBeVisible()

    const realAfter = await read(page, REAL_KEY)
    expect(realAfter).toContain(REAL_TASK)
    // Demo fixtures use stable ids; none of them may appear under the real key.
    expect(realAfter).not.toContain('demo-typography')
    expect(await read(page, DEMO_KEY)).toContain('demo-typography')

    // And the real user is unaffected on return: no lost task, no forced reckoning.
    await page.goto('/app.html')
    await expect(page.locator('.taskrow__title', { hasText: REAL_TASK })).toBeVisible()
    await expect(page.locator('[aria-labelledby="reckoning-heading"]')).toHaveCount(0)
  })

  test('the demo still seeds after the real app has been opened first', async ({ page }) => {
    // The regression: /app.html used to stamp the session-seeded flag on mount.
    await page.goto('/app.html')
    await page.evaluate(() => {
      localStorage.clear()
      sessionStorage.clear()
    })
    await page.reload()
    await expect(page.locator('#qa')).toBeVisible()

    await page.goto('/demo')

    await expect(page.locator('[aria-labelledby="reckoning-heading"]')).toBeVisible()
    // 4 seeded active tasks, all created before today, so all four are queued.
    await expect(page.locator('.reckoning__count')).toHaveText('1/4')
  })

  test('the demo resumes rather than reseeding on refresh', async ({ page }) => {
    await page.goto('/demo')
    await expect(page.locator('.reckoning__count')).toHaveText('1/4')

    await page.getByRole('button', { name: 'Drop it' }).click()
    await expect(page.locator('.reckoning__count')).toHaveText('2/4')

    await page.reload()
    // Dropping persisted immediately, so the queue is one shorter — not reseeded back to four.
    await expect(page.locator('.reckoning__count')).toHaveText('1/3')
  })

  test('the app entry is not indexable, so it cannot outrank the landing page', async ({
    page,
  }) => {
    await page.goto('/app.html')
    await expect(page.locator('meta[name="robots"]')).toHaveAttribute(
      'content',
      /noindex/,
    )
  })
})
