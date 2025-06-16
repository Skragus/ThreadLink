import { test } from '@playwright/test';

test('debug page elements', async ({ page }) => {
  await page.goto('/');
  
  // Wait for page to load completely
  await page.waitForLoadState('networkidle');
  // TODO: [Test Flakiness] Replace this hardcoded wait with a specific web assertion. Ex: await expect(page.locator('...')).toBeVisible(); // Extra wait
  
  // Take a screenshot
  await page.screenshot({ path: 'debug-page.png', fullPage: true });
  
  // Log page title and URL
  console.log(`Page title: "${await page.title()}"`);
  console.log(`Page URL: "${page.url()}"`);
  
  // Log page content
  const bodyContent = await page.locator('body').innerHTML();
  console.log(`Body HTML length: ${bodyContent.length}`);
  console.log(`Body HTML (first 500 chars): ${bodyContent.substring(0, 500)}`);
  
  // Log all elements
  const allElements = await page.locator('*').all();
  console.log(`Found ${allElements.length} total elements`);
  
  // Log specific elements we're looking for
  const textareas = await page.locator('textarea').all();
  console.log(`Found ${textareas.length} textarea elements`);
  
  const buttons = await page.locator('button').all();
  console.log(`Found ${buttons.length} button elements`);
  
  // Check for React root
  const reactRoot = await page.locator('#root').isVisible();
  console.log(`React root visible: ${reactRoot}`);
  
  if (reactRoot) {
    const rootContent = await page.locator('#root').innerHTML();
    console.log(`Root HTML length: ${rootContent.length}`);
    console.log(`Root HTML (first 500 chars): ${rootContent.substring(0, 500)}`);
  }
});
