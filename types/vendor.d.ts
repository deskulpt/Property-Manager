declare module "node:sqlite" {
  export class DatabaseSync {
    constructor(path: string)
    exec(sql: string): void
    prepare(sql: string): {
      get(...params: unknown[]): unknown
      all(...params: unknown[]): unknown[]
      run(...params: unknown[]): { changes: number; lastInsertRowid: number | bigint }
    }
    /** Present at runtime; needed so closeDatabase() typechecks under this stub. */
    close(): void
  }
}

declare module "pannellum"
