import { expect, test } from '@jest/globals';

test('object method reads the outer variable with the same name', () => {
    const pending = new Map<string, Promise<unknown>>();
    pending.set('request-1', Promise.resolve('done'));

    const tracker = {
        pending(): string[] {
            return [...pending.keys()];
        },
    };

    expect(tracker.pending()).toEqual(['request-1']);
});
