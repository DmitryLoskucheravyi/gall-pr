import type { Locale } from '../utils/locale';

// The privacy and cookie statement, in both languages.
//
// Kept as structured data rather than i18n strings: it is long, it is legal
// text that gets revised as a whole, and the cookie table below has to stay
// in step with what the site actually stores (see lib/consent.ts and the
// storage keys it lists). Change a cookie, change this table.
//
// The operator's details are placeholders, the same ones the public offer
// contract still carries. Fill them in here once — every mention on the page
// reads from this object.
export const OPERATOR = {
  name: { ua: '[ПІБ / назва ФОП]', en: '[Full name / sole proprietor]' },
  taxId: '[ІПН / РНОКПП]',
  address: { ua: '[юридична адреса]', en: '[registered address]' },
  email: '[email]',
};

export const PRIVACY_UPDATED = '2026-10-01';

export type PrivacyBlock =
  | { kind: 'p'; text: string }
  | { kind: 'list'; items: string[] }
  | { kind: 'table'; head: string[]; rows: string[][] }
  | { kind: 'cookieSettings' };

export type PrivacySection = { id: string; title: string; blocks: PrivacyBlock[] };

export type PrivacyContent = {
  title: string;
  description: string;
  updatedLabel: string;
  intro: string;
  tocTitle: string;
  cookieSettingsButton: string;
  sections: PrivacySection[];
};

const p = (text: string): PrivacyBlock => ({ kind: 'p', text });
const list = (...items: string[]): PrivacyBlock => ({ kind: 'list', items });

const ua: PrivacyContent = {
  title: 'Політика конфіденційності та cookie',
  description:
    'Які персональні дані збирає галерея Viktorumm, навіщо, кому їх передає, які cookie використовує і як керувати своїми даними.',
  updatedLabel: 'Остання редакція',
  intro:
    'Ця політика пояснює, які дані ми збираємо, коли ви користуєтеся сайтом галереї Viktorumm, навіщо вони нам, кому ми їх передаємо та як ви можете ними керувати. Вона є невід’ємною частиною публічної оферти, за якою продаються роботи на сайті.',
  tocTitle: 'Зміст',
  cookieSettingsButton: 'Змінити налаштування cookie',
  sections: [
    {
      id: 'operator',
      title: '1. Хто обробляє ваші дані',
      blocks: [
        p(
          `Володілець персональних даних — ${OPERATOR.name.ua}, фізична особа-підприємець, ІПН ${OPERATOR.taxId}, адреса: ${OPERATOR.address.ua}. Електронна пошта для питань щодо даних: ${OPERATOR.email}. Також можна написати в чат підтримки на сайті.`,
        ),
      ],
    },
    {
      id: 'data',
      title: '2. Які дані ми збираємо',
      blocks: [
        p('Ми збираємо лише те, що потрібно для роботи сайту та виконання замовлень:'),
        list(
          'Обліковий запис: ім’я, прізвище, email, телефон і адреса, якщо ви їх вказали. Пароль зберігається лише у вигляді незворотного хешу — ми не бачимо його.',
          'Замовлення: ПІБ, телефон, email, адреса доставки або відділення «Нової пошти», коментар до замовлення, спосіб оплати та, якщо ви його завантажили, підтвердження оплати.',
          'Підтримка: повідомлення, які ви пишете в чат підтримки, а також ідентифікатор чату в Telegram, якщо ви підключили нашого бота.',
          'Активність на сайті: роботи, які ви додали в улюблені, вміст кошика, участь у розіграшах.',
          'Технічні дані сесії: тип браузера та пристрою (user agent) для кожного входу — щоб ви бачили свої активні сесії і могли їх завершити.',
        ),
        p(
          'Ми не збираємо дані платіжних карток. Якщо ви оплачуєте онлайн, їх обробляє платіжний сервіс, і до нас вони не потрапляють.',
        ),
      ],
    },
    {
      id: 'purposes',
      title: '3. Навіщо ми їх використовуємо',
      blocks: [
        list(
          'Щоб оформити, оплатити й доставити замовлення та зв’язатися з вами щодо нього — виконання договору.',
          'Щоб вести ваш обліковий запис, кошик і улюблені — виконання договору.',
          'Щоб відповідати на звернення в підтримку та надсилати сповіщення про замовлення email або в Telegram — виконання договору та ваша згода (Telegram ви підключаєте самі).',
          'Щоб захищати сайт і ваш акаунт від несанкціонованого доступу — наш законний інтерес.',
          'Щоб виконувати вимоги законодавства, зокрема податкового та бухгалтерського обліку — юридичний обов’язок.',
        ),
        p('Ми не продаємо ваші дані і не використовуємо їх для реклами.'),
      ],
    },
    {
      id: 'recipients',
      title: '4. Кому ми передаємо дані',
      blocks: [
        p('Лише сервісам, без яких сайт або замовлення не можуть працювати, і лише в потрібному їм обсязі:'),
        list(
          '«Нова пошта» та інші служби доставки — ім’я, телефон і адреса для відправлення.',
          'Платіжні сервіси (LiqPay, WayForPay) — дані, потрібні для проведення оплати, якщо ви оплачуєте онлайн.',
          'Хмарна база даних (TiDB Cloud) — зберігання даних сайту.',
          'Cloudinary — зберігання зображень, зокрема завантажених підтверджень оплати.',
          'Поштовий сервіс — надсилання листів про замовлення та відновлення пароля.',
          'Telegram — сповіщення та підтримка, якщо ви підключили бота.',
        ),
        p(
          'Деякі з цих сервісів розташовані за межами України. Ми передаємо їм дані лише за умови належного рівня захисту. Також ми можемо розкрити дані на законну вимогу державних органів.',
        ),
      ],
    },
    {
      id: 'retention',
      title: '5. Скільки ми зберігаємо дані',
      blocks: [
        list(
          'Обліковий запис — доки ви ним користуєтеся або доки не попросите його видалити.',
          'Замовлення — стільки, скільки вимагає законодавство про бухгалтерський і податковий облік.',
          'Сесії входу — до 30 днів, після чого потрібно увійти знову.',
          'Листування з підтримкою — доки існує ваш обліковий запис або доки ви не попросите його видалити.',
        ),
      ],
    },
    {
      id: 'cookies',
      title: '6. Cookie та сховище браузера',
      blocks: [
        p(
          'Cookie — невеликі файли, які сайт зберігає у вашому браузері. Ми також використовуємо локальне сховище браузера (localStorage), яке працює схоже. Ось усе, що зберігає наш сайт:',
        ),
        {
          kind: 'table',
          head: ['Назва', 'Категорія', 'Для чого', 'Строк'],
          rows: [
            ['gall_refresh', 'Необхідні · cookie', 'Тримає вас у системі. Недоступна скриптам сторінки (httpOnly).', '30 днів'],
            ['gall_guest_token', 'Необхідні · localStorage', 'Дозволяє користуватися кошиком і замовленнями без реєстрації.', 'Доки ви не очистите браузер'],
            ['gall_cookie_consent', 'Необхідні · localStorage', 'Запам’ятовує ваш вибір щодо cookie.', 'Доки ви не очистите браузер'],
            ['gall_theme', 'Необхідні · localStorage', 'Обрана вами тема оформлення — світла чи темна.', 'Доки ви не очистите браузер'],
            ['support-widget-dock', 'Необхідні · localStorage', 'Куди ви перетягнули кнопку підтримки.', 'Доки ви не очистите браузер'],
          ],
        },
        p(
          'Необхідні cookie вимкнути не можна — без них сайт не працює. Аналітичних і рекламних cookie на сайті зараз немає. Якщо ми їх додамо, вони запрацюють лише після вашої згоди, а цю таблицю буде оновлено.',
        ),
        p(
          'Змінити свій вибір можна будь-коли — кнопкою нижче або посиланням «Налаштування cookie» внизу кожної сторінки. Також cookie можна видалити в налаштуваннях браузера.',
        ),
        { kind: 'cookieSettings' },
      ],
    },
    {
      id: 'rights',
      title: '7. Ваші права',
      blocks: [
        p(
          'Відповідно до Закону України «Про захист персональних даних», а для жителів ЄС — Загального регламенту захисту даних (GDPR), ви маєте право:',
        ),
        list(
          'знати, які ваші дані ми обробляємо, і отримати їх копію;',
          'виправити неточні дані — більшість з них можна змінити в профілі;',
          'вимагати видалення даних, якщо їх зберігання не вимагає закон;',
          'заперечити проти обробки або обмежити її;',
          'відкликати згоду в будь-який момент — це не впливає на обробку, яка відбулася до відкликання;',
          'подати скаргу Уповноваженому Верховної Ради України з прав людини або наглядовому органу своєї країни в ЄС.',
        ),
        p(
          `Щоб скористатися правами, напишіть на ${OPERATOR.email} або в чат підтримки. Ми відповімо протягом 30 днів.`,
        ),
      ],
    },
    {
      id: 'security',
      title: '8. Як ми захищаємо дані',
      blocks: [
        p(
          'Сайт працює лише через захищене з’єднання (HTTPS). Паролі зберігаються у вигляді хешу, токен входу недоступний скриптам сторінки, а доступ до даних замовлень має лише власниця галереї.',
        ),
      ],
    },
    {
      id: 'children',
      title: '9. Діти',
      blocks: [
        p(
          'Сайт не призначений для дітей, і ми свідомо не збираємо їхніх даних. Якщо ви вважаєте, що дитина передала нам свої дані, напишіть нам — ми їх видалимо.',
        ),
      ],
    },
    {
      id: 'changes',
      title: '10. Зміни політики',
      blocks: [
        p(
          'Ми можемо оновлювати цю політику. Дата останньої редакції вказана вгорі сторінки. Про суттєві зміни ми повідомимо на сайті.',
        ),
      ],
    },
  ],
};

const en: PrivacyContent = {
  title: 'Privacy and cookie statement',
  description:
    'What personal data the Viktorumm gallery collects, why, who it is shared with, which cookies the site uses and how to manage your data.',
  updatedLabel: 'Last updated',
  intro:
    'This statement explains what data we collect when you use the Viktorumm gallery website, why we need it, who we share it with and how you can control it. It forms part of the public offer under which works on this site are sold.',
  tocTitle: 'Contents',
  cookieSettingsButton: 'Change cookie settings',
  sections: [
    {
      id: 'operator',
      title: '1. Who processes your data',
      blocks: [
        p(
          `The data controller is ${OPERATOR.name.en}, a sole proprietor registered in Ukraine, tax ID ${OPERATOR.taxId}, address: ${OPERATOR.address.en}. Email for data questions: ${OPERATOR.email}. You can also write to the support chat on the site.`,
        ),
      ],
    },
    {
      id: 'data',
      title: '2. What data we collect',
      blocks: [
        p('We collect only what the site and your orders need:'),
        list(
          'Account: first and last name, email, and phone and address if you add them. Your password is stored only as an irreversible hash — we cannot see it.',
          'Orders: full name, phone, email, delivery address or Nova Poshta branch, order comment, payment method and, if you upload one, proof of payment.',
          'Support: messages you write in the support chat, and your Telegram chat ID if you connect our bot.',
          'Activity on the site: works you add to favourites, your cart, and giveaway entries.',
          'Session data: the browser and device type (user agent) of each sign-in, so you can see your active sessions and end them.',
        ),
        p(
          'We do not collect card details. If you pay online, the payment provider handles them and they never reach us.',
        ),
      ],
    },
    {
      id: 'purposes',
      title: '3. Why we use it',
      blocks: [
        list(
          'To place, pay for and deliver your order and contact you about it — performance of a contract.',
          'To run your account, cart and favourites — performance of a contract.',
          'To answer support requests and send order notifications by email or Telegram — performance of a contract and your consent (you connect Telegram yourself).',
          'To protect the site and your account from unauthorised access — our legitimate interest.',
          'To meet legal obligations, including tax and accounting rules — legal obligation.',
        ),
        p('We do not sell your data and do not use it for advertising.'),
      ],
    },
    {
      id: 'recipients',
      title: '4. Who we share it with',
      blocks: [
        p('Only with services the site or your order cannot work without, and only as much as each needs:'),
        list(
          'Nova Poshta and other carriers — name, phone and address for shipping.',
          'Payment providers (LiqPay, WayForPay) — the data needed to take a payment, if you pay online.',
          'Cloud database (TiDB Cloud) — storage of the site’s data.',
          'Cloudinary — image storage, including uploaded proofs of payment.',
          'An email service — order emails and password resets.',
          'Telegram — notifications and support, if you connect the bot.',
        ),
        p(
          'Some of these services are located outside Ukraine. We share data with them only where it is adequately protected. We may also disclose data when lawfully required by public authorities.',
        ),
      ],
    },
    {
      id: 'retention',
      title: '5. How long we keep it',
      blocks: [
        list(
          'Account — for as long as you use it or until you ask us to delete it.',
          'Orders — for as long as accounting and tax law requires.',
          'Sign-in sessions — up to 30 days, after which you sign in again.',
          'Support conversations — for as long as your account exists or until you ask us to delete them.',
        ),
      ],
    },
    {
      id: 'cookies',
      title: '6. Cookies and browser storage',
      blocks: [
        p(
          'Cookies are small files a site stores in your browser. We also use the browser’s local storage (localStorage), which works in a similar way. This is everything our site stores:',
        ),
        {
          kind: 'table',
          head: ['Name', 'Category', 'Purpose', 'Duration'],
          rows: [
            ['gall_refresh', 'Necessary · cookie', 'Keeps you signed in. Not readable by scripts on the page (httpOnly).', '30 days'],
            ['gall_guest_token', 'Necessary · localStorage', 'Lets you use the cart and orders without an account.', 'Until you clear your browser'],
            ['gall_cookie_consent', 'Necessary · localStorage', 'Remembers your cookie choice.', 'Until you clear your browser'],
            ['gall_theme', 'Necessary · localStorage', 'The theme you chose — light or dark.', 'Until you clear your browser'],
            ['support-widget-dock', 'Necessary · localStorage', 'Where you dragged the support button.', 'Until you clear your browser'],
          ],
        },
        p(
          'Necessary cookies cannot be switched off — the site does not work without them. There are no analytics or advertising cookies on the site at the moment. If we add any, they will only run after you agree, and this table will be updated.',
        ),
        p(
          'You can change your choice at any time with the button below or the “Cookie settings” link at the bottom of every page. You can also delete cookies in your browser settings.',
        ),
        { kind: 'cookieSettings' },
      ],
    },
    {
      id: 'rights',
      title: '7. Your rights',
      blocks: [
        p(
          'Under the Law of Ukraine “On Personal Data Protection” and, for residents of the EU, the General Data Protection Regulation (GDPR), you have the right to:',
        ),
        list(
          'know what data of yours we process and get a copy of it;',
          'correct inaccurate data — most of it can be changed in your profile;',
          'have your data deleted where the law does not require us to keep it;',
          'object to or restrict processing;',
          'withdraw consent at any time — this does not affect processing that happened before;',
          'complain to the Ukrainian Parliament Commissioner for Human Rights or to the supervisory authority of your EU country.',
        ),
        p(
          `To use these rights, write to ${OPERATOR.email} or to the support chat. We will reply within 30 days.`,
        ),
      ],
    },
    {
      id: 'security',
      title: '8. How we protect it',
      blocks: [
        p(
          'The site works only over a secure connection (HTTPS). Passwords are stored as hashes, the sign-in token cannot be read by scripts on the page, and only the gallery owner has access to order data.',
        ),
      ],
    },
    {
      id: 'children',
      title: '9. Children',
      blocks: [
        p(
          'The site is not intended for children, and we do not knowingly collect their data. If you believe a child has given us their data, write to us and we will delete it.',
        ),
      ],
    },
    {
      id: 'changes',
      title: '10. Changes to this statement',
      blocks: [
        p(
          'We may update this statement. The date of the latest version is shown at the top of the page. We will announce significant changes on the site.',
        ),
      ],
    },
  ],
};

export const PRIVACY: Record<Locale, PrivacyContent> = { ua, en };
