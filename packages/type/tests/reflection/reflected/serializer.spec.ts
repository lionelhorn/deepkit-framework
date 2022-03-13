/*
 * Deepkit Framework
 * Copyright (c) Deepkit UG, Marc J. Schmidt
 *
 * This program is free software: you can redistribute it and/or modify
 * it under the terms of the MIT License.
 *
 * You should have received a copy of the MIT License along with this program.
 */
import { expect, test } from '@jest/globals';
import { reflect, ReflectionClass } from '../../../src/reflection/reflection';
import { AutoIncrement, BackReference, Embedded, Excluded, Group, int8, integer, PrimaryKey, Reference, ReflectionKind } from '../../../src/reflection/type';
import { createSerializeFunction, getSerializeFunction, serializer } from '../../../src/serializer';
import { cast, deserialize, serialize } from '../../../src/serializer-facade';
import { getClassName } from '@deepkit/core';
import { t } from '../../../src/decorator';
import { ValidationError } from '../../../src/validator';

test('deserializer', () => {
    class User {
        username!: string;
        created!: Date;
    }

    const fn = createSerializeFunction(reflect(User), serializer.deserializeRegistry);
    const o = fn({ username: 'Peter', created: '2021-10-19T00:22:58.257Z' });
    expect(o).toEqual({
        username: 'Peter',
        created: new Date('2021-10-19T00:22:58.257Z')
    });
});

test('cast interface', () => {
    interface User {
        username: string;
        created: Date;
    }

    const user = cast<User>({ username: 'Peter', created: '2021-10-19T00:22:58.257Z' });
    expect(user).toEqual({
        username: 'Peter',
        created: new Date('2021-10-19T00:22:58.257Z')
    });
});

test('cast class', () => {
    class User {
        created: Date = new Date;

        constructor(public username: string) {
        }
    }

    const user = cast<User>({ username: 'Peter', created: '2021-10-19T00:22:58.257Z' });
    expect(user).toBeInstanceOf(User);
    expect(user).toEqual({
        username: 'Peter',
        created: new Date('2021-10-19T00:22:58.257Z')
    });
});

test('groups', () => {
    class Settings {
        weight: string & Group<'privateSettings'> = '12g';
        color: string = 'red';
    }

    class User {
        id: number = 0;
        password: string & Group<'b'> = '';
        settings: Settings = new Settings;

        constructor(public username: string & Group<'a'>) {
        }

    }

    const user = new User('peter');
    expect(serialize<User>(user)).toEqual({ id: 0, username: 'peter', password: '', settings: { weight: '12g', color: 'red' } });
    expect(serialize<User>(user, { groups: ['a'] })).toEqual({ username: 'peter' });
    expect(serialize<User>(user, { groups: ['b'] })).toEqual({ password: '' });
    expect(serialize<User>(user, { groups: ['a', 'b'] })).toEqual({ username: 'peter', password: '' });
    expect(serialize<User>(user, { groupsExclude: ['b'] })).toEqual({ id: 0, username: 'peter', settings: { weight: '12g', color: 'red' } });
    expect(serialize<User>(user, { groupsExclude: ['privateSettings'] })).toEqual({ id: 0, username: 'peter', password: '', settings: { color: 'red' } });
});

test('default value', () => {
    class User {
        logins: number = 0;
    }

    {
        const user = cast<User>({});
        expect(user).toBeInstanceOf(User);
        expect(user).toEqual({
            logins: 0
        });
    }

    {
        const user = cast<User>({ logins: 2 });
        expect(user).toEqual({
            logins: 2
        });
    }
});

test('optional value', () => {
    class User {
        logins?: number;
    }

    {
        const user = cast<User>({});
        expect(user).toEqual({
            logins: undefined
        });
    }

    {
        const user = cast<User>({ logins: 2 });
        expect(user).toEqual({
            logins: 2
        });
    }
});

test('optional default value', () => {
    class User {
        logins?: number = 2;
    }

    {
        const user = cast<User>({});
        expect(user).toEqual({
            logins: 2
        });
    }

    {
        const user = cast<User>({ logins: 2 });
        expect(user).toEqual({
            logins: 2
        });
    }

    {
        const user = cast<User>({ logins: null });
        expect(user).toEqual({
            logins: undefined
        });
    }

    {
        const user = cast<User>({ logins: undefined });
        expect(user).toEqual({
            logins: undefined
        });
    }
});

test('cast primitives', () => {
    expect(cast<string>('123')).toBe('123');
    expect(cast<string>(123)).toBe('123');
    expect(cast<number>(123)).toBe(123);
    expect(cast<number>('123')).toBe(123);

    expect(cast<Date>('2021-10-19T00:22:58.257Z')).toEqual(new Date('2021-10-19T00:22:58.257Z'));
    expect(serialize<Date>(new Date('2021-10-19T00:22:58.257Z'))).toEqual('2021-10-19T00:22:58.257Z');
});

test('cast integer', () => {
    expect(cast<integer>(123.456)).toBe(123);
    expect(cast<int8>(1000)).toBe(128);
});

test('tuple 2', () => {
    const value = cast<[string, number]>([12, '13']);
    expect(value).toEqual(['12', 13]);
});

test('tuple rest', () => {
    {
        const value = cast<[...string[], number]>([12, '13']);
        expect(value).toEqual(['12', 13]);
    }
    {
        const value = cast<[...string[], number]>([12, 13, '14']);
        expect(value).toEqual(['12', '13', 14]);
    }
    {
        const value = cast<[boolean, ...string[], number]>([1, 12, '13']);
        expect(value).toEqual([true, '12', 13]);
    }
    {
        const value = cast<[boolean, ...string[], number]>([1, 12, 13, '14']);
        expect(value).toEqual([true, '12', '13', 14]);
    }
    {
        const value = serialize<[boolean, ...string[], number]>([true, '12', 13]);
        expect(value).toEqual([true, '12', 13]);
    }
});

test('set', () => {
    {
        const value = cast<Set<string>>(['a', 'a', 'b']);
        expect(value).toEqual(new Set(['a', 'b']));
    }
    {
        const value = cast<Set<string>>(['a', 2, 'b']);
        expect(value).toEqual(new Set(['a', '2', 'b']));
    }
    {
        const value = serialize<Set<string>>(new Set(['a', 'b']));
        expect(value).toEqual(['a', 'b']);
    }
});

test('map', () => {
    {
        const value = cast<Map<string, number>>([['a', 1], ['a', 2], ['b', 3]]);
        expect(value).toEqual(new Map([['a', 2], ['b', 3]]));
    }
    {
        const value = cast<Map<string, number>>([['a', 1], [2, '2'], ['b', 3]]);
        expect(value).toEqual(new Map([['a', 1], ['2', 2], ['b', 3]]));
    }
    {
        const value = serialize<Map<string, number>>(new Map([['a', 2], ['b', 3]]));
        expect(value).toEqual([['a', 2], ['b', 3]]);
    }
});

test('number', () => {
    expect(cast<number>(1)).toBe(1);
    expect(cast<number>(-1)).toBe(-1);
    expect(cast<number>(true)).toBe(1);
    expect(cast<number>(false)).toBe(0);
    expect(cast<number>('1')).toBe(1);
    expect(cast<number>('-1')).toBe(-1);
});

test('union string number', () => {
    expect(cast<string | number>('a')).toEqual('a');
    expect(cast<string | number>(2)).toEqual(2);

    expect(cast<string | integer>(2)).toEqual(2);
    expect(cast<string | integer>('3')).toEqual('3');

    expect(cast<string | integer>(2.2)).toEqual(2);
    expect(cast<string | integer>('2.2')).toEqual('2.2');

    expect(cast<string | integer>(false)).toEqual('false');
    expect(cast<string | integer>(true)).toEqual('true');
});

test('union boolean number', () => {
    expect(cast<boolean | number>(2)).toEqual(2);
    expect(cast<boolean | number>(1)).toEqual(1);
    expect(cast<boolean | number>(0)).toEqual(0);
    expect(cast<boolean | number>(false)).toEqual(false);
    expect(cast<boolean | number>(true)).toEqual(true);
});

test('union loose string number', () => {
    expect(cast<string | number>('a', { loosely: true })).toEqual('a');
    expect(cast<string | number>(2, { loosely: true })).toEqual(2);
    expect(cast<string | number>(-2, { loosely: true })).toEqual(-2);

    expect(cast<string | integer>(2, { loosely: true })).toEqual(2);
    expect(cast<string | integer>('3', { loosely: true })).toEqual(3);

    expect(cast<string | integer>(2.2, { loosely: true })).toEqual(2);
    expect(cast<string | integer>(-2.2, { loosely: true })).toEqual(-2);
    expect(cast<string | integer>('2.2', { loosely: true })).toEqual(2);
    expect(cast<string | integer>(false)).toEqual('false');
    expect(cast<string | integer>(true)).toEqual('true');
});

test('union loose string boolean', () => {
    expect(cast<string | boolean>('a', { loosely: true })).toEqual('a');
    expect(cast<string | boolean>(1, { loosely: true })).toEqual(true);
    expect(cast<string | boolean>(0, { loosely: true })).toEqual(false);
    expect(cast<string | boolean>(-1, { loosely: true })).toEqual('-1');
    expect(cast<string | boolean>(2, { loosely: true })).toEqual('2');
    expect(cast<string | boolean>('true', { loosely: true })).toEqual(true);
    expect(cast<string | boolean>('true2', { loosely: true })).toEqual('true2');
});

test('union loose number boolean', () => {
    expect(cast<number | boolean>('a', { loosely: true })).toEqual(undefined);
    expect(cast<string | boolean>(1, { loosely: true })).toEqual(true);
    expect(cast<number | boolean>(1, { loosely: true })).toEqual(1);
    expect(cast<string | boolean>('1', { loosely: true })).toEqual(true);
    expect(cast<number | boolean>('1', { loosely: true })).toEqual(1);
    expect(cast<number | boolean>('1')).toEqual(1);
    expect(cast<string | boolean>(0, { loosely: true })).toEqual(false);
    expect(cast<number | boolean>(0, { loosely: true })).toEqual(0);
    expect(cast<number | boolean>(-1, { loosely: true })).toEqual(-1);
    expect(cast<number | boolean>(2, { loosely: true })).toEqual(2);
    expect(cast<number | boolean>('2', { loosely: true })).toEqual(2);
    expect(cast<number | boolean>('true', { loosely: true })).toEqual(true);
    expect(cast<number | boolean>('true')).toEqual(undefined);
    expect(cast<number | boolean>('true2', { loosely: true })).toEqual(undefined);
});

test('union string date', () => {
    expect(cast<string | Date>('a')).toEqual('a');
    expect(cast<string | Date>('2021-11-24T16:21:13.425Z')).toBeInstanceOf(Date);
    expect(cast<string | Date>(1637781902866)).toBeInstanceOf(Date);
    expect(cast<string | Date>('1637781902866')).toBe('1637781902866');
});

test('union string bigint', () => {
    expect(cast<string | bigint>('a')).toEqual('a');
    expect(cast<string | bigint>(2n)).toEqual(2n);
    expect(cast<string | bigint>(2)).toEqual(2n);
    expect(cast<string | bigint>('2')).toEqual('2');
    expect(cast<string | bigint>('2a')).toEqual('2a');
});

test('union loose string bigint', () => {
    expect(cast<string | bigint>('a', { loosely: true })).toEqual('a');
    expect(cast<string | bigint>(2n, { loosely: true })).toEqual(2n);
    expect(cast<string | bigint>(2, { loosely: true })).toEqual(2n);
    expect(cast<string | bigint>('2', { loosely: true })).toEqual(2n);
    expect(cast<string | bigint>('2a', { loosely: true })).toEqual('2a');
});

test('literal', () => {
    expect(cast<'a'>('a')).toEqual('a');
    expect(serialize<'a'>('a')).toEqual('a');
    expect(cast<'a'>('b')).toEqual('a');
    expect(cast<'a'>(123)).toEqual('a');
    expect(cast<1>(123)).toEqual(1);
    expect(cast<1>('123')).toEqual(1);
    expect(cast<true>('123')).toEqual(true);
    expect(cast<1n>('123')).toEqual(1n);
    expect(cast<1n>('123')).toEqual(1n);

    expect(serialize<1n>(1n)).toEqual(1n);
});

test('union literal', () => {
    expect(cast<'a' | number>('a')).toEqual('a');
    expect(cast<'a' | number>(23)).toEqual(23);
    expect(serialize<'a' | number>('a')).toEqual('a');
    expect(serialize<'a' | number>(23)).toEqual(23);

    expect(cast<3 | number>(23)).toEqual(23);
    expect(cast<3 | number>(3)).toEqual(3);
    expect(serialize<3 | number>(23)).toEqual(23);
    expect(serialize<3 | number>(3)).toEqual(3);

    expect(cast<3 | boolean>(3)).toEqual(3);
    expect(cast<true | boolean>(true)).toEqual(true);
    expect(cast<true | boolean>(false)).toEqual(false);
    expect(cast<false | boolean>(true)).toEqual(true);
    expect(cast<false | boolean>(false)).toEqual(false);
});

test('union primitive and class', () => {
    class User {
        id!: number;
    }

    expect(cast<number | User>(2)).toEqual(2);
    expect(cast<number | User>('2')).toEqual(2);
    expect(cast<number | User>({ id: 23 })).toEqual({ id: 23 });
    expect(cast<number | User>({ id: 23 })).toBeInstanceOf(User);
    expect(cast<number | User>('2asd')).toEqual(undefined);

    expect(serialize<number | User>(2)).toEqual(2);
    expect(serialize<number | User>({ id: 23 })).toEqual({ id: 23 });
    expect(serialize<number | User>({ id: 23 })).toBeInstanceOf(Object);
});

test('union multiple classes', () => {
    class User {
        id!: number;
        username!: string;
    }

    class Picture {
        id!: number;
        path!: string;
    }

    expect(cast<Picture | User>({ id: 23, username: 'peter' })).toEqual({ id: 23, username: 'peter' });
    expect(cast<Picture | User>({ id: 23, username: 'peter' })).toBeInstanceOf(User);

    expect(cast<Picture | User>({ id: 23, path: 'src/path' })).toEqual({ id: 23, path: 'src/path' });
    expect(cast<Picture | User>({ id: 23, path: 'src/path' })).toBeInstanceOf(Picture);

    expect(cast<number | User>(23)).toEqual(23);
    expect(cast<number | User>({ id: 23, username: 'peter' })).toBeInstanceOf(User);

    expect(serialize<Picture | User>({ id: 23, username: 'peter' })).toEqual({ id: 23, username: 'peter' });
    expect(serialize<Picture | User>({ id: 23, username: 'peter' })).toBeInstanceOf(Object);

    expect(serialize<Picture | User>({ id: 23, path: 'src/path' })).toEqual({ id: 23, path: 'src/path' });
    expect(serialize<Picture | User>({ id: 23, path: 'src/path' })).toBeInstanceOf(Object);

    expect(serialize<number | User>(23)).toEqual(23);
    expect(serialize<number | User>({ id: 23, username: 'peter' })).toBeInstanceOf(Object);
    expect(serialize<number | User>({ id: 23, username: 'peter' })).toEqual({ id: 23, username: 'peter' });
});

test('brands', () => {
    expect(cast<number & PrimaryKey>(2)).toEqual(2);
    expect(cast<number & PrimaryKey>('2')).toEqual(2);

    expect(serialize<number & PrimaryKey>(2)).toEqual(2);
});

test('throw', () => {
    expect(() => cast<number>('123abc')).toThrow('Cannot convert 123abc to number');
    expect(() => cast<{ a: string }>(false)).toThrow('Cannot convert false to {a: string}');
    expect(() => cast<{ a: number }>({ a: 'abc' })).toThrow('Cannot convert abc to number');
    expect(() => cast<{ a: { b: number } }>({ a: 'abc' })).toThrow('Cannot convert abc to {b: number}');
    expect(() => cast<{ a: { b: number } }>({ a: { b: 'abc' } })).toThrow('Cannot convert abc to number');
});

test('index signature ', () => {
    interface BagOfNumbers {
        [name: string]: number;
    }

    interface BagOfStrings {
        [name: string]: string;
    }

    expect(cast<BagOfNumbers>({ a: 1 })).toEqual({ a: 1 });
    expect(cast<BagOfNumbers>({ a: 1, b: 2 })).toEqual({ a: 1, b: 2 });
    expect(() => cast<BagOfNumbers>({ a: 'b' })).toThrow(ValidationError as any);
    expect(() => cast<BagOfNumbers>({ a: 'b' })).toThrow('Cannot convert b to number');
    expect(cast<BagOfNumbers>({ a: '1' })).toEqual({ a: 1 });
    expect(() => cast<BagOfNumbers>({ a: 'b', b: 'c' })).toThrow(ValidationError as any);
    expect(() => cast<BagOfNumbers>({ a: 'b', b: 'c' })).toThrow('Cannot convert b to number');

    expect(cast<BagOfStrings>({ a: 1 })).toEqual({ a: '1' });
    expect(cast<BagOfStrings>({ a: 1, b: 2 })).toEqual({ a: '1', b: '2' });
    expect(cast<BagOfStrings>({ a: 'b' })).toEqual({ a: 'b' });
    expect(cast<BagOfStrings>({ a: 'b', b: 'c' })).toEqual({ a: 'b', b: 'c' });

    expect(serialize<BagOfNumbers>({ a: 1 })).toEqual({ a: 1 });
    expect(serialize<BagOfStrings>({ a: '1' })).toEqual({ a: '1' });
});

test('exclude', () => {
    class User {
        username!: string;

        password?: string & Excluded<'*'>;
    }

    const reflection = ReflectionClass.from(User);
    expect(reflection.getProperty('password')?.getExcluded()).toEqual(['*']);

    expect(cast<User>({ username: 'peter', password: 'nope' })).toEqual({ username: 'peter', password: undefined });
    expect(serialize<User>({ username: 'peter', password: 'nope' })).toEqual({ username: 'peter', password: undefined });
});

test('regexp direct', () => {
    expect(cast<RegExp>(/abc/).toString()).toEqual('/abc/');
    expect(cast<RegExp>('/abc/').toString()).toEqual('/abc/');
    expect(cast<RegExp>('abc').toString()).toEqual('/abc/');
    expect(serialize<RegExp>(/abc/).toString()).toEqual('/abc/');
});

test('regexp union', () => {
    expect(cast<string | { $regex: RegExp }>({ $regex: /abc/ })).toEqual({ $regex: /abc/ });
    expect(cast<Record<string, string | { $regex: RegExp }>>({ a: { $regex: /abc/ } })).toEqual({ a: { $regex: /abc/ } });
});

test('index signature with template literal', () => {
    type a1 = { [index: `a${number}`]: number };
    expect(cast<a1>({ a123: '123' })).toEqual({ a123: 123 });
    expect(cast<a1>({ a123: '123', b: 123 })).toEqual({ a123: 123, b: undefined });
    expect(cast<a1>({ a123: '123', a124: 123 })).toEqual({ a123: 123, a124: 123 });
});

test('class circular reference', () => {
    class User {
        constructor(public username: string) {
        }

        manager?: User;
    }

    const res = cast<User>({ username: 'Horst', manager: { username: 'Peter' } });
    expect(res).toEqual({ username: 'Horst', manager: { username: 'Peter' } });
    expect(res).toBeInstanceOf(User);
    expect(res.manager).toBeInstanceOf(User);
});

test('class with reference', () => {
    class User {
        id: number & PrimaryKey = 0;

        constructor(public username: string) {
        }
    }

    interface Team {
        lead: User & Reference;
    }

    {
        const res = cast<Team>({ lead: { id: 1, username: 'Peter' } });
        expect(res).toEqual({ lead: { id: 1, username: 'Peter' } });
        expect(res.lead).toBeInstanceOf(User);
    }

    {
        const res = cast<Team>({ lead: { username: 'Peter' } });
        expect(res).toEqual({ lead: { id: 0, username: 'Peter' } });
        expect(res.lead).toBeInstanceOf(User);
    }

    {
        const res = cast<Team>({ lead: 23 });
        expect(res).toEqual({ lead: { id: 23 } });
        expect(res.lead).toBeInstanceOf(User);
        expect(getClassName(res.lead)).toBe('UserReference');
    }
});

test('class with back reference', () => {
    class User {
        id: number & PrimaryKey = 0;

        constructor(public username: string) {
        }
    }

    interface Team {
        leads: User[] & BackReference;
    }

    const res = cast<Team>({ leads: [{ username: 'Peter' }] });
    expect(res).toEqual({ leads: [{ id: 0, username: 'Peter' }] });
    expect(res.leads[0]).toBeInstanceOf(User);
});

test('embedded single', () => {
    class Price {
        constructor(public amount: integer) {
        }
    }

    class Product {
        constructor(public title: string, public price: Embedded<Price>) {
        }
    }

    expect(serialize<Embedded<Price>>(new Price(34))).toEqual(34);
    expect(serialize<Embedded<Price>[]>([new Price(34)])).toEqual([34]);
    expect(serialize<Embedded<Price, { prefix: '' }>[]>([new Price(34)])).toEqual([34]);
    expect(serialize<Embedded<Price, { prefix: 'price_' }>[]>([new Price(34)])).toEqual([34]);
    expect(serialize<{ a: Embedded<Price> }>({ a: new Price(34) })).toEqual({ a: 34 });
    expect(serialize<{ a: Embedded<Price, { prefix: '' }> }>({ a: new Price(34) })).toEqual({ amount: 34 });
    expect(serialize<{ a: Embedded<Price, { prefix: 'price_' }> }>({ a: new Price(34) })).toEqual({ price_amount: 34 });
    expect(serialize<Product>(new Product('Brick', new Price(34)))).toEqual({ title: 'Brick', price: 34 });

    expect(deserialize<Embedded<Price>>(34)).toEqual(new Price(34));
    expect(deserialize<Embedded<Price>[]>([34])).toEqual([new Price(34)]);
    expect(deserialize<(Embedded<Price> | string)[]>([34])).toEqual([new Price(34)]);
    expect(deserialize<(Embedded<Price> | string)[]>(['abc'])).toEqual(['abc']);
    expect(deserialize<Embedded<Price, { prefix: '' }>[]>([34])).toEqual([new Price(34)]);
    expect(deserialize<Embedded<Price, { prefix: 'price_' }>[]>([34])).toEqual([new Price(34)]);
    expect(deserialize<{ a: Embedded<Price> }>({ a: 34 })).toEqual({ a: new Price(34) });
    expect(deserialize<{ a: Embedded<Price, { prefix: '' }> }>({ amount: 34 })).toEqual({ a: new Price(34) });
    expect(deserialize<{ a: Embedded<Price, { prefix: 'price_' }> }>({ price_amount: 34 })).toEqual({ a: new Price(34) });
    expect(deserialize<Product>({ title: 'Brick', price: 34 })).toEqual(new Product('Brick', new Price(34)));

    // check if union works correctly
    expect(serialize<{ v: Embedded<Price> | string }>({ v: new Price(34) })).toEqual({ v: 34 });
    expect(serialize<{ v: Embedded<Price> | string }>({ v: '123' })).toEqual({ v: '123' });
    expect(serialize<(Embedded<Price> | string)[]>([new Price(34)])).toEqual([34]);
    expect(serialize<(Embedded<Price> | string)[]>(['abc'])).toEqual(['abc']);
    expect(serialize<{ v: Embedded<Price, { prefix: '' }> | string }>({ v: new Price(34) })).toEqual({ amount: 34 });
    expect(serialize<{ v: Embedded<Price, { prefix: '' }> | string }>({ v: '34' })).toEqual({ v: '34' });
    expect(serialize<{ v: Embedded<Price, { prefix: 'price_' }> | string }>({ v: new Price(34) })).toEqual({ price_amount: 34 });
    expect(serialize<{ v: Embedded<Price, { prefix: 'price_' }> | string }>({ v: '34' })).toEqual({ v: '34' });

    expect(deserialize<{ v: Embedded<Price> | string }>({ v: 34 })).toEqual({ v: new Price(34) });
    expect(deserialize<{ v: Embedded<Price> | string }>({ v: '123' })).toEqual({ v: '123' });
    expect(deserialize<{ v: Embedded<Price, { prefix: '' }> | string }>({ amount: 34 })).toEqual({ v: new Price(34) });
    expect(deserialize<{ v: Embedded<Price, { prefix: '' }> | string }>({ v: '34' })).toEqual({ v: '34' });
    expect(deserialize<{ v: Embedded<Price, { prefix: 'price_' }> | string }>({ price_amount: 34 })).toEqual({ v: new Price(34) });
    expect(deserialize<{ v: Embedded<Price, { prefix: 'price_' }> | string }>({ v: '34' })).toEqual({ v: '34' });

});

test('embedded single optional', () => {
    class Price {
        constructor(public amount: integer) {
        }
    }

    expect(deserialize<{ v?: Embedded<Price> }>({ v: 34 })).toEqual({ v: new Price(34) });
    expect(deserialize<{ v?: Embedded<Price> }>({})).toEqual({});
    expect(deserialize<{ v?: Embedded<Price, { prefix: '' }> }>({ amount: 34 })).toEqual({ v: new Price(34) });
    expect(deserialize<{ v?: Embedded<Price, { prefix: '' }> }>({})).toEqual({});
    expect(deserialize<{ v?: Embedded<Price, { prefix: 'price_' }> }>({ price_amount: 34 })).toEqual({ v: new Price(34) });
    expect(deserialize<{ v?: Embedded<Price, { prefix: 'price_' }> }>({})).toEqual({});

    class Product1 {
        constructor(public title: string, public price: Embedded<Price> = new Price(15)) {
        }
    }

    class Product2 {
        constructor(public title: string, public price?: Embedded<Price>) {
        }
    }

    class Product3 {
        public price: Embedded<Price> | undefined = new Price(15);
    }

    class Product4 {
        public price: Embedded<Price> | null = new Price(15);
    }

    expect(deserialize<{ a?: Embedded<Price> }>({})).toEqual({});
    expect(deserialize<{ a?: Embedded<Price> }>({ a: undefined })).toEqual({});
    expect(deserialize<{ a?: Embedded<Price, { prefix: '' }> }>({})).toEqual({});
    expect(deserialize<{ a?: Embedded<Price, { prefix: '' }> }>({ amount: undefined })).toEqual({});
    expect(deserialize<{ a?: Embedded<Price, { prefix: 'price_' }> }>({})).toEqual({});
    expect(deserialize<{ a?: Embedded<Price, { prefix: 'price_' }> }>({ price_amount: undefined })).toEqual({});
    expect(deserialize<Product1>({ title: 'Brick' })).toEqual(new Product1('Brick'));
    expect(deserialize<Product2>({ title: 'Brick' })).toEqual(new Product2('Brick'));
    expect(deserialize<Product3>({})).toEqual({ price: new Price(15) });
    expect(deserialize<Product3>({ price: null })).toEqual({ price: undefined });
    expect(deserialize<Product4>({})).toEqual({ price: new Price(15) });
    expect(deserialize<Product4>({ price: null })).toEqual({ price: null });
});

test('embedded multi parameter', () => {
    class Price {
        constructor(public amount: integer, public currency: string = 'EUR') {
        }
    }

    class Product {
        constructor(public title: string, public price: Embedded<Price>) {
        }
    }

    expect(serialize<Embedded<Price>>(new Price(34))).toEqual({ amount: 34, currency: 'EUR' });
    expect(serialize<Embedded<Price>[]>([new Price(34)])).toEqual([{ amount: 34, currency: 'EUR' }]);
    expect(serialize<Embedded<Price, { prefix: '' }>[]>([new Price(34)])).toEqual([{ amount: 34, currency: 'EUR' }]);
    expect(serialize<Embedded<Price, { prefix: 'price_' }>[]>([new Price(34)])).toEqual([{ price_amount: 34, price_currency: 'EUR' }]);
    expect(serialize<{ a: Embedded<Price> }>({ a: new Price(34) })).toEqual({ a_amount: 34, a_currency: 'EUR' });
    expect(serialize<{ a: Embedded<Price, { prefix: '' }> }>({ a: new Price(34) })).toEqual({ amount: 34, currency: 'EUR' });
    expect(serialize<{ a: Embedded<Price, { prefix: 'price_' }> }>({ a: new Price(34) })).toEqual({ price_amount: 34, price_currency: 'EUR' });
    expect(serialize<Product>(new Product('Brick', new Price(34)))).toEqual({ title: 'Brick', price_amount: 34, price_currency: 'EUR' });

    expect(deserialize<Embedded<Price>>({ amount: 34 })).toEqual(new Price(34));
    expect(deserialize<Embedded<Price>>({ amount: 34, currency: '$' })).toEqual(new Price(34, '$'));
    expect(deserialize<Embedded<Price>[]>([{ amount: 34 }])).toEqual([new Price(34)]);
    expect(deserialize<Embedded<Price>[]>([{ amount: 34, currency: '$' }])).toEqual([new Price(34, '$')]);
    expect(deserialize<Embedded<Price, { prefix: '' }>[]>([{ amount: 34 }])).toEqual([new Price(34)]);
    expect(deserialize<Embedded<Price, { prefix: 'price_' }>[]>([{ price_amount: 34 }])).toEqual([new Price(34)]);
    expect(deserialize<{ a: Embedded<Price> }>({ a_amount: 34 })).toEqual({ a: new Price(34) });
    expect(deserialize<{ a: Embedded<Price, { prefix: '' }> }>({ amount: 34 })).toEqual({ a: new Price(34) });
    expect(deserialize<{ a: Embedded<Price, { prefix: '' }> }>({ amount: 34, currency: '$' })).toEqual({ a: new Price(34, '$') });
    expect(deserialize<{ a: Embedded<Price, { prefix: '' }> }>({ amount: 34, currency: undefined })).toEqual({ a: new Price(34) });
    expect(deserialize<{ a: Embedded<Price, { prefix: 'price_' }> }>({ price_amount: 34 })).toEqual({ a: new Price(34) });
    expect(deserialize<{ a: Embedded<Price, { prefix: 'price_' }> }>({ price_amount: 34, price_currency: '$' })).toEqual({ a: new Price(34, '$') });
    expect(deserialize<Product>({ title: 'Brick', price_amount: 34 })).toEqual(new Product('Brick', new Price(34)));

    //check if union works correctly
    expect(serialize<{ v: Embedded<Price> | string }>({ v: new Price(34) })).toEqual({ v_amount: 34, v_currency: 'EUR' });
    expect(serialize<{ v: Embedded<Price> | string }>({ v: new Price(34, '$') })).toEqual({ v_amount: 34, v_currency: '$' });
    expect(serialize<{ v: Embedded<Price> | string }>({ v: '123' })).toEqual({ v: '123' });
    expect(serialize<{ v: Embedded<Price, { prefix: '' }> | string }>({ v: new Price(34) })).toEqual({ amount: 34, currency: 'EUR' });
    expect(serialize<{ v: Embedded<Price, { prefix: '' }> | string }>({ v: '34' })).toEqual({ v: '34' });
    expect(serialize<{ v: Embedded<Price, { prefix: 'price_' }> | string }>({ v: new Price(34) })).toEqual({ price_amount: 34, price_currency: 'EUR' });
    expect(serialize<{ v: Embedded<Price, { prefix: 'price_' }> | string }>({ v: '34' })).toEqual({ v: '34' });

    expect(deserialize<{ v: Embedded<Price> | string }>({ v_amount: 34 })).toEqual({ v: new Price(34) });
    expect(deserialize<{ v: Embedded<Price> | string }>({ v_amount: 34, v_currency: '$' })).toEqual({ v: new Price(34, '$') });
    expect(deserialize<{ v: Embedded<Price> | string }>({ v: '123' })).toEqual({ v: '123' });
    expect(deserialize<{ v: Embedded<Price, { prefix: '' }> | string }>({ amount: 34 })).toEqual({ v: new Price(34) });
    expect(deserialize<{ v: Embedded<Price, { prefix: '' }> | string }>({ v: '34' })).toEqual({ v: '34' });
    expect(deserialize<{ v: Embedded<Price, { prefix: 'price_' }> | string }>({ price_amount: 34 })).toEqual({ v: new Price(34) });
    expect(deserialize<{ v: Embedded<Price, { prefix: 'price_' }> | string }>({ v: '34' })).toEqual({ v: '34' });
});

test('class inheritance', () => {
    abstract class Person {
        id: number & PrimaryKey & AutoIncrement = 0;
        firstName?: string;
        lastName?: string;
        abstract type: string;
    }

    class Employee extends Person {
        email?: string;
        type: 'employee' = 'employee';
    }

    class Freelancer extends Person {
        @t budget: number = 10_000;
        type: 'freelancer' = 'freelancer';
    }

    const employee = ReflectionClass.from(Employee);
    expect(employee.getProperty('firstName').getKind()).toBe(ReflectionKind.string);
    const scopeSerializer = getSerializeFunction(employee.type, serializer.serializeRegistry);

    expect(scopeSerializer({ type: 'employee', firstName: 'Peter', email: 'test@example.com' })).toEqual({ type: 'employee', firstName: 'Peter', email: 'test@example.com' });
});

test('class with union literal', () => {
    class ConnectionOptions {
        readConcernLevel: 'local' | 'majority' | 'linearizable' | 'available' = 'majority';
    }

    expect(cast<ConnectionOptions>({ readConcernLevel: 'majority' })).toEqual({ readConcernLevel: 'majority' });
    expect(cast<ConnectionOptions>({ readConcernLevel: 'linearizable' })).toEqual({ readConcernLevel: 'linearizable' });
    expect(cast<ConnectionOptions>({ readConcernLevel: 'unknown' })).toEqual({ readConcernLevel: 'majority' });
});

test('named tuple in error message', () => {
    expect(cast<[age: number]>([23])).toEqual([23]);
    expect(() => cast<{ v: [age: number] }>({ v: ['123abc'] })).toThrow('v.age(type): Cannot convert 123abc to number');
});

test('intersected mapped type key', () => {
    type SORT_ORDER = 'asc' | 'desc' | any;
    type Sort<T, ORDER extends SORT_ORDER = SORT_ORDER> = { [P in keyof T & string]?: ORDER };

    interface A {
        username: string;
        id: number;
    }
    type sortA = Sort<A>;

    expect(cast<sortA>({username: 'asc'})).toEqual({username: 'asc'});
    expect(cast<sortA>({id: 'desc', username: 'asc'})).toEqual({id: 'desc', username: 'asc'});

    type sortAny = Sort<any>;
    expect(cast<sortAny>({username: 'asc'})).toEqual({username: 'asc'});
    expect(cast<sortAny>({id: 'desc', username: 'asc'})).toEqual({id: 'desc', username: 'asc'});
});

test('wild property names', () => {
    interface A {
        ['asd-344']: string;
        ['#$%^^x']: number;
    }

    expect(cast<A>({'asd-344': 'abc', '#$%^^x': 3})).toEqual({'asd-344': 'abc', '#$%^^x': 3});
});
