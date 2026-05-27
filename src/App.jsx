import React, { useEffect, useMemo, useRef, useState } from 'react';
import { FilesetResolver, GestureRecognizer, HandLandmarker } from '@mediapipe/tasks-vision';
import {
  Activity,
  BadgeCheck,
  Camera,
  Hand,
  RefreshCcw,
  Sparkles,
  Timer,
} from 'lucide-react';
import CoachUiPrototype from './CoachUiPrototype.jsx';

const TOTAL_SECONDS = 60;
const MEDIAPIPE_WASM_URL = 'https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@0.10.35/wasm';
const GESTURE_MODEL_URL =
  'https://storage.googleapis.com/mediapipe-models/gesture_recognizer/gesture_recognizer/float16/1/gesture_recognizer.task';
const HAND_MODEL_URL =
  'https://storage.googleapis.com/mediapipe-models/hand_landmarker/hand_landmarker/float16/1/hand_landmarker.task';

const HAND_CONNECTIONS = [
  [0, 1],
  [1, 2],
  [2, 3],
  [3, 4],
  [0, 5],
  [5, 6],
  [6, 7],
  [7, 8],
  [5, 9],
  [9, 10],
  [10, 11],
  [11, 12],
  [9, 13],
  [13, 14],
  [14, 15],
  [15, 16],
  [13, 17],
  [17, 18],
  [18, 19],
  [19, 20],
  [0, 17],
];

const FINGER_SEQUENCE = [
  { tip: 8, name: '食指' },
  { tip: 12, name: '中指' },
  { tip: 16, name: '无名指' },
  { tip: 20, name: '小指' },
];

const ACTION_COOLDOWNS = {
  bloom: 620,
  'thumb-call': 520,
  fan: 460,
  sway: 500,
  circle: 480,
  'thumb-up': 620,
};

const INITIAL_ACTION_HINTS = {
  bloom: '握拳蓄能，开掌启动疲劳机。',
  'thumb-call': '拇指按顺序接通四根线路。',
  fan: '五指并拢再张开，打开散热百叶窗。',
  sway: '左右摆手，清掉维修口堵塞。',
  circle: '手腕留在原位，手掌绕着手腕慢慢转盘。',
  'thumb-up': '竖起大拇指，给本次维修盖章。',
};

const drills = [
  {
    id: 'bloom',
    station: '01 启动舱',
    name: '开掌启动',
    duration: 8,
    target: 4,
    mission: '点火启动核心',
    cue: '握拳压缩能量，再开掌点火。',
    gesture: '拳 -> 掌',
    success: '启动 +1',
    coach: [
      '启动舱上线，把能量压进核心里。',
      '开掌命中，点火火花弹出来了。',
      '别急，机器刚睡醒，节奏稳一点。',
    ],
  },
  {
    id: 'thumb-call',
    station: '02 接线台',
    name: '拇指接线',
    duration: 12,
    target: 8,
    mission: '接通四根线路',
    cue: '拇指依次轻碰食指、中指、无名指、小指指尖。',
    gesture: '接 4 线',
    success: '接通 +1',
    coach: [
      '拇指是维修站唯一工程师，开始接线。',
      '线路亮了，别让其他手指抢戏。',
      '小动作也算大维修，继续稳住。',
    ],
  },
  {
    id: 'fan',
    station: '03 散热窗',
    name: '五指散热',
    duration: 10,
    target: 6,
    mission: '打开散热百叶窗',
    cue: '手掌朝镜头，五指并拢后像扇子一样张开。',
    gesture: '并拢 -> 张开',
    success: '散热 +1',
    coach: [
      '散热窗卡住了，先收拢，再把五指扇开。',
      '百叶窗打开一片，热气正在跑出去。',
      '很好，指缝越清楚，散热越顺。',
    ],
  },
  {
    id: 'sway',
    station: '04 清障口',
    name: '摆手清障',
    duration: 10,
    target: 6,
    mission: '雨刮清掉报错',
    cue: '手腕带着整只手左右平移一小段。',
    gesture: '左 -> 右',
    success: '清障 +1',
    coach: [
      '屏幕弹满报错了，左右一刷清掉。',
      '报错少了一块，维修窗口变清楚了。',
      '继续，像给机器擦掉加班痕迹。',
    ],
  },
  {
    id: 'circle',
    station: '05 充能盘',
    name: '绕腕转盘',
    duration: 12,
    target: 4,
    mission: '拧开能量阀门',
    cue: '手腕尽量留在原位，手掌绕着手腕慢慢转。',
    gesture: '转 1 圈',
    success: '充能 +1',
    coach: [
      '能量阀门卡住了，慢慢拧开。',
      '刻度咔哒一下，锁销弹开了。',
      '很好，手腕留住，手掌负责拧。',
    ],
  },
  {
    id: 'thumb-up',
    station: '06 验收台',
    name: '点赞盖章',
    duration: 8,
    target: 1,
    mission: '给维修单盖章',
    cue: '最后竖起大拇指完成验收。',
    gesture: 'Thumb Up',
    success: '盖章完成',
    coach: [
      '最后验收，给这台机器一个批准章。',
      '盖章成功，维修站准备关机。',
      '完成得不错，手部系统暂时恢复运营。',
    ],
  },
];

const idleCoachLines = [
  '把手放进扫描窗，维修站会自动识别。',
  '命中任务就会加进度，失败不会扣分。',
  '每个模块都很短，稳一点比快一点更强。',
  '这不是健康操，是一台疲劳机器的抢修现场。',
];

const titles = [
  '疲劳机修复师',
  '一分钟维修员',
  '拇指接线大师',
  '手势车间班长',
  '转盘充能专家',
  '验收盖章达人',
];

const finalComments = [
  '疲劳机器已恢复运行，手也顺便回血。',
  '维修记录已保存，建议稍后别立刻把机器打爆。',
  '本次抢修完成，关节噪音明显下降。',
  '检测到快乐值和手部电量同步回弹。',
  '这台机器还能撑一会儿，你的手也一样。',
];

function clamp(value, min, max) {
  return Math.max(min, Math.min(max, value));
}

function getDrillByElapsed(elapsed) {
  let cursor = 0;

  for (const drill of drills) {
    const end = cursor + drill.duration;

    if (elapsed < end) {
      return {
        drill,
        drillStart: cursor,
        drillEnd: end,
        drillElapsed: elapsed - cursor,
      };
    }

    cursor = end;
  }

  return {
    drill: drills[drills.length - 1],
    drillStart: TOTAL_SECONDS - drills[drills.length - 1].duration,
    drillEnd: TOTAL_SECONDS,
    drillElapsed: drills[drills.length - 1].duration,
  };
}

function getResult(score, maxCombo, completedDrills) {
  const recharge = clamp(Math.round(score * 0.82 + maxCombo * 4 + completedDrills * 5), 12, 100);
  const title = titles[(completedDrills + maxCombo) % titles.length];
  const comment = finalComments[(score + maxCombo) % finalComments.length];

  return { recharge, title, comment };
}

function getTopGesture(result) {
  return result?.gestures?.[0]?.[0]?.categoryName ?? 'None';
}

function getTopGestureScore(result) {
  return result?.gestures?.[0]?.[0]?.score ?? 0;
}

function drawLandmarks(canvas, hands, video) {
  const context = canvas.getContext('2d');
  const width = canvas.clientWidth;
  const height = canvas.clientHeight;

  canvas.width = width;
  canvas.height = height;
  context.clearRect(0, 0, width, height);

  const videoWidth = video?.videoWidth || width;
  const videoHeight = video?.videoHeight || height;
  const scale = Math.max(width / videoWidth, height / videoHeight);
  const renderedWidth = videoWidth * scale;
  const renderedHeight = videoHeight * scale;
  const offsetX = (width - renderedWidth) / 2;
  const offsetY = (height - renderedHeight) / 2;

  hands.forEach((landmarks) => {
    context.lineWidth = 4;
    context.strokeStyle = '#58d7b7';
    context.fillStyle = '#ffffff';

    HAND_CONNECTIONS.forEach(([from, to]) => {
      const start = landmarks[from];
      const end = landmarks[to];

      context.beginPath();
      context.moveTo(offsetX + start.x * renderedWidth, offsetY + start.y * renderedHeight);
      context.lineTo(offsetX + end.x * renderedWidth, offsetY + end.y * renderedHeight);
      context.stroke();
    });

    landmarks.forEach((point) => {
      context.beginPath();
      context.arc(offsetX + point.x * renderedWidth, offsetY + point.y * renderedHeight, 4.5, 0, Math.PI * 2);
      context.fill();
    });
  });
}

function distance(a, b) {
  if (!a || !b) return Infinity;

  return Math.hypot(a.x - b.x, a.y - b.y);
}

function getHandBounds(landmarks) {
  const xs = landmarks.map((point) => point.x);
  const ys = landmarks.map((point) => point.y);

  return {
    width: Math.max(...xs) - Math.min(...xs),
    height: Math.max(...ys) - Math.min(...ys),
  };
}

function getHandSize(landmarks) {
  const bounds = getHandBounds(landmarks);
  return Math.max(bounds.width, bounds.height, 0.12);
}

function selectPrimaryHand(hands) {
  if (!hands.length) return null;

  return hands.reduce((best, hand) => (getHandSize(hand) > getHandSize(best) ? hand : best), hands[0]);
}

function getPalmScale(landmarks) {
  return Math.max(distance(landmarks[0], landmarks[9]), 0.12);
}

function getThumbTouchState(landmarks, expectedTip) {
  const scale = getPalmScale(landmarks);
  const distances = FINGER_SEQUENCE.map((finger) => ({
    ...finger,
    distance: distance(landmarks[4], landmarks[finger.tip]),
  })).sort((a, b) => a.distance - b.distance);
  const expected = distances.find((finger) => finger.tip === expectedTip);
  const nearestOther = distances.find((finger) => finger.tip !== expectedTip);
  const normalized = expected.distance / scale;
  const isClose = normalized < 0.36 || (normalized < 0.44 && expected.distance <= nearestOther.distance + scale * 0.08);

  return {
    hit: isClose,
    normalized,
    nearestName: distances[0].name,
  };
}

function getFingerFanState(landmarks) {
  const fingertips = [landmarks[8], landmarks[12], landmarks[16], landmarks[20]];
  const knuckles = [landmarks[5], landmarks[9], landmarks[13], landmarks[17]];
  const tipXs = fingertips.map((point) => point.x);
  const knuckleXs = knuckles.map((point) => point.x);
  const tipSpread = Math.max(...tipXs) - Math.min(...tipXs);
  const knuckleSpread = Math.max(...knuckleXs) - Math.min(...knuckleXs);
  const ratio = tipSpread / Math.max(knuckleSpread, 0.08);

  if (ratio > 0.88) return { pose: 'open', ratio };
  if (ratio < 0.78) return { pose: 'closed', ratio };
  return { pose: null, ratio };
}

function getWristSwayState(landmarks, baseX) {
  const wristX = landmarks[0].x;
  const threshold = clamp(getHandSize(landmarks) * 0.24, 0.055, 0.105);

  if (baseX === null) {
    return { side: null, baseX: wristX, deltaX: 0, threshold };
  }

  const deltaX = wristX - baseX;

  if (deltaX > threshold) return { side: 'right', baseX, deltaX, threshold };
  if (deltaX < -threshold) return { side: 'left', baseX, deltaX, threshold };
  return { side: null, baseX, deltaX, threshold };
}

function getCircleZoneState(landmarks, minRadius) {
  const wrist = landmarks[0];
  const palmPoints = [landmarks[5], landmarks[9], landmarks[13], landmarks[17]];

  if (!wrist || palmPoints.some((point) => !point)) {
    return { zone: null, angle: 0, distance: 0, minRadius };
  }

  const palmCenter = palmPoints.reduce(
    (sum, point) => ({
      x: sum.x + point.x / palmPoints.length,
      y: sum.y + point.y / palmPoints.length,
    }),
    { x: 0, y: 0 },
  );
  const dx = palmCenter.x - wrist.x;
  const dy = palmCenter.y - wrist.y;
  const distance = Math.hypot(dx, dy);

  if (distance < minRadius) {
    return { zone: null, angle: 0, distance, minRadius };
  }

  const angle = (Math.atan2(dy, dx) * 180) / Math.PI;
  const normalizedAngle = (angle + 360) % 360;

  if (normalizedAngle < 45 || normalizedAngle >= 315) {
    return { zone: 'right', angle: normalizedAngle, distance, minRadius };
  }
  if (normalizedAngle < 135) {
    return { zone: 'down', angle: normalizedAngle, distance, minRadius };
  }
  if (normalizedAngle < 225) {
    return { zone: 'left', angle: normalizedAngle, distance, minRadius };
  }
  return { zone: 'up', angle: normalizedAngle, distance, minRadius };
}

function RepairScene({ drill, ticks, progress, pulse }) {
  const progressValue = clamp(progress, 0, 100);
  const clearedCount = Math.min(drill.target, ticks);
  const sceneClassName = `repair-scene scene-${drill.id} ${pulse ? 'is-hit' : ''}`;

  if (drill.id === 'bloom') {
    return (
      <div className={sceneClassName} style={{ '--scene-progress': `${progressValue}%` }} aria-hidden="true">
        <div className="starter-game">
          <div className="power-seed">
            <span />
            {Array.from({ length: drill.target }).map((_, index) => (
              <i key={index} className={index < ticks ? 'is-lit' : ''} />
            ))}
          </div>
          <div className="power-burst">
            {Array.from({ length: 8 }).map((_, index) => (
              <b key={index} className={ticks > index / 2 ? 'is-on' : ''} />
            ))}
          </div>
          <strong>点火</strong>
        </div>
      </div>
    );
  }

  if (drill.id === 'thumb-call') {
    return (
      <div className={sceneClassName} style={{ '--scene-progress': `${progressValue}%` }} aria-hidden="true">
        <div className="circuit-game">
          {FINGER_SEQUENCE.map((finger, index) => (
            <div key={finger.tip} className={`finger-port ${ticks > index ? 'is-lit' : ''}`}>
              <span>{finger.name.slice(0, 1)}</span>
              <i />
              <div className="wire-charge">
                <b className={ticks > index ? 'is-on' : ''} />
                <b className={ticks > index + FINGER_SEQUENCE.length ? 'is-on' : ''} />
              </div>
            </div>
          ))}
          <div className="circuit-core">
            <span>{Math.min(ticks, drill.target)}/{drill.target}</span>
          </div>
        </div>
      </div>
    );
  }

  if (drill.id === 'fan') {
    return (
      <div className={sceneClassName} style={{ '--scene-progress': `${progressValue}%` }} aria-hidden="true">
        <div className="fan-game">
          <div className="fan-window">
            {Array.from({ length: drill.target }).map((_, index) => (
              <i key={index} className={index < ticks ? 'is-open' : ''} />
            ))}
          </div>
          <div className="heat-lines">
            <span />
            <span />
            <span />
          </div>
          <strong>散热中</strong>
        </div>
      </div>
    );
  }

  if (drill.id === 'sway') {
    return (
      <div className={sceneClassName} style={{ '--scene-progress': `${progressValue}%` }} aria-hidden="true">
        <div className="wipe-game">
          <div className="error-window">
            <strong>ERROR</strong>
            <span />
            <span />
            {Array.from({ length: drill.target }).map((_, index) => (
              <i key={index} className={index < clearedCount ? 'is-cleared' : ''} />
            ))}
          </div>
          <div className="wiper-blade" />
        </div>
      </div>
    );
  }

  if (drill.id === 'circle') {
    return (
      <div className={sceneClassName} style={{ '--dial-angle': `${progressValue * 2.7}deg` }} aria-hidden="true">
        <div className="dial-game">
          <div className="safe-dial">
            {Array.from({ length: 12 }).map((_, index) => (
              <i key={index} className={index < ticks * 3 ? 'is-lit' : ''} />
            ))}
            <span />
          </div>
          <div className="lock-pins">
            {Array.from({ length: drill.target }).map((_, index) => (
              <b key={index} className={index < ticks ? 'is-open' : ''} />
            ))}
          </div>
          <strong>拧阀解锁</strong>
        </div>
      </div>
    );
  }

  return (
    <div className={sceneClassName} style={{ '--scene-progress': `${progressValue}%` }} aria-hidden="true">
      <div className="stamp-desk">
        <div className="repair-form">
          <span />
          <span />
          <span />
          <strong className={ticks >= drill.target ? 'is-stamped' : ''}>PASS</strong>
        </div>
        <div className={`stamp-block ${ticks >= drill.target ? 'is-done' : ''}`}>
          <i />
        </div>
      </div>
    </div>
  );
}

function App() {
  if (['coach-ui', 'progress-ui'].includes(new URLSearchParams(window.location.search).get('prototype'))) {
    return <CoachUiPrototype />;
  }

  const [screen, setScreen] = useState('home');
  const [elapsed, setElapsed] = useState(0);
  const [score, setScore] = useState(0);
  const [combo, setCombo] = useState(0);
  const [maxCombo, setMaxCombo] = useState(0);
  const [completed, setCompleted] = useState({});
  const [drillTicks, setDrillTicks] = useState({});
  const [coachLine, setCoachLine] = useState(idleCoachLines[0]);
  const [pulse, setPulse] = useState(false);
  const [successFlash, setSuccessFlash] = useState(false);
  const [successToast, setSuccessToast] = useState('命中 +1');
  const [mode, setMode] = useState('camera');
  const [cameraStatus, setCameraStatus] = useState('idle');
  const [cameraMessage, setCameraMessage] = useState('点击开始回血，允许浏览器使用摄像头。');
  const [actionHint, setActionHint] = useState(INITIAL_ACTION_HINTS.bloom);
  const [motionDebug, setMotionDebug] = useState({
    thumb: '-',
    fan: '-',
    sway: '-',
    circle: '0/3',
  });

  const videoRef = useRef(null);
  const canvasRef = useRef(null);
  const streamRef = useRef(null);
  const animationRef = useRef(null);
  const gestureRecognizerRef = useRef(null);
  const handLandmarkerRef = useRef(null);
  const currentRef = useRef(null);
  const modeRef = useRef(mode);
  const drillTicksRef = useRef(drillTicks);
  const lastVideoTimeRef = useRef(-1);
  const lastAcceptedGestureRef = useRef('None');
  const lastAutoAdvanceAtRef = useRef(0);
  const stableGestureRef = useRef({ name: 'None', since: 0, score: 0 });
  const landmarkCandidateRef = useRef({ key: null, since: 0 });
  const thumbStepRef = useRef(0);
  const fanPoseRef = useRef(null);
  const fanReadyRef = useRef(true);
  const wristSwayBaseXRef = useRef(null);
  const wristSwaySideRef = useRef(null);
  const wristCircleZonesRef = useRef(new Set());

  const isPlaying = screen === 'game';
  const current = useMemo(() => getDrillByElapsed(elapsed), [elapsed]);
  const remaining = Math.max(TOTAL_SECONDS - elapsed, 0);
  const currentTicks = drillTicks[current.drill.id] ?? 0;
  const completedDrills = Object.values(completed).filter(Boolean).length;
  const drillProgress = Math.round((currentTicks / current.drill.target) * 100);
  const drillTimeProgress = clamp(Math.round((current.drillElapsed / current.drill.duration) * 100), 0, 100);
  const result = useMemo(
    () => getResult(score, maxCombo, completedDrills),
    [completedDrills, maxCombo, score],
  );

  useEffect(() => {
    currentRef.current = current;
  }, [current]);

  useEffect(() => {
    modeRef.current = mode;
  }, [mode]);

  useEffect(() => {
    drillTicksRef.current = drillTicks;
  }, [drillTicks]);

  useEffect(() => {
    const drillId = current.drill.id;

    lastAcceptedGestureRef.current = 'None';
    landmarkCandidateRef.current = { key: null, since: 0 };
    stableGestureRef.current = { name: 'None', since: 0, score: 0 };
    setActionHint(INITIAL_ACTION_HINTS[drillId]);
    setMotionDebug({ thumb: '-', fan: '-', sway: '-', circle: '0/3' });

    if (drillId === 'thumb-call') thumbStepRef.current = 0;
    if (drillId === 'fan') {
      fanPoseRef.current = null;
      fanReadyRef.current = true;
    }
    if (drillId === 'sway') {
      wristSwayBaseXRef.current = null;
      wristSwaySideRef.current = null;
    }
    if (drillId === 'circle') {
      wristCircleZonesRef.current = new Set();
    }
  }, [current.drill.id]);

  useEffect(() => {
    if (!isPlaying) return undefined;

    const timer = window.setInterval(() => {
      setElapsed((value) => {
        if (value >= TOTAL_SECONDS - 1) {
          window.clearInterval(timer);
          setScreen('result');
          return TOTAL_SECONDS;
        }

        return value + 1;
      });
    }, 1000);

    return () => window.clearInterval(timer);
  }, [isPlaying]);

  useEffect(() => {
    if (!isPlaying) return;

    const lines = current.drill.coach;
    const line = lines[Math.floor(current.drillElapsed / 4) % lines.length];
    setCoachLine(line);
  }, [current.drill.coach, current.drillElapsed, isPlaying]);

  useEffect(() => {
    if (!isPlaying || mode !== 'camera') {
      return undefined;
    }

    let cancelled = false;
    startCameraSession(() => cancelled);

    return () => {
      cancelled = true;
      stopCameraResources();
    };
  }, [isPlaying, mode]);

  useEffect(() => () => stopCameraResources(), []);

  function getStableGestureName(gestureName, score, now) {
    const stable = stableGestureRef.current;

    if (stable.name !== gestureName) {
      stableGestureRef.current = { name: gestureName, since: now, score };
      return null;
    }

    stable.score = score;
    if (gestureName === 'None' || score < 0.48 || now - stable.since < 140) return null;
    return gestureName;
  }

  function isStableLandmarkCandidate(key, now, holdMs = 120) {
    const candidate = landmarkCandidateRef.current;

    if (candidate.key !== key) {
      landmarkCandidateRef.current = { key, since: now };
      return false;
    }

    return now - candidate.since >= holdMs;
  }

  function clearLandmarkCandidate() {
    landmarkCandidateRef.current = { key: null, since: 0 };
  }

  function resetGame(nextMode) {
    setMode(nextMode);
    setScreen('game');
    setElapsed(0);
    setScore(0);
    setCombo(0);
    setMaxCombo(0);
    setCompleted({});
    setDrillTicks({});
    drillTicksRef.current = {};
    lastAcceptedGestureRef.current = 'None';
    lastAutoAdvanceAtRef.current = 0;
    thumbStepRef.current = 0;
    fanPoseRef.current = null;
    fanReadyRef.current = true;
    wristSwayBaseXRef.current = null;
    wristSwaySideRef.current = null;
    wristCircleZonesRef.current = new Set();
    stableGestureRef.current = { name: 'None', since: 0, score: 0 };
    landmarkCandidateRef.current = { key: null, since: 0 };
    setActionHint(INITIAL_ACTION_HINTS.bloom);
    setSuccessToast('命中 +1');
    setMotionDebug({ thumb: '-', fan: '-', sway: '-', circle: '0/3' });
  }

  function stopCameraResources() {
    if (animationRef.current) {
      window.cancelAnimationFrame(animationRef.current);
      animationRef.current = null;
    }

    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track) => track.stop());
      streamRef.current = null;
    }

    gestureRecognizerRef.current?.close();
    handLandmarkerRef.current?.close();
    gestureRecognizerRef.current = null;
    handLandmarkerRef.current = null;
    lastVideoTimeRef.current = -1;

    const canvas = canvasRef.current;
    const context = canvas?.getContext('2d');
    if (canvas && context) {
      context.clearRect(0, 0, canvas.width, canvas.height);
    }
  }

  async function startCameraSession(isCancelled) {
    if (!navigator.mediaDevices?.getUserMedia) {
      setCameraStatus('error');
      setCameraMessage('当前浏览器不支持摄像头，请换用支持摄像头权限的浏览器。');
      return;
    }

    try {
      setCameraStatus('loading');
      setCameraMessage('正在请求摄像头权限...');

      const stream = await navigator.mediaDevices.getUserMedia({
        audio: false,
        video: {
          facingMode: 'user',
          width: { ideal: 1280 },
          height: { ideal: 720 },
        },
      });

      if (isCancelled()) {
        stream.getTracks().forEach((track) => track.stop());
        return;
      }

      streamRef.current = stream;
      videoRef.current.srcObject = stream;
      await videoRef.current.play();

      setCameraMessage('正在加载手势识别模型...');

      const vision = await FilesetResolver.forVisionTasks(MEDIAPIPE_WASM_URL);
      const [gestureRecognizer, handLandmarker] = await Promise.all([
        GestureRecognizer.createFromOptions(vision, {
          baseOptions: {
            modelAssetPath: GESTURE_MODEL_URL,
            delegate: 'CPU',
          },
          runningMode: 'VIDEO',
          numHands: 2,
        }),
        HandLandmarker.createFromOptions(vision, {
          baseOptions: {
            modelAssetPath: HAND_MODEL_URL,
            delegate: 'CPU',
          },
          runningMode: 'VIDEO',
          numHands: 2,
        }),
      ]);

      if (isCancelled()) {
        gestureRecognizer.close();
        handLandmarker.close();
        return;
      }

      gestureRecognizerRef.current = gestureRecognizer;
      handLandmarkerRef.current = handLandmarker;
      setCameraStatus('ready');
      setCameraMessage('摄像头已连接，把手放进画面。');
      runVisionLoop();
    } catch (error) {
      const reason =
        error?.name === 'NotAllowedError'
          ? '摄像头权限被拒绝'
          : error?.name === 'NotFoundError'
            ? '没有找到可用摄像头'
            : error?.message?.includes('Failed to fetch')
              ? '模型下载失败'
              : error?.message || '初始化失败';

      console.warn('Camera mode failed:', error);
      setCameraStatus('error');
      setCameraMessage(`${reason}，请在浏览器地址栏允许摄像头后刷新页面。`);
    }
  }

  function runVisionLoop() {
    const video = videoRef.current;
    const canvas = canvasRef.current;
    const gestureRecognizer = gestureRecognizerRef.current;
    const handLandmarker = handLandmarkerRef.current;

    if (!video || !canvas || !gestureRecognizer || !handLandmarker) return;

    if (video.readyState >= 2 && video.currentTime !== lastVideoTimeRef.current) {
      lastVideoTimeRef.current = video.currentTime;

      const now = performance.now();
      const gestureResult = gestureRecognizer.recognizeForVideo(video, now);
      const handResult = handLandmarker.detectForVideo(video, now);
      const gestureName = getTopGesture(gestureResult);
      const gestureScore = getTopGestureScore(gestureResult);
      const hands = handResult.landmarks ?? [];

      drawLandmarks(canvas, hands, video);
      handleAutoGesture(gestureName, gestureScore, hands, now);
    }

    animationRef.current = window.requestAnimationFrame(runVisionLoop);
  }

  function handleAutoGesture(gestureName, gestureScore, hands, now) {
    const active = currentRef.current?.drill;
    if (!active || modeRef.current !== 'camera') return;
    const landmarks = selectPrimaryHand(hands);
    const currentTicks = drillTicksRef.current[active.id] ?? 0;

    if (currentTicks >= active.target) {
      setActionHint('这个模块修好了，等下一张任务卡。');
      return;
    }

    if (!landmarks) {
      clearLandmarkCandidate();
      setActionHint('把维修手放进扫描窗，手腕也露出来。');
      setMotionDebug({ thumb: '-', fan: '-', sway: '-', circle: '0/3' });
      return;
    }

    const stableGestureName = getStableGestureName(gestureName, gestureScore, now);
    const cooldown = ACTION_COOLDOWNS[active.id] ?? 650;
    const isCoolingDown = now - lastAutoAdvanceAtRef.current < cooldown;

    if (active.id === 'bloom') {
      const nextGesture = lastAcceptedGestureRef.current === 'Closed_Fist' ? '开掌点火' : '握拳蓄能';
      setActionHint(`启动舱任务：现在${nextGesture}。`);

      if (isCoolingDown || !['Closed_Fist', 'Open_Palm'].includes(stableGestureName)) return;
      if (lastAcceptedGestureRef.current === stableGestureName) return;

      lastAcceptedGestureRef.current = stableGestureName;
      lastAutoAdvanceAtRef.current = now;
      registerSuccessForDrill(active);
      return;
    }

    if (active.id === 'thumb-call') {
      const expectedFinger = FINGER_SEQUENCE[thumbStepRef.current % FINGER_SEQUENCE.length];
      const touch = getThumbTouchState(landmarks, expectedFinger.tip);

      setActionHint(`接线台任务：拇指接到${expectedFinger.name}线，碰到就松开。`);
      setMotionDebug((value) => ({
        ...value,
        thumb: `${expectedFinger.name} ${Math.round(touch.normalized * 100)}%`,
      }));

      if (isCoolingDown || !touch.hit) {
        if (!touch.hit) clearLandmarkCandidate();
        return;
      }
      if (!isStableLandmarkCandidate(`thumb-${expectedFinger.tip}`, now, 110)) return;

      thumbStepRef.current += 1;
      clearLandmarkCandidate();
      lastAutoAdvanceAtRef.current = now;
      registerSuccessForDrill(active);

      const nextFinger = FINGER_SEQUENCE[thumbStepRef.current % FINGER_SEQUENCE.length];
      setActionHint(`线路已亮，下一根接${nextFinger.name}。`);
      return;
    }

    if (active.id === 'fan') {
      const fan = getFingerFanState(landmarks);
      const nextPose = fanPoseRef.current === 'open' ? '并拢五指' : '张开五指';

      setActionHint(
        fanReadyRef.current
          ? `散热窗任务：${nextPose}，像打开一把小扇子。`
          : '先做反方向动作，让百叶窗重新卡住。',
      );
      setMotionDebug((value) => ({
        ...value,
        fan: fan.pose ? `${fan.pose === 'open' ? '张开' : '并拢'} ${Math.round(fan.ratio * 100)}%` : `${Math.round(fan.ratio * 100)}%`,
      }));

      if (!fan.pose) {
        clearLandmarkCandidate();
        return;
      }

      if (fanPoseRef.current && fan.pose !== fanPoseRef.current) {
        fanReadyRef.current = true;
      }

      if (isCoolingDown || !fanReadyRef.current || fan.pose === fanPoseRef.current) {
        return;
      }
      if (!isStableLandmarkCandidate(`fan-${fan.pose}`, now, 55)) return;

      fanPoseRef.current = fan.pose;
      fanReadyRef.current = false;
      clearLandmarkCandidate();
      lastAutoAdvanceAtRef.current = now;
      registerSuccessForDrill(active);
      return;
    }

    if (active.id === 'sway') {
      const result = getWristSwayState(landmarks, wristSwayBaseXRef.current);
      if (wristSwayBaseXRef.current === null) wristSwayBaseXRef.current = result.baseX;

      setActionHint('清障口任务：手腕带着整只手左右扫开堵塞物。');
      setMotionDebug((value) => ({
        ...value,
        sway: `${Math.round(Math.abs(result.deltaX) * 100)} / ${Math.round(result.threshold * 100)}`,
      }));

      if (isCoolingDown || !result.side || result.side === wristSwaySideRef.current) {
        if (!result.side) clearLandmarkCandidate();
        return;
      }
      if (!isStableLandmarkCandidate(`sway-${result.side}`, now, 90)) return;

      wristSwaySideRef.current = result.side;
      wristSwayBaseXRef.current = landmarks[0].x;
      clearLandmarkCandidate();
      lastAutoAdvanceAtRef.current = now;
      registerSuccessForDrill(active);
      return;
    }

    if (active.id === 'circle') {
      const minRadius = clamp(getPalmScale(landmarks) * 0.09, 0.012, 0.045);
      const circle = getCircleZoneState(landmarks, minRadius);

      if (circle.zone) wristCircleZonesRef.current.add(circle.zone);

      setActionHint(`充能盘任务：手腕留在原位，手掌慢慢转。已捕捉 ${wristCircleZonesRef.current.size}/2 个方向。`);
      setMotionDebug((value) => ({
        ...value,
        circle: `${wristCircleZonesRef.current.size}/2`,
      }));

      if (isCoolingDown || wristCircleZonesRef.current.size < 2) return;

      wristCircleZonesRef.current = new Set();
      lastAutoAdvanceAtRef.current = now;
      registerSuccessForDrill(active);
      return;
    }

    if (active.id === 'thumb-up') {
      setActionHint('验收台任务：竖起大拇指，给维修单盖章。');
    }

    if (active.id === 'thumb-up' && !isCoolingDown && stableGestureName === 'Thumb_Up') {
      lastAutoAdvanceAtRef.current = now;
      registerSuccessForDrill(active);
    }
  }

  function registerSuccessForDrill(drill) {
    const previousTicks = drillTicksRef.current[drill.id] ?? 0;
    if (previousTicks >= drill.target) return;

    const nextTicks = Math.min(previousTicks + 1, drill.target);
    const nextTicksMap = {
      ...drillTicksRef.current,
      [drill.id]: nextTicks,
    };

    setPulse(true);
    setSuccessFlash(true);
    setSuccessToast(drill.success ?? '命中 +1');
    window.setTimeout(() => setPulse(false), 260);
    window.setTimeout(() => setSuccessFlash(false), 620);
    drillTicksRef.current = nextTicksMap;
    setDrillTicks(nextTicksMap);
    setCombo((value) => {
      const nextCombo = value + 1;
      setMaxCombo((maxValue) => Math.max(maxValue, nextCombo));
      return nextCombo;
    });
    setScore((value) => value + 9 + Math.min(nextTicks, 8));
    setCoachLine(drill.coach[nextTicks % drill.coach.length]);

    if (nextTicks >= drill.target) {
      setCompleted((value) => ({ ...value, [drill.id]: true }));
    }
  }

  function startCamera() {
    resetGame('camera');
    setActionHint(INITIAL_ACTION_HINTS.bloom);
    setCoachLine('正在唤醒摄像头教练，请允许浏览器使用摄像头。');
  }

  function restart() {
    startCamera();
  }

  if (screen === 'home') {
    return (
      <main className="app-shell">
        <section className="hero-panel">
          <div className="brand-pill">
            <Sparkles size={18} />
            <span>60 秒手势维修站</span>
          </div>

          <div className="hero-copy">
            <h1>手势维修站</h1>
            <p>打开摄像头，用 6 个真实手势抢修一台疲劳机器。</p>
          </div>

          <div className="hand-stage" aria-hidden="true">
            <div className="hand-card main-card">
              <Hand size={64} />
              <span>SCAN</span>
            </div>
            <div className="orbit-card top-card">
              <Timer size={24} />
              <strong>60s</strong>
            </div>
            <div className="orbit-card bottom-card">
              <Activity size={24} />
              <strong>6关</strong>
            </div>
          </div>

          <div className="action-row">
            <button className="primary-button" type="button" onClick={startCamera}>
              <Camera size={20} />
              <span>开工维修</span>
            </button>
          </div>
        </section>
      </main>
    );
  }

  if (screen === 'result') {
    return (
      <main className="app-shell">
        <section className="result-panel">
          <div className="result-header">
            <BadgeCheck size={34} />
            <span>维修报告</span>
          </div>

          <div className="score-ring">
            <strong>{result.recharge}%</strong>
            <span>机器回血指数</span>
          </div>

          <div className="result-title">{result.title}</div>
          <p className="result-comment">{result.comment}</p>

          <div className="stats-grid">
            <div>
              <span>修好模块</span>
              <strong>{completedDrills}/6</strong>
            </div>
            <div>
              <span>最高连击</span>
              <strong>{maxCombo}</strong>
            </div>
            <div>
              <span>维修得分</span>
              <strong>{score}</strong>
            </div>
            <div>
              <span>识别模式</span>
              <strong>摄像头</strong>
            </div>
          </div>

          <button className="primary-button wide-button" type="button" onClick={restart}>
            <RefreshCcw size={20} />
            <span>再修一轮</span>
          </button>
        </section>
      </main>
    );
  }

  return (
    <main className="game-shell">
      <section className="game-stage">
        <header className="game-topbar">
          <div className="timer-block">
            <Timer size={20} />
            <span>剩余</span>
            <strong>{remaining}s</strong>
          </div>
          <div className="drill-title">
            <span>{current.drill.station}</span>
            <strong>{current.drill.name}</strong>
          </div>
          <div className="combo-block">
            <Activity size={20} />
            <span>连击</span>
            <strong>{combo}x</strong>
          </div>
        </header>

        <div className="camera-frame has-camera">
          <video ref={videoRef} className="camera-video" autoPlay muted playsInline />
          <canvas ref={canvasRef} className={`landmark-canvas ${pulse ? 'is-pulsing' : ''}`} />
          <RepairScene drill={current.drill} ticks={currentTicks} progress={drillProgress} pulse={pulse} />
          {successFlash && <div className="gesture-success-pop">{successToast}</div>}
          <div className={`repair-widget repair-${current.drill.id}`}>
            <div className="repair-widget-head">
              <span>{cameraStatus === 'ready' ? current.drill.station : '扫描舱'}</span>
              <strong>{cameraStatus === 'ready' ? current.drill.mission : '等待摄像头'}</strong>
            </div>
            <div className="task-pips" aria-hidden="true">
              {Array.from({ length: current.drill.target }).map((_, index) => (
                <i key={`${current.drill.id}-${index}`} className={index < currentTicks ? 'is-lit' : ''} />
              ))}
            </div>
            <div className="rhythm-strip" aria-hidden="true">
              <span style={{ width: `${drillTimeProgress}%` }} />
            </div>
          </div>
          <div className="camera-command">
            <span>{cameraStatus === 'ready' ? '当前任务' : '正在准备'}</span>
            <strong>{cameraStatus === 'ready' ? current.drill.name : '摄像头'}</strong>
            <em>{cameraStatus === 'ready' ? actionHint : cameraMessage}</em>
          </div>
          <div className="camera-coach-note">
            <span>维修广播</span>
            <p>{coachLine}</p>
          </div>
        </div>

      </section>
    </main>
  );
}

export default App;
