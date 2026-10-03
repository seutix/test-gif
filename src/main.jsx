import React, { useEffect, useMemo, useRef, useState } from 'react';
import { createRoot } from 'react-dom/client';
import {
  Upload, Plus, Trash2, Copy, Play, Pause, SkipBack, SkipForward, Undo2, Redo2,
  Settings2, Download, ChevronDown, Scissors, RotateCcw, RotateCw, FlipHorizontal,
  FlipVertical, Crop, Layers3, Clock3, Image as ImageIcon, Grid3X3, Eye, EyeOff,
  Maximize2, Minimize2, ZoomIn, ZoomOut, MoreHorizontal, Check, Repeat2, Sparkles
} from 'lucide-react';
import './style.css';

const clamp = (v, a, b) => Math.min(b, Math.max(a, v));
const makeId = () => Date.now() + Math.random();
const emptyFrame = (i) => ({ id: makeId(), label: String(i + 1).padStart(2, '0'), duration: 0.1, url: '', name: '', type: '', rotation: 0, flipX: false, flipY: false, opacity: 1 });

function App() {
  const picker = useRef(null);
  const stageRef = useRef(null);
  const [frames, setFrames] = useState([]);
  const [media, setMedia] = useState([]);
  const [selectedIds, setSelectedIds] = useState(new Set());
  const [anchor, setAnchor] = useState(null);
  const [playing, setPlaying] = useState(false);
  const [loop, setLoop] = useState(true);
  const [zoom, setZoom] = useState(72);
  const [fps, setFps] = useState(12);
  const [quality, setQuality] = useState('high');
  const [checker, setChecker] = useState(false);
  const [onion, setOnion] = useState(false);
  const [fit, setFit] = useState('contain');
  const [history, setHistory] = useState([]);
  const [future, setFuture] = useState([]);
  const [notice, setNotice] = useState('');
  const [tab, setTab] = useState('frames');
  const [settings, setSettings] = useState(false);
  const [bg, setBg] = useState('#101510');

  const selected = frames.find(f => selectedIds.has(f.id)) || frames[0];
  const selectedArray = useMemo(() => frames.filter(f => selectedIds.has(f.id)), [frames, selectedIds]);
  const total = frames.reduce((s, f) => s + Number(f.duration || 0), 0);

  const notify = (s) => { setNotice(s); window.clearTimeout(window.__kadrToast); window.__kadrToast = window.setTimeout(() => setNotice(''), 2400); };

  const commit = (updater) => {
    setFrames(prev => {
      const next = typeof updater === 'function' ? updater(prev) : updater;
      if (JSON.stringify(prev) !== JSON.stringify(next)) {
        setHistory(h => [...h.slice(-49), prev]);
        setFuture([]);
      }
      return next;
    });
  };

  const select = (id, shift) => {
    const idx = frames.findIndex(f => f.id === id);
    if (idx < 0) return;
    if (!shift || anchor == null) {
      setSelectedIds(new Set([id])); setAnchor(id); return;
    }
    const a = frames.findIndex(f => f.id === anchor);
    const [lo, hi] = a < idx ? [a, idx] : [idx, a];
    setSelectedIds(new Set(frames.slice(lo, hi + 1).map(f => f.id)));
  };

  const addFiles = (e) => {
    const files = Array.from(e.target?.files || e.dataTransfer?.files || []).filter(f => f.type.startsWith('image/') || f.type === 'image/gif');
    if (!files.length) return;
    const additions = files.map(file => ({ id: makeId(), name: file.name, type: file.type, url: URL.createObjectURL(file) }));
    setMedia(m => [...m, ...additions]);
    commit(prev => [...prev, ...additions.map((m, i) => ({ ...emptyFrame(prev.length + i), url: m.url, name: m.name, type: m.type }))]);
    setTimeout(() => {
      const ids = additions.map((_, i) => frames.length + i);
      notify(`Импортировано кадров: ${files.length}`);
    }, 0);
    if (e.target) e.target.value = '';
  };

  const addBlank = () => {
    const f = emptyFrame(frames.length);
    commit(p => [...p, f]); setSelectedIds(new Set([f.id])); setAnchor(f.id); notify('Пустой кадр добавлен');
  };

  const duplicate = () => {
    if (!selectedArray.length) return;
    const copies = selectedArray.map((f, i) => ({ ...f, id: makeId(), label: String(frames.length + i + 1).padStart(2, '0') }));
    const last = frames.findIndex(f => f.id === selectedArray[selectedArray.length - 1].id);
    commit(p => [...p.slice(0, last + 1), ...copies, ...p.slice(last + 1)]);
    setSelectedIds(new Set(copies.map(f => f.id))); setAnchor(copies[0].id); notify('Кадры продублированы');
  };

  const remove = () => {
    if (!selectedArray.length) return;
    const ids = new Set(selectedArray.map(f => f.id));
    const next = frames.find(f => !ids.has(f.id));
    commit(p => p.filter(f => !ids.has(f.id)));
    setSelectedIds(next ? new Set([next.id]) : new Set()); setAnchor(next?.id ?? null); setPlaying(false); notify(`Удалено кадров: ${ids.size}`);
  };

  const updateSelected = (patch) => commit(p => p.map(f => selectedIds.has(f.id) ? { ...f, ...patch } : f));

  const setDuration = (v) => updateSelected({ duration: clamp(Number(v), 0.01, 10) });

  const move = (dir) => {
    if (!selectedArray.length) return;
    const ids = new Set(selectedArray.map(f => f.id));
    commit(p => {
      const out = [...p];
      if (dir < 0) {
        for (let i = 1; i < out.length; i++) if (ids.has(out[i].id) && !ids.has(out[i - 1].id)) [out[i - 1], out[i]] = [out[i], out[i - 1]];
      } else {
        for (let i = out.length - 2; i >= 0; i--) if (ids.has(out[i].id) && !ids.has(out[i + 1].id)) [out[i], out[i + 1]] = [out[i + 1], out[i]];
      }
      return out;
    });
  };

  const reverse = () => { commit(p => [...p].reverse().map((f, i) => ({ ...f, label: String(i + 1).padStart(2, '0') }))); notify('Кадры обращены'); };
  const undo = () => { if (!history.length) return; const prev = history.at(-1); setFuture(f => [frames, ...f].slice(0, 50)); setHistory(h => h.slice(0, -1)); setFrames(prev); notify('Отменено'); };
  const redo = () => { if (!future.length) return; const next = future[0]; setHistory(h => [...h.slice(-49), frames]); setFuture(f => f.slice(1)); setFrames(next); notify('Повторено'); };

  const replaceSelected = (item) => {
    if (!selected || !item) return;
    commit(p => p.map(f => f.id === selected.id ? { ...f, url: item.url, name: item.name, type: item.type } : f));
    notify('Кадр заменён');
  };

  const deleteMedia = (item) => {
    const ids = new Set(frames.filter(f => f.url === item.url).map(f => f.id));
    if (ids.size) commit(p => p.filter(f => !ids.has(f.id)));
    setMedia(m => m.filter(x => x.id !== item.id));
    URL.revokeObjectURL(item.url);
    notify('Исходник и связанные кадры удалены');
  };

  useEffect(() => {
    if (!playing || frames.length < 1) return;
    const current = frames.findIndex(f => selectedIds.has(f.id));
    const ms = Math.max(10, (frames[current >= 0 ? current : 0]?.duration || 0.1) * 1000);
    const t = setTimeout(() => {
      const next = current + 1;
      if (next >= frames.length) {
        if (!loop) { setPlaying(false); return; }
        setSelectedIds(new Set([frames[0].id])); setAnchor(frames[0].id);
      } else {
        setSelectedIds(new Set([frames[next].id])); setAnchor(frames[next].id);
      }
    }, ms);
    return () => clearTimeout(t);
  }, [playing, frames, selectedIds, loop]);

  const transform = (patch) => updateSelected(patch);
  const rotate = (deg) => updateSelected({ rotation: ((selected?.rotation || 0) + deg + 360) % 360 });
  const toggleFlip = (axis) => updateSelected({ [axis]: !selected?.[axis] });

  const exportGif = async () => {
    if (!frames.length) { notify('Добавьте кадры'); return; }
    if (!window.kadr?.exportMedia) { notify('Откройте Windows-приложение для экспорта GIF'); return; }
    const snapshots = [];
    for (const frame of frames) {
      const canvas = document.createElement('canvas'); canvas.width = 1280; canvas.height = 720;
      const ctx = canvas.getContext('2d');
      ctx.fillStyle = bg; ctx.fillRect(0, 0, canvas.width, canvas.height);
      if (frame.url) {
        const img = new Image(); img.src = frame.url;
        await new Promise(r => { img.onload = r; img.onerror = r; });
        if (img.naturalWidth) {
          ctx.save(); ctx.globalAlpha = frame.opacity ?? 1;
          ctx.translate(canvas.width / 2, canvas.height / 2); ctx.rotate((frame.rotation || 0) * Math.PI / 180); ctx.scale(frame.flipX ? -1 : 1, frame.flipY ? -1 : 1);
          const sx = canvas.width / img.naturalWidth, sy = canvas.height / img.naturalHeight;
          const scale = fit === 'cover' ? Math.max(sx, sy) : Math.min(sx, sy);
          const w = img.naturalWidth * scale, h = img.naturalHeight * scale;
          ctx.drawImage(img, -w / 2, -h / 2, w, h); ctx.restore();
        }
      }
      snapshots.push({ data: canvas.toDataURL('image/png').split(',')[1], duration: frame.duration });
    }
    notify('Рендер GIF…');
    const result = await window.kadr.exportMedia({ format: 'GIF', frames: snapshots, quality, fps });
    notify(result?.ok ? 'GIF готов: ' + result.fileName : (result?.error || 'Ошибка экспорта'));
  };

  return <main className="app">
    <input ref={picker} className="file-picker" type="file" accept="image/png,image/jpeg,image/webp,image/gif" multiple onChange={addFiles} />
    <header className="topbar">
      <div className="brand"><span className="brand-mark">K</span><div><b>КАДР</b><small>GIF STUDIO</small></div></div>
      <nav><button className={tab === 'frames' ? 'active' : ''} onClick={() => setTab('frames')}>Кадры</button><button className={tab === 'timing' ? 'active' : ''} onClick={() => setTab('timing')}><Clock3 size={14}/> Тайминг</button><button className={tab === 'canvas' ? 'active' : ''} onClick={() => setTab('canvas')}><Crop size={14}/> Холст</button></nav>
      <div className="top-actions"><button className="icon" title="Отменить" onClick={undo} disabled={!history.length}><Undo2 size={17}/></button><button className="icon" title="Повторить" onClick={redo} disabled={!future.length}><Redo2 size={17}/></button><button className="settings" onClick={() => setSettings(v => !v)}><Settings2 size={16}/> Настройки</button><button className="export" onClick={exportGif}><Download size={16}/> Экспорт GIF</button></div>
    </header>

    <section className="workspace">
      <aside className="left-panel">
        <div className="panel-head"><b>Медиа</b><button onClick={() => picker.current?.click()}><Plus size={18}/></button></div>
        <button className="dropzone" onClick={() => picker.current?.click()} onDragOver={e => e.preventDefault()} onDrop={addFiles}><Upload size={23}/><b>Импортировать кадры</b><span>PNG · JPG · WEBP · GIF</span></button>
        <div className="section-label">ИСТОЧНИКИ · {media.length}</div>
        {media.map(item => <div className="media-item" key={item.id} onClick={() => replaceSelected(new File([], item.name, {type:item.type}))}><div className="thumb" style={{backgroundImage:`url(${item.url})`}}/><div className="media-copy"><b>{item.name}</b><small>Исходник</small></div><button title="Удалить" onClick={e => {e.stopPropagation();deleteMedia(item)}}><Trash2 size={15}/></button></div>)}
        {!media.length && <div className="empty">Импортируйте изображения — каждый файл станет отдельным кадром.</div>}
        <div className="tool-stack">
          <button onClick={duplicate} disabled={!selectedArray.length}><Copy size={16}/> Дублировать кадр</button>
          <button onClick={reverse} disabled={frames.length < 2}><Repeat2 size={16}/> Обратный порядок</button>
          <button onClick={() => setChecker(v => !v)}><Grid3X3 size={16}/> Шахматный фон</button>
        </div>
      </aside>

      <section className="editor">
        <div className="editorbar">
          <div className="tooltabs"><button className={tab==='frames'?'on':''} onClick={()=>setTab('frames')}><Layers3 size={15}/> Кадры</button><button className={tab==='timing'?'on':''} onClick={()=>setTab('timing')}><Clock3 size={15}/> Тайминг</button></div>
          <div className="quick-tools">
            <button onClick={()=>rotate(-90)} disabled={!selected}><RotateCcw size={15}/></button><button onClick={()=>rotate(90)} disabled={!selected}><RotateCw size={15}/></button><button onClick={()=>toggleFlip('flipX')} disabled={!selected}><FlipHorizontal size={15}/></button><button onClick={()=>toggleFlip('flipY')} disabled={!selected}><FlipVertical size={15}/></button><button onClick={()=>setFit(f=>f==='contain'?'cover':'contain')}><Maximize2 size={15}/></button>
          </div>
          <span className="saved"><i/> Автосохранение</span>
        </div>

        <div className={`stage-wrap ${checker?'checker':''}`} ref={stageRef}>
          {selected ? <div className="stage" style={{transform:`scale(${zoom/100})`}}>
            {onion && frames.length > 1 && <div className="onion" style={{backgroundImage:`url(${frames[Math.max(0,frames.findIndex(f=>f.id===selected.id)-1)]?.url})`}}/>}
            <div className="canvas-image" style={{ backgroundImage: `url(${selected.url})`, backgroundSize: fit, opacity: selected.opacity, transform: `rotate(${selected.rotation || 0}deg) scaleX(${selected.flipX ? -1 : 1}) scaleY(${selected.flipY ? -1 : 1})` }} />
            <div className="stage-hud"><span>Кадр {frames.findIndex(f=>f.id===selected.id)+1} / {frames.length}</span><span>{total.toFixed(2)} сек</span></div>
          </div> : <button className="empty-stage" onClick={()=>picker.current?.click()}><Upload size={30}/><b>Создайте первый кадр</b><span>Перетащите изображения сюда</span></button>}
        </div>

        <div className="transport"><button onClick={()=>frames[0]&&select(frames[0].id,false)}><SkipBack size={16}/></button><button className="play" onClick={()=>setPlaying(v=>!v)} disabled={!frames.length}>{playing?<Pause size={16}/>:<Play size={16} fill="currentColor"/>}</button><button onClick={()=>{const i=frames.findIndex(f=>f.id===selected?.id);if(frames[i+1])select(frames[i+1].id,false)}}><SkipForward size={16}/></button><span className="timecode">{frames.findIndex(f=>f.id===selected?.id)+1} / {frames.length || 0}</span><button className={loop?'active-loop':''} onClick={()=>setLoop(v=>!v)}><Repeat2 size={15}/></button></div>

        <div className="timeline-head"><div className="timeline-actions"><button onClick={addBlank}><Plus size={15}/> Кадр</button><button onClick={duplicate} disabled={!selectedArray.length}><Copy size={15}/> Дубликат</button><button className="danger" onClick={remove} disabled={!selectedArray.length}><Trash2 size={15}/> Удалить</button></div><div className="timeline-stats">{frames.length} кадров · {total.toFixed(2)} сек <button onClick={()=>setZoom(clamp(zoom-10,40,120))}><ZoomOut size={14}/></button><span>{zoom}%</span><button onClick={()=>setZoom(clamp(zoom+10,40,120))}><ZoomIn size={14}/></button></div></div>
        <div className="timeline">
          <div className="ruler">{Array.from({length:9},(_,i)=><span key={i}>{(i/10).toFixed(1)}s</span>)}</div>
          <div className="frame-row">
            {frames.map((f,i)=><button key={f.id} draggable className={`frame ${selectedIds.has(f.id)?'selected':''}`} style={{width:Math.max(92, f.duration*170)}} onClick={e=>select(f.id,e.shiftKey)} onDragStart={e=>e.dataTransfer.setData('text/plain',f.id)} onDragOver={e=>e.preventDefault()} onDrop={e=>{const id=e.dataTransfer.getData('text/plain');const from=frames.findIndex(x=>x.id===id);const to=i;if(from<0||from===to)return;commit(p=>{const n=[...p];const [x]=n.splice(from,1);n.splice(to,0,x);return n})}}><div className="frame-img" style={{backgroundImage:`url(${f.url})`}}/><div className="frame-foot"><b>{String(i+1).padStart(2,'0')}</b><small>{Number(f.duration).toFixed(2)}s</small></div></button>)}
            {!frames.length && <button className="empty-timeline" onClick={()=>picker.current?.click()}><Plus size={16}/> Импортируйте первый кадр</button>}
          </div>
        </div>
      </section>

      <aside className="right-panel">
        <div className="panel-head"><b>Инспектор</b><button onClick={()=>notify('Все параметры доступны в инспекторе')}><MoreHorizontal size={18}/></button></div>
        {selected ? <><div className="inspector-title"><span>Выбрано кадров: {selectedArray.length || 1}</span><b>КАДР {frames.findIndex(f=>f.id===selected.id)+1}</b></div>
          <section className="inspector-section"><h3><Clock3 size={14}/> Тайминг</h3><label>Длительность <b>{Number(selected.duration).toFixed(2)} сек</b></label><input type="range" min="0.01" max="5" step="0.01" value={selected.duration} onChange={e=>setDuration(e.target.value)}/><div className="number-row"><input type="number" min=".01" max="10" step=".01" value={selected.duration} onChange={e=>setDuration(e.target.value)}/><button onClick={()=>setDuration(1/fps)}>1/{fps} s</button><button onClick={()=>setDuration(0.1)}>0.10 s</button></div></section>
          <section className="inspector-section"><h3><Crop size={14}/> Преобразование</h3><div className="grid2"><button onClick={()=>rotate(-90)}><RotateCcw size={14}/> −90°</button><button onClick={()=>rotate(90)}><RotateCw size={14}/> +90°</button><button onClick={()=>toggleFlip('flipX')}><FlipHorizontal size={14}/> Гориз.</button><button onClick={()=>toggleFlip('flipY')}><FlipVertical size={14}/> Вертик.</button></div><label>Масштаб отображения <b>{zoom}%</b></label><input type="range" min="40" max="120" value={zoom} onChange={e=>setZoom(Number(e.target.value))}/><label>Прозрачность <b>{Math.round((selected.opacity??1)*100)}%</b></label><input type="range" min="0" max="1" step=".01" value={selected.opacity??1} onChange={e=>updateSelected({opacity:Number(e.target.value)})}/></section>
          <section className="inspector-section"><h3><Sparkles size={14}/> Анимация</h3><div className="grid2"><button className={onion?'selected-btn':''} onClick={()=>setOnion(v=>!v)}>{onion?<Eye size={14}/>:<EyeOff size={14}/>} Onion skin</button><button onClick={()=>setFit(f=>f==='contain'?'cover':'contain')}><Maximize2 size={14}/> {fit==='contain'?'Вписать':'Заполнить'}</button></div></section>
          <section className="inspector-section"><h3><Settings2 size={14}/> GIF</h3><div className="info"><span>Кадров</span><b>{frames.length}</b></div><div className="info"><span>Длительность</span><b>{total.toFixed(2)} сек</b></div><div className="info"><span>Частота предпросмотра</span><b>{fps} FPS</b></div><div className="fps"><button onClick={()=>setFps(clamp(fps-1,1,60))}>−</button><span>{fps} FPS</span><button onClick={()=>setFps(clamp(fps+1,1,60))}>+</button></div></section>
          <button className="big-delete" onClick={remove}><Trash2 size={15}/> Удалить выбранные кадры</button>
        </> : <div className="empty-inspector">Выберите кадр на таймлайне.</div>}
      </aside>
    </section>

    {settings && <div className="settings-pop"><b>Параметры экспорта</b><label>Качество<select value={quality} onChange={e=>setQuality(e.target.value)}><option value="high">Высокое</option><option value="balanced">Баланс</option><option value="small">Малый размер</option></select></label><label>Цвет фона<input type="color" value={bg} onChange={e=>setBg(e.target.value)}/></label><button onClick={()=>setSettings(false)}>Готово</button></div>}
    {notice && <div className="toast"><Check size={15}/>{notice}</div>}
  </main>;
}
createRoot(document.getElementById('root')).render(<App />);