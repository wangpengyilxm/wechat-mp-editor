# 公众号智能助手

微信公众号智能排版与草稿同步工具。基于大模型生成文章、自动套用「极简文艺风」排版，并支持同步到公众号草稿箱。

## 功能特性

- **选题裂变**：输入主题，自动生成多个标题候选
- **一键成文**：正文初稿 → 段内标记 → 分镜设计 → 图文排版 → 配图情感语录 → 互动引导 → 自动保存
- **直接排版**：已有正文时，跳过初稿，从段内标记开始排版
- **极简文艺风**：统一排版样式（金句开篇、故事引入、小标题、引用、作者简介、往期推荐）
- **配图生成**：可选开启文生图，自动插入配图与图注
- **草稿同步**：配置公众号 AppID / AppSecret 后，一键同步到微信草稿箱
- **多模型支持**：自定义文本模型与图像模型 API（需先「测试连接」再保存）

## 技术栈

- 前端：React 19 + TypeScript + Vite 8 + Tailwind CSS 4
- 桌面端：Electron + electron-builder（Windows NSIS 安装包）
- 可选：Capacitor Android 构建

## 环境要求

- Node.js 18+
- npm 9+

## 快速开始

```bash
# 克隆仓库
git clone https://github.com/wangpengyilxm/wechat-mp-editor.git
cd wechat-mp-editor

# 安装依赖
npm install

# 本地开发（浏览器访问 http://localhost:5173）
npm run dev
```

## 首次配置

启动后点击 **模型配置**，填写：

| 配置项 | 说明 |
|--------|------|
| 文本模型 | API 地址、模型名、API Key |
| 图像模型 | 文生图接口（可选，关闭配图可不填） |
| 公众号链接 | AppID、AppSecret（用于草稿同步） |
| 提示词 | 可自定义各环节提示词 |

> 保存前必须先点击 **测试连接**，通过后方可 **保存信息**。  
> API Key 仅保存在本机浏览器 `localStorage`，不会写入仓库。

## 常用命令

| 命令 | 说明 |
|------|------|
| `npm run dev` | 开发模式 |
| `npm run build` | 构建前端产物到 `dist/` |
| `npm run preview` | 预览构建结果 |
| `npm run electron:dev` | Electron 本地运行 |
| `npm run pack` | 打包 Windows 安装包（输出到 `release/`） |
| `npm run pack:android` | 构建 Android APK（需 Android SDK） |

Windows 安装包文件名：`公众号智能助手-Setup-1.0.0.exe`

## 项目结构

```
├── electron/          # Electron 主进程
├── server/            # 开发服务器（微信草稿、图片代理等）
├── src/
│   ├── components/    # UI 组件
│   ├── config/        # 排版样式、工作流、提示词
│   ├── services/      # 文章生成、配图、草稿同步
│   └── utils/         # 排版引擎、存储、格式化
├── scripts/           # 构建脚本
└── android/           # Capacitor Android 工程
```

## 排版说明（极简文艺风）

文章结构固定为五段式：

1. 金句开篇 → `·····` 分隔
2. 故事引入
3. `｜小标题` × 2–3 段正文
4. `❙引用` × 1–2
5. `✦` → 作者简介 → `·` 往期推荐

正文字数建议 **1500–2400 字**，不足时会自动续写。

## 隐私与安全

- 请勿将 `.env`、API Key、公众号密钥提交到 Git
- `release/`、`node_modules/`、`dist/` 已在 `.gitignore` 中排除
- 克隆后需自行配置模型与公众号信息

## 许可证

私有项目，未经授权请勿商用或二次分发。

## 作者

王哥 · [GitHub](https://github.com/wangpengyilxm)
