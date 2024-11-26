## 开发者

[@Ray-D-Song](https://github.com/ray-d-song) 和 [@banzhe](https://github.com/banzhe)

<script setup>
import { VPTeamMembers } from 'vitepress/theme'

const members = [
  {
    avatar: 'https://www.github.com/ray-d-song.png',
    name: 'Ray-D-Song',
    title: 'Creator',
    links: [
      { icon: 'github', link: 'https://github.com/ray-d-song' },
    ]
  },
  {
    avatar: 'https://www.github.com/banzhe.png',
    name: 'banzhe',
    title: 'Creator',
    links: [
      { icon: 'github', link: 'https://github.com/banzhe' },
    ]
  }
]
</script>

<VPTeamMembers size="small" :members="members" />

## 为什么构建这个工具

我一直是 ArchiveBox 的忠实用户，ArchiveBox 是一个非常优秀的网页归档工具，但是它需要自己搭建服务，而且对服务器的要求比较高（需要用到无头浏览器），我之前用的是树莓派，性能不太行。  

而且 x 和 medium 这种网站，需要登录后才能访问，ArchiveBox 需要自己手动配置 token 或者 cookie，比较麻烦。

所以我就想，能不能有一个网页归档工具，不需要自己搭建服务，不需要用到无头浏览器，而且对服务器没有要求，最好还能跨平台，这样我就可以在任何地方，任何时间，任何设备上访问我的归档网页了。

## 贡献者

- [@b-yp](https://github.com/b-yp)
