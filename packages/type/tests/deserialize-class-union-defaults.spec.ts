import { expect, test } from '@jest/globals';
import { deserialize, serialize } from '@deepkit/type';

class User { name: string = ''; }
class Order { total: number = 0; }
type UserOrOrder = User | Order;
type OrderOrUser = Order | User;

test('class unions preserve a member with one populated property in either order', () => {
    const objectAssignOrder = Object.assign(new Order(), { total: 3 });
    const objectAssignUser = Object.assign(new User(), { name: 'Alice' });
    const serializedObjectAssignOrder = serialize<UserOrOrder>(objectAssignOrder);
    const serializedObjectAssignUser = serialize<OrderOrUser>(objectAssignUser);
    const deserializedObjectAssignOrder = deserialize<UserOrOrder>(serializedObjectAssignOrder);
    const deserializedObjectAssignUser = deserialize<OrderOrUser>(serializedObjectAssignUser);

    const order = new Order();
    order.total = 3;
    const user = new User();
    user.name = 'Alice';
    const serializedOrder = serialize<UserOrOrder>(order);
    const serializedUser = serialize<OrderOrUser>(user);
    const deserializedOrder = deserialize<UserOrOrder>(serializedOrder);
    const deserializedUser = deserialize<OrderOrUser>(serializedUser);

    const expectedOrder = new Order();
    expectedOrder.total = 3;
    const expectedUser = new User();
    expectedUser.name = 'Alice';

    expect({
        'Object.assign order: serialized': serializedObjectAssignOrder,
        'Object.assign order: deserialized': deserializedObjectAssignOrder,
        'Object.assign user: serialized': serializedObjectAssignUser,
        'Object.assign user: deserialized': deserializedObjectAssignUser,
        'assigned order: serialized': serializedOrder,
        'assigned order: deserialized': deserializedOrder,
        'assigned user: serialized': serializedUser,
        'assigned user: deserialized': deserializedUser,
    }).toStrictEqual({
        'Object.assign order: serialized': { total: 3 },
        'Object.assign order: deserialized': expectedOrder,
        'Object.assign user: serialized': { name: 'Alice' },
        'Object.assign user: deserialized': expectedUser,
        'assigned order: serialized': { total: 3 },
        'assigned order: deserialized': expectedOrder,
        'assigned user: serialized': { name: 'Alice' },
        'assigned user: deserialized': expectedUser,
    });
});
