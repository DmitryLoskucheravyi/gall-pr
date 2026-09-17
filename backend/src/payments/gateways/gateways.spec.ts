import { createHash, createHmac } from 'crypto';

import { LiqPayGateway } from './liqpay.gateway';
import { WayForPayGateway } from './wayforpay.gateway';

// Signature verification is the only thing standing between a stranger's HTTP
// request and "this order is paid", so it gets tested against both a genuine
// signature and a wrong one.

describe('LiqPayGateway.verifyCallback', () => {
  const PRIVATE_KEY = 'liqpay-private-key-for-tests';
  let gateway: LiqPayGateway;

  const sign = (data: string) =>
    createHash('sha1')
      .update(PRIVATE_KEY + data + PRIVATE_KEY)
      .digest('base64');

  const encode = (payload: Record<string, unknown>) =>
    Buffer.from(JSON.stringify(payload)).toString('base64');

  beforeEach(() => {
    process.env.LIQPAY_PUBLIC_KEY = 'public';
    process.env.LIQPAY_PRIVATE_KEY = PRIVATE_KEY;
    gateway = new LiqPayGateway();
  });

  afterEach(() => {
    delete process.env.LIQPAY_PUBLIC_KEY;
    delete process.env.LIQPAY_PRIVATE_KEY;
  });

  it('accepts a correctly signed callback and reads the order out of it', () => {
    const data = encode({
      order_id: 'order-42',
      payment_id: 987,
      status: 'success',
      amount: 1500,
      currency: 'UAH',
    });

    expect(gateway.verifyCallback({ data, signature: sign(data) })).toEqual({
      orderId: 42,
      transactionId: '987',
      success: true,
      amount: 1500,
      currency: 'UAH',
    });
  });

  it('rejects a callback signed with the wrong key', () => {
    const data = encode({ order_id: 'order-42', status: 'success' });

    expect(
      gateway.verifyCallback({ data, signature: 'not-the-signature' }),
    ).toBeNull();
  });

  // A valid signature over a body that isn't the shape we expect has to be a
  // rejected callback, not a 500.
  it('rejects a correctly signed callback whose payload is not JSON', () => {
    const data = Buffer.from('this is not json').toString('base64');

    expect(gateway.verifyCallback({ data, signature: sign(data) })).toBeNull();
  });

  it('rejects a correctly signed callback with no usable order id', () => {
    const data = encode({ order_id: 'order-not-a-number', status: 'success' });

    expect(gateway.verifyCallback({ data, signature: sign(data) })).toBeNull();
  });

  it('reports a declined payment as unsuccessful rather than rejecting it', () => {
    const data = encode({
      order_id: 'order-42',
      payment_id: 1,
      status: 'failure',
      amount: 1500,
      currency: 'UAH',
    });

    expect(
      gateway.verifyCallback({ data, signature: sign(data) }),
    ).toMatchObject({ orderId: 42, success: false });
  });
});

describe('WayForPayGateway.verifyCallback', () => {
  const SECRET = 'wfp-secret-for-tests';
  const MERCHANT = 'merchant.test';
  let gateway: WayForPayGateway;

  const sign = (fields: (string | number)[]) =>
    createHmac('md5', SECRET).update(fields.join(';')).digest('hex');

  const callback = (overrides: Record<string, unknown> = {}) => {
    const body = {
      orderReference: 'order-42',
      amount: '1500',
      currency: 'UAH',
      authCode: 'A1B2C3',
      cardPan: '44**44',
      transactionStatus: 'Approved',
      reasonCode: '1100',
      ...overrides,
    };

    return {
      ...body,
      merchantSignature: sign([
        MERCHANT,
        String(body.orderReference),
        String(body.amount),
        String(body.currency),
        String(body.authCode),
        String(body.cardPan),
        String(body.transactionStatus),
        String(body.reasonCode),
      ]),
    };
  };

  beforeEach(() => {
    process.env.WAYFORPAY_MERCHANT_ACCOUNT = MERCHANT;
    process.env.WAYFORPAY_SECRET_KEY = SECRET;
    process.env.WAYFORPAY_DOMAIN = 'example.test';
    gateway = new WayForPayGateway();
  });

  afterEach(() => {
    delete process.env.WAYFORPAY_MERCHANT_ACCOUNT;
    delete process.env.WAYFORPAY_SECRET_KEY;
    delete process.env.WAYFORPAY_DOMAIN;
  });

  it('accepts a correctly signed callback', () => {
    expect(gateway.verifyCallback(callback())).toMatchObject({
      orderId: 42,
      success: true,
      amount: 1500,
      currency: 'UAH',
    });
  });

  // The transaction id used to be the order reference, which is the same value
  // on every callback for an order — so PaymentsService's duplicate check
  // matched every later callback and a reversal could never be recorded.
  it('identifies the transaction, not the order', () => {
    const first = gateway.verifyCallback(callback());
    const second = gateway.verifyCallback(
      callback({ authCode: 'Z9Y8X7', transactionStatus: 'Refunded' }),
    );

    expect(first?.transactionId).not.toEqual(second?.transactionId);
    expect(first?.transactionId).not.toEqual('order-42');
  });

  it('rejects a callback signed with the wrong key', () => {
    expect(
      gateway.verifyCallback({ ...callback(), merchantSignature: 'nope' }),
    ).toBeNull();
  });

  // A repeated query parameter arrives as an array; blanket-casting the body to
  // Record<string, string> and joining that into the signature gave a forger a
  // second shape to try.
  it('rejects a callback whose fields are not strings', () => {
    expect(
      gateway.verifyCallback({
        ...callback(),
        amount: ['1500', '1'] as unknown,
      }),
    ).toBeNull();
  });

  it('is not configured, and verifies nothing, without a secret', () => {
    delete process.env.WAYFORPAY_SECRET_KEY;

    expect(gateway.isConfigured()).toBe(false);
    expect(gateway.verifyCallback(callback())).toBeNull();
  });
});
