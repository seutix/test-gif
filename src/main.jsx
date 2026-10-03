
import React, { useRef, useState } from 'react';
import { createRoot } from 'react-dom/client';
import { Upload, Settings2, Play, Sparkles, ChevronDown, Undo2, Redo2, Plus, Image, Video, SlidersHorizontal, Download, ArrowLeft, ArrowRight, MoreHorizontal, X, Check, Clock3, WandSparkles } from 'lucide-react';
import './style.css';

const starterFrames = [
  { id: 1, tone: 'one', label: '01', duration: 0.5 }, { id: 2, tone: 'two', label: '02', duration: 0.5 },
  { id: 3, tone: 'three', label: '03', duration: 0.5 }, { id: 4, tone: 'four', label: '04', duration: 0.5 },
  { id: 5, tone: 'five', label: '05', duration: 0.5 }, { id: 6, tone: 'six', label: '06', duration: 0.5 },
];

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
    const files = Array.from(event.target.files || []);
    if (!files.length) return;
    const additions = files.map((file, index) => ({
      id: `${file.name}-${file.lastModified}`, name: file.name, type: file.type, url: URL.createObjectURL(file),
    }));
    setMedia((previous) => [...previous, ...additions]);
    const images = additions.filter((file) => file.type.startsWith('image/') && file.type !== 'image/gif');
    if (images.length) {
      setFrames((previous) => [...previous, ...images.map((file, index) => ({
        id: Date.now() + index, label: String(previous.length + index + 1).padStart(2, '0'), duration: 0.5, image: file.url,
      }))]);
    }
    notify(`Добавлено файлов: ${files.length}`);
    event.target.value = '';
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
        <button className="dropzone" onClick={() => picker.current.click()}><Upload size={22} /><b>Добавить файлы</b><span>PNG, JPG, GIF, MP4</span></button>
        {media.length === 0 ? <div className="media-list"><div className="media-thumb scenic"><span>IMG</span></div><div className="media-name"><b>Путешествие</b><small>6 демонстрационных кадров</small></div></div> : media.map((file) => <div className="media-list" key={file.id}><div className="media-thumb custom" style={file.type.startsWith('image/') ? { backgroundImage: `url(${file.url})` } : {}}>{file.type.startsWith('video') && <Video size={15} />}</div><div className="media-name"><b>{file.name}</b><small>{file.type.startsWith('video') ? 'Видео для улучшения' : 'Добавлено на таймлайн'}</small></div><button className="more"><MoreHorizontal size={18} /></button></div>)}
        <div className="source-note"><Sparkles size={14} /><span>Исходники сохраняются<br />без изменений</span></div>
      </aside>
      <section className="editor">
        <div className="editor-toolbar"><div><button className="tool selected"><SlidersHorizontal size={16} /> Кадры</button><button className="tool"><Clock3 size={16} /> Тайминг</button></div><div className="status"><span />Изменения сохранены локально</div></div>
        <div className="stage-wrap"><div className="stage"><div className="art" style={selectedFrame?.image ? { backgroundImage: `url(${selectedFrame.image})` } : {}}>{!selectedFrame?.image && <><div className="sun" /><div className="mountain back" /><div className="mountain front" /><div className="lake" /><div className="shore" /><div className="boat"><i /></div><div className="art-title">не спешить</div></>}</div><button className="stage-play" onClick={() => setPlaying(!playing)} aria-label="Воспроизвести">{playing ? <X size={20} /> : <Play size={20} fill="currentColor" />}</button><div className="stage-meta"><span>Кадр {frames.findIndex((frame) => frame.id === selected) + 1} из {frames.length}</span><span>{frames.reduce((sum, frame) => sum + frame.duration, 0).toFixed(1)} сек</span></div></div></div>
        <div className="timeline-head"><div><button className="timeline-button"><Image size={15} /> Кадры <ChevronDown size={14} /></button><button className="add-frame" onClick={addFrame}><Plus size={15} /> Добавить</button></div><div className="zoom">− <div className="zoomline"><i /></div> +</div></div>
        <div className="timeline"><div className="time-row"><span>0:00</span><span>0:01</span><span>0:02</span><span>0:03</span></div><div className="frame-row">{frames.map((frame, index) => <React.Fragment key={frame.id}><button className={`frame ${frame.tone || ''} ${selected === frame.id ? 'active' : ''}`} onClick={() => setSelected(frame.id)}><div className="scene" style={frame.image ? { backgroundImage: `url(${frame.image})` } : {}} /><b>{frame.label}</b><small>{frame.duration.toFixed(1)} c</small></button>{index < frames.length - 1 && <button className="between" onClick={() => notify('Переход отмечен — настройте его в будущем модуле')} title="Добавить переход"><Plus size={12} /></button>}</React.Fragment>)}<div className="endcap" /></div></div>
      </section>
      <aside className="right-panel">
        <div className="panel-title"><span>Свойства</span><button><MoreHorizontal size={19} /></button></div>
        <div className="property-section"><h3>Выбранный кадр</h3><div className="mini-preview scenic" style={selectedFrame?.image ? { backgroundImage: `url(${selectedFrame.image})` } : {}}><span>{selectedFrame?.label}</span></div><label>Длительность <b>{selectedFrame?.duration.toFixed(1)} сек</b></label><input type="range" min="0.1" max="2" step="0.1" value={selectedFrame?.duration || 0.5} onChange={(event) => updateDuration(event.target.value)} /><div className="field-row"><button onClick={() => moveFrame(-1)} disabled={selected === frames[0]?.id}><ArrowLeft size={15} /> Назад</button><button onClick={() => moveFrame(1)} disabled={selected === frames.at(-1)?.id}>Вперёд <ArrowRight size={15} /></button></div></div>
        <div className="property-section enhance"><div className="enhance-title"><div className="spark"><WandSparkles size={17} /></div><div><h3>Плавное движение</h3><p>Генерация промежуточных кадров</p></div><button className={`toggle ${quality ? 'on' : ''}`} onClick={() => setQuality(!quality)} aria-label="Включить плавное движение"><i /></button></div>{quality && <div className="quality-open"><label>Плавность <b>×2 кадра</b></label><input type="range" defaultValue="45" /><small>Будет добавлено {Math.max(0, frames.length - 1)} кадров с сохранением исходного разрешения.</small></div>}</div>
        <div className="property-section"><h3>Настройки проекта</h3><div className="info-row"><span>Разрешение</span><b>Исходное</b></div><div className="info-row"><span>Частота</span><b>30 fps</b></div><div className="format-row">{['GIF', 'MP4'].map((type) => <button key={type} className={format === type ? 'format-active' : ''} onClick={() => setFormat(type)}>{type}{format === type && <Check size={13} />}</button>)}</div></div>
      </aside>
    </section>
    {notice && <div className="toast"><Check size={16} />{notice}</div>}
  </main>;
}
createRoot(document.getElementById('root')).render(<App />);
=======
import React, {useState} from 'react';
import { createRoot } from 'react-dom/client';
import {Upload, Settings2, Play, Sparkles, ChevronDown, Undo2, Redo2, Plus, Image, Video, GripVertical, SlidersHorizontal, Download, ArrowLeft, ArrowRight, MoreHorizontal, X, Menu, Check, Clock3, WandSparkles} from 'lucide-react';
import './style.css';

const frames = [
  {id:1, time:'00:00.0', tone:'one', label:'01'}, {id:2, time:'00:00.5', tone:'two', label:'02'}, {id:3, time:'00:01.0', tone:'three', label:'03'}, {id:4, time:'00:01.5', tone:'four', label:'04'}, {id:5, time:'00:02.0', tone:'five', label:'05'}, {id:6, time:'00:02.5', tone:'six', label:'06'}
];
function App(){
 const [selected, setSelected]=useState(3); const [playing,setPlaying]=useState(false); const [quality,setQuality]=useState(false); const [format,setFormat]=useState('MP4'); const [notice,setNotice]=useState('');
 const notify=(x)=>{setNotice(x); setTimeout(()=>setNotice(''),2000)};
 return <main>
  <header className="topbar">
   <div className="brand"><span className="brand-mark">K</span><span>КАДР</span><i></i><small>новый проект</small></div>
   <nav><button className="nav-active">Монтаж</button><button>Улучшение</button><button>Экспорт</button></nav>
   <div className="head-actions"><button className="icon-btn"><Undo2 size={17}/></button><button className="icon-btn"><Redo2 size={17}/></button><button className="settings"><Settings2 size={16}/> Настройки</button><button className="export" onClick={()=>notify('Экспорт готовится…')}><Download size={16}/> Экспортировать</button></div>
  </header>
  <section className="workspace">
   <aside className="left-panel">
    <div className="panel-title"><span>Медиа</span><button onClick={()=>notify('Открыт выбор файлов')}><Plus size={18}/></button></div>
    <button className="dropzone" onClick={()=>notify('Открыт выбор файлов')}><Upload size={22}/><b>Добавить файлы</b><span>PNG, JPG, GIF, MP4</span></button>
    <div className="media-list">
      <div className="media-thumb scenic"><span>IMG</span></div><div className="media-name"><b>Путешествие</b><small>6 изображений</small></div><button className="more"><MoreHorizontal size={18}/></button>
    </div>
    <div className="media-list"><div className="media-thumb video"><Video size={15}/></div><div className="media-name"><b>reel_001.mp4</b><small>00:08 · 4K</small></div><button className="more"><MoreHorizontal size={18}/></button></div>
    <div className="source-note"><Sparkles size={14}/><span>Исходники сохраняются<br/>без изменений</span></div>
   </aside>
   <section className="editor">
    <div className="editor-toolbar"><div><button className="tool selected"><SlidersHorizontal size={16}/> Кадры</button><button className="tool"><Clock3 size={16}/> Тайминг</button></div><div className="status"><span></span>Изменения сохранены</div></div>
    <div className="stage-wrap">
      <div className="stage">
       <div className="art"><div className="sun"></div><div className="mountain back"></div><div className="mountain front"></div><div className="lake"></div><div className="shore"></div><div className="boat"><i></i></div><div className="art-title">не спешить</div></div>
       <button className="stage-play" onClick={()=>setPlaying(!playing)}>{playing?<X size={20}/>:<Play size={20} fill="currentColor"/>}</button>
       <div className="stage-meta"><span>Кадр {selected} из 6</span><span>00:01.0 / 00:03.0</span></div>
      </div>
    </div>
    <div className="timeline-head"><div><button className="timeline-button"><Image size={15}/> Кадры <ChevronDown size={14}/></button><button className="add-frame" onClick={()=>notify('Новый кадр добавлен')}><Plus size={15}/> Добавить</button></div><div className="zoom">− <div className="zoomline"><i></i></div> +</div></div>
    <div className="timeline"><div className="time-row"><span>0:00</span><span>0:01</span><span>0:02</span><span>0:03</span></div><div className="frame-row">{frames.map((f,i)=><React.Fragment key={f.id}><button className={'frame '+f.tone+(selected===f.id?' active':'')} onClick={()=>setSelected(f.id)}><div className="scene"></div><b>{f.label}</b><small>0.5 c</small></button>{i<frames.length-1&&<button className="between" onClick={()=>notify('Переход добавлен')}><Plus size={12}/></button>}</React.Fragment>)}<div className="endcap"></div></div><div className="playhead" style={{left:`calc(27% + ${(selected-1)*104}px)`}}></div></div>
   </section>
   <aside className="right-panel">
    <div className="panel-title"><span>Свойства</span><button><MoreHorizontal size={19}/></button></div>
    <div className="property-section"><h3>Выбранный кадр</h3><div className="mini-preview scenic"><span>03</span></div><label>Длительность <b>0.5 сек</b></label><input type="range" min="0.1" max="2" step="0.1" defaultValue="0.5"/><div className="field-row"><button><ArrowLeft size={15}/> Назад</button><button>Вперёд <ArrowRight size={15}/></button></div></div>
    <div className="property-section enhance"><div className="enhance-title"><div className="spark"><WandSparkles size={17}/></div><div><h3>Плавное движение</h3><p>Генерация промежуточных кадров</p></div><button className={'toggle '+(quality?'on':'')} onClick={()=>setQuality(!quality)}><i></i></button></div>{quality&&<div className="quality-open"><label>Плавность <b>×2 кадра</b></label><input type="range" defaultValue="45"/><small>Добавит 6 кадров с сохранением исходного разрешения.</small></div>}</div>
    <div className="property-section"><h3>Настройки проекта</h3><div className="info-row"><span>Разрешение</span><b>3840 × 2160</b></div><div className="info-row"><span>Частота</span><b>30 fps</b></div><div className="format-row">{['GIF','MP4'].map(x=><button key={x} className={format===x?'format-active':''} onClick={()=>setFormat(x)}>{x}{format===x&&<Check size={13}/>}</button>)}</div></div>
   </aside>
  </section>
  {notice&&<div className="toast"><Check size={16}/>{notice}</div>}
 </main>
}
createRoot(document.getElementById('root')).render(<App/>);