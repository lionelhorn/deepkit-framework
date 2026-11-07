import { expect, test } from '@jest/globals';
import { DirectClient, rpc, RpcKernel, RpcKernelConnection, RpcKernelSecurity, Session, SessionState } from '@deepkit/rpc';

type CurrentSession = {
    injectedUsername: string;
    connectionUsername: string;
    sameState: boolean;
};

test('injected SessionState belongs to the authenticated RPC connection', async () => {
    const authenticatedUsers: string[] = [];

    class TokenSecurity extends RpcKernelSecurity {
        async authenticate(token: string): Promise<Session> {
            return new Session(token, token);
        }

        async hasControllerAccess(session: Session): Promise<boolean> {
            authenticatedUsers.push(session.username);
            return !session.isAnonymous();
        }
    }

    @rpc.controller('account')
    class AccountController {
        constructor(private state: SessionState, private connection: RpcKernelConnection) {
        }

        @rpc.action()
        currentSession(): CurrentSession {
            return {
                injectedUsername: this.state.getSession().username,
                connectionUsername: this.connection.sessionState.getSession().username,
                sameState: this.state === this.connection.sessionState,
            };
        }
    }

    const kernel = new RpcKernel([{ provide: RpcKernelSecurity, useClass: TokenSecurity, scope: 'rpc' }]);
    kernel.registerController(AccountController);
    const client = new DirectClient(kernel);
    client.token.set('alice');
    try {
        const session = await client.controller<AccountController>('account').currentSession();
        expect({
            'security authenticated the caller': authenticatedUsers,
            'injected state has the authenticated user': session.injectedUsername,
            'connection state has the authenticated user': session.connectionUsername,
            'injected state belongs to the connection': session.sameState,
        }).toStrictEqual({
            'security authenticated the caller': ['alice'],
            'injected state has the authenticated user': 'alice',
            'connection state has the authenticated user': 'alice',
            'injected state belongs to the connection': true,
        });
    } finally {
        await client.disconnect();
    }
});
