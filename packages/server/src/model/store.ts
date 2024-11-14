import { createHash } from 'node:crypto'

function hashToken(token: string): string {
  return createHash('sha256').update(token).digest('hex')
}

async function checkAdminExist(DB: D1Database): Promise<boolean> {
  const result: { count: number } = await DB.prepare(`SELECT COUNT(*) as count FROM stores WHERE key = 'ADMIN_TOKEN'`).first()
  return result.count > 0
}

async function verifyAdminToken(DB: D1Database, token: string): Promise<'new' | 'fail' | 'reject' | 'accept'> {
  if (typeof token !== 'string' || token.length < 8)
    return 'reject'
  token = hashToken(token)
  const result: { count: number } = await DB.prepare(`SELECT COUNT(*) as count FROM stores WHERE key = 'ADMIN_TOKEN' AND value = ?`).bind(token).first()
  if (result.count > 0) {
    return 'accept'
  }
  const exist = await checkAdminExist(DB)
  if (!exist) {
    const success = await setAdminToken(DB, token)
    return success ? 'new' : 'fail'
  }
  return 'reject'
}

async function setAdminToken(DB: D1Database, token: string): Promise<boolean> {
  const exist = await checkAdminExist(DB)
  if (exist) {
    throw new Error('Admin token already exists')
  }
  const result = await DB.prepare(`INSERT INTO stores (key, value) VALUES ('ADMIN_TOKEN', ?)`).bind(token).run()
  return result.success
}

async function getShouldShowRecent(DB: D1Database): Promise<boolean> {
  const result = await DB.prepare(`SELECT value FROM stores WHERE key = 'config/should_show_recent'`).all<{ value: string }>()
  if (!result.success) {
    throw result.error
  }
  if (result.results.length === 0) {
    return true
  }
  return result.results[0].value === 'true'
}

async function setShouldShowRecent(DB: D1Database, value: boolean): Promise<boolean> {
  const bindValue = value ? 'true' : 'false'
  const insertSql = `INSERT INTO stores (key, value) VALUES ('config/should_show_recent', ?) ON CONFLICT(key) DO UPDATE SET value = ?`
  const result = await DB.prepare(insertSql).bind(bindValue, bindValue).run()
  if (!result.success) {
    throw result.error
  }
  return result.success
}

export {
  checkAdminExist,
  verifyAdminToken,
  setAdminToken,
  getShouldShowRecent,
  setShouldShowRecent,
}
