import { expect, test } from '@jest/globals';
import { Index, ReflectionClass, Unique } from '@deepkit/type';

type UniqueEmail = string & Unique;
type UniqueThenIndexEmail = string & Unique & Index;
type IndexThenUniqueEmail = string & Index & Unique;
type UniqueIndexEmail = string & Index<{ unique: true }>;

class User {
    uniqueOnly: UniqueEmail = '';
    uniqueThenIndex: UniqueThenIndexEmail = '';
    indexThenUnique: IndexThenUniqueEmail = '';
    uniqueIndexOption: UniqueIndexEmail = '';
}

test('index annotations preserve uniqueness in either order', () => {
    const user = ReflectionClass.from(User);

    expect({
        'Unique alone is unique': user.getProperty('uniqueOnly').getIndex(),
        'Unique followed by Index is unique': user.getProperty('uniqueThenIndex').getIndex(),
        'Index followed by Unique is unique': user.getProperty('indexThenUnique').getIndex(),
        'Index with unique option is unique': user.getProperty('uniqueIndexOption').getIndex(),
    }).toStrictEqual({
        'Unique alone is unique': { unique: true },
        'Unique followed by Index is unique': { unique: true },
        'Index followed by Unique is unique': { unique: true },
        'Index with unique option is unique': { unique: true },
    });
});
