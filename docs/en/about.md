## Developer

[@Ray-D-Song](https://github.com/ray-d-song) and [@banzhe](https://github.com/banzhe)

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

## Why build this tool

I have been a loyal user of ArchiveBox for a long time. ArchiveBox is a very excellent web archiving tool, but it requires self-hosting services and has high requirements for server performance (requires headless browser). I used to use a Raspberry Pi before, but the performance was not good.

And for websites like Zhihu and Medium, which require login to access, ArchiveBox needs to manually configure tokens or cookies, which is very troublesome.

So I thought, why not build a web archiving tool that doesn't require self-hosting services, doesn't require headless browser, and has no requirements for server performance, and is cross-platform, so I can access my archived web pages anywhere, anytime, and on any device.

## Contributors

- [@b-yp](https://github.com/b-yp)
