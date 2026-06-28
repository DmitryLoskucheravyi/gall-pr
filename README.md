# Gallery — Платформа для продажу живопису

Повнофункціональний застосунок (мобільний та веб) для онлайн-галереї картин із системою управління користувачами, каталогом творів та автентифікацією на основі JWT.

---

## Зміст

- [Архітектура проекту](#архітектура-проекту)
- [Структура проекту](#структура-проекту)
- [Основні сутності](#основні-сутності)
- [Патерни та підходи](#патерни-та-підходи)
- [Флоу операцій](#флоу-операцій)
- [Стилізація](#стилізація)
- [Технологічний стек](#технологічний-стек)
- [API Endpoints](#api-endpoints)
- [Запуск проекту](#запуск-проекту)
- [Змінні середовища](#змінні-середовища)

---

## Архітектура проекту

Проект побудований за класичною архітектурою **клієнт–сервер**:

```
┌─────────────────────────────────────────────────────────────┐
│                    FRONTEND (React Native)                  │
│                                                             │
│  ┌───────────────────────────────────────────────────────┐  │
│  │  Screens: Home, Catalog, Painting, Profile, Auth      │  │
│  │  Components: UI-елементи, меню, форми                 │  │
│  │  Store: Zustand (Auth, Theme, UI State)               │  │
│  │  Hooks: власні React-хуки                             │  │
│  └───────────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────────┘
                         ↓ HTTP API (Axios)
┌─────────────────────────────────────────────────────────────┐
│                     BACKEND (NestJS)                        │
│                                                             │
│  ┌─────────────┐  ┌──────────────┐  ┌──────────────────┐    │
│  │  Auth       │  │  Users       │  │  Paintings       │    │
│  │  Module     │  │  Module      │  │  Module          │    │
│  └─────────────┘  └──────────────┘  └──────────────────┘    │
│  ┌──────────────────────────────────────────────────────┐   │
│  │         Uploads Module (Cloudinary Integration)      │   │
│  └──────────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────┘
                         ↓ TypeORM
┌─────────────────────────────────────────────────────────────┐
│                     MySQL Database (galleryDB)              │
│                                                             │
│           ┌──────────────┐        ┌───────────────┐         │
│           │    users     │        │   paintings   │         │
│           └──────────────┘        └───────────────┘         │
└─────────────────────────────────────────────────────────────┘
```

---

## Структура проекту

### Кореневий рівень

```
gall_pr/
├── backend/        # NestJS-застосунок
├── frontend/       # React Native-застосунок
├── db.sql          # SQL-скрипти для ініціалізації БД
└── .git/           # Git-репозиторій
```

---

## Backend (`/backend`)

### Структура

```
backend/
├── src/
│   ├── main.ts                     # Точка входу застосунку
│   ├── app.module.ts               # Кореневий модуль
│   ├── app.controller.ts           # Основний контролер
│   ├── app.service.ts              # Основний сервіс
│   │
│   ├── auth/                       # Модуль автентифікації
│   │   ├── auth.controller.ts
│   │   ├── auth.service.ts
│   │   ├── auth.module.ts
│   │   ├── decorators/
│   │   ├── dto/
│   │   ├── guards/
│   │   └── strategies/
│   │
│   ├── users/                      # Модуль користувачів
│   │   ├── users.controller.ts
│   │   ├── users.service.ts
│   │   ├── users.module.ts
│   │   ├── entities/
│   │   └── dto/
│   │
│   ├── paintings/                  # Модуль картин
│   │   ├── paintings.controller.ts
│   │   ├── paintings.service.ts
│   │   ├── paintings.module.ts
│   │   ├── entities/
│   │   └── dto/
│   │
│   └── uploads/                    # Модуль завантаження файлів
│       ├── uploads.controller.ts
│       ├── uploads.service.ts
│       └── uploads.module.ts
│
├── test/
├── package.json
├── tsconfig.json
└── .env
```

### Опис ключових модулів

**`app.module.ts`** — кореневий модуль. Містить конфігурацію TypeORM і MySQL, реєстрацію всіх підмодулів (Auth, Users, Paintings, Uploads), а також налаштування глобальних сервісів.

**`main.ts`** — точка входу. Відповідає за запуск NestJS-застосунку, конфігурацію CORS та підключення middleware.

**`auth/`** — модуль автентифікації. Реалізує видачу та перевірку JWT-токенів (access + refresh), Passport-стратегії, Guards для захисту приватних ендпоінтів, а також реєстрацію та вхід користувачів.

**`users/`** — модуль користувачів. Забезпечує операції з профілем, отримання даних користувача та управління ролями (`USER`, `ADMIN`).

**`paintings/`** — модуль картин. Реалізує повний CRUD для каталогу, фільтрацію та пошук.

**`uploads/`** — модуль завантажень. Відповідає за інтеграцію з Cloudinary: обробку файлів через Multer, завантаження на CDN та повернення публічних URL.

---

## Frontend (`/frontend`)

### Структура

```
frontend/
├── src/
│   ├── App.tsx                     # Точка входу застосунку
│   ├── index.ts                    # Конфігурація Expo
│   │
│   ├── screens/                    # Екрани застосунку
│   │   ├── HomeScreen.tsx
│   │   ├── LoginScreen.tsx
│   │   ├── RegisterScreen.tsx
│   │   ├── ProfileScreen.tsx
│   │   ├── CatalogScreen.tsx
│   │   ├── PaintingScreen.tsx
│   │   └── stydel/                 # Стилізовані компоненти екранів
│   │
│   ├── components/                 # UI-компоненти
│   │   ├── admin/
│   │   ├── layout/
│   │   ├── menu/
│   │   └── ...
│   │
│   ├── navigation/
│   │   ├── AppNavigator.tsx
│   │   └── BottomMenu.tsx
│   │
│   ├── store/                      # Zustand-сховища
│   │   ├── authStore.ts
│   │   ├── themeStore.ts
│   │   └── UIStore.ts
│   │
│   ├── hooks/
│   │   ├── useTheme.ts
│   │   └── ...
│   │
│   ├── theme/
│   │   ├── colors.ts
│   │   └── styled.d.ts
│   │
│   ├── api/
│   │   └── index.ts
│   │
│   ├── auth/
│   │   └── bootstrap.ts
│   │
│   └── types/
│       ├── auth.types.ts
│       ├── painting.types.ts
│       └── create-painting.types.ts
│
├── android/
├── assets/
├── package.json
├── app.json
└── tsconfig.json
```

### Опис ключових файлів

**`App.tsx`** — ініціалізує Zustand-сховища, налаштовує ThemeProvider та підключає AppNavigator.

**`screens/`** — екрани застосунку: `HomeScreen` (головна з топ-картинами), `LoginScreen`, `RegisterScreen`, `ProfileScreen`, `CatalogScreen` (повний каталог з пагінацією), `PaintingScreen` (детальний перегляд картини).

**`navigation/AppNavigator.tsx`** — Stack Navigator з анімаціями переходів та глобальним меню.

**`store/`** — управління станом через Zustand: `authStore` (користувач, токени, статус автентифікації), `themeStore` (тема оформлення), `UIStore` (глобальні UI-стани).

**`api/index.ts`** — конфігурація Axios, interceptors для автоматичного додавання токенів та централізована обробка помилок.

---

## База даних (`db.sql`)

### Таблиця `users`

```sql
CREATE TABLE users (
    id            BIGINT PRIMARY KEY AUTO_INCREMENT,
    email         VARCHAR(255) NOT NULL UNIQUE,
    password_hash VARCHAR(255) NOT NULL,
    first_name    VARCHAR(100),
    last_name     VARCHAR(100),
    phone         VARCHAR(20)  NOT NULL,
    address       VARCHAR(255),
    role          ENUM('USER', 'ADMIN') DEFAULT 'USER',
    is_active     BOOLEAN DEFAULT TRUE,
    is_verified   BOOLEAN DEFAULT FALSE,
    refresh_token TEXT NULL,
    created_at    TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at    TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);
```

| Поле | Призначення |
|------|-------------|
| `id` | Унікальний ідентифікатор |
| `email` | Електронна адреса (унікальна) |
| `password_hash` | Хеш пароля (bcrypt) |
| `role` | Роль: `USER` або `ADMIN` |
| `refresh_token` | Токен для оновлення access token |
| `is_verified` | Підтвердження email |
| `created_at / updated_at` | Часові мітки |

### Таблиця `paintings`

```sql
CREATE TABLE paintings (
    id           INT AUTO_INCREMENT PRIMARY KEY,
    title        VARCHAR(255)   NOT NULL UNIQUE,
    subtitle     VARCHAR(255),
    card_image   VARCHAR(500)   NOT NULL,
    images       JSON           NOT NULL,
    price        DECIMAL(10,2)  NOT NULL,
    discount     INT            DEFAULT 0,
    amount       INT            NOT NULL DEFAULT 1,
    is_available BOOLEAN        DEFAULT TRUE,
    is_featured  BOOLEAN        DEFAULT FALSE,
    author       VARCHAR(255),
    technique    VARCHAR(255),
    material     VARCHAR(255),
    width        INT,
    height       INT,
    year         INT,
    description  TEXT           NOT NULL,
    created_at   TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at   TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);
```

| Поле | Призначення |
|------|-------------|
| `id` | Унікальний ідентифікатор |
| `title` | Назва картини (унікальна) |
| `card_image` | URL зображення для картки каталогу |
| `images` | JSON-масив URL усіх зображень |
| `price` | Базова ціна |
| `discount` | Відсоток знижки |
| `amount` | Кількість примірників у наявності |
| `is_featured` | Відображення на головній сторінці |
| `author, technique, material, width, height, year` | Метадані твору |

---

## Основні сутності

### User

```typescript
User {
  id:           number
  email:        string
  firstName:    string
  lastName:     string
  phone:        string
  address?:     string
  role:         'USER' | 'ADMIN'
  isVerified:   boolean
  isActive:     boolean
  refreshToken?: string
  createdAt:    Date
  updatedAt:    Date
}
```

### Painting

```typescript
Painting {
  id:          number
  title:       string
  subtitle?:   string
  cardImage:   string        // URL
  images:      string[]      // JSON-масив URL
  price:       number
  discount:    number
  amount:      number
  isAvailable: boolean
  isFeatured:  boolean
  author:      string
  technique:   string
  material:    string
  width:       number
  height:      number
  year:        number
  description: string
  createdAt:   Date
  updatedAt:   Date
}
```

### AuthResponse

```typescript
AuthResponse {
  accessToken:  string   // JWT
  refreshToken: string
  user:         User
}
```

---

## Патерни та підходи

### Backend

**NestJS Modules Pattern** — кожен функціональний модуль (Auth, Users, Paintings) є незалежним і містить контролер, сервіс та сутності. Усі модулі реєструються в `AppModule`.

**TypeORM** — ORM для роботи з MySQL. Сутності описують структуру таблиць; репозиторії забезпечують CRUD-операції.

**JWT-автентифікація** — access-токен короткоживучий (15–30 хвилин), refresh-токен довгоживучий і зберігається в БД. Захист ендпоінтів реалізовано через Passport-стратегії та Guards.

**Guards та декоратори:**
- `@UseGuards(JwtAuthGuard)` — захист приватних ендпоінтів
- `@GetUser()` — отримання поточного користувача з токена
- `@IsAdmin()` — перевірка ролі адміністратора

**Завантаження файлів** — Multer обробляє `multipart/form-data`, після чого файл передається до Cloudinary. Клієнту повертається публічний URL.

### Frontend

**React Native Navigation** — Stack Navigator для управління стеком екранів; Bottom Menu для швидкої навігації між основними розділами.

**Zustand (State Management):**

```javascript
const useAuthStore = create(
  persist(
    (set) => ({
      user: null,
      accessToken: null,
      setAuth: (data) => set({ ...data }),
      logout: () => set({ user: null, accessToken: null }),
    }),
    { storage: AsyncStorage }
  )
);
```

Стан персистується через `AsyncStorage`. Сховища розділені за доменами: автентифікація, тема, UI.

**Styled Components** — компонентна архітектура стилів із підтримкою світлої та темної теми через `ThemeProvider`.

**Axios Interceptors** — автоматичне додавання токенів до запитів, перехоплення помилок 401 з ініціацією оновлення токена.

---

## Флоу операцій

### Реєстрація

```
Користувач заповнює форму → клієнт валідує дані локально
    → POST /auth/register
    → Backend: хешує пароль (bcrypt), зберігає User у БД, генерує JWT-токени
    → Відповідь: AuthResponse { user, accessToken, refreshToken }
    → Клієнт: зберігає в authStore (AsyncStorage), переходить на HomeScreen
```

### Вхід

```
Користувач вводить email + password → POST /auth/login
    → Backend: перевіряє email, порівнює пароль (bcrypt.compare),
               генерує токени, зберігає refresh_token у БД
    → Відповідь: AuthResponse
    → Клієнт: зберігає в authStore, налаштовує Axios interceptor, переходить на HomeScreen
```

### Завантаження картини (Admin)

```
Адміністратор обирає файл → multipart/form-data з файлом і метаданими
    → POST /uploads/painting
    → Backend: Multer обробляє файл → завантажує на Cloudinary → отримує URL
               → зберігає Painting у БД
    → Відповідь: Painting-сутність
    → Клієнт оновлює список картин у CatalogScreen
```

### Перегляд каталогу

```
Відкривається CatalogScreen → GET /paintings?page=1&limit=20
    → Backend повертає масив Painting із пагінацією
    → Клієнт рендерить список (card_image)
    → Натискання на картину → перехід на PaintingScreen з ID
    → GET /paintings/:id → детальна інформація (всі зображення, опис, метадані)
```

### Оновлення профілю

```
Користувач редагує дані → PATCH /users/:id
    → Backend: валідує та зберігає зміни у БД
    → Відповідь: оновлений User
    → Клієнт оновлює authStore.user
```

### Оновлення токена

```
Access token прострочено → Axios interceptor перехоплює помилку 401
    → POST /auth/refresh з refreshToken
    → Backend: перевіряє refresh_token у БД, видає новий accessToken
    → Axios повторює оригінальний запит із новим токеном
```

---

## Стилізація

### Система тем

Проект використовує **styled-components** із двома темами.

#### Світла тема (за замовчуванням)

```javascript
{
  background:    '#EFFDFF',  // Світло-блакитний
  card:          '#FFFFFF',  // Білий
  text:          '#660029',  // Темно-червоний (основний)
  secondaryText: '#8A5A6E',  // Сірий
  primary:       '#660029',  // Бордовий
  primaryText:   '#FFFFFF',  // Білий текст на primary
  border:        '#E6D7DE',  // Світлий бордер
  error:         '#FF4D4F'   // Червоний для помилок
}
```

#### Темна тема

```javascript
{
  background:    '#111827',  // Темно-сірий
  card:          '#1F2937',  // Темна картка
  text:          '#FFFFFF',  // Білий текст
  secondaryText: '#9CA3AF',  // Світло-сірий
  primary:       '#afe1ff',  // Світло-блакитний
  primaryText:   '#FFFFFF',
  border:        '#374151',  // Темний бордер
  error:         '#FF4D4F'
}
```

### Архітектура стилів

**`theme/colors.ts`** — централізована палітра; експортує `lightTheme` та `darkTheme` для ThemeProvider.

**`theme/styled.d.ts`** — TypeScript-типи для ThemeProvider; розширює типи styled-components і забезпечує автодоповнення для `props.theme`.

**Приклад стилізованого компонента:**

```javascript
const PaintingCard = styled.View`
  background-color: ${({ theme }) => theme.card};
  border-radius: 12px;
  padding: 16px;
  margin-bottom: 16px;
`;
```

**Перемикання теми:**

```javascript
// themeStore.ts
const useThemeStore = create((set) => ({
  isDark: false,
  toggleTheme: () => set((state) => ({ isDark: !state.isDark })),
}));

// hooks/useTheme.ts
export const useTheme = () => {
  const isDark = useThemeStore((state) => state.isDark);
  return isDark ? darkTheme : lightTheme;
};
```

---

## Технологічний стек

### Backend

| Технологія | Версія |
|------------|--------|
| Node.js | LTS |
| NestJS | 11.x |
| TypeORM | 1.x |
| MySQL | 8.x |
| Passport / JWT | — |
| Multer + Cloudinary | — |
| bcrypt | — |
| Jest | — |

### Frontend

| Технологія | Версія |
|------------|--------|
| React Native | 0.81.x |
| Expo | 54.x |
| TypeScript | 5.9.x |
| Zustand | 5.x |
| React Navigation | 7.x |
| Axios | 1.18.x |
| styled-components | 6.x |
| AsyncStorage | — |

### Інфраструктура

- Файлове сховище: **Cloudinary CDN**
- База даних: **MySQL 8.x**
- Контроль версій: **Git**

---

## API Endpoints

### Автентифікація

| Метод | Шлях | Опис |
|-------|------|------|
| POST | `/auth/register` | Реєстрація користувача |
| POST | `/auth/login` | Вхід у систему |
| POST | `/auth/refresh` | Оновлення access token |

### Користувачі

| Метод | Шлях | Опис |
|-------|------|------|
| GET | `/users/:id` | Отримати профіль |
| PATCH | `/users/:id` | Оновити профіль |
| GET | `/users` | Список користувачів (Admin) |

### Картини

| Метод | Шлях | Опис |
|-------|------|------|
| GET | `/paintings` | Каталог із пагінацією |
| GET | `/paintings/:id` | Деталі картини |
| POST | `/paintings` | Створити картину (Admin) |
| PATCH | `/paintings/:id` | Оновити картину (Admin) |
| DELETE | `/paintings/:id` | Видалити картину (Admin) |

### Завантаження

| Метод | Шлях | Опис |
|-------|------|------|
| POST | `/uploads/painting` | Завантажити зображення картини |
| POST | `/uploads/avatar` | Завантажити аватар користувача |

---

## Запуск проекту

### Backend

```bash
cd backend
npm install
npm run start:dev
```

Сервер запускається на `http://localhost:3000`.

### Frontend

```bash
cd frontend
npm install
npm start

# Android:
npm run android

# iOS:
npm run ios
```

### База даних

```bash
mysql -u root -p < db.sql
```

---

## Змінні середовища

### Backend (`.env`)

```env
DB_HOST=localhost
DB_PORT=3306
DB_USERNAME=root
DB_PASSWORD=password
DB_DATABASE=galleryDB
JWT_SECRET=your-secret-key
JWT_EXPIRATION=3600
CLOUDINARY_URL=your-cloudinary-url
```

### Frontend

Базовий URL API задається в `src/api/index.ts` через змінну `REACT_APP_API_URL`.

---

## Ключові файли

| Файл | Призначення |
|------|-------------|
| `db.sql` | SQL-скрипти ініціалізації бази даних |
| `backend/.env` | Змінні середовища backend |
| `frontend/app.json` | Конфігурація Expo |
| `backend/package.json` | Залежності backend |
| `frontend/package.json` | Залежності frontend |