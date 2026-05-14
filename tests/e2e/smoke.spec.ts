import { test, expect } from '@playwright/test'

/**
 * Smoke suite — side_effects.art
 *
 * Goal: catch a deploy that broke a public page or removed a load-bearing
 * CTA. No deep behaviour testing. Selectors lean on semantic attributes
 * (`role`, `aria-label`, anchor `href`) rather than class names so the
 * suite survives Tailwind churn.
 *
 * All `metadata.title` for the site resolves to "side_effects.art" today
 * (root layout `default`). If sub-pages add their own titles later, the
 * matcher tolerates that via `/side_effects/i`.
 */

const PUBLIC_PAGES = [
  { path: '/', name: 'home' },
  { path: '/sf01', name: 'sf-01' },
  { path: '/chord-lab', name: 'chord-lab' },
  { path: '/playground', name: 'playground' },
  { path: '/privacy', name: 'privacy' },
  { path: '/terms', name: 'terms' },
  { path: '/licensing', name: 'licensing' },
] as const

test.describe('Smoke — public pages', () => {
  for (const { path, name } of PUBLIC_PAGES) {
    test(`GET ${path} renders (${name})`, async ({ page }) => {
      const response = await page.goto(path)
      // 2xx covers 200 plus any future revalidation/304 path.
      const status = response?.status() ?? 0
      expect(status, `expected 2xx for ${path}, got ${status}`).toBeGreaterThanOrEqual(200)
      expect(status).toBeLessThan(300)

      // Title hierarchy: root layout uses `default: 'side_effects.art'`
      // and `template: '%s · side_effects.art'`. Both pass the regex.
      await expect(page).toHaveTitle(/side_effects/i)

      // Every page renders some kind of <main> or <body> content — confirm
      // the body has *some* text after hydration. Catches blank-page
      // regressions (e.g. an error in a top-level dynamic import).
      const bodyText = await page.locator('body').innerText()
      expect(bodyText.trim().length, `body of ${path} was empty`).toBeGreaterThan(0)
    })
  }
})

test.describe('Smoke — Gallery lightbox', () => {
  test('clicking a gallery tile opens a lightbox close button', async ({ page }) => {
    await page.goto('/')

    // Gallery tiles render as role="button" with an aria-label that starts
    // with "Open ". Stable across F.1's edits — they're touching titles
    // & images, not the semantic structure.
    const tile = page.getByRole('button', { name: /^Open / }).first()
    await expect(tile).toBeVisible({ timeout: 10_000 })
    await tile.click()

    // Lightbox renders a close button with aria-label="Close". It only
    // exists when the lightbox is open, so seeing it == lightbox opened.
    const close = page.getByRole('button', { name: /^close$/i })
    await expect(close).toBeVisible({ timeout: 5_000 })
  })
})

test.describe('Smoke — Beta access CTAs', () => {
  // The public contact email is load-bearing — multiple pages route beta
  // signups through it. If a refactor drops the mailto, fail loud.
  const PUBLIC_EMAIL = 'robertobecerrilhurtado@gmail.com'

  test('SF-01 page has mailto CTA to public email', async ({ page }) => {
    await page.goto('/sf01')
    const cta = page.locator(`a[href*="mailto:${PUBLIC_EMAIL}"]`).first()
    await expect(cta).toBeVisible()
  })

  test('Chord-Lab page has mailto CTA to public email', async ({ page }) => {
    await page.goto('/chord-lab')
    const cta = page.locator(`a[href*="mailto:${PUBLIC_EMAIL}"]`).first()
    await expect(cta).toBeVisible()
  })
})

test.describe('Smoke — Playground', () => {
  test('drag orb is rendered and accessible', async ({ page }) => {
    await page.goto('/playground')

    // The orb is a <button> with `aria-label` that begins with "Drag the
    // proposition". This is the load-bearing interactive control of the
    // playground page.
    const orb = page.getByRole('button', { name: /^Drag the proposition/i })
    await expect(orb).toBeVisible({ timeout: 15_000 })
  })
})
