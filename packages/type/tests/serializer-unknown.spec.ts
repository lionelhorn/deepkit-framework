import { expect, test } from '@jest/globals';
import { cast, deserialize, serialize } from '../src/serializer-facade.js';

test('serialize, deserialize and cast keep unknown values', () => {
    interface WebhookEvent {
        id: string;
        payload: unknown;
        context: any;
    }

    const event: WebhookEvent = { id: 'evt_123', payload: { orderId: 42 }, context: { orderId: 42 } };

    expect({
        serialize: serialize<WebhookEvent>(event),
        deserialize: deserialize<WebhookEvent>(event),
        cast: cast<WebhookEvent>(event),
    }).toStrictEqual({ serialize: event, deserialize: event, cast: event });
});
