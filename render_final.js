const { chromium } = require('playwright');
const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

const EXE = "C:\\Users\\USUARIO\\AppData\\Local\\ms-playwright\\chromium-1217\\chrome-win64\\chrome.exe";
const URL = "http://127.0.0.1:8765/index.html";

const VIDEOS = [
  { title: "chunks-la-semana", slug: "chunks-la-semana", kind: "story" },
  { title: "chunks-el-primer-dia", slug: "chunks-el-primer-dia", kind: "story" },
  { title: "historia-podcast-1", slug: "historia-podcast-1", kind: "podcast" },
  { title: "historia-podcast-2", slug: "historia-podcast-2", kind: "podcast" },
  { title: "historia-podcast-3", slug: "historia-podcast-3", kind: "podcast" },
  { title: "historia-podcast-4", slug: "historia-podcast-4", kind: "podcast" },
  { title: "pizza-despues-del-trabajo", slug: "pizza-despues-del-trabajo", kind: "podcast" },
  { title: "history-podcast-1", slug: "history-podcast-1", kind: "podcast" },
  { title: "history-podcast-2", slug: "history-podcast-2", kind: "podcast" },
  { title: "history-podcast-3", slug: "history-podcast-3", kind: "podcast" },
  { title: "history-podcast-4", slug: "history-podcast-4", kind: "podcast" },
  { title: "pizza-despues-del-trabajo", slug: "pizza-despues-del-trabajo", kind: "podcast" },
  { title: "sunrise-city", slug: "sunrise-city", kind: "song" },
  { title: "market-day", slug: "market-day", kind: "song" },
  { title: "golden-hour", slug: "golden-hour", kind: "song" },
  { title: "connected-speech", slug: "connected-speech", kind: "song" },
  { title: "progress", slug: "progress", kind: "song" },
];

async function renderVideo(browser, video) {
  const page = await browser.newPage({ viewport: { width: 720, height: 1280 } });
  
  try {
    await page.goto('http://127.0.0.1:8765/index.html', { waitUntil: 'load', timeout: 60000 });
    await new Promise(r => setTimeout(r, 5000));
    
    await page.click("#startAppBtn");
    await new Promise(r => setTimeout(r, 2000));
    
    await page.click("#creativeTab");
    await new Promise(r => setTimeout(r, 3000));
    
    await page.click("#songsKindBtn");
    await new Promise(r => setTimeout(r, 2000));
    
    await page.evaluate((title) => {
      const btns = document.querySelectorAll('[data-creative-index]');
      for (const b of btns) { 
        if (b.textContent.includes(title)) { b.click(); return; } 
      }
    }, video.title);
    await new Promise(r => setTimeout(r, 3000));
    
    await page.click("#creativeMp4Btn");
    await new Promise(r => setTimeout(r, 8000));
    
    // Wait for modal to be ready - check for errors first
    await new Promise(r => setTimeout(r, 10000));
    
    // Check if modal exists and its state
    const modalState = await page.evaluate(() => {
      const modal = document.getElementById('sequenceVideoMaker');
      return {
        exists: !!modal,
        hidden: modal ? modal.hidden : null,
        style: modal ? modal.style.cssText : null,
        className: modal ? modal.className : null,
        display: modal ? window.getComputedStyle(modal).display : null,
        visibility: modal ? window.getComputedStyle(modal).visibility : null,
        parentDisplay: modal && modal.parentElement ? window.getComputedStyle(modal.parentElement).display : null,
        parentVisibility: modal && modal.parentElement ? window.getComputedStyle(modal.parentElement).visibility : null,
      };
    });
    console.log("Modal state:", JSON.stringify(modalState, null, 2));
    
    // Wait for modal to be ready - check for errors in console
    await new Promise(r => setTimeout(r, 8000));
    
    const modalState2 = await page.evaluate(() => {
      const modal = document.getElementById('sequenceVideoMaker');
      return {
        hidden: modal ? modal.hidden : null,
        display: modal ? window.getComputedStyle(modal).display : null,
        visibility: modal ? window.getComputedStyle(modal).visibility : null,
        parentDisplay: modal && modal.parentElement ? window.getComputedStyle(modal.parentElement).display : null,
      };
    });
    console.log("Modal state after wait:", JSON.stringify(modalState2, null, 2));
    
    await page.waitForSelector("#sequenceVideoMaker", { state: "visible", timeout: 60000 });
    await new Promise(r => setTimeout(r, 3000));
    
    // Set video options
    await page.waitForSelector("#sequenceVideoRes", { state: "visible", timeout: 20000 });
    await page.selectOption("#sequenceVideoRes", "720x1280");
    await page.selectOption("#sequenceVideoFps", "15");
    await page.selectOption("#sequenceVideoBitrate", "500000");
    await page.selectOption("#sequenceVideoPace", "natural");
    
    // Set theme to Escenario
    await page.evaluate(() => {
      sequenceState.videoTheme = "escenario";
      document.querySelectorAll("[data-video-theme]").forEach(opt => {
        opt.setAttribute("aria-pressed", opt.dataset.videoTheme === "escenario");
      });
      renderSequenceVideoPreview();
    });
    await new Promise(r => setTimeout(r, 2000));
    
    // Click export
    const downloadPromise = page.waitForEvent('download', { timeout: 300000 });
    await page.click("#sequenceVideoCreateBtn");
    const download = await downloadPromise;
    
    // Compress with ffmpeg
    const inputPath = path.join(process.cwd(), video.slug + ".mp4");
    const outputPath = path.join(__dirname, "..", "assets", "videos", "hero", video.slug + ".mp4");
    
    const { execSync } = require('child_process');
    execSync(`ffmpeg -y -i "${inputPath}" -vf "scale=360:640" -r 15 -b:v 500k -c:v libx264 -preset fast -c:a aac -b:a 64k -movflags +faststart "${outputPath}"`);
  } catch (e) {
    console.error(`Error rendering ${video.title}:`, e);
  } finally {
    await page.close();
  }
}

async function main() {
  const { chromium } = require('playwright');
  const browser = await chromium.launch({ 
    executablePath: "C:\\Users\\USUARIO\\AppData\\Local\\ms-playwright\\chromium-1217\\chrome-win64\\chrome.exe",
    args: ["--no-sandbox"]
  });
  
  const context = await browser.newContext({ acceptDownloads: true });
  const page = await browser.newPage({ viewport: { width: 1280, height: 900 } });
  
  await page.goto("http://127.0.0.1:8765/index.html", { waitUntil: "load", timeout: 60000 });
  await new Promise(r => setTimeout(r, 5000));
  
  await page.click("#startAppBtn");
  await new Promise(r => setTimeout(r, 2000));
  
  await page.click("#creativeTab");
  await new Promise(r => setTimeout(r, 3000));
  
  await page.click("#songsKindBtn");
  await new Promise(r => setTimeout(r, 2000));
  
  for (const video of VIDEOS) {
    console.log(`Rendering ${video.title} (${video.slug})...`);
    try {
      await page.evaluate((title) => {
        const btns = document.querySelectorAll('[data-creative-index]');
        for (const b of btns) { 
          if (b.textContent.includes(title)) { b.click(); return; } 
        }
      }, video.title);
      await new Promise(r => setTimeout(r, 3000));
      
      await page.click("#creativeMp4Btn");
      await new Promise(r => setTimeout(r, 8000));
      
      // Wait for modal to be ready
      await new Promise(r => setTimeout(r, 8000));
      
      // Wait for modal to be visible
      await page.waitForSelector("#sequenceVideoMaker", { state: "visible", timeout: 60000 });
      await new Promise(r => setTimeout(r, 3000));
      
      // Set video options
      await page.waitForSelector("#sequenceVideoRes", { state: "visible", timeout: 20000 });
      await page.selectOption("#sequenceVideoRes", "720x1280");
      await page.selectOption("#sequenceVideoFps", "15");
      await page.selectOption("#sequenceVideoBitrate", "500000");
      await page.selectOption("#sequenceVideoPace", "natural");
      
      // Set theme to Escenario
      await page.evaluate(() => {
        sequenceState.videoTheme = "escenario";
        document.querySelectorAll("[data-video-theme]").forEach(opt => {
          opt.setAttribute("aria-pressed", opt.dataset.videoTheme === "escenario");
        });
        renderSequenceVideoPreview();
      });
      await new Promise(r => setTimeout(r, 2000));
      
      // Click export
      const downloadPromise = page.waitForEvent('download', { timeout: 300000 });
      await page.click("#sequenceVideoCreateBtn");
      const download = await downloadPromise;
      
      // Compress with ffmpeg
      const inputPath = path.join(process.cwd(), video.slug + ".mp4");
      const outputPath = path.join(__dirname, "..", "assets", "videos", "hero", video.slug + ".mp4");
      
      const { execSync } = require('child_process');
      execSync(`ffmpeg -y -i "${inputPath}" -vf "scale=360:640" -r 15 -b:v 500k -c:v libx264 -preset fast -c:a aac -b:a 64k -movflags +faststart "${outputPath}"`);
    } catch (e) {
      console.error(`Error rendering ${video.title}:`, e);
    } finally {
      await page.close();
    }
  }
  
  await browser.close();
  console.log("All videos rendered!");
}

main().catch(console.error);