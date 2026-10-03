const { app, BrowserWindow, ipcMain } = require('electron');
const path = require('path');
const fs = require('fs');
const os = require('os');
const { spawn } = require('child_process');
const ffmpegPackagePath = require.resolve('ffmpeg-static');
const ffmpegPath = ffmpegPackagePath.replace('app.asar' + path.sep, 'app.asar.unpacked' + path.sep);

function runFfmpeg(args) {
  return new Promise((resolve, reject) => {
    const proc = spawn(ffmpegPath, args, { windowsHide: true });
    let stderr = '';
    proc.stderr.on('data', (d) => { stderr += d.toString(); });
    proc.on('error', reject);
    proc.on('close', (code) => code === 0 ? resolve() : reject(new Error(stderr.slice(-2000))));
  });
}

ipcMain.handle('export-media', async (_event, payload) => {
  const format = 'GIF';
  const fps = Math.max(1, Math.min(60, Number(payload?.fps) || 12));
  const quality = payload?.quality || 'high';
  const frames = Array.isArray(payload?.frames) ? payload.frames : [];
  if (!frames.length) return { ok:false, error:'Нет кадров для экспорта' };
  const ext = format.toLowerCase();
  const downloads = app.getPath('downloads');
  const stamp = new Date().toISOString().replace(/[:.]/g, '-');
  let outputPath = path.join(downloads, `kadr-animation-${stamp}.${ext}`);
  let suffix = 1;
  while (fs.existsSync(outputPath)) {
    outputPath = path.join(downloads, `kadr-animation-${stamp}-${suffix++}.${ext}`);
  }
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'kadr-'));
  try {
    const list = [];
    for (let i=0;i<frames.length;i++) {
      const file = path.join(dir, String(i).padStart(5,'0') + '.png');
      fs.writeFileSync(file, Buffer.from(frames[i].data, 'base64'));
      list.push({ file, duration:Math.max(0.05, Number(frames[i].duration) || 0.5) });
    }
    const concat = path.join(dir, 'input.txt');
    const lines = [];
    for (const item of list) { lines.push("file '" + item.file.replace(/'/g, "'\\''") + "'"); lines.push('duration ' + item.duration); }
    lines.push("file '" + list[list.length - 1].file.replace(/'/g, "'\\''") + "'");
    fs.writeFileSync(concat, lines.join('\n'));
    if (format === 'GIF') {
      const palette = path.join(dir, 'palette.png');
      await runFfmpeg(['-y','-f','concat','-safe','0','-i',concat,'-vf',`fps=${fps},scale=1280:-1:flags=lanczos,palettegen=max_colors=${quality === 'small' ? 128 : 256}:stats_mode=diff`,palette]);
      await runFfmpeg(['-y','-f','concat','-safe','0','-i',concat,'-i',palette,'-lavfi',`fps=${fps},scale=1280:-1:flags=lanczos[x];[x][1:v]paletteuse=dither=sierra2_4a`,'-loop','0',outputPath]);
    } else {
      await runFfmpeg(['-y','-f','concat','-safe','0','-i',concat,'-vf','fps=30,format=yuv420p','-movflags','+faststart','-c:v','libx264',picked.filePath]);
    }
    return { ok:true, fileName:path.basename(outputPath), filePath:outputPath };
  } catch (error) {
    return { ok:false, error:'Ошибка FFmpeg: ' + error.message };
  } finally {
    fs.rmSync(dir,{recursive:true,force:true});
  }
});

function createWindow() {
  const win = new BrowserWindow({
    width: 1440, height: 900, minWidth: 1100, minHeight: 650,
    backgroundColor: '#edf0ed', autoHideMenuBar: true,
    webPreferences: { contextIsolation: true, nodeIntegration: false, preload: path.join(__dirname,'preload.cjs') },
  });
  win.loadFile(path.join(__dirname, '..', 'dist', 'index.html'));
}
app.whenReady().then(() => { createWindow(); app.on('activate', () => { if (BrowserWindow.getAllWindows().length === 0) createWindow(); }); });
app.on('window-all-closed', () => { if (process.platform !== 'darwin') app.quit(); });
