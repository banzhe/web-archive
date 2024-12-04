export type Bindings = {
  JWT_SECRET: string
  DB: D1Database
  KV: KVNamespace
  BUCKET: R2Bucket
  AI: Ai
}

export type HonoTypeUserInformation = {
  Bindings: Bindings
}
