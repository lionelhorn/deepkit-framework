import { DirectClient, rpc, RpcKernel } from '@deepkit/rpc';
import { expect, test } from '@jest/globals';
import { Subject } from 'rxjs';

test('unsubscribing from a Subject removes the server observer', async () => {
    const prices = new Subject<number>();

    class PriceController {
        @rpc.action()
        updates(): Subject<number> {
            return prices;
        }

        @rpc.action()
        publish(price: number): void {
            prices.next(price);
        }
    }

    const kernel = new RpcKernel();
    kernel.registerController(PriceController, 'prices');
    const client = new DirectClient(kernel);
    const controller = client.controller<PriceController>('prices');

    try {
        const updates = await controller.updates();
        try {
            const received: number[] = [];
            const subscription = updates.subscribe(price => received.push(price));
            await controller.publish(101);
            const observedBeforeUnsubscribe = prices.observed;

            subscription.unsubscribe();
            await controller.publish(102);

            expect({
                'client receives a Subject': updates instanceof Subject,
                'prices arrive before unsubscribe': received,
                'server has an observer before unsubscribe': observedBeforeUnsubscribe,
                'local subscription is closed': subscription.closed,
                'server has an observer after unsubscribe': prices.observed,
            }).toStrictEqual({
                'client receives a Subject': true,
                'prices arrive before unsubscribe': [101],
                'server has an observer before unsubscribe': true,
                'local subscription is closed': true,
                'server has an observer after unsubscribe': false,
            });
        } finally {
            updates.complete();
        }
    } finally {
        await client.disconnect();
    }
});
