import { PaymentsService } from './payments.service';
import {
  Order,
  OrderStatus,
  PaymentProvider,
  PaymentStatus,
} from '../orders/entities/order.entity';
import type { PaymentGateway } from './gateways/payment-gateway.interface';

// The callback handler is where a signed message from a gateway turns into
// "this order is paid", and every one of these is a way that used to go wrong
// or would cost real money if it did.

type CallbackResult = NonNullable<ReturnType<PaymentGateway['verifyCallback']>>;

function gatewayReturning(result: CallbackResult | null): PaymentGateway {
  return {
    provider: PaymentProvider.LIQPAY,
    isConfigured: () => true,
    createPayment: () => ({ actionUrl: 'https://example.test', fields: {} }),
    verifyCallback: () => result,
  };
}

function orderLike(overrides: Partial<Order> = {}): Order {
  return {
    id: 42,
    total: 1500,
    status: OrderStatus.PENDING,
    paymentStatus: PaymentStatus.PENDING,
    paymentProvider: PaymentProvider.LIQPAY,
    paymentTransactionId: null,
    ...overrides,
  } as Order;
}

function serviceWith(gateway: PaymentGateway, order: Order | null) {
  const update = jest.fn().mockResolvedValue({ affected: 1 });
  const repository = { findOne: jest.fn().mockResolvedValue(order), update };

  const service = new PaymentsService(
    repository as never,
    gateway as never,
    gatewayReturning(null) as never,
  );

  return { service, update, repository };
}

describe('PaymentsService.handleCallback', () => {
  const settled: CallbackResult = {
    orderId: 42,
    transactionId: 'tx-1',
    success: true,
    amount: 1500,
    currency: 'UAH',
  };

  it('marks the order paid when the gateway settles the full amount', async () => {
    const { service, update } = serviceWith(
      gatewayReturning(settled),
      orderLike(),
    );

    await service.handleCallback(PaymentProvider.LIQPAY, {});

    expect(update).toHaveBeenCalledWith(
      { id: 42 },
      { paymentStatus: PaymentStatus.PAID, paymentTransactionId: 'tx-1' },
    );
  });

  // Without this, a genuine 1 ₴ payment settles a 50 000 ₴ order: the
  // signature proves the gateway sent the message, not what it paid for.
  it('refuses to settle an order for less than it is owed', async () => {
    const { service, update } = serviceWith(
      gatewayReturning({ ...settled, amount: 1 }),
      orderLike(),
    );

    await service.handleCallback(PaymentProvider.LIQPAY, {});

    expect(update).toHaveBeenCalledWith(
      { id: 42 },
      { paymentStatus: PaymentStatus.FAILED, paymentTransactionId: 'tx-1' },
    );
  });

  it('refuses to settle an order paid in another currency', async () => {
    const { service, update } = serviceWith(
      gatewayReturning({ ...settled, currency: 'USD' }),
      orderLike(),
    );

    await service.handleCallback(PaymentProvider.LIQPAY, {});

    expect(update).toHaveBeenCalledWith(
      { id: 42 },
      { paymentStatus: PaymentStatus.FAILED, paymentTransactionId: 'tx-1' },
    );
  });

  // Gateway signatures carry no nonce and no timestamp, so a captured body is
  // replayable forever. Settling the same transaction twice has to be a no-op.
  it('ignores a replay of a callback that already settled the order', async () => {
    const { service, update } = serviceWith(
      gatewayReturning(settled),
      orderLike({
        paymentStatus: PaymentStatus.PAID,
        paymentTransactionId: 'tx-1',
      }),
    );

    await service.handleCallback(PaymentProvider.LIQPAY, {});

    expect(update).not.toHaveBeenCalled();
  });

  // A cancelled order has had its stock returned and may have been sold again.
  it('never settles a cancelled order', async () => {
    const { service, update } = serviceWith(
      gatewayReturning(settled),
      orderLike({ status: OrderStatus.CANCELLED }),
    );

    await service.handleCallback(PaymentProvider.LIQPAY, {});

    expect(update).not.toHaveBeenCalled();
  });

  it('rejects a callback whose signature does not verify', async () => {
    const { service, update, repository } = serviceWith(
      gatewayReturning(null),
      orderLike(),
    );

    await service.handleCallback(PaymentProvider.LIQPAY, {});

    expect(repository.findOne).not.toHaveBeenCalled();
    expect(update).not.toHaveBeenCalled();
  });

  // An unset key hashes to a value anybody can compute, so a callback for a
  // provider we never handed a payment to must be refused, not trusted.
  it('rejects a callback for a gateway that has no keys', async () => {
    const unconfigured: PaymentGateway = {
      ...gatewayReturning(settled),
      isConfigured: () => false,
    };
    const { service, update } = serviceWith(unconfigured, orderLike());

    await service.handleCallback(PaymentProvider.LIQPAY, {});

    expect(update).not.toHaveBeenCalled();
  });

  describe('availableProviders', () => {
    it('lists only the gateways that actually have keys', () => {
      const configured = gatewayReturning(null);
      const unconfigured: PaymentGateway = {
        ...gatewayReturning(null),
        provider: PaymentProvider.WAYFORPAY,
        isConfigured: () => false,
      };

      const service = new PaymentsService(
        { findOne: jest.fn(), update: jest.fn() } as never,
        configured as never,
        unconfigured as never,
      );

      expect(service.availableProviders()).toEqual([PaymentProvider.LIQPAY]);
    });
  });
});
