import { isNotNil } from '@web-archive/shared/utils'
import type { TagBindRecord } from './tag'
import { generateUpdateTagSql } from './tag'
import type { Page } from '~/sql/types'
import { removeBucketFile } from '~/utils/file'

async function selectPageTotalCount(DB: D1Database, options: { folderId?: number, keyword?: string, tagId?: number }) {
  const { folderId, keyword, tagId } = options
  let sql = `
    SELECT COUNT(*) as count FROM pages
    WHERE isDeleted = 0
  `
  const bindParams: (number | string)[] = []

  if (isNotNil(folderId)) {
    sql += ` AND folderId = ?`
    bindParams.push(folderId)
  }

  if (keyword) {
    sql += ` AND title LIKE ?`
    bindParams.push(`${keyword}%`)
  }

  if (isNotNil(tagId)) {
    sql += ` AND id IN (SELECT value FROM json_each((SELECT pageIdDict FROM tags WHERE id = ?)))`
    bindParams.push(tagId)
  }

  const result = await DB.prepare(sql).bind(...bindParams).first()
  return result.count
}

async function selectAllPageCount(DB: D1Database) {
  const sql = `
    SELECT COUNT(*) as count FROM pages
    WHERE isDeleted = 0
  `
  const result = await DB.prepare(sql).first()
  return result.count
}

async function queryPage(DB: D1Database, options: { folderId?: number, pageNumber?: number, pageSize?: number, keyword?: string, tagId?: number }) {
  const { folderId, pageNumber, pageSize, keyword, tagId } = options
  let sql = `
    SELECT
      id,
      title,
      contentUrl,
      pageUrl,
      folderId,
      pageDesc,
      screenshotId,
      createdAt,
      updatedAt,
      isShowcased
    FROM pages
    WHERE isDeleted = 0
  `
  const bindParams: (number | string)[] = []

  if (isNotNil(folderId)) {
    console.log('folderId', folderId)
    sql += ` AND folderId = ?`
    bindParams.push(folderId)
  }

  if (keyword) {
    sql += ` AND title LIKE ?`
    bindParams.push(`%${keyword}%`)
  }

  if (isNotNil(tagId)) {
    sql += ` AND id IN (SELECT value FROM json_each((SELECT pageIdDict FROM tags WHERE id = ?)))`
    bindParams.push(tagId)
  }

  sql += ` ORDER BY createdAt DESC`

  if (isNotNil(pageNumber) && isNotNil(pageSize)) {
    sql += ` LIMIT ? OFFSET ?`
    bindParams.push(pageSize)
    bindParams.push((pageNumber - 1) * pageSize)
  }

  const sqlResult = await DB.prepare(sql).bind(...bindParams).all<Page>()
  if (sqlResult.error) {
    throw sqlResult.error
  }
  return sqlResult.results
}

async function selectDeletedPageTotalCount(DB: D1Database) {
  const sql = `
    SELECT COUNT(*) as count FROM pages
    WHERE isDeleted = 1
  `
  const result = await DB.prepare(sql).first()
  return result.count
}

async function queryDeletedPage(DB: D1Database) {
  const sql = `
    SELECT
      id,
      title,
      contentUrl,
      pageUrl,
      folderId,
      pageDesc,
      createdAt,
      updatedAt,
      deletedAt
    FROM pages
    WHERE isDeleted = 1
    ORDER BY updatedAt DESC
  `
  const result = await DB.prepare(sql).all<Page>()
  return result.results
}

async function deletePageById(DB: D1Database, pageId: number) {
  const sql = `
    UPDATE pages
    SET 
      isDeleted = 1,
      deletedAt = CURRENT_TIMESTAMP
    WHERE id = ?
  `
  const result = await DB.prepare(sql).bind(pageId).run()
  return result.success
}

async function restorePage(DB: D1Database, id: number) {
  const sql = `
    UPDATE pages
    SET 
      isDeleted = 0,
      deletedAt = NULL
    WHERE id = ?
  `
  const result = await DB.prepare(sql).bind(id).run()
  return result.success && result.meta.changes > 0
}

async function getPageById(DB: D1Database, options: { id: number, isDeleted?: boolean }) {
  const { id, isDeleted } = options
  const sql = `
    SELECT 
      *
    FROM pages
    WHERE id = ?
  `
  const page = await DB.prepare(sql).bind(id).first<Page>()
  if (isNotNil(isDeleted) && page?.isDeleted !== Number(isDeleted)) {
    return null
  }
  return page
}

interface InsertPageOptions {
  title: string
  pageDesc: string
  pageUrl: string
  contentUrl: string
  folderId: number
  screenshotId?: string
  isShowcased: boolean
}

async function insertPage(DB: D1Database, pageOptions: InsertPageOptions) {
  const { title, pageDesc, pageUrl, contentUrl, folderId, screenshotId = null, isShowcased } = pageOptions
  const insertResult = await DB
    .prepare(
      'INSERT INTO pages (title, pageDesc, pageUrl, contentUrl, folderId, screenshotId, isShowcased) VALUES (?, ?, ?, ?, ?, ?, ?)',
    )
    .bind(title, pageDesc, pageUrl, contentUrl, folderId, screenshotId, isShowcased)
    .run()
  return insertResult.meta.last_row_id
}

async function clearDeletedPage(DB: D1Database, BUCKET: R2Bucket) {
  const pageListSql = `
    SELECT * FROM pages WHERE isDeleted = 1
  `
  const deletePageResult = await DB.prepare(pageListSql).all<Page>()
  if (deletePageResult.error) {
    return false
  }
  const deleteBucketKeys = deletePageResult.results
    .map(page => [page.screenshotId, page.contentUrl])
    .flat()
    .filter(isNotNil)
  await removeBucketFile(BUCKET, deleteBucketKeys)

  const sql = `
    DELETE FROM pages WHERE isDeleted = 1
  `
  const result = await DB.prepare(sql).run()
  return result.success
}

async function queryRecentSavePage(DB: D1Database) {
  const sql = `
    SELECT * FROM pages WHERE isDeleted = 0 ORDER BY createdAt DESC LIMIT 20
  `
  const result = await DB.prepare(sql).all<Page>()
  return result.results
}

interface UpdatePageOptions {
  id: number
  folderId: number
  title: string
  isShowcased: boolean
  pageDesc: string
  pageUrl: string
  bindTags?: Array<TagBindRecord>
  unbindTags?: Array<TagBindRecord>
}

async function updatePage(DB: D1Database, options: UpdatePageOptions) {
  const { id, folderId, title, isShowcased, pageDesc, pageUrl, bindTags = [], unbindTags = [] } = options
  const sql = `
    UPDATE pages
    SET
      folderId = ?,
      title = ?,
      isShowcased = ?,
      pageDesc = ?,
      pageUrl = ?
    WHERE id = ?
  `
  const updateSql = DB.prepare(sql).bind(folderId, title, isShowcased, pageDesc, pageUrl, id)
  const updateSqlList = generateUpdateTagSql(DB, bindTags, unbindTags)
  const result = await DB.batch([updateSql, ...updateSqlList])
  return result.every(r => r.success)
}

async function queryAllPageIds(DB: D1Database, folderId: number) {
  const sql = `
    SELECT id FROM pages WHERE folderId = ? AND isDeleted = 0
  `
  const result = await DB.prepare(sql).bind(folderId).all()
  return result.results.map(r => r.id)
}

export {
  selectPageTotalCount,
  queryPage,
  selectDeletedPageTotalCount,
  queryDeletedPage,
  deletePageById,
  restorePage,
  getPageById,
  insertPage,
  clearDeletedPage,
  queryRecentSavePage,
  selectAllPageCount,
  updatePage,
  queryAllPageIds,
}
