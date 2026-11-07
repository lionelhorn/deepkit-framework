import { expect, test } from '@jest/globals';

import { deserializeBSON } from '../src/bson-deserializer.js';
import { serializeBSON } from '../src/bson-serializer.js';

test('tuple round-trip preserves an undefined optional element before a supplied element', () => {
    type UpdateUserArgs = [id: number, name?: string, email?: string];
    type Call = { args: UpdateUserArgs };
    const value: Call = { args: [1, undefined, 'peter@example.com'] };
    // @deepkit/rpc sends method arguments as a tuple, so updateUser(1, undefined, 'peter@example.com') would set the name to the email.
    expect(deserializeBSON<Call>(serializeBSON<Call>(value))).toStrictEqual({
        args: [1, undefined, 'peter@example.com'],
    });
});
