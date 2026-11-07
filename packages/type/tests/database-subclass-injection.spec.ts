import { expect, test } from '@jest/globals';
import { App } from '@deepkit/app';
import { Database, MemoryDatabaseAdapter } from '@deepkit/orm';

test('a Database dependency receives the provided subclass instance', () => {
    class AppDatabase extends Database {
        constructor() {
            super(new MemoryDatabaseAdapter(), []);
        }
    }

    class DatabaseService {
        constructor(public db: Database) {}
    }

    const app = new App({ providers: [AppDatabase, DatabaseService] });

    expect(app.get(DatabaseService).db).toBe(app.get(AppDatabase));
});
