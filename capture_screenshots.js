const puppeteer = require('puppeteer-core');
const path = require('path');
const fs = require('fs');

const EDGE_PATH = 'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe';
const SCREENSHOT_DIR = path.join(__dirname, 'screenshots');

if (!fs.existsSync(SCREENSHOT_DIR)) {
    fs.mkdirSync(SCREENSHOT_DIR, { recursive: true });
}

async function run() {
    console.log('Launching Edge browser...');
    const browser = await puppeteer.launch({
        executablePath: EDGE_PATH,
        headless: true,
        args: ['--no-sandbox', '--disable-setuid-sandbox', '--window-size=1400,900']
    });

    const page = await browser.newPage();
    await page.setViewport({ width: 1400, height: 900 });

    console.log('Navigating to http://localhost:3000...');
    await page.goto('http://localhost:3000', { waitUntil: 'networkidle0' });
    await new Promise(r => setTimeout(r, 1500));

    // Nạp dữ liệu mẫu trước nếu bảng trống
    try {
        await page.evaluate(() => {
            const btnSeed = document.getElementById('btnSeed');
            if (btnSeed) btnSeed.click();
        });
        await new Promise(r => setTimeout(r, 1200));
    } catch (e) {
        console.log('Seed error (optional):', e.message);
    }

    // 1. Giao diện chính Tổng Quan
    console.log('Capturing 1: Main Dashboard...');
    await page.screenshot({ path: path.join(SCREENSHOT_DIR, 'hinh_1_tong_quan.png') });

    // 2. Modal Đăng nhập / Đăng ký
    console.log('Capturing 2: Auth Modal...');
    await page.evaluate(() => {
        const btnAuth = document.getElementById('btnOpenAuthModal');
        if (btnAuth) btnAuth.click();
    });
    await new Promise(r => setTimeout(r, 600));
    await page.screenshot({ path: path.join(SCREENSHOT_DIR, 'hinh_2_auth_modal.png') });

    // Đóng Auth Modal
    await page.evaluate(() => {
        const btnClose = document.getElementById('btnCloseAuth');
        if (btnClose) btnClose.click();
    });
    await new Promise(r => setTimeout(r, 400));

    // 3. Modal Database Explorer
    console.log('Capturing 3: Database Explorer...');
    await page.evaluate(() => {
        const btnExplorer = document.getElementById('btnOpenExplorer');
        if (btnExplorer) btnExplorer.click();
    });
    await new Promise(r => setTimeout(r, 1000));
    await page.screenshot({ path: path.join(SCREENSHOT_DIR, 'hinh_3_database_explorer.png') });

    // Đóng Database Explorer
    await page.evaluate(() => {
        const btnClose = document.getElementById('btnCloseExplorer');
        if (btnClose) btnClose.click();
    });
    await new Promise(r => setTimeout(r, 400));

    // 4. Modal Skip List Visualizer
    console.log('Capturing 4: Skip List Visualizer...');
    await page.evaluate(() => {
        const btn = document.getElementById('btnOpenSkipList');
        if (btn) btn.click();
    });
    await new Promise(r => setTimeout(r, 600));
    await page.screenshot({ path: path.join(SCREENSHOT_DIR, 'hinh_4_skiplist_visualizer.png') });

    // Đóng Skip List
    await page.evaluate(() => {
        const btn = document.getElementById('btnCloseSkipList');
        if (btn) btn.click();
    });
    await new Promise(r => setTimeout(r, 400));

    // 5. Modal Tie-Breaking
    console.log('Capturing 5: Tie-Breaking...');
    await page.evaluate(() => {
        const btn = document.getElementById('btnOpenTieBreak');
        if (btn) btn.click();
        const btnRun = document.getElementById('btnRunTieBreakDemo');
        if (btnRun) btnRun.click();
    });
    await new Promise(r => setTimeout(r, 800));
    await page.screenshot({ path: path.join(SCREENSHOT_DIR, 'hinh_5_tie_breaking.png') });

    // Đóng Tie-Breaking
    await page.evaluate(() => {
        const btn = document.getElementById('btnCloseTieBreak');
        if (btn) btn.click();
    });
    await new Promise(r => setTimeout(r, 400));

    // 6. Modal Bang Hội (Guilds)
    console.log('Capturing 6: Guilds Leaderboard...');
    await page.evaluate(() => {
        const btn = document.getElementById('btnOpenGuild');
        if (btn) btn.click();
    });
    await new Promise(r => setTimeout(r, 800));
    await page.screenshot({ path: path.join(SCREENSHOT_DIR, 'hinh_6_guilds_modal.png') });

    // Đóng Guilds
    await page.evaluate(() => {
        const btn = document.getElementById('btnCloseGuild');
        if (btn) btn.click();
    });
    await new Promise(r => setTimeout(r, 400));

    // 7. Modal Persistence
    console.log('Capturing 7: Persistence...');
    await page.evaluate(() => {
        const btn = document.getElementById('btnOpenPersistence');
        if (btn) btn.click();
    });
    await new Promise(r => setTimeout(r, 600));
    await page.screenshot({ path: path.join(SCREENSHOT_DIR, 'hinh_7_persistence_modal.png') });

    // Đóng Persistence
    await page.evaluate(() => {
        const btnClose = document.getElementById('btnClosePersistence');
        if (btnClose) btnClose.click();
    });
    await new Promise(r => setTimeout(r, 400));

    // 8. Modal Quét QR Mạng LAN
    console.log('Capturing 8: QR Code Modal...');
    await page.evaluate(() => {
        const btn = document.getElementById('btnOpenQr');
        if (btn) btn.click();
    });
    await new Promise(r => setTimeout(r, 600));
    await page.screenshot({ path: path.join(SCREENSHOT_DIR, 'hinh_8_qr_modal.png') });

    // 9. Mobile Live Tapper Game (Mobile Viewport)
    console.log('Capturing 9: Mobile Game...');
    const mobilePage = await browser.newPage();
    await mobilePage.setViewport({ width: 390, height: 844, isMobile: true });
    await mobilePage.goto('http://localhost:3000/game.html', { waitUntil: 'networkidle0' });
    await new Promise(r => setTimeout(r, 800));
    // Click join game
    await mobilePage.evaluate(() => {
        const input = document.getElementById('playerNameInput');
        if (input) input.value = 'Quốc Bảo Mobile';
        const btnTabGuest = document.getElementById('btnTabGuest');
        if (btnTabGuest) btnTabGuest.click();
        const btnJoin = document.getElementById('btnJoinGame');
        if (btnJoin) btnJoin.click();
    });
    await new Promise(r => setTimeout(r, 600));
    await mobilePage.screenshot({ path: path.join(SCREENSHOT_DIR, 'hinh_9_mobile_game.png') });

    await browser.close();
    console.log('All screenshots captured successfully!');
}

run().catch(err => {
    console.error('Error during screenshot capture:', err);
    process.exit(1);
});
