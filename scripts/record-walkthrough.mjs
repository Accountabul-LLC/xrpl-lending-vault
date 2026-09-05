#!/usr/bin/env node
/**
 * Records the in-app walkthrough at 1920×1080 and muxes official narration.
 */
import { spawn } from 'node:child_process'
import { mkdir, rm } from 'node:fs/promises'
import path from 'node:path'
import { chromium } from 'playwright'

const ROOT = path.resolve(import.meta.dirname, '..')
const OUT_DIR = path.join(ROOT, 'tmp-walkthrough-video')
const PUBLIC_MP4 = path.join(ROOT, 'public/walkthrough/accountabul-lending-lab-walkthrough.mp4')
const ARTIFACTS = '/opt/cursor/artifacts'
const AUDIO = path.join(ROOT, 'public/walkthrough/narration.mp3')

function run(cmd, args) {
  return new Promise((resolve, reject) => {
    const child = spawn(cmd, args, { stdio: 'inherit' })
    child.on('exit', (code) => (code === 0 ? resolve() : reject(new Error(`${cmd} ${code}`))))
  })
}

async function waitForPort(url, ms = 60_000) {
  const start = Date.now()
  while (Date.now() - start < ms) {
    try {
      const res = await fetch(url)
      if (res.ok || res.status === 200 || res.status === 304) return
    } catch {
      /* retry */
    }
    await new Promise((r) => setTimeout(r, 400))
  }
  throw new Error(`Timeout waiting for ${url}`)
}

const preview = spawn('npm', ['run', 'preview', '--', '--host', '127.0.0.1', '--port', '4173'], {
  cwd: ROOT,
  stdio: 'inherit'
})

try {
  await waitForPort('http://127.0.0.1:4173')
  await rm(OUT_DIR, { recursive: true, force: true })
  await mkdir(OUT_DIR, { recursive: true })

  const browser = await chromium.launch({
    headless: true,
    args: ['--autoplay-policy=no-user-gesture-required']
  })
  const context = await browser.newContext({
    viewport: { width: 1920, height: 1080 },
    recordVideo: { dir: OUT_DIR, size: { width: 1920, height: 1080 } }
  })
  const page = await context.newPage()
  await page.goto('http://127.0.0.1:4173/?view=walkthrough&record=1', {
    waitUntil: 'load',
    timeout: 60_000
  })
  await page.waitForSelector('[data-walkthrough-ready="true"]', { timeout: 60_000 })
  await page.waitForSelector('[data-walkthrough-complete="true"]', { timeout: 15 * 60_000 })
  await page.waitForTimeout(2500)
  const videoPath = await page.video().path()
  await context.close()
  await browser.close()

  await mkdir(path.dirname(PUBLIC_MP4), { recursive: true })
  await run('ffmpeg', [
    '-y',
    '-i',
    videoPath,
    '-i',
    AUDIO,
    '-map',
    '0:v:0',
    '-map',
    '1:a:0',
    '-c:v',
    'libx264',
    '-pix_fmt',
    'yuv420p',
    '-crf',
    '20',
    '-preset',
    'medium',
    '-c:a',
    'aac',
    '-b:a',
    '160k',
    '-shortest',
    '-movflags',
    '+faststart',
    PUBLIC_MP4
  ])

  await mkdir(ARTIFACTS, { recursive: true })
  await run('cp', [PUBLIC_MP4, path.join(ARTIFACTS, 'accountabul_lending_lab_walkthrough.mp4')])
  console.log('wrote', PUBLIC_MP4)
} finally {
  preview.kill('SIGTERM')
}
