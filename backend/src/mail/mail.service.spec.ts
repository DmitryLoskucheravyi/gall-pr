import { MailService, htmlToText } from './mail.service';
import { MailKind } from './entities/mail-outbox.entity';

function build() {
  const outbox = {
    findOne: jest.fn().mockResolvedValue(null),
    create: jest.fn((value: unknown) => value),
    save: jest.fn((value: unknown) => Promise.resolve(value)),
  };
  const dispatcher = {
    isConfigured: jest.fn().mockReturnValue(true),
    drain: jest.fn().mockResolvedValue(undefined),
  };
  const service = new MailService(outbox as never, dispatcher as never);

  return { service, outbox, dispatcher };
}

describe('MailService preview and edits', () => {
  it('composes a letter for the preview without queuing it', async () => {
    const { service, outbox, dispatcher } = build();

    const letter = await service.sendOrderCancelled('buyer@example.test', 42, {
      preview: true,
    });

    expect(letter).toEqual(
      expect.objectContaining({
        kind: MailKind.ORDER_CANCELLED,
        to: 'buyer@example.test',
        subject: expect.stringContaining('№42'),
        html: expect.stringContaining('скасовано'),
      }),
    );
    expect(outbox.save).not.toHaveBeenCalled();
    expect(dispatcher.drain).not.toHaveBeenCalled();
  });

  it('sends the edited subject and HTML, with text rebuilt from it', async () => {
    const { service, outbox } = build();

    await service.sendOrderApology('buyer@example.test', 42, {
      override: {
        subject: '  Наш промах із №42  ',
        html: '<div><h1>Вибачте</h1><p>Повернемо <strong>100 ₴</strong> &amp; подарунок.</p><a href="https://x.test/o">Деталі</a></div>',
      },
    });

    expect(outbox.save).toHaveBeenCalledWith(
      expect.objectContaining({
        subject: 'Наш промах із №42',
        htmlBody: expect.stringContaining('100 ₴'),
        textBody:
          'Вибачте\nПовернемо 100 ₴ & подарунок.\nДеталі (https://x.test/o)',
      }),
    );
  });

  it('keeps the template when the edits are blank', async () => {
    const { service, outbox } = build();

    await service.sendOrderApology('buyer@example.test', 42, {
      override: { subject: ' ', html: '' },
    });

    expect(outbox.save).toHaveBeenCalledWith(
      expect.objectContaining({
        subject: expect.stringContaining('№42'),
        textBody: expect.stringContaining('сталася помилка'),
      }),
    );
  });
});

describe('htmlToText', () => {
  it('drops styles and scripts, keeps line breaks', () => {
    expect(
      htmlToText('<style>p{}</style>Рядок<br/>другий<script>x()</script>'),
    ).toBe('Рядок\nдругий');
  });
});
