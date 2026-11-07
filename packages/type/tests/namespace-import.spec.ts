import { expect, test } from '@jest/globals';
import { is, ReflectionKind, typeOf } from '@deepkit/type';
import * as models from './namespace-import-models.js';

test('namespace import types reflect and validate', () => {
    const user = { name: 'Alice' };

    expect({
        'interface kind': typeOf<models.User>().kind,
        'class kind': typeOf<models.UserRecord>().kind,
        'interface validates': is<models.User>(user),
    }).toEqual({
        'interface kind': ReflectionKind.objectLiteral,
        'class kind': ReflectionKind.class,
        'interface validates': true,
    });
});
