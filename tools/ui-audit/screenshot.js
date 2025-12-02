const { chromium } = require('playwright');
const fs = require('fs');
const path = require('path');

const args = require('minimist')(process.argv.slice(2));
const port = args.port || 5173;
const outDir = args.out || path.join(__dirname, 'screenshots');

async function ensureOut() {
    if (!fs.existsSync(outDir)) fs.mkdirSync(outDir, { recursive: true });
}

async function capture(url, name, page) {
    console.log('Visiting', url);
    await page.goto(url, { waitUntil: 'networkidle' });
    // give the app a moment to settle
    await page.waitForTimeout(400);
    const file = path.join(outDir, `${name}.png`);
    await page.screenshot({ path: file, fullPage: true });
    console.log('Saved', file);
}

(async () => {
    await ensureOut();
    const browser = await chromium.launch({ headless: true });
    const page = await browser.newPage({ viewport: { width: 1280, height: 900 } });
    const base = `http://localhost:${port}`;

    try {
        // Home
        await capture(base + '/', 'home', page);

        // Upload (protected route - might redirect to signin)
        await capture(base + '/upload', 'upload', page);

        // Example image page - you should replace <example-slug> with a real slug
        await capture(base + '/photos/example-image-slug', 'image-example', page);

        // Signin
        await capture(base + '/signin', 'signin', page);

    } catch (err) {
        console.error(err);
    } finally {
        await browser.close();
        console.log('Done');
    }
})();
