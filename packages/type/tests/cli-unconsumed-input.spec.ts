import { expect, test } from '@jest/globals';
import { App, Flag } from '@deepkit/app';
import { Logger, MemoryLogger } from '@deepkit/logger';

type Label = string & Flag;
type Color = boolean & Flag;

test('CLI applies supported flags and rejects unconsumed input before executing the command', async () => {
    async function execute(argv: string[]) {
        const calls: { target: string, label: string, color: boolean }[] = [];
        const app = new App({ providers: [{ provide: Logger, useValue: new MemoryLogger() }] })
            .command('run', (target: string, label: Label = 'none', color: Color = true) => {
                calls.push({ target, label, color });
            });
        const code = await app.execute(argv, ['node', 'app']);
        return { code, calls };
    }

    expect({
        'valid positional runs with defaults': await execute(['run', 'a']),
        'separate flag values are applied': await execute(['run', 'a', '--label', 'foo', '--color', 'false']),
        'equals flag value is applied': await execute(['run', 'a', '--label=foo']),
        'unknown flag prevents execution': await execute(['run', 'a', '--unknown', 'x']),
        'unknown negated flag prevents execution': await execute(['run', 'a', '--no-color']),
        'extra positionals prevent execution': await execute(['run', 'a', 'b', 'c']),
    }).toStrictEqual({
        'valid positional runs with defaults': { code: 0, calls: [{ target: 'a', label: 'none', color: true }] },
        'separate flag values are applied': { code: 0, calls: [{ target: 'a', label: 'foo', color: false }] },
        'equals flag value is applied': { code: 0, calls: [{ target: 'a', label: 'foo', color: true }] },
        'unknown flag prevents execution': { code: 1, calls: [] },
        'unknown negated flag prevents execution': { code: 1, calls: [] },
        'extra positionals prevent execution': { code: 1, calls: [] },
    });
});
