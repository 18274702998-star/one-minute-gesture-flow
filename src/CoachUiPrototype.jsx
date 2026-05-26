import React, { useEffect, useMemo, useState } from 'react';
import {
  Activity,
  BadgeCheck,
  ChevronLeft,
  ChevronRight,
  HeartPulse,
  MessageCircle,
  Timer,
  Zap,
} from 'lucide-react';
import './CoachUiPrototype.css';

const variants = [
  { key: 'A', name: '任务条 + 教练气泡' },
  { key: 'B1', name: '大字 + 便签气泡' },
  { key: 'B2', name: '大字 + 教练标签' },
  { key: 'B3', name: '大字 + 轻弹幕条' },
  { key: 'C', name: '极简摄像头 + 双卡' },
];

const progressVariants = [
  { key: 'P1', name: '呼吸胶囊' },
  { key: 'P2', name: '能量环 + 细线' },
  { key: 'P3', name: '双芯片' },
  { key: 'P4', name: '底部仪表条' },
  { key: 'P5', name: '单动作进度' },
];

function getInitialVariant() {
  const value = new URLSearchParams(window.location.search).get('variant')?.toUpperCase();
  if (value === 'B') return 'B1';
  const list = getPrototypeMode() === 'progress-ui' ? progressVariants : variants;
  return list.some((variant) => variant.key === value) ? value : list[0].key;
}

function getPrototypeMode() {
  return new URLSearchParams(window.location.search).get('prototype') === 'progress-ui'
    ? 'progress-ui'
    : 'coach-ui';
}

function setVariantInUrl(nextVariant) {
  const url = new URL(window.location.href);
  url.searchParams.set('prototype', 'coach-ui');
  url.searchParams.set('variant', nextVariant);
  window.history.replaceState(null, '', url);
}

function PhoneShell({ children, label, tone = 'mint' }) {
  return (
    <main className="prototype-shell">
      <section className={`prototype-phone tone-${tone}`} aria-label={label}>
        <div className="prototype-screen">
          <header className="prototype-status">
            <strong>18:40</strong>
            <div className="prototype-status-icons" aria-hidden="true">
              <span className="prototype-signal" />
              <span className="prototype-wifi" />
              <span className="prototype-battery" />
            </div>
          </header>
          {children}
          <span className="prototype-home-indicator" aria-hidden="true" />
        </div>
      </section>
    </main>
  );
}

function HandSkeleton({ pose = 'tilt' }) {
  return (
    <svg className={`prototype-skeleton pose-${pose}`} viewBox="0 0 260 320" aria-hidden="true">
      <g className="skeleton-lines">
        <path d="M130 250 L126 210 L106 180 L91 139 L78 102" />
        <path d="M126 210 L123 163 L120 112 L118 68" />
        <path d="M126 210 L147 164 L161 113 L172 67" />
        <path d="M126 210 L171 176 L199 133 L222 96" />
        <path d="M130 250 L169 225 L209 206" />
        <path d="M126 210 L171 176 L209 206" />
        <path d="M106 180 L123 163 L147 164 L171 176" />
      </g>
      {[
        [130, 250],
        [126, 210],
        [106, 180],
        [91, 139],
        [78, 102],
        [123, 163],
        [120, 112],
        [118, 68],
        [147, 164],
        [161, 113],
        [172, 67],
        [171, 176],
        [199, 133],
        [222, 96],
        [169, 225],
        [209, 206],
      ].map(([cx, cy], index) => (
        <circle key={`${cx}-${cy}-${index}`} cx={cx} cy={cy} r={index === 0 ? 7 : 5} />
      ))}
    </svg>
  );
}

function MockCamera({ children, className = '', pose = 'tilt' }) {
  return (
    <div className={`prototype-camera ${className}`}>
      <div className="prototype-camera-feed" />
      <div className="prototype-depth-ring" />
      <HandSkeleton pose={pose} />
      <div className="prototype-camera-corners" aria-hidden="true" />
      {children}
    </div>
  );
}

function AppHeader({ title = '手部回血', subtitle = '第 3 / 6 节', right = '42s' }) {
  return (
    <div className="prototype-app-header">
      <div className="prototype-app-logo">
        <HeartPulse size={18} />
      </div>
      <div>
        <strong>{title}</strong>
        <span>{subtitle}</span>
      </div>
      <em>{right}</em>
    </div>
  );
}

function VariantA() {
  return (
    <PhoneShell label="方案 A" tone="mint">
      <AppHeader />

      <MockCamera className="variant-a-camera" pose="tilt">
        <div className="task-panel a-task">
          <div className="task-panel-icon">
            <BadgeCheck size={18} />
          </div>
          <div>
            <span>动作任务</span>
            <strong>向左倾斜</strong>
            <p>回到中间后，再向右</p>
          </div>
          <div className="direction-meter" aria-hidden="true">
            <i />
            <b />
          </div>
        </div>

        <div className="coach-bubble-soft">
          <MessageCircle size={18} />
          <p>很好，手掌终于不是一块加班中的门板了。</p>
        </div>
      </MockCamera>

      <div className="prototype-bottom-progress">
        <div>
          <span>本动作</span>
          <strong>46%</strong>
        </div>
        <div className="prototype-progress">
          <span style={{ width: '46%' }} />
        </div>
      </div>
    </PhoneShell>
  );
}

function VariantBFrame({ children, label }) {
  return (
    <PhoneShell label={label} tone="dark">
      <div className="prototype-pill-top">
        <Timer size={17} />
        <strong>42s</strong>
        <span>连击 3</span>
      </div>

      <MockCamera className="variant-b-camera" pose="sway">
        <div className="motion-arrows" aria-hidden="true">
          <span>左</span>
          <i />
          <span>右</span>
        </div>

        <div className="hero-command">
          <span>现在做</span>
          <strong>向左倾斜</strong>
          <em>慢一点，稳住半秒</em>
        </div>

        {children}
      </MockCamera>

      <div className="mini-score-row">
        <span>手掌倾斜</span>
        <strong>3 / 6</strong>
        <i />
      </div>
    </PhoneShell>
  );
}

function B1Camera() {
  return (
    <MockCamera className="variant-b-camera" pose="sway">
      <div className="motion-arrows" aria-hidden="true">
        <span>左</span>
        <i />
        <span>右</span>
      </div>

      <div className="hero-command">
        <span>现在做</span>
        <strong>向左倾斜</strong>
        <em>慢一点，稳住半秒</em>
      </div>

      <div className="coach-note-bubble">
        <span>教练小纸条</span>
        <p>别和手腕较劲，它今天已经很努力地当过鼠标垫了。</p>
      </div>
    </MockCamera>
  );
}

function VariantB1() {
  return (
    <VariantBFrame label="方案 B1">
      <div className="coach-note-bubble">
        <span>教练小纸条</span>
        <p>别和手腕较劲，它今天已经很努力地当过鼠标垫了。</p>
      </div>
    </VariantBFrame>
  );
}

function ProgressFrame({ children, label }) {
  return (
    <PhoneShell label={label} tone="dark">
      <div className="prototype-pill-top">
        <Timer size={17} />
        <strong>42s</strong>
        <span>连击 3</span>
      </div>
      <B1Camera />
      {children}
    </PhoneShell>
  );
}

function ProgressVariantP1() {
  return (
    <ProgressFrame label="进度方案 P1">
      <div className="progress-capsule">
        <div>
          <span>本动作</span>
          <strong>46%</strong>
        </div>
        <div>
          <span>总进度</span>
          <strong>32%</strong>
        </div>
        <i className="capsule-main"><b style={{ width: '46%' }} /></i>
        <i className="capsule-total"><b style={{ width: '32%' }} /></i>
      </div>
    </ProgressFrame>
  );
}

function ProgressVariantP2() {
  return (
    <ProgressFrame label="进度方案 P2">
      <div className="progress-orbit">
        <div className="orbit-ring">
          <strong>46</strong>
          <span>%</span>
        </div>
        <div className="orbit-copy">
          <div>
            <span>本动作</span>
            <strong>手掌倾斜</strong>
          </div>
          <i><b style={{ width: '32%' }} /></i>
          <em>总进度 32%</em>
        </div>
      </div>
    </ProgressFrame>
  );
}

function ProgressVariantP3() {
  return (
    <ProgressFrame label="进度方案 P3">
      <div className="progress-chips">
        <div>
          <span>本动作</span>
          <strong>46%</strong>
          <i><b style={{ width: '46%' }} /></i>
        </div>
        <div>
          <span>总进度</span>
          <strong>32%</strong>
          <i><b style={{ width: '32%' }} /></i>
        </div>
      </div>
    </ProgressFrame>
  );
}

function ProgressVariantP4() {
  return (
    <ProgressFrame label="进度方案 P4">
      <div className="progress-dashboard">
        <div>
          <span>本动作</span>
          <strong>46%</strong>
        </div>
        <i><b style={{ width: '46%' }} /></i>
        <div>
          <span>总进度</span>
          <strong>32%</strong>
        </div>
      </div>
    </ProgressFrame>
  );
}

function ProgressVariantP5() {
  return (
    <ProgressFrame label="进度方案 P5">
      <div className="progress-single-action">
        <div className="single-action-copy">
          <span>本动作</span>
          <strong>手掌倾斜</strong>
          <em>3 / 6 次</em>
        </div>
        <div className="single-action-ring">
          <b>46%</b>
        </div>
        <i><b style={{ width: '46%' }} /></i>
      </div>
    </ProgressFrame>
  );
}

function VariantB2() {
  return (
    <VariantBFrame label="方案 B2">
      <div className="coach-tag-bubble">
        <div>
          <span />
          <strong>教练</strong>
        </div>
        <p>动作小一点也算数，优雅，不是甩锅。</p>
      </div>
    </VariantBFrame>
  );
}

function VariantB3() {
  return (
    <VariantBFrame label="方案 B3">
      <div className="coach-toast-line">
        <MessageCircle size={15} />
        <p>稳住，很好，手腕正在退出高负荷模式。</p>
      </div>
    </VariantBFrame>
  );
}

function VariantC() {
  return (
    <PhoneShell label="方案 C" tone="paper">
      <AppHeader title="回血训练" subtitle="手掌倾斜" right="42s" />

      <MockCamera className="variant-c-camera" pose="circle">
        <div className="tiny-camera-pill">
          <Activity size={14} />
          <span>识别中</span>
        </div>
      </MockCamera>

      <div className="native-card-stack">
        <article className="native-action-card">
          <div className="native-card-icon">
            <Zap size={18} />
          </div>
          <div>
            <span>下一步</span>
            <strong>向左倾斜，回中，再向右</strong>
          </div>
        </article>
        <article className="native-coach-card">
          <span>AI 教练</span>
          <p>动作不用大，优雅一点，手腕不是雨刷器。</p>
        </article>
      </div>
    </PhoneShell>
  );
}

function PrototypeSwitcher({ current, onChange, options }) {
  const currentIndex = options.findIndex((variant) => variant.key === current);
  const currentVariant = options[currentIndex] ?? options[0];

  function move(direction) {
    const nextIndex = (currentIndex + direction + options.length) % options.length;
    onChange(options[nextIndex].key);
  }

  useEffect(() => {
    function handleKeyDown(event) {
      const tag = event.target?.tagName;
      if (tag === 'INPUT' || tag === 'TEXTAREA' || event.target?.isContentEditable) return;
      if (event.key === 'ArrowLeft') move(-1);
      if (event.key === 'ArrowRight') move(1);
    }

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  });

  return (
    <nav className="prototype-switcher" aria-label="方案切换">
      <button type="button" onClick={() => move(-1)} aria-label="上一个方案">
        <ChevronLeft size={18} />
      </button>
      <strong>
        {currentVariant.key}：{currentVariant.name}
      </strong>
      <button type="button" onClick={() => move(1)} aria-label="下一个方案">
        <ChevronRight size={18} />
      </button>
    </nav>
  );
}

function CoachUiPrototype() {
  const mode = getPrototypeMode();
  const options = mode === 'progress-ui' ? progressVariants : variants;
  const [variant, setVariant] = useState(getInitialVariant);
  const rendered = useMemo(() => {
    if (mode === 'progress-ui') {
      if (variant === 'P2') return <ProgressVariantP2 />;
      if (variant === 'P3') return <ProgressVariantP3 />;
      if (variant === 'P4') return <ProgressVariantP4 />;
      if (variant === 'P5') return <ProgressVariantP5 />;
      return <ProgressVariantP1 />;
    }

    if (variant === 'B1') return <VariantB1 />;
    if (variant === 'B2') return <VariantB2 />;
    if (variant === 'B3') return <VariantB3 />;
    if (variant === 'C') return <VariantC />;
    return <VariantA />;
  }, [mode, variant]);

  function handleChange(nextVariant) {
    setVariant(nextVariant);
    const url = new URL(window.location.href);
    url.searchParams.set('prototype', mode);
    url.searchParams.set('variant', nextVariant);
    window.history.replaceState(null, '', url);
  }

  return (
    <>
      {rendered}
      <PrototypeSwitcher current={variant} onChange={handleChange} options={options} />
    </>
  );
}

export default CoachUiPrototype;
