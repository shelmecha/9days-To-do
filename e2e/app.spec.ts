import { test, expect } from '@playwright/test'

/**
 * Smoke test: the app boots and renders the Today list.
 *
 * A fresh Playwright context has empty localStorage, so `useStore` stamps today's date on
 * load and no reckoning is due — the list is what a first-time visitor sees. Nothing here
 * writes to the app or depends on seeded data.
 */
test('the app loads and shows the Today list', async ({ page }) => {
  // Registered before navigating — a listener added afterwards would miss boot-time errors.
  const errors: string[] = []
  page.on('pageerror', (e) => errors.push(e.message))

  await page.goto('/app.html')

  await expect(page).toHaveTitle('9days To-do')

  // The Win95 title bar is the app's own chrome, not the OS window's.
  await expect(page.locator('.titlebar')).toContainText('9days To-do')

  // Three menu items, no more.
  const menu = page.locator('.menubar')
  await expect(menu.getByRole('button', { name: 'Today' })).toHaveAttribute(
    'aria-current',
    'true',
  )
  await expect(menu.getByRole('button', { name: 'Notes' })).toBeVisible()
  await expect(menu.getByRole('button', { name: 'Done' })).toBeVisible()

  // Quick-add is present and autofocused, so typing goes somewhere.
  const quickAdd = page.getByPlaceholder('What needs doing?')
  await expect(quickAdd).toBeVisible()
  await expect(quickAdd).toBeFocused()

  // Empty list plus the status bar that carries the pitch.
  await expect(page.getByText("Empty. That's the goal.")).toBeVisible()
  await expect(page.locator('.statusbar')).toContainText('0 active')
  await expect(page.locator('.statusbar')).toContainText('keep or drop tomorrow')

  // Nothing threw while booting.
  expect(errors).toEqual([])
})
