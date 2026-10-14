import {
  OPERATOR,
  TRANSLATION_NOTE_EN,
  list,
  p,
  type LegalContent,
  type LegalDocument,
} from './legal';

// Delivery and payment, as a page of its own.
//
// Every acquirer that takes on a Ukrainian shop looks for this page by name
// before it will approve the merchant, and so does a buyer deciding whether
// to order. It says nothing the offer does not, but it says it in the order
// someone about to buy wants it: how it ships, what it costs, how it is paid
// for, and when the money moves.
//
// It describes what checkout actually does, not what it might one day: one
// carrier (Nova Poshta), four payment methods, and international delivery
// arranged by hand because the form cannot price it.

export const DELIVERY_UPDATED = '2026-10-12';

const ua: LegalContent = {
  title: 'Доставка та оплата',
  description:
    'Як галерея Viktorumm відправляє картини: Нова пошта по Україні, пакування, строки, вартість доставки та доступні способи оплати.',
  updatedLabel: 'Редакція від',
  intro:
    'Коротко про те, як робота дістанеться до вас і як за неї заплатити. Усе на цій сторінці є частиною умов публічної оферти — повні формулювання там.',
  tocTitle: 'Зміст',
  cookieSettingsButton: '',
  sections: [
    {
      id: 'carrier',
      title: '1. Куди і чим ми відправляємо',
      blocks: [
        p(
          'Доставка по Україні здійснюється «Новою поштою» — на відділення або поштомат, який ви обираєте при оформленні замовлення. Інших перевізників у чекауті зараз немає.',
        ),
        p(
          'Міжнародна доставка можлива, але оформлюється окремо: напишіть у підтримку до оформлення замовлення, і ми порахуємо вартість і строки для вашої країни. Самостійно порахувати її на сайті поки не можна.',
        ),
      ],
    },
    {
      id: 'cost',
      title: '2. Скільки коштує доставка',
      blocks: [
        p(
          'Вартість доставки рахується «Новою поштою» за її власними тарифами — від міста відправлення, міста отримання, ваги й оголошеної вартості відправлення. Сайт показує цю суму в кошику до того, як ви підтвердите замовлення.',
        ),
        p(
          'Доставка оплачується окремо від картини і не входить у її ціну, якщо на картці роботи не зазначено інше. Якщо ви обрали накладений платіж, «Нова пошта» додатково утримує власну комісію за переказ коштів — її розмір показує перевізник.',
        ),
      ],
    },
    {
      id: 'packing',
      title: '3. Пакування і строки',
      blocks: [
        p(
          'Картини — крихкий вантаж, тому кожна робота їде в твердій тарі із захистом від вологи й деформацій та з маркуванням «крихке». На відправлення оформлюється оголошена вартість, що дорівнює ціні роботи, — це те, що дає змогу її застрахувати.',
        ),
        p(
          'Робота передається перевізнику протягом 1–3 робочих днів після підтвердження замовлення. Далі строк — за регламентом «Нової пошти»: зазвичай 1–3 дні по Україні. Для авторського повтору строк виготовлення вказується на картці роботи або узгоджується окремо.',
        ),
      ],
    },
    {
      id: 'payment',
      title: '4. Способи оплати',
      blocks: [
        p('На сайті доступні такі способи оплати:'),
        list(
          'Банківська картка онлайн — через платіжну систему LiqPay. Повна передоплата; дані картки обробляє платіжна система, сайт їх не бачить і не зберігає.',
          'Переказ на рахунок — за реквізитами, які ви побачите на сторінці замовлення. Повна передоплата; підтвердження оплати можна завантажити туди ж.',
          'Накладений платіж — оплата при отриманні у відділенні «Нової пошти», якщо цей спосіб доступний для обраної роботи.',
        ),
        p(
          'Ціна фіксується в гривнях на момент оформлення замовлення. Долари на картці роботи — довідкові: списання завжди відбувається в гривні.',
        ),
      ],
    },
    {
      id: 'receiving',
      title: '5. Коли отримуєте',
      blocks: [
        p(
          'Огляньте упаковку у відділенні, у присутності представника перевізника. Якщо тара пошкоджена — оформіть акт на місці й напишіть нам протягом 48 годин, додавши фото тари й роботи. Це єдиний спосіб довести, що пошкодження сталося в дорозі.',
        ),
        p(
          `Якщо щось пішло не так — пишіть у чат підтримки на сайті або на ${OPERATOR.email}. Умови повернення й обміну — на окремій сторінці.`,
        ),
      ],
    },
  ],
};

const en: LegalContent = {
  title: 'Delivery and payment',
  description:
    'How the Viktorumm gallery ships paintings: Nova Poshta within Ukraine, packing, timings, delivery cost and the payment methods available.',
  updatedLabel: 'Revision of',
  translationNote: TRANSLATION_NOTE_EN,
  intro:
    'In short: how the work reaches you, and how to pay for it. Everything on this page forms part of the public offer — the full wording is there.',
  tocTitle: 'Contents',
  cookieSettingsButton: '',
  sections: [
    {
      id: 'carrier',
      title: '1. Where and how we ship',
      blocks: [
        p(
          'Within Ukraine we ship with Nova Poshta, to the branch or parcel locker you choose at checkout. No other carrier is offered at checkout at the moment.',
        ),
        p(
          'International delivery is possible but arranged separately: write to support before placing an order and we will quote the cost and the timing for your country. The site cannot price it on its own yet.',
        ),
      ],
    },
    {
      id: 'cost',
      title: '2. What delivery costs',
      blocks: [
        p(
          'Delivery is priced by Nova Poshta on its own tariffs — from the sending city, the receiving city, the weight and the declared value. The site shows that amount in the basket before you confirm the order.',
        ),
        p(
          'Delivery is paid separately from the painting and is not included in its price unless the work’s page says otherwise. If you choose cash on delivery, Nova Poshta also charges its own fee for transferring the money; the carrier states that amount.',
        ),
      ],
    },
    {
      id: 'packing',
      title: '3. Packing and timing',
      blocks: [
        p(
          'Paintings are fragile freight, so every work travels in rigid packaging, protected from damp and deformation and marked “fragile”. The shipment is declared at the price of the work, which is what allows it to be insured.',
        ),
        p(
          'The work is handed to the carrier within 1–3 working days of the order being confirmed. After that the timing is Nova Poshta’s: usually 1–3 days within Ukraine. For an artist’s repetition, the time needed to make it is stated on the work’s page or agreed separately.',
        ),
      ],
    },
    {
      id: 'payment',
      title: '4. Payment methods',
      blocks: [
        p('The site offers:'),
        list(
          'Bank card online — through the LiqPay payment system. Paid in full in advance; the card details are handled by the payment system, and the site neither sees nor stores them.',
          'Bank transfer — using the details shown on your order page. Paid in full in advance; proof of payment can be uploaded there as well.',
          'Cash on delivery — paid on collection at a Nova Poshta branch, where that method is available for the chosen work.',
        ),
        p(
          'The price is fixed in hryvnia when the order is placed. The dollar figure on a work’s page is indicative: the amount is always charged in hryvnia.',
        ),
      ],
    },
    {
      id: 'receiving',
      title: '5. On collection',
      blocks: [
        p(
          'Inspect the packaging at the branch, in the presence of the carrier’s representative. If it is damaged, have a report drawn up on the spot and write to us within 48 hours with photographs of the packaging and the work. That is the only way to show the damage happened in transit.',
        ),
        p(
          `If something has gone wrong, write to us in the support chat on the site or to ${OPERATOR.email}. The terms of return and exchange are on a page of their own.`,
        ),
      ],
    },
  ],
};

export const DELIVERY: LegalDocument = { ua, en };
