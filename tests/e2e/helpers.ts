import { Page, expect } from "@playwright/test"

export const BASE_URL = process.env.BASE_URL ?? "https://football-manager-ui.vercel.app"
export const API_URL = process.env.API_URL ?? "https://backend-production-d7a8.up.railway.app"

/** Generate a unique test user email */
export function testEmail(suffix: string) {
  return `e2e-${suffix}-${Date.now()}@pitchperfect.test`
}

/** Navigate to the app and dismiss the welcome screen if present */
export async function openApp(page: Page) {
  await page.goto(BASE_URL, { waitUntil: "networkidle" })
  const enterBtn = page.getByRole("button", { name: "Enter the dugout" })
  if (await enterBtn.isVisible({ timeout: 4000 }).catch(() => false)) {
    await enterBtn.click()
  }
}

/** Register a new user and land on the Hub screen */
export async function registerUser(
  page: Page,
  opts: { email: string; password: string; displayName: string; clubId?: string },
) {
  await openApp(page)

  // Switch to register mode if needed
  const registerBtn = page.getByRole("button", { name: "Crear una cuenta nueva" })
  if (await registerBtn.isVisible({ timeout: 4000 }).catch(() => false)) {
    await registerBtn.click()
  }

  // Fill the form
  const displayNameInput = page.getByPlaceholder("Nombre de manager")
  if (await displayNameInput.isVisible({ timeout: 3000 }).catch(() => false)) {
    await displayNameInput.fill(opts.displayName)
  }

  // Select club if provided (click the club button that contains the name)
  if (opts.clubId) {
    const clubButtons = page.locator("button[type='button']").filter({ hasNotText: /Crear|Unirse|Registrar|Entrar|Next/ })
    const allButtons = await clubButtons.all()
    for (const btn of allButtons) {
      const text = await btn.textContent()
      if (text?.toLowerCase().includes(opts.clubId.toLowerCase())) {
        await btn.click()
        break
      }
    }
  }

  await page.getByPlaceholder("Email").fill(opts.email)
  await page.getByPlaceholder("Password").fill(opts.password)
  await page.getByRole("button", { name: "Registrarme" }).click()

  // Wait for Hub to appear
  await expect(page.getByText("Pantalla de inicio")).toBeVisible({ timeout: 20000 })
}

/** Login an existing user */
export async function loginUser(page: Page, opts: { email: string; password: string }) {
  await openApp(page)

  // Make sure we're on login (not register)
  const alreadyHaveAccount = page.getByRole("button", { name: "Ya tengo cuenta" })
  if (await alreadyHaveAccount.isVisible({ timeout: 3000 }).catch(() => false)) {
    await alreadyHaveAccount.click()
  }

  await page.getByPlaceholder("Email").fill(opts.email)
  await page.getByPlaceholder("Password").fill(opts.password)
  await page.getByRole("button", { name: "Entrar" }).click()

  await expect(page.getByText("Pantalla de inicio")).toBeVisible({ timeout: 20000 })
}

/** Extract the invite code from the hub message or league card */
export async function getInviteCode(page: Page): Promise<string> {
  // After creating a league, the invite code appears in a success message
  const msgLocator = page.locator("p").filter({ hasText: /Codigo:|Invite code:/ })
  const text = await msgLocator.textContent({ timeout: 10000 })
  const match = text?.match(/([A-Z0-9]{6})/)
  if (match) return match[1]

  // Fallback: look in lobby
  const lobbyCode = page.locator(".text-\\[var\\(--amber\\)\\]").filter({ hasText: /^[A-Z0-9]{6}$/ })
  const codeText = await lobbyCode.textContent({ timeout: 5000 })
  if (codeText?.trim().length === 6) return codeText.trim()

  throw new Error("Could not find invite code on page")
}

/** Wait and assert a toast notification appears */
export async function expectToast(page: Page, textFragment: string) {
  await expect(page.locator("[data-sonner-toast], [role='status'], [data-radix-toast-viewport] li").first())
    .toContainText(textFragment, { timeout: 15000 })
    .catch(async () => {
      // Fallback: look for any text on page
      await expect(page.getByText(textFragment, { exact: false })).toBeVisible({ timeout: 5000 })
    })
}

/** Sleep for ms */
export function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms))
}
