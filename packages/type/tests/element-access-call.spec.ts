import { expect, test } from '@jest/globals';
import { ReceiveType, ReflectionKind, resolveReceiveType } from '@deepkit/type';

type Result = string;

class Service {
    get<T>(type?: ReceiveType<T>) {
        return resolveReceiveType(type).kind;
    }
}

test('element access method calls receive their type argument', () => {
    const service = new Service();

    expect({
        'dot call': service.get<Result>(),
        'element access call': service['get']<Result>(),
    }).toEqual({
        'dot call': ReflectionKind.string,
        'element access call': ReflectionKind.string,
    });
});
