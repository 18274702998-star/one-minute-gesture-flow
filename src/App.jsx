import React, { useEffect, useMemo, useRef, useState } from 'react';
import { FilesetResolver, GestureRecognizer, HandLandmarker } from '@mediapipe/tasks-vision';
import {
  Activity,
  BadgeCheck,
  Camera,
  Hand,
  HeartPulse,
  RefreshCcw,
  Sparkles,
  Timer,
  Trophy,
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
  tilt: 430,
  sway: 500,
  circle: 480,
  'thumb-up': 620,
};

const INITIAL_ACTION_HINTS = {
  bloom: '先握拳，识别后再慢慢张开手掌。',
  'thumb-call': '拇指先轻碰食指指尖，碰到就松开。',
  tilt: '手掌朝镜头，向左或向右轻轻倾斜。',
  sway: '手腕带着整只手左右平移一小段。',
  circle: '手腕尽量留在原位，手掌绕着手腕慢慢转。',
  'thumb-up': '最后竖起大拇指，稳住半秒。',
};

const SIDE_LABELS = {
  left: '左',
  right: '右',
  up: '上',
  down: '下',
};

const drills = [
  {
    id: 'bloom',
    name: '握拳开花',
    duration: 10,
    target: 5,
    cue: '握拳，再把五指慢慢打开。',
    gesture: '握拳 -> 开掌',
    coach: [
      '找到你的手了，它看起来很想下班。',
      '很好，先把手指从屏幕宇宙里捞出来。',
      '别急，手指正在重新加载日常权限。',
    ],
  },
  {
    id: 'thumb-call',
    name: '拇指点名',
    duration: 12,
    target: 8,
    cue: '拇指依次轻碰食指、中指、无名指、小指指尖，碰到就松开。',
    gesture: '食 -> 中 -> 无名 -> 小',
    coach: [
      '拇指开始点名，其他手指请不要装没听见。',
      '很好，关节开始恢复人类权限。',
      '这个动作很小，但你的手会记得这份温柔。',
    ],
  },
  {
    id: 'tilt',
    name: '手掌倾斜',
    duration: 10,
    target: 6,
    cue: '手掌朝镜头，像门一样向左、向右轻轻倾斜。',
    gesture: '左倾 / 右倾',
    coach: [
      '像给手掌换个角度看世界。',
      '别太用力，放松不是跟自己掰腕子。',
      '很好，屏幕还在，但手先喘口气。',
    ],
  },
  {
    id: 'sway',
    name: '手腕摆摆',
    duration: 10,
    target: 6,
    cue: '手腕带着整只手左右平移一小段，别甩太快。',
    gesture: '左 -> 右',
    coach: [
      '手腕开始记得自己不是鼠标配件了。',
      '不错，重复点击宇宙正在松动。',
      '继续，手腕正在退出高负荷模式。',
    ],
  },
  {
    id: 'circle',
    name: '手腕画圈',
    duration: 12,
    target: 4,
    cue: '手腕尽量留在原位，手掌绕着手腕慢慢转。',
    gesture: '画 1 圈',
    coach: [
      '画个圈，把刚才的紧绷圈出去。',
      '速度不用快，稳定比炫技更有用。',
      '很好，手腕正在申请恢复出厂弹性。',
    ],
  },
  {
    id: 'thumb-up',
    name: '点赞收尾',
    duration: 6,
    target: 1,
    cue: '最后给自己的手一个点赞。',
    gesture: 'Thumb Up',
    coach: [
      '最后几秒，给这双手一点掌声。',
      '完成得不错，今天的手暂时不申请罢工。',
      '点赞保存，本次回血即将写入记忆。',
    ],
  },
];

const TOTAL_TARGETS = drills.reduce((sum, drill) => sum + drill.target, 0);

const idleCoachLines = [
  '光线有点低也没关系，把手靠近画面一点。',
  '动作正确时进度会上涨，失败不会扣分。',
  '不用追求标准，舒服、轻、慢就好。',
  '这一分钟不是考试，是让手偷偷休假。',
];

const titles = [
  '屏幕幸存者',
  '手腕临时复活师',
  '拇指外交官',
  '重复点击逃生员',
  '一分钟放松玩家',
  '手指重启管理员',
];

const finalComments = [
  '屏幕还在，手先活过来了。',
  '今天的手指重新上线了，但别连续刷太久。',
  '你的双手申请了 60 秒年假，并已获批。',
  '检测到快乐值轻微回弹。',
  '本次放松完成，建议稍后让眼睛也休息一下。',
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

function getPalmTiltState(landmarks) {
  const thumbSide = {
    x: (landmarks[5].x + landmarks[9].x) / 2,
    y: (landmarks[5].y + landmarks[9].y) / 2,
  };
  const pinkySide = {
    x: (landmarks[13].x + landmarks[17].x) / 2,
    y: (landmarks[13].y + landmarks[17].y) / 2,
  };
  const palmWidth = Math.max(distance(thumbSide, pinkySide), 0.065);
  const handDirection = thumbSide.x < pinkySide.x ? -1 : 1;
  const tiltValue = ((thumbSide.y - pinkySide.y) / palmWidth) * handDirection;
  const magnitude = Math.abs(tiltValue);

  if (tiltValue > 0.15) return { side: 'right', magnitude, isNeutral: false };
  if (tiltValue < -0.15) return { side: 'left', magnitude, isNeutral: false };
  return { side: null, magnitude, isNeutral: magnitude < 0.14 };
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
  const [mode, setMode] = useState('camera');
  const [cameraStatus, setCameraStatus] = useState('idle');
  const [cameraMessage, setCameraMessage] = useState('点击开始回血，允许浏览器使用摄像头。');
  const [actionHint, setActionHint] = useState(INITIAL_ACTION_HINTS.bloom);
  const [motionDebug, setMotionDebug] = useState({
    thumb: '-',
    tilt: '-',
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
  const tiltSideRef = useRef(null);
  const tiltReadyRef = useRef(true);
  const wristSwayBaseXRef = useRef(null);
  const wristSwaySideRef = useRef(null);
  const wristCircleZonesRef = useRef(new Set());

  const isPlaying = screen === 'game';
  const current = useMemo(() => getDrillByElapsed(elapsed), [elapsed]);
  const remaining = Math.max(TOTAL_SECONDS - elapsed, 0);
  const currentTicks = drillTicks[current.drill.id] ?? 0;
  const completedDrills = Object.values(completed).filter(Boolean).length;
  const completedTicks = Object.values(drillTicks).reduce((sum, value) => sum + value, 0);
  const drillProgress = Math.round((currentTicks / current.drill.target) * 100);
  const totalProgress = clamp(Math.round((completedTicks / TOTAL_TARGETS) * 100), 0, 100);
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
    setMotionDebug({ thumb: '-', tilt: '-', sway: '-', circle: '0/3' });

    if (drillId === 'thumb-call') thumbStepRef.current = 0;
    if (drillId === 'tilt') {
      tiltSideRef.current = null;
      tiltReadyRef.current = true;
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
    tiltSideRef.current = null;
    tiltReadyRef.current = true;
    wristSwayBaseXRef.current = null;
    wristSwaySideRef.current = null;
    wristCircleZonesRef.current = new Set();
    stableGestureRef.current = { name: 'None', since: 0, score: 0 };
    landmarkCandidateRef.current = { key: null, since: 0 };
    setActionHint(INITIAL_ACTION_HINTS.bloom);
    setMotionDebug({ thumb: '-', tilt: '-', sway: '-', circle: '0/3' });
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
      setActionHint('这一节够了，手先别卷，等下一项。');
      return;
    }

    if (!landmarks) {
      clearLandmarkCandidate();
      setActionHint('把一只手完整放进画面，手腕也露出来。');
      setMotionDebug({ thumb: '-', tilt: '-', sway: '-', circle: '0/4' });
      return;
    }

    const stableGestureName = getStableGestureName(gestureName, gestureScore, now);
    const cooldown = ACTION_COOLDOWNS[active.id] ?? 650;
    const isCoolingDown = now - lastAutoAdvanceAtRef.current < cooldown;

    if (active.id === 'bloom') {
      const nextGesture = lastAcceptedGestureRef.current === 'Closed_Fist' ? '张开手掌' : '握拳';
      setActionHint(`现在${nextGesture}，动作慢一点更容易识别。`);

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

      setActionHint(`拇指轻碰${expectedFinger.name}指尖，碰到就松开。`);
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
      setActionHint(`收到，下一下碰${nextFinger.name}。`);
      return;
    }

    if (active.id === 'tilt') {
      const tilt = getPalmTiltState(landmarks);
      const nextSide = tiltSideRef.current === 'left' ? '右' : tiltSideRef.current === 'right' ? '左' : '左或右';

      setActionHint(
        tiltReadyRef.current
          ? `手掌朝镜头，轻轻向${nextSide}倾斜。`
          : '先回到中间，别急着抢答。',
      );
      setMotionDebug((value) => ({
        ...value,
        tilt: tilt.side ? `${SIDE_LABELS[tilt.side]}倾` : '居中',
      }));

      if (!tilt.side) {
        if (tilt.isNeutral) tiltReadyRef.current = true;
        clearLandmarkCandidate();
        return;
      }

      if (isCoolingDown || !tiltReadyRef.current || tilt.side === tiltSideRef.current) {
        return;
      }
      if (!isStableLandmarkCandidate(`tilt-${tilt.side}`, now, 70)) return;

      tiltSideRef.current = tilt.side;
      tiltReadyRef.current = false;
      clearLandmarkCandidate();
      lastAutoAdvanceAtRef.current = now;
      registerSuccessForDrill(active);
      return;
    }

    if (active.id === 'sway') {
      const result = getWristSwayState(landmarks, wristSwayBaseXRef.current);
      if (wristSwayBaseXRef.current === null) wristSwayBaseXRef.current = result.baseX;

      setActionHint('手腕带着整只手左右平移，像把鼠标从工位请出去。');
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
      const minRadius = clamp(getPalmScale(landmarks) * 0.14, 0.018, 0.05);
      const circle = getCircleZoneState(landmarks, minRadius);

      if (circle.zone) wristCircleZonesRef.current.add(circle.zone);

      setActionHint(`手腕尽量留在原位，手掌绕着手腕慢慢转。已捕捉 ${wristCircleZonesRef.current.size}/3 个方向。`);
      setMotionDebug((value) => ({
        ...value,
        circle: `${wristCircleZonesRef.current.size}/3`,
      }));

      if (isCoolingDown || wristCircleZonesRef.current.size < 3) return;

      wristCircleZonesRef.current = new Set();
      lastAutoAdvanceAtRef.current = now;
      registerSuccessForDrill(active);
      return;
    }

    if (active.id === 'thumb-up') {
      setActionHint('竖起大拇指，给这只手一点精神赔偿。');
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
            <HeartPulse size={18} />
            <span>一分钟手部放松小游戏</span>
          </div>

          <div className="hero-copy">
            <h1>手部回血 60 秒</h1>
            <p>打开摄像头，跟着温柔嘴欠的 AI 教练做 6 个手指和手腕动作。</p>
          </div>

          <div className="hand-stage" aria-hidden="true">
            <div className="hand-card main-card">
              <Hand size={64} />
              <span>Ready</span>
            </div>
            <div className="orbit-card top-card">
              <Timer size={24} />
              <strong>60s</strong>
            </div>
            <div className="orbit-card bottom-card">
              <Sparkles size={24} />
              <strong>回血</strong>
            </div>
          </div>

          <div className="action-row">
            <button className="primary-button" type="button" onClick={startCamera}>
              <Camera size={20} />
              <span>开始回血</span>
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
            <Trophy size={34} />
            <span>一分钟放松报告</span>
          </div>

          <div className="score-ring">
            <strong>{result.recharge}%</strong>
            <span>手部回血指数</span>
          </div>

          <div className="result-title">{result.title}</div>
          <p className="result-comment">{result.comment}</p>

          <div className="stats-grid">
            <div>
              <span>完成动作</span>
              <strong>{completedDrills}/6</strong>
            </div>
            <div>
              <span>最高连击</span>
              <strong>{maxCombo}</strong>
            </div>
            <div>
              <span>本局得分</span>
              <strong>{score}</strong>
            </div>
            <div>
              <span>主要使用手</span>
              <strong>任意手</strong>
            </div>
          </div>

          <button className="primary-button wide-button" type="button" onClick={restart}>
            <RefreshCcw size={20} />
            <span>再来 60 秒</span>
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
            <strong>{remaining}s</strong>
          </div>
          <div className="drill-title">
            <span>当前动作</span>
            <strong>{current.drill.name}</strong>
          </div>
          <div className="combo-block">
            <Activity size={20} />
            <strong>{combo}x</strong>
          </div>
        </header>

        <div className="camera-frame has-camera">
          <video ref={videoRef} className="camera-video" autoPlay muted playsInline />
          <canvas ref={canvasRef} className={`landmark-canvas ${pulse ? 'is-pulsing' : ''}`} />
          {successFlash && <div className="gesture-success-pop">漂亮 +1</div>}
          <div className="camera-command">
            <span>{cameraStatus === 'ready' ? '现在做' : '正在准备'}</span>
            <strong>{cameraStatus === 'ready' ? current.drill.name : '摄像头'}</strong>
            <em>{cameraStatus === 'ready' ? actionHint : cameraMessage}</em>
          </div>
          <div className="camera-coach-note">
            <span>教练小纸条</span>
            <p>{coachLine}</p>
          </div>
        </div>

        <div className="progress-area single-progress">
          <div className="single-progress-copy">
            <span>本动作</span>
            <strong>{current.drill.name}</strong>
            <em>
              {currentTicks}/{current.drill.target} 次
            </em>
          </div>
          <div className="single-progress-ring" style={{ '--progress': `${drillProgress}%` }}>
            <b>{drillProgress}%</b>
          </div>
          <div className="progress-track single-track">
            <span style={{ width: `${drillProgress}%` }} />
          </div>
        </div>

      </section>
    </main>
  );
}

export default App;
