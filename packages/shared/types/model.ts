type Page = {
  id: number
  title: string
  contentUrl: string
  pageUrl: string
  folderId: number
  pageDesc: string
  screenshotId: string | null
  isDeleted: number
  deletedAt: Date | null
  createdAt: Date
  updatedAt: Date
  isShowcased: number
}

type Folder = {
  id: number
  name: string
  isDeleted: number
  deletedAt: Date | null
  createdAt: Date
  updatedAt: Date
}

type Tag = {
  id: number
  name: string
  pageIds: Array<number>
  createdAt: Date
  updatedAt: Date
}

export type { Page, Folder, Tag }
