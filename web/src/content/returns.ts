import {
  OPERATOR,
  TRANSLATION_NOTE_EN,
  list,
  p,
  type LegalContent,
  type LegalDocument,
} from './legal';

// Returns and exchange.
//
// Section 8 of the offer says the same thing in the register a contract is
// written in. This page says it in the register someone who has just opened a
// damaged parcel can read, because that is the state anyone arrives here in —
// and because an acquirer will not approve a shop that buries its returns
// policy inside a contract.
//
// The headline is an awkward one and is stated plainly rather than softened:
// an original painting is a good made to individual order, so the fourteen-day
// change-of-mind right does not apply to it. What does apply — defects,
// damage in transit, a work that is not what the page described — is set out
// straight after, with the steps and the deadlines.

export const RETURNS_UPDATED = '2026-10-12';

const ua: LegalContent = {
  title: 'Повернення та обмін',
  description:
    'Коли оригінальну картину можна повернути, коли ні, як подати скаргу на брак чи пошкодження при доставці та в які строки повертаються кошти.',
  updatedLabel: 'Редакція від',
  intro:
    'Що робити, якщо з роботою щось не так. Ця сторінка переказує розділ 8 публічної оферти простими словами; у разі розбіжностей діє текст оферти.',
  tocTitle: 'Зміст',
  cookieSettingsButton: '',
  sections: [
    {
      id: 'no-change-of-mind',
      title: '1. Повернення «просто так» не передбачене',
      blocks: [
        p(
          'Оригінальна картина — товар, що має індивідуально визначені властивості. За п. 5 ч. 1 ст. 9 Закону України «Про захист прав споживачів» такі товари належної якості не підлягають обміну чи поверненню на підставі «не підійшло» або «передумав». Чотирнадцятиденне право на відмову, яке діє для звичайних товарів, на оригінальний живопис не поширюється.',
        ),
        p(
          'Саме тому на картці кожної роботи є розміри, техніка, рік і кілька фотографій, а якщо чогось бракує — напишіть у підтримку до замовлення, ми додамо фото чи відео роботи в потрібному ракурсі.',
        ),
        p(
          'Покупці-споживачі з Європейського Союзу: імперативні норми вашого національного законодавства про дистанційні договори застосовуються до вашого замовлення незалежно від цього пункту.',
        ),
      ],
    },
    {
      id: 'defects',
      title: '2. Коли повернення є',
      blocks: [
        p('Повернути кошти або усунути недолік ми зобов’язані, якщо:'),
        list(
          'робота має виробничий брак;',
          'робота пошкоджена під час транспортування;',
          'робота істотно не відповідає опису на картці — не той розмір, не та техніка, не та робота.',
        ),
        p(
          'У цих випадках ви обираєте: безоплатне усунення недоліків або повернення повної вартості роботи.',
        ),
      ],
    },
    {
      id: 'how',
      title: '3. Як подати скаргу',
      blocks: [
        p('Строк — 48 годин з моменту отримання. Що потрібно:'),
        list(
          'сфотографувати транспортну тару — до того, як ви її розберете;',
          'сфотографувати або зняти на відео сам недолік;',
          'якщо пошкодження видно у відділенні — оформити акт про невідповідність у присутності представника «Нової пошти»;',
          `написати нам у чат підтримки на сайті або на ${OPERATOR.email}, додавши ці матеріали й номер замовлення.`,
        ),
        p(
          'Акт перевізника — не формальність: без нього довести, що пошкодження сталося в дорозі, практично неможливо, і страхування відправлення не спрацює.',
        ),
      ],
    },
    {
      id: 'money',
      title: '4. Коли повертаються кошти',
      blocks: [
        p(
          'Кошти повертаються тим самим способом, яким була здійснена оплата, протягом 14 банківських днів з моменту підтвердження браку. Якщо оплата була карткою — на ту саму картку; якщо переказом — на той самий рахунок.',
        ),
        p(
          'Якщо робота існувала в єдиному екземплярі й повернулася до нас, її картка знову з’являється в каталозі у попередньому стані.',
        ),
      ],
    },
    {
      id: 'cancel',
      title: '5. Скасування замовлення до відправлення',
      blocks: [
        p(
          'Поки замовлення не передане перевізнику, його можна скасувати: напишіть у підтримку. Оплачена сума повертається повністю, а робота повертається у вільний продаж.',
        ),
        p(
          'Якщо замовлення скасовуємо ми — наприклад, коли ту саму роботу встигли замовити двічі, — ви отримуєте повне повернення протягом 3 банківських днів і повідомлення про причину.',
        ),
      ],
    },
  ],
};

const en: LegalContent = {
  title: 'Returns and exchange',
  description:
    'When an original painting can be returned and when it cannot, how to report a defect or damage in transit, and how long a refund takes.',
  updatedLabel: 'Revision of',
  translationNote: TRANSLATION_NOTE_EN,
  intro:
    'What to do if something is wrong with the work. This page restates section 8 of the public offer in plain words; where the two differ, the offer governs.',
  tocTitle: 'Contents',
  cookieSettingsButton: '',
  sections: [
    {
      id: 'no-change-of-mind',
      title: '1. There is no change-of-mind return',
      blocks: [
        p(
          'An original painting is a good with individually determined properties. Under clause 5 of part 1 of article 9 of the Law of Ukraine “On consumer protection”, such goods, when of proper quality, cannot be exchanged or returned because they “did not suit” or because the buyer changed their mind. The fourteen-day right of withdrawal that applies to ordinary goods does not extend to original paintings.',
        ),
        p(
          'That is why every work’s page carries its dimensions, technique, year and several photographs — and if something is missing, write to support before ordering and we will add a photograph or a video from the angle you need.',
        ),
        p(
          'Consumer buyers in the European Union: the mandatory provisions of your own national law on distance contracts apply to your order regardless of this clause.',
        ),
      ],
    },
    {
      id: 'defects',
      title: '2. When there is a return',
      blocks: [
        p('We are obliged to refund you, or to remedy the defect, where:'),
        list(
          'the work has a manufacturing defect;',
          'the work was damaged in transit;',
          'the work differs materially from its description — the wrong size, the wrong technique, the wrong work.',
        ),
        p(
          'In those cases the choice is yours: have the defect remedied free of charge, or have the full price refunded.',
        ),
      ],
    },
    {
      id: 'how',
      title: '3. How to report it',
      blocks: [
        p('The deadline is 48 hours from receipt. What is needed:'),
        list(
          'photograph the transport packaging — before you take it apart;',
          'photograph or film the defect itself;',
          'if the damage is visible at the branch, have a damage report drawn up in the presence of the Nova Poshta representative;',
          `write to us in the support chat on the site or to ${OPERATOR.email}, attaching all of it and your order number.`,
        ),
        p(
          'The carrier’s report is not a formality: without it, proving the damage happened in transit is close to impossible, and the shipment’s insurance will not pay out.',
        ),
      ],
    },
    {
      id: 'money',
      title: '4. When the money comes back',
      blocks: [
        p(
          'Refunds are made by the same means as the payment, within 14 banking days of the defect being confirmed. Paid by card — back to the same card; paid by transfer — back to the same account.',
        ),
        p(
          'If the work existed as a single copy and has come back to us, its page returns to the catalogue in its previous state.',
        ),
      ],
    },
    {
      id: 'cancel',
      title: '5. Cancelling before dispatch',
      blocks: [
        p(
          'An order can be cancelled at any time before it is handed to the carrier: write to support. Anything paid is refunded in full, and the work returns to sale.',
        ),
        p(
          'If we cancel the order — for instance where the same work was ordered twice — you are refunded in full within 3 banking days and told why.',
        ),
      ],
    },
  ],
};

export const RETURNS: LegalDocument = { ua, en };
