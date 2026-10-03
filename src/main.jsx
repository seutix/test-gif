import React, { useEffect, useRef, useState } from 'react';
import { createRoot } from 'react-dom/client';
import { Upload, Settings2, Play, Sparkles, ChevronDown, Undo2, Redo2, Plus, Image, Video, SlidersHorizontal, Download, ArrowLeft, ArrowRight, MoreHorizontal, Check, Clock3, WandSparkles, Trash2 } from 'lucide-react';
import './style.css';

const starterFrames = [];

function App() {
  const picker = useRef(null);
  const [frames, setFrames] = useState(starterFrames);
  const [selected, setSelected] = useState(3);
  const [playing, setPlaying] = useState(false);
  const [quality, setQuality] = useState(false);
  const [zoom, setZoom] = useState(50);
  const [activeTool, setActiveTool] = useState('frames');
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [history, setHistory] = useState([]);
  const [future, setFuture] = useState([]);
  const historyLock = useRef(false);
  const [format, setFormat] = useState('MP4');
  const [media, setMedia] = useState([]);
  const [notice, setNotice] = useState('');
  const [draggedId, setDraggedId] = useState(null);
  const [selectedIds, setSelectedIds] = useState(new Set());
  const [selectionAnchor, setSelectionAnchor] = useState(null);
  const selectedFrame = frames.find((frame) => frame.id === selected) || frames[0];
  const notify = (message) => { setNotice(message); window.setTimeout(() => setNotice(''), 2600); };
  const changeFrames = (updater) => {
    setFrames((previous) => {
      const next = typeof updater === 'function' ? updater(previous) : updater;
      if (!historyLock.current && JSON.stringify(previous) !== JSON.stringify(next)) {
        setHistory((items) => [...items.slice(-29), previous]);
        setFuture([]);
      }
      return next;
    });
  };
  const undo = () => {
    setHistory((items) => {
      if (!items.length) return items;
      const previous = items[items.length - 1];
      setFuture((f) => [frames, ...f].slice(0, 30));
      historyLock.current = true; setFrames(previous); historyLock.current = false;
      if (previous[0]) setSelected(previous[0].id);
      notify('Изменение отменено');
      return items.slice(0, -1);
    });
  };
  const redo = () => {
    setFuture((items) => {
      if (!items.length) return items;
      const next = items[0];
      setHistory((h) => [...h.slice(-29), frames]);
      historyLock.current = true; setFrames(next); historyLock.current = false;
      if (next[0]) setSelected(next[0].id);
      notify('Изменение возвращено');
      return items.slice(1);
    });
  };
  useEffect(() => {
    if (!playing || frames.length < 2) return;
    const timer = window.setTimeout(() => {
      const index = frames.findIndex((frame) => frame.id === selected);
      setSelected(frames[(index + 1) % frames.length].id);
    }, Math.max(100, (selectedFrame?.duration || 0.5) * 1000));
    return () => window.clearTimeout(timer);
  }, [playing, selected, frames, selectedFrame]);

  const addFiles = (event) => {
    const files = Array.from(event.target?.files || event.dataTransfer?.files || []);
    if (!files.length) return;
    const additions = files.map((file, index) => ({
      id: `${file.name}-${file.lastModified}`, name: file.name, type: file.type, url: URL.createObjectURL(file),
    }));
    setMedia((previous) => [...previous, ...additions]);
    changeFrames((previous) => [...previous, ...additions.map((file, index) => ({
      id: Date.now() + index, label: String(previous.length + index + 1).padStart(2, '0'), duration: 0.5, url: file.url, video: file.type.startsWith('video/'),
    }))]);
    notify(`Добавлено файлов: ${files.length}`);
    if (event.target) event.target.value = '';
  };

  const addFrame = () => {
    const id = Date.now();
    changeFrames((previous) => [...previous, { id, label: String(previous.length + 1).padStart(2, '0'), duration: 0.5, tone: 'two' }]);
    setSelected(id);
    setSelectedIds(new Set([id]));
    setSelectionAnchor(id);
    notify('Пустой кадр добавлен в конец таймлайна');
  };

  const moveFrame = (direction) => {
    const currentIndex = frames.findIndex((frame) => frame.id === selected);
    const nextIndex = currentIndex + direction;
    if (nextIndex < 0 || nextIndex >= frames.length) return;
    changeFrames((previous) => {
      const next = [...previous];
      [next[currentIndex], next[nextIndex]] = [next[nextIndex], next[currentIndex]];
      return next;
    });
    notify(direction < 0 ? 'Кадр перемещён назад' : 'Кадр перемещён вперёд');
  };

  const moveByDrag = (targetId) => {
    if (!draggedId || draggedId === targetId) return;
    changeFrames((previous) => {
      const source = previous.findIndex((frame) => frame.id === draggedId);
      const target = previous.findIndex((frame) => frame.id === targetId);
      const next = [...previous];
      const [item] = next.splice(source, 1);
      next.splice(target, 0, item);
      return next;
    });
    setDraggedId(null);
    notify('Кадры переставлены');
  };

  const selectFrame = (id, shiftKey = false) => {
    if (!shiftKey) { setSelected(id); setSelectedIds(new Set([id])); setSelectionAnchor(id); return; }
    const anchor = selectionAnchor ?? selected ?? id;
    const a = frames.findIndex((f) => f.id === anchor), b = frames.findIndex((f) => f.id === id);
    if (a < 0 || b < 0) return;
    const [start, end] = a < b ? [a, b] : [b, a];
    setSelectedIds(new Set(frames.slice(start, end + 1).map((f) => f.id))); setSelected(id);
  };
  const deleteMediaFile = (file) => {
    const affectedIds = new Set(frames.filter((frame) => frame.url === file.url).map((frame) => frame.id));
    if (affectedIds.size) {
      changeFrames((previous) => previous.filter((frame) => !affectedIds.has(frame.id)));
      const remaining = frames.filter((frame) => !affectedIds.has(frame.id));
      const next = remaining[0];
      setSelected(next?.id);
      setSelectedIds(next ? new Set([next.id]) : new Set());
    }
    setMedia((previous) => previous.filter((item) => item.id !== file.id));
    URL.revokeObjectURL(file.url);
    notify('Файл и связанные кадры удалены');
  };

  const replaceSelectedFrame = (file) => {
    if (!selectedFrame || !file) return;
    const url = URL.createObjectURL(file);
    changeFrames((previous) => previous.map((frame) => frame.id === selectedFrame.id ? { ...frame, name:file.name, url, type:file.type, video:file.type.startsWith('video/') } : frame));
    notify('Содержимое кадра заменено');
  };
  const deleteSelectedFrames = () => {
    const ids = selectedIds.size ? selectedIds : new Set([selected]);
    changeFrames((previous) => previous.filter((frame) => !ids.has(frame.id)));
    const next = frames.find((frame) => !ids.has(frame.id));
    setSelected(next?.id); setSelectedIds(next ? new Set([next.id]) : new Set()); setPlaying(false);
    notify(ids.size > 1 ? 'Удалено кадров: ' + ids.size : 'Кадр удалён');
  };
  const updateDuration = (value) => {
    const ids = selectedIds.size ? selectedIds : new Set([selected]);
    changeFrames((previous) => previous.map((frame) => ids.has(frame.id) ? { ...frame, duration:Number(value) } : frame));
  };
  const exportMedia = async () => {
    if (!frames.length) { notify('Добавьте хотя бы один кадр'); return; }
    if (!window.kadr?.exportMedia) { notify('Экспорт доступен в Windows-приложении КАДР Motion Lab'); return; }
    const snapshots = [];
    for (const frame of frames) {
      const canvas = document.createElement('canvas'); canvas.width = 1280; canvas.height = 720;
      const ctx = canvas.getContext('2d'); ctx.fillStyle = '#101712'; ctx.fillRect(0, 0, canvas.width, canvas.height);
      if (frame.url) {
        const mediaEl = frame.video ? document.createElement('video') : new Image();
        mediaEl.src = frame.url; if (frame.video) { mediaEl.muted = true; mediaEl.currentTime = 0; }
        await new Promise((resolve) => { mediaEl.onload = resolve; mediaEl.onloadeddata = resolve; mediaEl.onerror = resolve; });
        try { const w = mediaEl.videoWidth || mediaEl.naturalWidth || 1, h = mediaEl.videoHeight || mediaEl.naturalHeight || 1, scale = Math.min(canvas.width/w, canvas.height/h); const dw=w*scale, dh=h*scale; ctx.drawImage(mediaEl,(canvas.width-dw)/2,(canvas.height-dh)/2,dw,dh); } catch {}
      }
      snapshots.push({ data:canvas.toDataURL('image/png').split(',')[1], duration:frame.duration });
    }
    notify('Подготовка экспорта…');
    const result = await window.kadr.exportMedia({ format, frames:snapshots });
    notify(result?.ok ? 'Файл сохранён: ' + result.fileName : (result?.error || 'Экспорт отменён'));
  };
  const exportProject = () => {
    const project = { format, interpolation: quality ? '2x' : 'off', frames: frames.map(({ id, label, duration }) => ({ id, label, duration })) };
    const link = document.createElement('a');
    link.href = URL.createObjectURL(new Blob([JSON.stringify(project, null, 2)], { type: 'application/json' }));
    link.download = 'kadr-project.json'; link.click(); URL.revokeObjectURL(link.href);
    notify('Проект сохранён как JSON. Рендер MP4/GIF подключается через серверный кодек.');
  };

  return <main>
    <input ref={picker} className="file-picker" type="file" accept="image/*,video/mp4,image/gif" multiple onChange={addFiles} />
    <header className="topbar">
      <div className="brand"><span className="brand-mark">K</span><span>КАДР</span><i /><small>новый проект</small></div>
      <nav><button className="nav-active" onClick={() => { setActiveTool("frames"); notify("Режим монтажа"); }}>Монтаж</button><button onClick={() => { setQuality((v) => !v); notify("Плавное движение переключено"); }}>Улучшение</button><button onClick={exportMedia}>Экспорт</button></nav>
      <div className="head-actions"><button className="icon-btn" title="Отменить" onClick={undo} disabled={!history.length}><Undo2 size={17} /></button><button className="icon-btn" title="Повторить" onClick={redo} disabled={!future.length}><Redo2 size={17} /></button><button className="settings" onClick={() => setSettingsOpen(!settingsOpen)}><Settings2 size={16} /> Настройки</button><button className="export" onClick={exportMedia}><Download size={16} /> Экспорт</button></div>
    </header>
    <section className="workspace">
      <aside className="left-panel">
        <div className="panel-title"><span>Медиа</span><button onClick={() => picker.current.click()}><Plus size={18} /></button></div>
        <button className="dropzone" onClick={() => picker.current.click()} onDragOver={(event) => event.preventDefault()} onDrop={addFiles}><Upload size={22} /><b>Добавить файлы</b><span>Нажмите или перетащите PNG, JPG, GIF, MP4</span></button>
        {media.length === 0 ? <div className="empty-media"><Image size={17} /><span>Здесь появятся ваши файлы</span></div> : media.map((file) => <div className="media-list" key={file.id} onClick={() => replaceSelectedFrame(file)}><div className="media-thumb custom" style={file.type.startsWith('image/') ? { backgroundImage: `url(${file.url})` } : {}}>{file.type.startsWith('video') && <Video size={15} />}</div><div className="media-name"><b>{file.name}</b><small>{file.type.startsWith('video') ? 'Видео для улучшения' : 'Добавлено на таймлайн'}</small></div><button className="more" title="Удалить файл" onClick={(event) => { event.stopPropagation(); deleteMediaFile(file); }}><Trash2 size={16} /></button></div>)}
        <div className="source-note"><Sparkles size={14} /><span>Исходники сохраняются<br />без изменений</span></div>
      </aside>
      <section className="editor">
        <div className="editor-toolbar"><div><button className={`tool ${activeTool === "frames" ? "selected" : ""}`} onClick={() => setActiveTool("frames")}><SlidersHorizontal size={16} /> Кадры</button><button className={`tool ${activeTool === "timing" ? "selected" : ""}`} onClick={() => setActiveTool("timing")}><Clock3 size={16} /> Тайминг</button></div><div className="status"><span />Изменения сохранены локально</div></div>
        <div className="stage-wrap"><div className="stage">{selectedFrame ? <><div className="art uploaded-art" style={!selectedFrame.video ? { backgroundImage: `url(${selectedFrame.url})` } : {}}>{selectedFrame.video && <video src={selectedFrame.url} controls={playing} autoPlay={playing} />}</div><div className="stage-meta"><span>Кадр {frames.findIndex((frame) => frame.id === selected) + 1} из {frames.length}</span><span>{frames.reduce((sum, frame) => sum + frame.duration, 0).toFixed(1)} сек</span></div></> : <button className="empty-stage" onClick={() => picker.current.click()}><Upload size={30} /><b>Добавьте изображения или видео</b><span>Нажмите здесь или перетащите файлы в панель «Медиа»</span></button>}</div></div>
        <div className="timeline-head"><div><button className="timeline-button" onClick={() => setActiveTool("frames")}><Image size={15} /> Кадры <ChevronDown size={14} /></button><button className="add-frame" onClick={addFrame}><Plus size={15} /> Добавить</button></div><div className="zoom"><button onClick={() => setZoom(Math.max(25, zoom - 10))}>−</button><div className="zoomline" title={`Масштаб ${zoom}%`}><i style={{width:`${zoom}%`}} /></div><button onClick={() => setZoom(Math.min(100, zoom + 10))}>+</button></div></div>
        <div className="timeline"><button className={`timeline-play ${playing ? "playing" : ""}`} onClick={() => { if (!frames.length) { picker.current.click(); return; } setPlaying((v) => !v); }} aria-label={playing ? "Пауза" : "Воспроизвести"}>{playing ? <span>Ⅱ</span> : <Play size={13} fill="currentColor" />}</button><div className="time-row"><span>0:00</span><span>0:01</span><span>0:02</span><span>0:03</span></div><div className="frame-row">{frames.length === 0 ? <button className="empty-timeline" onClick={() => picker.current.click()}><Plus size={16} /> Добавьте первый кадр</button> : frames.map((frame) => <button key={frame.id} draggable className={`frame ${frame.tone || ''} ${(selectedIds.has(frame.id) || selected === frame.id) ? 'active' : ''}`} onClick={(event) => selectFrame(frame.id, event.shiftKey)} onDragStart={() => setDraggedId(frame.id)} onDragOver={(event) => event.preventDefault()} onDrop={() => moveByDrag(frame.id)}><div className="scene" style={!frame.video ? { backgroundImage: `url(${frame.url})` } : {}}>{frame.video && <Video size={17} />}</div><b>{frame.label}</b><small>{frame.duration.toFixed(1)} c</small></button>)}</div></div>
      </section>
      <aside className="right-panel">
        <div className="panel-title"><span>Свойства</span><button onClick={() => notify("Дополнительные свойства пока не требуются")}><MoreHorizontal size={19} /></button></div>
        <div className="property-section"><h3>Выбранный кадр</h3>{selectedFrame ? <><div className="mini-preview scenic" style={!selectedFrame.video ? { backgroundImage: `url(${selectedFrame.url})` } : {}}><span>{selectedFrame.label}</span></div><label>Длительность <b>{selectedFrame.duration.toFixed(1)} сек</b></label><input type="range" min="0.1" max="2" step="0.1" value={selectedFrame.duration} onChange={(event) => updateDuration(event.target.value)} /><div className="field-row"><button className="danger-btn" onClick={deleteSelectedFrames}>Удалить</button><button onClick={() => moveFrame(-1)} disabled={selected === frames[0]?.id}><ArrowLeft size={15} /> Назад</button><button onClick={() => moveFrame(1)} disabled={selected === frames.at(-1)?.id}>Вперёд <ArrowRight size={15} /></button></div></> : <p className="empty-properties">Выберите или добавьте кадр, чтобы настроить его.</p>}</div>
        <div className="bulk-note">{selectedIds.size > 1 ? "Выбрано " + selectedIds.size + " кадров. Shift + клик задаёт диапазон. Тайминг меняется у всех выбранных." : "Shift + клик по кадрам — выбрать диапазон и изменить их тайминг вместе."}</div><div className="property-section enhance"><div className="enhance-title"><div className="spark"><WandSparkles size={17} /></div><div><h3>Плавное движение</h3><p>Генерация промежуточных кадров</p></div><button className={`toggle ${quality ? 'on' : ''}`} onClick={() => setQuality(!quality)} aria-label="Включить плавное движение"><i /></button></div>{quality && <div className="quality-open"><label>Плавность <b>×2 кадра</b></label><input type="range" defaultValue="45" /><small>Будет добавлено {Math.max(0, frames.length - 1)} кадров с сохранением исходного разрешения.</small></div>}</div>
        <div className="property-section"><h3>Настройки проекта</h3><div className="info-row"><span>Разрешение</span><b>Исходное</b></div><div className="info-row"><span>Частота</span><b>30 fps</b></div><div className="format-row">{['GIF', 'MP4'].map((type) => <button key={type} className={format === type ? 'format-active' : ''} onClick={() => setFormat(type)}>{type}{format === type && <Check size={13} />}</button>)}</div></div>
      </aside>
    </section>
    {notice && <div className="toast"><Check size={16} />{notice}</div>}
  {settingsOpen && <div className="settings-popover"><b>Настройки проекта</b><span>Изменения сохраняются автоматически.</span><button onClick={() => { setSettingsOpen(false); notify("Настройки закрыты"); }}>Готово</button></div>}\n  </main>;
}
createRoot(document.getElementById('root')).render(<App />);
