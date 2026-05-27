# 第二版 Git 保存说明

## 已保存的版本

- 分支名：`codex/gameplay-upgrade`
- 提交号：`5f9fc8b`
- 提交信息：`Save second gameplay layout version`

## 这一版保存了什么

这一版是从「手部回血 60 秒」升级到「60 秒手势维修站」后的当前可运行版本，主要包含：

- React + Vite 页面小游戏主体
- 真实摄像头接入
- MediaPipe GestureRecognizer / HandLandmarker 手势识别
- canvas 手部骨架扫描层
- iPhone 15 模拟框内的首页、游戏页、结束页 UI
- 游戏页任务卡、维修广播、成功反馈、单任务进度
- 6 个真实手势维修小游戏：
  - 开掌启动：`Closed_Fist` / `Open_Palm` 交替
  - 拇指接线：拇指尖依次靠近 8 / 12 / 16 / 20
  - 五指散热：食指到小指并拢 / 张开交替
  - 摆手清障：手腕横向移动
  - 绕腕转盘：掌心中心围绕手腕转动
  - 点赞盖章：`Thumb_Up`
- 第三关 `fan` 和倒数第二关 `circle` 成功限制已降低
- 删除游戏页最底部外置进度条
- 摄像头/游戏区域放大，占用原底部进度条空间
- 视频底部「维修广播」改为顶部状态区同款米白卡片风格
- 保持真实摄像头玩法，不加入模拟按钮或模拟完成逻辑

## 已提交的主要文件

- `src/App.jsx`
- `src/App.css`

## 如何回到这一版

在项目文件夹打开终端：

```powershell
cd "E:\同济\实习工作相关\一分钟游戏"
git checkout codex/gameplay-upgrade
```

如果想精确回到这次提交：

```powershell
git checkout 5f9fc8b
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

## 验证记录

```powershell
npm run build
```

构建已通过。
