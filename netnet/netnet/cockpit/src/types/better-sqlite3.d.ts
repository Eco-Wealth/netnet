declare module "better-sqlite3" {
  namespace BetterSqlite3 {
    interface RunResult {
      changes: number;
      lastInsertRowid: number | bigint;
    }

    interface Statement<Result = unknown> {
      run(bindParameters?: unknown): RunResult;
      get(bindParameters?: unknown): Result | undefined;
      all(bindParameters?: unknown): Result[];
    }

    interface Database {
      exec(sql: string): this;
      pragma(source: string): unknown;
      prepare<Result = unknown>(sql: string): Statement<Result>;
    }
  }

  interface DatabaseConstructor {
    new (filename: string, options?: Record<string, unknown>): BetterSqlite3.Database;
  }

  const Database: DatabaseConstructor;

  namespace Database {
    export type Database = BetterSqlite3.Database;
    export type Statement<Result = unknown> = BetterSqlite3.Statement<Result>;
    export type RunResult = BetterSqlite3.RunResult;
  }

  export default Database;
}
