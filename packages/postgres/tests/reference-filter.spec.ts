import { expect, test } from '@jest/globals';
import { Database, FilterQuery } from '@deepkit/orm';
import { PostgresDatabaseAdapter } from '@deepkit/postgres';
import { sql } from '@deepkit/sql';
import { AutoIncrement, entity, PrimaryKey, Reference } from '@deepkit/type';

test('reference filters preserve numeric keys, key operators, and nested fields', async () => {
    @entity.name('author')
    class Author {
        id: number & PrimaryKey & AutoIncrement = 0;

        constructor(public name: string) {
        }
    }

    @entity.name('book')
    class Book {
        id: number & PrimaryKey & AutoIncrement = 0;

        constructor(public title: string, public author: Author & Reference) {
        }
    }

    // What an app gets from a request, never checked against FilterQuery<Book>.
    type UntypedRequestFilter = Record<string, unknown>;
    const adapter = new PostgresDatabaseAdapter({
        host: 'localhost', port: 5432, user: 'postgres', database: 'postgres',
    });
    const database = new Database(adapter, [Author, Book]);
    const selectSql = (filter: FilterQuery<Book> | UntypedRequestFilter) => {
        const { sql, params } = adapter.createSelectSql(database.query(Book).filter(filter));
        return { sql, params };
    };
    const findBookTitles = async (filter: FilterQuery<Book>) => {
        const query = database.query(Book);
        const filtered = query.filter(filter);
        const books = await filtered.find();
        const titles = books.map(book => book.title);
        return titles.sort();
    };
    const findBookTitlesFromRequest = async (filter: UntypedRequestFilter) => {
        const query = database.query(Book);
        const filtered = query.filter(filter);
        const books = await filtered.find();
        const titles = books.map(book => book.title);
        return titles.sort();
    };

    try {
        await database.raw(sql`DROP TABLE IF EXISTS book, author`).execute();
        try {
            await database.migrate();
            const alice = new Author('alice');
            const bob = new Author('bob');
            await database.persist(alice, bob);
            await database.persist(new Book('a1', alice), new Book('b1', bob));

            const authorReferenceFilter: FilterQuery<Book> = { author: database.getReference(Author, bob.id) };
            const authorIdObjectFilter: UntypedRequestFilter = { author: { id: bob.id } };
            const authorIdFilter: UntypedRequestFilter = { author: bob.id };
            const authorNotIdFilter: UntypedRequestFilter = { author: { $ne: bob.id } };
            const authorInIdsFilter: UntypedRequestFilter = { author: { $in: [bob.id] } };
            const authorNameFilter: UntypedRequestFilter = { author: { name: bob.name } };

            for (const { label, filter } of [
                { label: 'getReference', filter: authorReferenceFilter },
                { label: '{ id }', filter: authorIdObjectFilter },
                { label: 'raw id', filter: authorIdFilter },
                { label: '$ne', filter: authorNotIdFilter },
                { label: '$in', filter: authorInIdsFilter },
                { label: '{ name }', filter: authorNameFilter },
            ]) {
                const { sql, params } = selectSql(filter);
                console.log(label, sql, params);
            }

            const checks = {
                'typed: reference to bob selects bob books': await findBookTitles(authorReferenceFilter),
                'untyped: primary key object selects bob books': await findBookTitlesFromRequest(authorIdObjectFilter),
                'untyped: numeric primary key selects bob books': await findBookTitlesFromRequest(authorIdFilter),
                'untyped: not equal to primary key excludes bob books': await findBookTitlesFromRequest(authorNotIdFilter),
                'untyped: in primary keys selects bob books': await findBookTitlesFromRequest(authorInIdsFilter),
                'untyped: nested non key field selects bob books': await findBookTitlesFromRequest(authorNameFilter),
            };
            expect(checks).toEqual({
                'typed: reference to bob selects bob books': ['b1'],
                'untyped: primary key object selects bob books': ['b1'],
                'untyped: numeric primary key selects bob books': ['b1'],
                'untyped: not equal to primary key excludes bob books': ['a1'],
                'untyped: in primary keys selects bob books': ['b1'],
                'untyped: nested non key field selects bob books': ['b1'],
            });
        } finally {
            await database.raw(sql`DROP TABLE IF EXISTS book, author`).execute();
        }
    } finally {
        database.disconnect();
    }
});
