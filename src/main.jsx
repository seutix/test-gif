
import React, { useRef, useState } from 'react';
import { createRoot } from 'react-dom/client';
import { Upload, Settings2, Play, Sparkles, ChevronDown, Undo2, Redo2, Plus, Image, Video, SlidersHorizontal, Download, ArrowLeft, ArrowRight, MoreHorizontal, X, Check, Clock3, WandSparkles } from 'lucide-react';
import './style.css';

function App() {
  const picker = useRef(null);
  const [frames, setFrames] = useState(starterFrames);
  const [selected, setSelected] = useState(3);
  const [playing, setPlaying] = useState(false);
  const [quality, setQuality] = useState(false);
  const [format, setFormat] = useState('MP4');
  const [media, setMedia] = useState([]);
  const [notice, setNotice] = useState('');
  const selectedFrame = frames.find((frame) => frame.id === selected) || frames[0];
  const notify = (message) => { setNotice(message); window.setTimeout(() => setNotice(''), 2600); };

  const addFiles = (event) => {

    if (!files.length) return;
    const additions = files.map((file, index) => ({
      id: `${file.name}-${file.lastModified}`, name: file.name, type: file.type, url: URL.createObjectURL(file),
    }));
    setMedia((previous) => [...previous, ...additions]);
  };

  const addFrame = () => {
    const id = Date.now();
    setFrames((previous) => [...previous, { id, label: String(previous.length + 1).padStart(2, '0'), duration: 0.5, tone: 'two' }]);
    setSelected(id);
    notify('Пустой кадр добавлен в конец таймлайна');
  };

  const moveFrame = (direction) => {
    const currentIndex = frames.findIndex((frame) => frame.id === selected);
    const nextIndex = currentIndex + direction;
    if (nextIndex < 0 || nextIndex >= frames.length) return;
    setFrames((previous) => {
      const next = [...previous];
      [next[currentIndex], next[nextIndex]] = [next[nextIndex], next[currentIndex]];
      return next;
    });
    notify(direction < 0 ? 'Кадр перемещён назад' : 'Кадр перемещён вперёд');
  };

  const updateDuration = (value) => setFrames((previous) => previous.map((frame) => frame.id === selected ? { ...frame, duration: Number(value) } : frame));
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
      <nav><button className="nav-active">Монтаж</button><button>Улучшение</button><button>Экспорт</button></nav>
      <div className="head-actions"><button className="icon-btn" title="Отменить"><Undo2 size={17} /></button><button className="icon-btn" title="Повторить"><Redo2 size={17} /></button><button className="settings"><Settings2 size={16} /> Настройки</button><button className="export" onClick={exportProject}><Download size={16} /> Сохранить проект</button></div>
    </header>
    <section className="workspace">
      <aside className="left-panel">
        <div className="panel-title"><span>Медиа</span><button onClick={() => picker.current.click()}><Plus size={18} /></button></div>

        <div className="source-note"><Sparkles size={14} /><span>Исходники сохраняются<br />без изменений</span></div>
      </aside>
      <section className="editor">
        <div className="editor-toolbar"><div><button className="tool selected"><SlidersHorizontal size={16} /> Кадры</button><button className="tool"><Clock3 size={16} /> Тайминг</button></div><div className="status"><span />Изменения сохранены локально</div></div>

        <div className="property-section enhance"><div className="enhance-title"><div className="spark"><WandSparkles size={17} /></div><div><h3>Плавное движение</h3><p>Генерация промежуточных кадров</p></div><button className={`toggle ${quality ? 'on' : ''}`} onClick={() => setQuality(!quality)} aria-label="Включить плавное движение"><i /></button></div>{quality && <div className="quality-open"><label>Плавность <b>×2 кадра</b></label><input type="range" defaultValue="45" /><small>Будет добавлено {Math.max(0, frames.length - 1)} кадров с сохранением исходного разрешения.</small></div>}</div>
        <div className="property-section"><h3>Настройки проекта</h3><div className="info-row"><span>Разрешение</span><b>Исходное</b></div><div className="info-row"><span>Частота</span><b>30 fps</b></div><div className="format-row">{['GIF', 'MP4'].map((type) => <button key={type} className={format === type ? 'format-active' : ''} onClick={() => setFormat(type)}>{type}{format === type && <Check size={13} />}</button>)}</div></div>
      </aside>
    </section>
    {notice && <div className="toast"><Check size={16} />{notice}</div>}
  </main>;
}
