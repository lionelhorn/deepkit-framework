import { expect, test } from '@jest/globals';
import { sql, SqlPlaceholderStrategy } from '@deepkit/sql';
import { SQLitePlatform } from '../src/sqlite-platform.js';

test('sql template with a nested fragment preserves SQL and parameters', () => {
    const byName = (name: string) => sql`name = ${name}`;
    const query = sql`SELECT * FROM "user" WHERE ${byName('bob')}`;
    expect(query.convertToSQL(new SQLitePlatform(), new SqlPlaceholderStrategy())).toStrictEqual({
        sql: 'SELECT * FROM "user" WHERE name = ?',
        params: ['bob'],
    });
});
