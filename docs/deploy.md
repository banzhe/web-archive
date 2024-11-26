## Github Actions 一键部署(推荐)  

[![Deploy to Cloudflare Workers](https://deploy.workers.cloudflare.com/button)](https://deploy.workers.cloudflare.com/?url=https://github.com/ray-d-song/web-archive)  

点击上面的按钮，按照 Cloudflare 的指引完成部署。  

> [!IMPORTANT]  
> R2 存储桶是需要在 Cloudflare 面板上手动开通的功能，请开通后再进行部署或者失败后 re-run Github Actions。
> 仅需开通 R2 功能，不需要创建存储桶，存储桶会在部署时自动创建。

> [!NOTE]  
> 创建令牌时，直接选择 `编辑 Cloudflare Workers` 模版，再手动添加 `D1 编辑` 权限。

![permissions](https://raw.githubusercontent.com/ray-d-song/web-archive/main/docs/imgs/perm_zh.png)

部署后请尽快登录，首个登录的用户会被设置为管理员。

## 命令部署

要求本地安装了 node 环境。  
命令部署时更新比较麻烦, 推荐实用 Github actions 部署。  
### 0. 下载代码
在 release 页面下载最新的 service.zip，解压后在根目录执行后续操作。

### 1. 登录
```bash
npx wrangler login
```

### 2. 创建 r2 存储桶
```bash
npx wrangler r2 bucket create web-archive
```
成功输出：
```bash
 ⛅️ wrangler 3.78.10 (update available 3.80.4)
--------------------------------------------------------

Creating bucket web-archive with default storage class set to Standard.
Created bucket web-archive with default storage class set to Standard.
```

### 3. 创建 d1 数据库
```bash
# 创建数据库
npx wrangler d1 create web-archive
```

执行输出：

```bash
 ⛅️ wrangler 3.78.10 (update available 3.80.4)
--------------------------------------------------------

✅ Successfully created DB 'web-archive' in region UNKNOWN
Created your new D1 database.

[[d1_databases]]
binding = "DB" # i.e. available in your Worker on env.DB
database_name = "web-archive"
database_id = "xxxx-xxxx-xxxx-xxxx-xxxx"
```
拷贝最后一行，替换 `wrangler.toml` 文件中 `database_id` 的值。  

然后执行初始化 sql:
```bash
npx wrangler d1 migrations apply web-archive --remote
```

成功输出：
```bash
🌀 Executing on remote database web-archive (7fd5a5ce-79e7-4519-a5fb-2f9a3af71064):
🌀 To execute on your local development database, remove the --remote flag from your wrangler command.
Note: if the execution fails to complete, your DB will return to its original state and you can safely retry.
├ 🌀 Uploading 7fd5a5ce-79e7-4519-a5fb-2f9a3af71064.0a40ff4fc67b5bdf.sql
│ 🌀 Uploading complete.
│
🌀 Starting import...
🌀 Processed 9 queries.
🚣 Executed 9 queries in 0.00 seconds (13 rows read, 13 rows written)
   Database is currently at bookmark 00000001-00000005-00004e2b-c977a6f2726e175274a1c75055c23607.
┌────────────────────────┬───────────┬──────────────┬────────────────────┐
│ Total queries executed │ Rows read │ Rows written │ Database size (MB) │
├────────────────────────┼───────────┼──────────────┼────────────────────┤
│ 9                      │ 13        │ 13           │ 0.04               │
└────────────────────────┴───────────┴──────────────┴────────────────────┘
```

### 4. 部署服务
```bash
# 部署服务
npx wrangler pages deploy
```

成功输出：
```bash
The project you specified does not exist: "web-archive". Would you like to create it?
❯ Create a new project
✔ Enter the production branch name: … dev
✨ Successfully created the 'web-archive' project.
▲ [WARNING] Warning: Your working directory is a git repo and has uncommitted changes

  To silence this warning, pass in --commit-dirty=true

🌎  Uploading... (3/3)

✨ Success! Uploaded 3 files (3.29 sec)

✨ Compiled Worker successfully
✨ Uploading Worker bundle
✨ Uploading _routes.json
🌎 Deploying...
✨ Deployment complete! Take a peek over at https://web-archive-xxxx.pages.dev
```

## 如何更新

使用 Github Actions 部署时，会自动创建一个 fork 仓库，更新只需要 sync fork 即可。

命令部署时，需要下载最新的代码并手动更新。