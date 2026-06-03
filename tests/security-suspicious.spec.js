import { test, expect } from "@playwright/test";

test.use({
  ignoreHTTPSErrors: true
});

test.setTimeout(120000);

test("simulate suspicious user behaviour", async ({ page }) => {
  await page.goto("http://localhost:5173");

  for (let i = 0; i < 6; i++) {
    await page.getByPlaceholder("Enter email").fill("admin@moviehub.com");
    await page.getByPlaceholder("Enter password").fill(`wrong-password-${i}`);
    await page.getByRole("button", { name: "Generate OTP" }).click();

    await expect(page.getByText("Invalid email or password")).toBeVisible();
  }

  await page.getByPlaceholder("Enter email").fill("admin@moviehub.com");
  await page.getByPlaceholder("Enter password").fill("admin123");
  await page.getByRole("button", { name: "Generate OTP" }).click();

  const otpText = await page.locator("text=Demo OTP:").textContent();
  const otp = otpText.replace("Demo OTP:", "").trim();

  await page.getByPlaceholder("Enter 6 digit OTP").fill(otp);
  await page.getByRole("button", { name: "Verify OTP and Login" }).click();

  await expect(page).toHaveURL(/.*\/movies/);

  const token = await page.evaluate(() => localStorage.getItem("token"));

  for (let i = 0; i < 4; i++) {
    await page.evaluate(async () => {
      await fetch("https://moviehub-doyw.onrender.com/auth/login/verify-otp", {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          email: "admin@moviehub.com",
          otp: "000000"
        })
      });
    });
  }

  // Folosim mai puține request-uri grele ca să nu depășească timeout-ul.
  // Detectorul tot va ajunge HIGH datorită login + OTP + request frequency.
  for (let i = 0; i < 3; i++) {
    await page.evaluate(async (tokenValue) => {
      await fetch("https://moviehub-doyw.onrender.com/performance/actors-naive", {
        method: "GET",
        headers: {
          Authorization: `Bearer ${tokenValue}`
        }
      });
    }, token);
  }

  const analysis = await page.evaluate(async (tokenValue) => {
    const response = await fetch("https://localhost:3000/security/analyze", {
      method: "GET",
      headers: {
        Authorization: `Bearer ${tokenValue}`
      }
    });

    return response.json();
  }, token);

  console.log("SECURITY ANALYSIS:");
  console.log(JSON.stringify(analysis, null, 2));

  expect(["MEDIUM", "HIGH"]).toContain(analysis.analysis.riskLevel);
});