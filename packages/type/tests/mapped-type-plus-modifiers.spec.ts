import { expect, test } from '@jest/globals';
import { ReflectionClass } from '../src/reflection/reflection.js';
import { is } from '../src/typeguard.js';

test('mapped type with explicit plus modifiers', () => {
    interface User {
        name: string;
    }

    type Draft<T> = { +readonly [K in keyof T]+?: T[K] };
    type DraftUser = Draft<User>;

    const name = ReflectionClass.from<DraftUser>().getProperty('name');
    expect({
        'name is optional': name.isOptional(),
        'name is readonly': name.isReadonly(),
        'an empty draft is valid': is<DraftUser>({}),
    }).toEqual({
        'name is optional': true,
        'name is readonly': true,
        'an empty draft is valid': true,
    });
});
