# 🌟 Bran 的个人博客

一个基于 Next.js 构建的现代个人博客网站，用于分享技术、生活和思考。这是我的编程学习项目之一！

## ✨ 特性

- 📝 博客文章系统
- 🎨 现代化的 UI 设计
- 🌙 深色/浅色主题切换
- 📱 完全响应式设计
- ⚡ 快速的性能优化
- 🔐 用户认证系统
- 💬 评论功能
- 📧 邮件通知

## 🚀 快速开始

### 环境要求

- Node.js 18+
- pnpm

### 安装依赖

```bash
pnpm install
```

### 配置环境变量

复制 `.env.example` 到 `.env.local` 并填入你的配置：

```bash
cp .env.example .env.local
```

### 运行开发服务器

```bash
pnpm dev
```

打开 [http://localhost:3000](http://localhost:3000) 查看效果。

### 构建生产版本

```bash
pnpm build
pnpm start
```

## 🛠️ 技术栈

### 前端框架
- [Next.js](https://nextjs.org/) - React 框架
- [React](https://reactjs.org/) - UI 库
- [TypeScript](https://www.typescriptlang.org/) - 类型安全

### 样式与动画
- [Tailwind CSS](https://tailwindcss.com/) - CSS 框架
- [Framer Motion](https://www.framer.com/motion/) - 动画库
- [Radix UI](https://www.radix-ui.com/) - UI 组件库

### 后端服务
- [Clerk](https://clerk.com/) - 用户认证
- [Neon](https://neon.tech/) - 数据库
- [Drizzle ORM](https://orm.drizzle.team/) - ORM
- [Sanity](https://www.sanity.io/) - CMS
- [React Email](https://react.email) - 邮件模板
- [Resend](https://resend.com/) - 邮件服务

## 📚 项目结构

```
blog/
├── app/              # Next.js App Router
├── components/       # React 组件
├── lib/             # 工具函数
├── public/          # 静态资源
└── styles/          # 样式文件
```

## 📖 学习资源

这个项目基于 [Cali](https://cali.so) 的开源博客搭建。如果你想部署类似的网站，可以查看她的[官方教程](https://cali.so/blog/guide-for-cloning-my-site)。

## 🤝 贡献

欢迎提出建议和改进！

## 📄 许可证

MIT License



