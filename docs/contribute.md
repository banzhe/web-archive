# 贡献指南

## 技术栈
这是一个 TypeScript 全栈项目，部署在 Cloudflare Pages 上。  

### 前端和浏览器插件

- 框架：React
- 构建工具：Vite
- 样式：TailwindCSS
- UI 库：Shadcn UI

### 后端

- 框架：Hono
- 数据库：D1 + Raw SQL
- 存储：R2

## 环境搭建

首先需要安装 node.js (v20+) 和 pnpm。

### 服务开发

- Fork 代码后，使用 pnpm install 安装依赖。
- 执行 `pnpm init:local` 初始化本地环境。
- 执行 `pnpm dev:server` 启动后端服务。
- 执行 `pnpm dev:web` 启动前端服务。

### 浏览器插件开发

- 执行 `pnpm dev:plugin` 启动浏览器插件开发环境。

## 提交代码

目前没什么限制，分支名和 pr 标题尽量让我能看懂就行。