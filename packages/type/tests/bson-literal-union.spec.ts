import { expect, test } from '@jest/globals';
import { getBSONDeserializer, getBSONSerializer } from '@deepkit/bson';

type Kind = 'a' | 'b';
type Document = { kind: Kind };

test('BSON rejects values outside a string literal union', () => {
    const serialize = getBSONSerializer<Document>();
    const deserialize = getBSONDeserializer<Document>();
    const roundTrip = (kind: string) => deserialize(serialize({ kind }));
    const input = 'c';
    let invalid: unknown;
    try {
        invalid = roundTrip(input);
    } catch (error) {
        invalid = error;
    }

    expect({
        'valid member survives': roundTrip('b'),
        'invalid value is rejected': invalid,
    }).toStrictEqual({
        'valid member survives': { kind: 'b' },
        'invalid value is rejected': expect.any(Error),
    });
});
