import { expect, test } from '@jest/globals';
import { is } from '@deepkit/type';
import { User as Account } from './renamed-import-models.js';

test('a renamed interface import validates', () => {
    expect(is<Account>({ name: 'Alice' })).toBe(true);
});
