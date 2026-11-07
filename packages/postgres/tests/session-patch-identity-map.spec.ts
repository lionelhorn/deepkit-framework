import { expect, test } from '@jest/globals';
import { Database, Query } from '@deepkit/orm';
import { PostgresDatabaseAdapter } from '@deepkit/postgres';
import { sql } from '@deepkit/sql';
import { entity, PrimaryKey } from '@deepkit/type';

type SessionPatchNoteId = number & PrimaryKey;

test('session patchOne updates an already loaded entity', async () => {
    @entity.name('session_patch_identity_map_note')
    class SessionPatchNote {
        constructor(public id: SessionPatchNoteId, public title: string) {
        }
    }

    const database = new Database(new PostgresDatabaseAdapter({
        host: 'localhost', port: 5432, database: 'postgres', user: 'postgres',
    }), [SessionPatchNote]);
    let tableCreated = false;

    try {
        await database.raw(sql`DROP TABLE IF EXISTS session_patch_identity_map_note`).execute();
        await database.migrate();
        tableCreated = true;

        const note = new SessionPatchNote(1, 'Draft');
        await database.persist(note);
        const session = database.createSession();
        const loaded = await session.query(SessionPatchNote).filter({ id: note.id }).findOne();
        const titleBeforePatch = loaded.title;

        const result = await session.query(SessionPatchNote).filter({ id: note.id }).patchOne({ title: 'Published' });
        const titleAfterPatch = loaded.title;
        const reloaded = await session.query(SessionPatchNote).filter({ id: note.id }).findOne();
        const stored = await database.query(SessionPatchNote).filter({ id: note.id }).findOne();

        expect({
            'no pre patch listener is registered': database.eventDispatcher.hasListeners(Query.onPatchPre),
            'no post patch listener is registered': database.eventDispatcher.hasListeners(Query.onPatchPost),
            'title before patch': titleBeforePatch,
            'rows modified': result.modified,
            'stored title': stored.title,
            'loaded title after patch': titleAfterPatch,
            'reload reuses the loaded entity': reloaded === loaded,
            'reloaded title': reloaded.title,
        }).toStrictEqual({
            'no pre patch listener is registered': false,
            'no post patch listener is registered': false,
            'title before patch': 'Draft',
            'rows modified': 1,
            'stored title': 'Published',
            'loaded title after patch': 'Published',
            'reload reuses the loaded entity': true,
            'reloaded title': 'Published',
        });
    } finally {
        try {
            if (tableCreated) await database.raw(sql`DROP TABLE IF EXISTS session_patch_identity_map_note`).execute();
        } finally {
            database.disconnect();
        }
    }
});
