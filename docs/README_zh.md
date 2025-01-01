## Web Archive

![showcase](https://raw.githubusercontent.com/ray-d-song/web-archive/main/docs/imgs/homepage.png)

Web Archive 是一个网页归档工具，包含以下几个部分：

- 浏览器插件：将网页保存为网页快照，并上传到服务端。
- 服务端：   接收浏览器插件上传的快照，并存储在数据库和存储桶中。
- web 客户端： 查询快照并展示。

服务端基于 Cloudflare Worker 的全套服务，包含 D1 数据库、R2 存储桶。

## 功能

- 网页归档，搜索，分享
- 文件夹分类
- 移动端适配
- AI 生成 tag 分类
- 阅读模式

## 部署
可以参考 [部署文档](https://web-archive-docs.pages.dev/deploy.html) 进行部署。  
部署完成后，在浏览器插件中输入服务地址和 key 即可使用。

插件下载：
- [Chrome](https://chromewebstore.google.com/detail/web-archive/dfigobdhnhkkdniegjdagofhhhopjajb?hl=zh-CN&utm_source=ext_sidebar)
- [Firefox](https://addons.mozilla.org/zh-CN/firefox/addon/web-archive-ray-banzhe/)