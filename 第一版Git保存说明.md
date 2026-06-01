# 第一版 Git 保存说明

## 已保存的版本

- 分支名：`codex/baseline-before-pivot`
- 提交号：`c86b06a`
- 提交信息：`Save baseline before gameplay pivot`

## 这一版保存了什么

这一版是“思维大转变”之前的当前可运行版本，主要包含：

- React + Vite 项目基础文件
- 摄像头接入
- MediaPipe GestureRecognizer / HandLandmarker 识别逻辑
- canvas 手部骨架绘制
- iPhone 15 模拟框内的首页、游戏页、结束页 UI
- B1「便签气泡版」AI 教练 UI
- P5 底部“本动作进度”
- 真实摄像头动作流程：
  - 握拳开花
  - 拇指点名
  - 手掌倾斜
  - 手腕摆摆
  - 手腕画圈
  - 点赞收尾
- “手腕画圈”已改为：手腕尽量留在原位，手掌绕着手腕慢慢转

## 已提交的主要文件

- `.gitignore`
- `index.html`
- `package.json`
- `package-lock.json`
- `src/App.jsx`
- `src/App.css`
- `src/CoachUiPrototype.jsx`
- `src/CoachUiPrototype.css`
- `src/main.jsx`
- `手部回血60秒-PRD.md`

## 如何回到这一版

在项目文件夹打开终端：

```powershell
cd "E:\同济\实习工作相关\一分钟游戏"
git checkout codex/baseline-before-pivot
```

如果想精确回到这次提交：

```powershell
git checkout c86b06a
```

## 如何运行这一版

```powershell
cd "E:\同济\实习工作相关\一分钟游戏"
npm install
npm run dev
```

然后打开浏览器访问终端显示的地址，通常是：

```text
http://127.0.0.1:5174/
```
