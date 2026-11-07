import { expect, test } from '@jest/globals';
import { Database } from '@deepkit/orm';
import { PostgresDatabaseAdapter } from '@deepkit/postgres';
import { sql } from '@deepkit/sql';
import { entity, PrimaryKey, Unique } from '@deepkit/type';

test('migrate replaces a unique index when Unique moves to another column', async () => {
    @entity.name('account')
    class AccountV1 {
        constructor(
            public id: number & PrimaryKey,
            public email: string & Unique,
            public username: string,
        ) {
        }
    }

    @entity.name('account')
    class AccountV2 {
        constructor(
            public id: number & PrimaryKey,
            public email: string,
            public username: string & Unique,
        ) {
        }
    }

    type IndexRow = { indexdef: string };
    type MigrationMode = 'default' | 'dropIndex true';
    type Checks = Record<string, unknown>;
    const modes: MigrationMode[] = ['default', 'dropIndex true'];
    const checks: Checks = {};
    const previousDatabase = new Database(new PostgresDatabaseAdapter({
        host: 'localhost', database: 'postgres', user: 'postgres',
    }), [AccountV1]);
    const database = new Database(new PostgresDatabaseAdapter({
        host: 'localhost', database: 'postgres', user: 'postgres',
    }), [AccountV2]);
    const uniqueIndexColumns = async () => {
        const indexes = await database.raw<IndexRow>(sql`
            SELECT indexdef FROM pg_indexes
            WHERE schemaname = 'public' AND tablename = 'account'
              AND indexdef LIKE 'CREATE UNIQUE INDEX%' AND indexname NOT LIKE '%_pkey'
        `).find();
        return indexes.map(index => index.indexdef.replace(/^.*USING btree /, '')).sort();
    };
    const dropTable = () => previousDatabase.raw(sql`DROP TABLE IF EXISTS account`).execute();

    try {
        for (const mode of modes) {
            try {
                await dropTable();
                await previousDatabase.migrate();
                await previousDatabase.persist(new AccountV1(1, 'shared@example.com', 'alice'));

                const migration = mode === 'default' ? database.migrate() : database.migrate({ dropIndex: true });
                checks[`${mode}: migration error`] = await migration.then(
                    () => undefined, (error: unknown) => error instanceof Error ? error.message : String(error),
                );
                checks[`${mode}: unique index columns after migration`] = await uniqueIndexColumns();
                checks[`${mode}: inserting a duplicate email with another username`] = await database.persist(
                    new AccountV2(2, 'shared@example.com', 'bob'),
                ).then(() => undefined, (error: unknown) => String(error));
            } finally {
                await dropTable();
            }
        }

        expect(checks).toStrictEqual({
            'default: migration error': undefined,
            'default: unique index columns after migration': ['(username)'],
            'default: inserting a duplicate email with another username': undefined,
            'dropIndex true: migration error': undefined,
            'dropIndex true: unique index columns after migration': ['(username)'],
            'dropIndex true: inserting a duplicate email with another username': undefined,
        });
    } finally {
        previousDatabase.disconnect();
        database.disconnect();
    }
});
