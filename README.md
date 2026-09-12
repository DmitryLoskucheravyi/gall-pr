# Gallery — платформа для продажу живопису

Онлайн-галерея картин: каталог і сторінка твору, кошик і оформлення замовлення
(зокрема без реєстрації), онлайн-оплата, доставка Новою поштою, живий чат
підтримки, розіграші, новини, розсилки та адмін-панель.

---

## Зміст

- [Архітектура](#архітектура)
- [Структура репозиторію](#структура-репозиторію)
- [Backend (`/backend`)](#backend-backend)
- [Веб-застосунок (`/web`)](#веб-застосунок-web)
- [База даних](#база-даних)
- [Автентифікація та безпека](#автентифікація-та-безпека)
- [Ключові флоу](#ключові-флоу)
- [API Endpoints](#api-endpoints)
- [Стилізація](#стилізація)
- [Технологічний стек](#технологічний-стек)
- [Запуск проєкту](#запуск-проєкту)
- [Змінні середовища](#змінні-середовища)
- [Деплой](#деплой)

---

## Архітектура

```
┌──────────────────────────────────────────────────────────────────┐
│                 WEB (React 19 + Vite, SPA)                       │
│  сторінки · React Query (сервісний стан) · Redux Toolkit (auth,  │
│  тема, тости) · SCSS-модулі · socket.io-client (чат)             │
└──────────────────────────────────────────────────────────────────┘
              │ HTTPS (Axios, Bearer + httpOnly refresh-cookie)
              │ WebSocket (підтримка)
              ▼
┌──────────────────────────────────────────────────────────────────┐
│                        BACKEND (NestJS 11)                       │
│                                                                  │
│  auth · users · paintings · materials · techniques · cart        │
│  orders · payments · settings · likes · support (WS) · giveaways │
│  news · uploads · nova-poshta · telegram · mail                  │
│                                                                  │
│  helmet · CORS-allowlist · ValidationPipe · Throttler            │
└──────────────────────────────────────────────────────────────────┘
        │ TypeORM (MySQL-протокол, SSL)      │ зовнішні сервіси
        ▼                                    ▼
┌────────────────────────┐   ┌─────────────────────────────────────┐
│  TiDB / MySQL, 16      │   │ Cloudinary · LiqPay · WayForPay     │
│  таблиць (db.sql)      │   │ Нова пошта · SMTP · Telegram Bot    │
└────────────────────────┘   └─────────────────────────────────────┘
```

Продакшн: статика веба на Cloudflare Pages, backend у Docker на дроплеті
з Caddy попереду, обидва за Cloudflare — подробиці у [`deploy/README.md`](deploy/README.md).

---

## Структура репозиторію

```
gall_pr/
├── backend/            # NestJS API
├── web/                # Vite + React SPA
├── deploy/             # Caddyfile, prod-compose, інструкція деплою
├── docker-compose.yml  # локальний запуск backend у Docker
└── db.sql              # повна схема БД, згенерована з живої бази
```

---

## Backend (`/backend`)

### Структура

```
backend/
├── src/
│   ├── main.ts                 # bootstrap: helmet, cookie-parser, CORS, ValidationPipe
│   ├── app.module.ts           # TypeORM, ThrottlerModule, реєстрація модулів
│   │
│   ├── auth/                   # JWT: реєстрація, вхід, refresh, logout
│   │   ├── auth.cookie.ts      # єдине місце, що описує refresh-cookie
│   │   ├── guards/             # JwtAuthGuard, OptionalJwtAuthGuard, RolesGuard
│   │   ├── strategies/         # passport-jwt
│   │   └── decorators/         # @Roles()
│   │
│   ├── users/                  # користувачі, привʼязка Telegram
│   ├── paintings/              # каталог: CRUD, фільтри, діапазон цін
│   ├── materials/              # довідник матеріалів
│   ├── techniques/             # довідник технік
│   ├── cart/                   # кошик користувача і гостя
│   ├── orders/                 # оформлення, статуси, підтвердження оплати, замовлення на роботу
│   ├── payments/               # LiqPay / WayForPay + перевірка підписів колбеків
│   ├── nova-poshta/            # міста, відділення, вартість доставки
│   ├── support/                # чат підтримки (HTTP + WebSocket-шлюз)
│   ├── giveaways/              # розіграші та учасники
│   ├── news/                   # новини
│   ├── likes/                  # уподобані картини
│   ├── settings/               # налаштування магазину + FAQ
│   ├── mail/                   # outbox-черга листів і диспетчер SMTP
│   ├── telegram/               # бот-сповіщення (grammy, long polling)
│   ├── uploads/                # Cloudinary + перевірка сигнатури файлу
│   ├── common/                 # identity, throttler-guard, опції завантаження
│   └── config/                 # cors.ts, proxy.ts, secrets.ts
│
├── Dockerfile
├── .env.example
└── package.json
```

### Опис ключових модулів

**`main.ts`** — HTTPS вмикається сам, якщо в `./cert` лежить сертифікат (у розробці
це сертифікат Tailscale); інакше — звичайний HTTP, і TLS термінує Caddy. Тут же
`helmet`, `cookie-parser`, глобальний `ValidationPipe({ whitelist, transform })`,
CORS з `credentials: true` та `trust proxy` за `TRUST_PROXY`.

**`app.module.ts`** — TypeORM із `synchronize: false` (схема живе в `db.sql`,
не генерується з ентіті) та обовʼязковим SSL; глобальний Throttler зі стелею
120 запитів/хв, поверх якої окремі маршрути мають суворіші `@Throttle`.

**`auth/`** — access-токен у відповіді, refresh-токен — у httpOnly-cookie
`gall_refresh` з `path=/auth`. Токени підписуються **різними** секретами, щоб
access-токен структурно не міг зійти за refresh. `OptionalJwtAuthGuard` дає
маршрутам працювати і для гостя (кошик, замовлення, чат).

**`orders/`** — оформлення для користувача і для гостя, скасування, підтвердження
оплати завантаженим скріншотом, адмінські статуси, архівація, лист-вибачення,
а також окремий тип замовлення — картина на замовлення (`POST /orders/commission`).

**`payments/`** — спільний інтерфейс шлюзу. Шлюз без ключів просто не
пропонується, а його колбек відхиляється, а не приймається на віру: непідписаний
ключ не може перевірити підпис. Суми звіряються в копійках з допуском 1 копійка.

**`support/`** — чат на socket.io. Гість ідентифікується `X-Guest-Token`,
адресу клієнта беруть за тим самим правилом, що й HTTP-throttler (заголовки
проксі — лише якщо проксі оголошено). Є presence і rate-limit сервіси.

**`mail/`** — лист спершу рендериться і **записується** в `mail_outbox`, і лише
потім диспетчер віддає його SMTP. Пʼять спроб із backoff 1 хв → 5 хв → 15 хв →
1 год → 6 год; без `SMTP_*` листи позначаються як пропущені, а не губляться.

**`telegram/`** — бот на grammy у режимі long polling, тож публічний URL не
потрібен. Без `TELEGRAM_BOT_TOKEN` кожен виклик — залогований no-op.

**`uploads/`** — Multer пише файл під випадковим імʼям із whitelisted-розширенням,
далі перевіряються **магічні байти** (JPEG/PNG/WebP/HEIC), і лише потім файл їде
в Cloudinary. Ліміт — 10 МБ.

---

## Веб-застосунок (`/web`)

### Структура

```
web/
├── src/
│   ├── main.tsx / App.tsx
│   ├── routes/               # router.tsx, ProtectedRoute
│   ├── pages/                # сторінки, зокрема pages/admin/*
│   ├── components/           # UI, layout, support, admin
│   ├── hooks/
│   │   ├── queries/          # usePaintings, useCart, useOrders, useSupport…
│   │   └── mutations/        # useCheckoutMutation, useLikeMutation…
│   ├── api/                  # тонкі обгортки над axios-клієнтом
│   ├── store/slices/         # authSlice, themeSlice, toastSlice
│   ├── lib/                  # queryClient, queryKeys
│   ├── styles/               # global.scss, _variables.scss, _mixins.scss
│   ├── types/
│   └── utils/                # guestToken, imageUrl, safeUrl, edition, plural…
├── .env.example
└── vite.config.ts
```

### Маршрути

| Шлях | Сторінка |
|------|----------|
| `/` | Головна |
| `/catalog` | Каталог із фільтрами |
| `/gallery` | Галерея |
| `/painting/:id` | Сторінка картини |
| `/giveaways/:id` | Розіграш |
| `/cart`, `/orders` | Кошик, замовлення |
| `/login`, `/register` | Автентифікація |
| `/support`, `/support/chat` | FAQ і чат (чат відкритий і для гостей) |
| `/profile`, `/favorites` | Потребують входу |
| `/admin/{dictionaries,users,orders,settings,support,giveaways,mail}` | Лише для `ADMIN` |

### Підходи

**Розділення стану.** Серверні дані — у TanStack Query (ключі зібрані в
`lib/queryKeys.ts`); Redux Toolkit тримає лише те, що справді клієнтське: сесію,
тему й тости. У localStorage зберігається **тільки тема** — сесія живе в
httpOnly-cookie й відновлюється на старті (`auth/bootstrap.ts`).

**Axios-клієнт** (`api/client.ts`) додає `Authorization` або `X-Guest-Token`
(ніколи обидва), а на 401 виконує single-flight refresh: паралельні 401
чекають один спільний запит, бо backend ротує refresh-токен на кожному
використанні й два одночасні оновлення побили б одне одного.

**Ліниві сторінки** — усі маршрути через `React.lazy`.

---

## База даних

`db.sql` — **повна** схема, згенерована з живої бази (TiDB, сумісний із MySQL),
без даних. Це не набір міграцій: після зміни схеми файл треба перегенерувати.

16 таблиць:

| Група | Таблиці |
|-------|---------|
| Люди | `users`, `telegram_pending_links` |
| Каталог | `paintings`, `materials`, `techniques`, `likes` |
| Продажі | `cart_items`, `orders`, `order_items` |
| Комунікація | `support_chats`, `support_messages`, `mail_outbox`, `news` |
| Активності | `giveaways`, `giveaway_participants` |
| Конфігурація | `app_settings` |

### Основні сутності

```typescript
User {
  id: number; email: string; firstName?: string; lastName?: string
  phone: string; addres?: string            // назва колонки саме така
  role: 'USER' | 'ADMIN'; isActive: boolean
  refreshToken?: string
  telegramChatId?: string; telegramLinkCode?: string
  createdAt: Date; updatedAt: Date
}

Painting {
  id: number; title: string; subtitle?: string
  cardImage: string; images: string[]; interiorImages?: string[]
  animation3dImage?: string                 // кадр для 3D-перегляду
  price: number; amount: number
  isAvailable: boolean; isFeatured: boolean; isRepeatable: boolean
  materialId?: number; techniqueId?: number
  width?: number; height?: number; weight?: number; year?: number
  likesCount: number; description: string
  createdAt: Date; updatedAt: Date
}

Order {
  id: number
  userId?: number | guestToken?: string     // замовлення гостя
  guestName?, guestEmail?, guestPhone?, guestAddress?
  status: 'PENDING' | 'CONFIRMED' | 'SHIPPED' | 'CANCELLED' | 'COMPLETED'
  paymentProvider: 'LIQPAY' | 'WAYFORPAY' | 'CASH_ON_DELIVERY'
                 | 'CARD_TRANSFER' | 'ON_AGREEMENT'
  paymentStatus: 'PENDING' | 'PAID' | 'FAILED'; paymentTransactionId?: string
  paymentProofUrl?: string
  deliveryMethod: 'NOVA_POSHTA'
  novaPoshtaCity?, novaPoshtaWarehouse?, trackingNumber?
  total: number; deliveryCost: number; codFee: number
  isCommission: boolean; isArchived: boolean; callMeRequested: boolean
  comment?: string; contactHandle?: string
}
```

---

## Автентифікація та безпека

**Два секрети, не один.** `JWT_SECRET` і `JWT_REFRESH_SECRET` мають бути різні
й не коротші за 32 символи — інакше процес не стартує (`config/secrets.ts`).
Дефолтне значення тут було б секретом, відомим усім, хто читав репозиторій.

**Refresh у httpOnly-cookie.** `gall_refresh`, `Secure`, `SameSite=Lax`,
`path=/auth`, 30 днів. Скрипт на сторінці його не прочитає, тож XSS може діяти,
поки виконується, але не може винести облікові дані. Решта API працює на
Bearer-заголовку, тому CSRF-поверхні там немає.

**CORS — явний список** із `CORS_ORIGINS` (або `WEB_URL`). Поза продакшном
додатково дозволені localhost і приватні діапазони, бо адреса машини в розробці
змінюється; у продакшні — тільки список.

**Throttling** з урахуванням проксі. `TRUST_PROXY` за замовчуванням вимкнено:
переслані адреси — це лише заголовки, і довіра до них без проксі попереду
роздає атакувальнику по власному ліміту на кожну підроблену адресу. Суворіші
ліміти стоять на реєстрації (5/год), вході (10/хв), Telegram-кодах, злитті
гостьового кошика та завантаженні підтверджень оплати.

**Гість — це токен.** `X-Guest-Token` звʼязує кошик, замовлення й чат до входу;
після реєстрації вони «переносяться» на акаунт (`/cart/merge`,
`/orders/claim-guest`, `/support/claim-guest-chat`).

**Завантаження** перевіряються за вмістом, а не за `Content-Type`, і зберігаються
під згенерованим імʼям — маршрут підтвердження оплати доступний і анонімам.

---

## Ключові флоу

### Реєстрація та вхід

```
POST /auth/register | /auth/login
  → bcrypt, видача access-токена в тілі + refresh у httpOnly-cookie
  → web: accessToken у Redux (памʼять), користувач із GET /auth/me
```

### Поновлення сесії

```
Старт застосунку або 401 → POST /auth/refresh (cookie летить сама)
  → backend перевіряє й ротує refresh-токен
  → новий accessToken; паралельні 401 чекають один спільний запит
```

### Оформлення замовлення

```
Кошик (користувач або гість) → POST /orders/checkout
  → ref міста й відділення резолвляться на сервері (ціна доставки й адреса
    мають походити з одного джерела)
  → створення Order + OrderItem, списання наявності
  → LIQPAY/WAYFORPAY: форма оплати; колбек із перевіркою підпису й суми
    → payment_status = PAID
  → лист у mail_outbox + сповіщення в Telegram
```

### Чат підтримки

```
Клієнт (з акаунтом або з X-Guest-Token) відкриває сокет
  → gateway ідентифікує, кладе в кімнати, віддає історію
  → повідомлення адміну дублюється в Telegram; відповідь з Telegram
    повертається в той самий чат
```

---

## API Endpoints

Базова адреса — `http://localhost:3001`. 🔒 — потрібен вхід, 👑 — роль `ADMIN`,
◐ — працює і для гостя за `X-Guest-Token`.

### Auth

| Метод | Шлях | Опис |
|-------|------|------|
| POST | `/auth/register` | Реєстрація (5/год) |
| POST | `/auth/login` | Вхід (10/хв) |
| GET | `/auth/me` 🔒 | Поточний користувач |
| POST | `/auth/refresh` | Оновлення access-токена з cookie |
| POST | `/auth/logout` | Вихід, очищення cookie |

### Каталог і довідники

| Метод | Шлях | Опис |
|-------|------|------|
| GET | `/paintings` | Каталог: `page`, `limit`, `techniqueId`, `isAvailable`, `minPrice`, `maxPrice` |
| GET | `/paintings/price-range` | Мін./макс. ціна для фільтра |
| GET | `/paintings/:id` | Деталі картини |
| POST · PATCH · DELETE | `/paintings[/:id]` 👑 | Керування каталогом |
| GET · POST · PATCH · DELETE | `/materials[/:id]` | Читання відкрите, зміни 👑 |
| GET · POST · PATCH · DELETE | `/techniques[/:id]` | Читання відкрите, зміни 👑 |

### Кошик і замовлення

| Метод | Шлях | Опис |
|-------|------|------|
| GET · POST · DELETE | `/cart` ◐ | Переглянути, додати, очистити |
| PATCH · DELETE | `/cart/:paintingId` ◐ | Кількість, видалення позиції |
| POST | `/cart/merge` 🔒 | Перенести гостьовий кошик на акаунт |
| POST | `/orders/checkout` ◐ | Оформлення |
| POST | `/orders/commission` ◐ | Замовлення картини на замовлення (5/год) |
| GET | `/orders` ◐ · `/orders/:id` ◐ | Свої замовлення |
| PATCH | `/orders/:id/cancel` ◐ | Скасування |
| POST | `/orders/:id/payment-proof` ◐ | Скріншот оплати (10/год) |
| POST | `/orders/claim-guest` 🔒 | Привласнити гостьові замовлення |
| GET | `/orders/all` 👑 | Усі замовлення |
| PATCH | `/orders/:id/status` · `/payment-status` · `/archive` 👑 | Адмінські зміни |
| POST | `/orders/:id/status-mail` · `/apology-mail` 👑 | Листи клієнту |
| DELETE | `/orders/:id` 👑 | Видалення |
| POST | `/payments/liqpay/callback` · `/payments/wayforpay/callback` | Колбеки шлюзів |

### Доставка

| Метод | Шлях | Опис |
|-------|------|------|
| GET | `/nova-poshta/cities` · `/warehouses` | Пошук міст і відділень (30/хв) |
| GET | `/nova-poshta/delivery-price` ◐ | Розрахунок вартості |

### Взаємодія

| Метод | Шлях | Опис |
|-------|------|------|
| POST | `/likes/:paintingId` 🔒 | Перемкнути вподобання |
| GET | `/likes/mine` · `/likes/paintings` 🔒 | ID та самі картини |
| GET | `/giveaways` · `/giveaways/:id` | Розіграші |
| GET · POST | `/giveaways/:id/my-status` · `/join` 🔒 | Статус і участь |
| POST · PATCH · DELETE | `/giveaways[/:id]` 👑 | Керування розіграшами |
| GET | `/news` | Новини (зміни 👑) |
| GET | `/support/my-chat` ◐ · `/my-chat/unread` ◐ | Свій чат |
| POST | `/support/claim-guest-chat` 🔒 | Привласнити гостьовий чат |
| GET | `/support/chats` · `/support/chats/:id/messages` 👑 | Адмін-панель чатів |
| WS | `/support` (socket.io) | Живі повідомлення підтримки |

### Налаштування, розсилки, файли

| Метод | Шлях | Опис |
|-------|------|------|
| GET | `/settings` · `/settings/faq` | Публічні налаштування і FAQ |
| GET · PATCH | `/settings/admin` · `/settings` 👑 | Повні налаштування |
| POST · DELETE | `/settings/telegram-link-code` · `/settings/telegram-link` 👑 | Привʼязка Telegram магазину |
| POST · PATCH · DELETE | `/settings/faq[/:id]`, `/settings/faq/reorder` 👑 | Керування FAQ |
| POST · DELETE | `/users/me/telegram-link-code[/redeem]`, `/users/me/telegram-link` 🔒 | Привʼязка Telegram користувача |
| GET · DELETE | `/users` · `/users/:id` 👑 | Користувачі |
| GET · DELETE · POST | `/mail/outbox[...]` 👑 | Черга листів, повтор, очищення |
| POST | `/uploads/image` 👑 | Завантаження зображення в Cloudinary |

---

## Стилізація

SCSS-модулі на компонент плюс токени в CSS-змінних; перемикання теми — клас
`.dark` на корені, значення в `styles/global.scss`.

**Світла тема — «Porcelain Veil / Stone Moss / Warm Pebble»:**

```scss
--color-background: #eee9e4;   // Porcelain Veil
--color-surface:    #f6f6f1;
--color-primary:    #4f5340;   // заливка кнопок і активних елементів
--color-accent:     #6d705a;   // Stone Moss
--color-accent-text:#545845;   // глибший зріз для тексту й посилань
--color-text:       #24231e;
--color-border:     #d5d7c7;
```

**Темна — «Obsidian Veil / Moss Shadow / Graphite Ash»** (`#1b1a17`, `#24271f`,
світліший зріз мохового як `--color-primary`).

Акцент навмисно розділено на три ролі: Stone Moss достатньо темний, щоб нести
світлий текст на собі, але як текст на тлі сторінки дає лише 4.2:1 — нижче AA.
Тому заливка й текстовий колір — різні токени, а обидві теми лишаються
взаємозамінними, бо кожен споживач бере колір за роллю, а не за відтінком.

Шрифт — Tenor Sans; на мобільному герої додаються Rubik 900 і Cormorant
Garamond. Решта масштабів (відступи, радіуси, motion, брейкпойнти) — у
`styles/_variables.scss`.

---

## Технологічний стек

### Backend

| Технологія | Версія |
|------------|--------|
| Node.js | 24 (образ `node:24-slim`) |
| NestJS | 11.x |
| TypeORM | 1.x + mysql2 3.x |
| TiDB / MySQL | сумісні з MySQL 8 |
| Passport + JWT | 11.x |
| socket.io | 4.8.x |
| Cloudinary · Multer | 2.x · 2.x |
| grammy (Telegram) | 1.45.x |
| nodemailer | 9.x |
| helmet · @nestjs/throttler | 8.x · 6.x |
| bcrypt · class-validator | 6.x · 0.15.x |
| Jest | 30.x |

### Web

| Технологія | Версія |
|------------|--------|
| React | 19.2.x |
| Vite | 8.x |
| TypeScript | 6.x |
| TanStack Query | 5.x |
| Redux Toolkit · react-redux | 2.x · 9.x |
| React Router | 7.x |
| Axios · socket.io-client | 1.18.x · 4.8.x |
| Sass (SCSS-модулі) | 1.101.x |
| Oxlint | 1.x |

### Інфраструктура

Cloudinary CDN · Cloudflare Pages (веб) · Docker + Caddy на DigitalOcean (API) ·
TiDB Cloud (БД).

---

## Запуск проєкту

### Backend

```bash
cd backend
npm install
cp .env.example .env      # заповнити: без JWT-секретів процес не стартує
npm run start:dev
```

API підніметься на `http://localhost:3001` (або HTTPS, якщо в `backend/cert`
лежать `key.pem` і `cert.pem`).

У Docker:

```bash
docker compose up -d --build
```

### Web

```bash
cd web
npm install
cp .env.example .env
npm run dev               # Vite
npm run build             # tsc -b && vite build
npm run lint              # oxlint
```

### База даних

```bash
mysql -h <host> -P 4000 -u <user> -p <database> < db.sql
```

`db.sql` створює порожню схему цілком (`DROP TABLE IF EXISTS` на кожній
таблиці), тож на базі з даними виконувати його не можна.

---

## Змінні середовища

### Backend (`backend/.env`) — повний перелік із коментарями у `.env.example`

| Змінна | Призначення |
|--------|-------------|
| `JWT_SECRET`, `JWT_REFRESH_SECRET` | Обовʼязкові, різні, ≥32 символи |
| `DB_HOST`, `DB_PORT`, `DB_USERNAME`, `DB_PASSWORD`, `DB_DATABASE` | Підключення до БД (SSL обовʼязковий) |
| `NODE_ENV`, `PORT` | `production` у продакшні; порт за замовчуванням 3001 |
| `CORS_ORIGINS` / `WEB_URL` | Дозволені origin-и, через кому |
| `TRUST_PROXY` | Кількість проксі попереду (`2` у продакшні) |
| `CLOUDINARY_*` | Завантаження зображень |
| `LIQPAY_*`, `WAYFORPAY_*` | Платіжні шлюзи (необовʼязкові) |
| `PAYMENTS_CALLBACK_URL` | Публічна адреса для колбеків |
| `NOVA_POSHTA_API_KEY` | Міста, відділення, тарифи |
| `SMTP_*` | Пошта; без них листи позначаються пропущеними |
| `TELEGRAM_BOT_TOKEN` | Без нього сповіщення — залоговані no-op |

### Web (`web/.env`)

| Змінна | Призначення |
|--------|-------------|
| `VITE_API_URL` | Адреса API (типово `http://localhost:3001`) |
| `VITE_TELEGRAM_BOT_USERNAME` | Імʼя бота для привʼязки акаунта |
| `VITE_QUERY_DEVTOOLS` | Панель React Query у dev, типово `false` |

---

## Деплой

Покрокова інструкція, включно з налаштуваннями Cloudflare, які не живуть у
репозиторії, — [`deploy/README.md`](deploy/README.md).

```sh
API_DOMAIN=api.viktorumm.com docker compose -f deploy/docker-compose.prod.yml up -d
```

---

## Ключові файли

| Файл | Призначення |
|------|-------------|
| [db.sql](db.sql) | Повна схема БД |
| [backend/.env.example](backend/.env.example) | Опис усіх змінних середовища backend |
| [backend/src/config/secrets.ts](backend/src/config/secrets.ts) | Чому процес падає без секретів |
| [backend/src/config/cors.ts](backend/src/config/cors.ts) | Політика origin-ів |
| [backend/src/config/proxy.ts](backend/src/config/proxy.ts) | `TRUST_PROXY` і клієнтські адреси |
| [backend/src/auth/auth.cookie.ts](backend/src/auth/auth.cookie.ts) | Форма refresh-cookie |
| [web/src/api/client.ts](web/src/api/client.ts) | Токени, гостьовий заголовок, single-flight refresh |
| [web/src/styles/global.scss](web/src/styles/global.scss) | Палітра й теми |
| [deploy/README.md](deploy/README.md) | Деплой |
