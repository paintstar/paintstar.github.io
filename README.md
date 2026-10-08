# shin's blog

一个用 Astro 构建的静态个人博客。文章用 Markdown 编写，数学公式在构建时渲染成 KaTeX HTML，代码使用 Shiki 高亮。页面不需要 React，也不依赖第三方 CDN、统计脚本或主题插件。

## 本地开发

使用 Node.js 24 和 npm，在项目目录运行：

```sh
npm ci
npm run dev
```

`npm run build` 生成 `dist/`，`npm run preview` 预览生产版本，`npm run check` 检查 TypeScript 和 Astro 模板。

## 写文章

在 `src/content/posts/` 新建 `.md` 文件。文件名是文章地址的一部分，例如 `hello.md` 对应 `/posts/hello/`。原有文章继续使用原来的 ID，所以旧链接保持有效。

```md
---
title: '文章标题'
description: '一两句话介绍文章的内容。'
date: '2026-10-07T12:00:00+08:00'
topic: '算法题目'
categories: ['leetcode']
tags: ['leetcode', 'dp', '算法题']
---

这里是正文。行内公式使用 $e^{i\theta}$。

$$
\begin{bmatrix}
\cos\theta & -\sin\theta \\
\sin\theta & \cos\theta
\end{bmatrix}
$$
```

`topic` 是文章的主栏目，也会出现在分类页。`categories` 是可选的附加分类，一篇文章可以属于多个分类。题解统一使用 `topic: '算法题目'`；leetcode 题解再添加 `categories: ['leetcode']`，ICPC 真题添加 `categories: ['ICPC']`。算法原理放在“算法基础”，语言基础和命令练习放在“学习记录”，配置、开发与排错放在“工程实践”。标签描述来源和技术，例如 `ICPC`、`dp`、`算法题`，不要将文章标题当作标签。

其他可选字段：`updated` 是修改时间，`featured: true` 将文章显示在首页精选位置，`draft: true` 隐藏草稿。栏目及分类计数从完整文章库生成，再按 `src/site.mjs` 的 `pageSize` 分页，默认每页 10 篇。首页、归档、年份、月份、分类和标签文章列表都支持分页；序号在当前文章集合中从 01 开始，翻页后连续编号。首页精选的向量图可以在 `src/components/Rotation.astro` 修改。

文章图片放在 `public/images/`，Markdown 使用 `/images/文件名.png`。代码块注明语言，例如 `python`、`cpp`、`bash`。文章目录、阅读时间、标签页、归档、RSS、搜索索引和 sitemap 自动生成。公式包含语法错误时会中止构建，避免带着坏公式发布。

## 修改外观与信息

`src/site.mjs` 集中管理站点地址、部署子路径、作者、默认主题、栏目顺序和每页文章数量。`src/styles/global.css` 管理页面外观，`src/styles/prose.css` 管理正文排版。界面提供 GitHub 深色、浅色和森绿三种主题，选择后保存在当前浏览器。

项目介绍集中保存在 `src/content/projects.json`，修改名称、简介、功能、技术栈或 GitHub 链接后，项目页同步更新。随记在 `src/content/notes.json`。

## 从 CSDN 导入文章

运行 `npm run import:csdn -- 文章列表网址` 可导入该作者列表中公开可读取的文章。需要系统提供 `curl`。导入会保留原始发布时间、修改时间、标题、代码和公式，将配图保存到 `public/images/posts/`，并更新作者文章之间的链接。分类根据标题和题目链接初步整理，过滤标题标签和泛化标签，并统一常见技术标签；导入后仍需按正文核对解法与竞赛来源，确认 ICPC 真题的附加分类。已有 Markdown 文件不会覆盖。

缓存与进度保存在 `output/csdn-import/`，不提交到仓库。重新运行命令可利用已下载内容继续导入；如果 CSDN 对请求头有限制，可通过 `CSDN_USER_AGENT` 设置浏览器请求头。导入完成后运行 `npm run build` 检查生成结果。

## 发布到 GitHub Pages

仓库 Settings → Pages → Build and deployment 的 Source 选择 **GitHub Actions**。提交到默认分支后，`.github/workflows/deploy.yml` 自动构建并发布 `dist/`；也可以在 Actions 手动运行。无需安装或配置 Hexo。不要把 `dist/` 或 `node_modules/` 提交到仓库。

迁移到其他域名时修改 `src/site.mjs` 的 `url`；如果部署到仓库子路径，设置 `base: '/仓库名/'`。目录路径基于项目，构建不依赖本机的绝对路径。
