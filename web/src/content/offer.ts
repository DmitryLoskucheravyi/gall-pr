import {
  OPERATOR,
  TRANSLATION_NOTE_EN,
  list,
  p,
  table,
  type LegalContent,
  type LegalDocument,
} from './legal';

// The public offer — the contract every order on this site is placed under.
//
// Transcribed from the contract the gallery had drawn up, with four clauses
// changed because the shop does not behave the way they describe. A contract
// that contradicts the checkout is worse than no contract at all: it is the
// document a buyer would be held to, and the one an acquirer reads first.
//
//   * 4.2 — the drafted text reserves the work for a number of minutes while
//     payment is made. The shop does not do that: a work is taken off sale
//     the moment an order is placed and comes back only if that order is
//     cancelled (see orders.service.ts, where isAvailable is set to false).
//   * 5.1 — the drafted list of payment methods named providers the site has
//     never had (Fondy, Stripe). It now names the four it actually offers.
//     The same clause demanded 100% prepayment, while the checkout offers
//     cash on delivery; both now agree.
//   * 5.4 — the drafted text promised a fiscal receipt for every payment. The
//     site issues none, because whether a receipt is required at all depends
//     on the seller's tax group and turnover. It now says what is true.
//   * 1.4 — the drafted sentence was garbled to the point of saying the
//     opposite of what it meant. Rewritten to the plain sense: the edition
//     state shown on the card is the one that binds.
//
// Anything in square brackets is still waiting on the sole proprietorship
// being registered. Those come from OPERATOR in ./legal — fill that in once.

export const OFFER_UPDATED = '2026-10-12';

const ua: LegalContent = {
  title: 'Договір купівлі-продажу (публічна оферта)',
  description:
    'Умови, на яких галерея Viktorumm продає оригінальні картини: предмет договору, ціна, оплата, доставка, авторське право, повернення та реквізити продавця.',
  updatedLabel: 'Редакція від',
  intro:
    `Ця Публічна оферта (далі — «Договір») визначає умови продажу оригінальних художніх творів через сайт ${OPERATOR.site} (далі — «Сайт») і відповідно до статей 633, 641 та 642 Цивільного кодексу України є пропозицією Продавця укласти договір купівлі-продажу з будь-якою фізичною або юридичною особою, яка приймає її умови шляхом оформлення Замовлення на Сайті (акцепт).`,
  tocTitle: 'Зміст',
  cookieSettingsButton: '',
  sections: [
    {
      id: 'parties',
      title: '0. Сторони та терміни',
      blocks: [
        p(
          `Продавець — ${OPERATOR.name.ua}, зареєстрована як фізична особа-підприємець згідно із законодавством України, ІПН ${OPERATOR.taxId}, запис в ЄДР ${OPERATOR.registry}, яка є автором і власником представлених на Сайті творів мистецтва.`,
        ),
        p(
          'Покупець — будь-яка дієздатна фізична особа або юридична особа, яка оформила Замовлення на Сайті та прийняла умови цього Договору, у тому числі особа-нерезидент України.',
        ),
        list(
          'Товар — оригінальний твір образотворчого мистецтва (живопис), розміщений на Сайті з описом, зображенням, розмірами, технікою виконання та ціною.',
          'Тираж — облікова сутність у системі Сайту, що фіксує стан екземплярів конкретного Товару. «Єдиний екземпляр» — Товар існує в одній фізичній одиниці, і після продажу його картка знімається з продажу остаточно. «Доступна для повтору» — Продавець допускає створення нової фізичної роботи на замовлення (авторський повтор), і після продажу поточного екземпляра картка лишається доступною на умовах розділу 7.',
          'Замовлення — заявка Покупця на придбання конкретного Товару, оформлена через функціонал Сайту.',
          'Акцепт — повне й безумовне прийняття Покупцем умов цього Договору, яке відбувається в момент оформлення Замовлення та/або здійснення оплати.',
          `Сайт — інтернет-магазин ${OPERATOR.site}, що належить Продавцю та є єдиним каналом продажу представлених Товарів. Сайт не є маркетплейсом чи галереєю-агрегатором третіх осіб.`,
        ),
      ],
    },
    {
      id: 'subject',
      title: '1. Предмет договору',
      blocks: [
        p(
          '1.1. Продавець зобов’язується передати у власність Покупця Товар, обраний останнім у Замовленні, а Покупець зобов’язується прийняти й оплатити його на умовах цього Договору.',
        ),
        p(
          '1.2. Кожен Товар, представлений на Сайті, є оригінальним твором мистецтва, створеним особисто Продавцем уручну, без використання автоматичного тиражування (друк, літографія тощо), за винятком випадків, коли така техніка прямо зазначена в описі Товару.',
        ),
        p(
          '1.3. Сайт не є маркетплейсом або галереєю-агрегатором: на ньому представлені виключно твори однієї художниці — Продавця. Усі права та обов’язки за цим Договором виникають у Продавця безпосередньо, без участі третіх майданчиків чи агентів як сторін продажу.',
        ),
        p(
          '1.4. Стан Тиражу кожного Товару відображається на його картці на Сайті і є достовірним на момент оформлення Замовлення. Саме стан, показаний на картці в цей момент, визначає права сторін за цим Договором.',
        ),
        p(
          '1.5. У разі одночасного оформлення двома або більше Покупцями Замовлень на один і той самий екземпляр Товару в стані «єдиний екземпляр» дійсним вважається Замовлення, що першим отримало підтвердження оплати відповідно до розділу 5. Іншим Покупцям кошти повертаються у повному розмірі протягом 3 банківських днів з моменту виявлення колізії.',
        ),
      ],
    },
    {
      id: 'goods',
      title: '2. Товар і його унікальність',
      blocks: [
        p(
          '2.1. Кожен Товар у стані Тиражу «єдиний екземпляр» існує в одній фізичній копії, і його подальше тиражування, відтворення чи створення авторської повторної версії Продавцем не гарантується і не входить до предмета цього Договору.',
        ),
        p(
          '2.2. Одразу після успішного оформлення Замовлення на Товар у стані «єдиний екземпляр» Сайт знімає картку такого Товару з вітрини продажу, щоб уникнути прийому двох і більше Замовлень на один і той самий екземпляр.',
        ),
        p(
          '2.3. У разі одночасного оформлення кількох Замовлень до моменту, коли система Сайту ще не встигла позначити Товар проданим, дійсним вважається Замовлення, що першим було підтверджене оплатою. Щодо інших Замовлень Продавець негайно повідомляє Покупця про неможливість виконання та повертає отриману оплату в повному розмірі.',
        ),
        p(
          '2.4. Фотографії, відео та інші матеріали на сторінці Товару надаються для ознайомлення. Фактичні відтінки кольору можуть незначно відрізнятися від зображення внаслідок калібрування екрана Покупця, що не є підставою для претензій щодо якості Товару.',
        ),
        p(
          '2.5. Продавець гарантує, що на момент публікації картки Товару він не обтяжений правами третіх осіб, не перебуває під арештом або заставою.',
        ),
      ],
    },
    {
      id: 'price',
      title: '3. Ціна та валюта розрахунків',
      blocks: [
        p(
          '3.1. Офіційною валютою ціни та розрахунків є гривня України (UAH) згідно зі ст. 524, 533 Цивільного кодексу України.',
        ),
        p(
          '3.2. Для зручності Покупця Сайт додатково відображає ціну в доларах США (USD) як довідкову, недоговірну інформацію, розраховану за курсом, що оновлюється автоматично не рідше ніж раз на добу на основі офіційного курсу Національного банку України. Відображення в доларах має виключно інформативний характер і не є пропозицією укласти договір в іноземній валюті.',
        ),
        p(
          '3.3. Остаточною та обов’язковою для сторін є виключно ціна в гривнях, зафіксована на картці Товару на момент оформлення Замовлення. Курсова різниця між моментом перегляду сторінки та моментом фактичної оплати не є підставою для претензій до Продавця та не змінює суму в гривнях, що підлягає сплаті.',
        ),
        p(
          '3.4. Якщо Покупець здійснює оплату карткою, випущеною банком поза межами України, фактично списана сума може відрізнятися від відображеної на Сайті доларової оцінки внаслідок курсу банку-емітента чи платіжної системи та їхніх комісій. Продавець не відповідає за цю різницю.',
        ),
        p(
          '3.5. Ціна на Товар може бути змінена Продавцем в односторонньому порядку до моменту оформлення Замовлення. Після оформлення Замовлення ціна є зафіксованою і не підлягає зміні в односторонньому порядку.',
        ),
      ],
    },
    {
      id: 'order',
      title: '4. Оформлення та підтвердження Замовлення',
      blocks: [
        p(
          '4.1. Для оформлення Замовлення Покупець обирає конкретний Товар на Сайті та вказує дані, необхідні для виконання Замовлення: ПІБ, контактний телефон і email, адресу доставки або відділення перевізника, країну доставки. Реєстрація облікового запису для цього не є обов’язковою.',
        ),
        p(
          '4.2. Товар знімається з продажу в момент оформлення Замовлення, а не на визначений строк: з цієї миті його картка недоступна іншим Покупцям. Якщо Замовлення скасовується — Покупцем, Продавцем або внаслідок неотримання оплати, — Товар повертається у вільний продаж.',
        ),
        p('4.3. Договір вважається укладеним (акцептованим) з моменту більш пізньої з подій:'),
        list(
          'Замовлення оформлено на Сайті;',
          'Продавець надіслав підтвердження Замовлення (лист на email або повідомлення на Сайті);',
          'Покупець здійснив оплату відповідно до розділу 5 — для способів оплати, що передбачають передоплату.',
        ),
        p(
          '4.4. Продавець має право відмовити в прийнятті Замовлення, якщо Товар уже було продано іншому Покупцеві внаслідок технічного збою чи одночасного оформлення кількох Замовлень, або з інших об’єктивних причин. У такому разі Продавець негайно повідомляє про це Покупця та, за наявності оплати, повертає її в повному розмірі протягом 3 банківських днів.',
        ),
        p(
          '4.5. За бажанням Покупця Продавець може видати документ, що підтверджує автентичність твору (сертифікат автентичності / Certificate of Authenticity).',
        ),
      ],
    },
    {
      id: 'payment',
      title: '5. Оплата',
      blocks: [
        p('5.1. Оплата здійснюється одним зі способів, доступних на Сайті на момент оформлення Замовлення:'),
        list(
          'переказом на банківський рахунок Продавця за реквізитами, вказаними в розділі 14 та на сторінці Замовлення (передоплата в повному розмірі);',
          'накладеним платежем — оплата при отриманні у відділенні перевізника, якщо цей спосіб доступний для обраного Товару та напрямку доставки.',
        ),
        p(
          '5.2. Покупці-нерезиденти здійснюють оплату переказом на банківський рахунок Продавця; сума сплачується в гривнях відповідно до пп. 3.3–3.4.',
        ),
        p(
          '5.3. Моментом здійснення оплати вважається момент надходження коштів на рахунок Продавця, підтверджений банком.',
        ),
        p(
          '5.4. Розрахунковий документ надається Покупцеві на його вимогу в обсязі, передбаченому законодавством України для обраної Продавцем системи оподаткування.',
        ),
        p(
          '5.5. У разі помилкового списання коштів або збою платіжної системи Покупець має право звернутися до Продавця за контактами, вказаними в розділі 14.',
        ),
      ],
    },
    {
      id: 'delivery',
      title: '6. Передання товару, доставка, перехід ризику і права власності',
      blocks: [
        p(
          '6.1. Доставка Товару здійснюється службою доставки (Нова пошта, Укрпошта, міжнародні кур’єри) за рахунок Покупця, якщо інше не вказано на Сайті. Строки доставки встановлюються відповідно до тарифів і регламентів обраної служби; для міжнародних відправлень можливі затримки на митному оформленні, за яке Продавець відповідальності не несе.',
        ),
        p(
          '6.2. З огляду на крихкість Товару Продавець зобов’язаний забезпечити належне транспортне пакування (тверда тара, захист від вологи та деформацій, маркування «крихке») та оформлення оголошеної вартості відправлення відповідно до ціни Товару для можливості страхування.',
        ),
        p(
          '6.3. Право власності на Товар та ризик його випадкового знищення чи пошкодження переходять до Покупця з моменту фактичного вручення Товару Покупцеві або першому перевізникові, що діє за дорученням Покупця (ст. 334 Цивільного кодексу України).',
        ),
        p(
          '6.4. Під час отримання Покупець зобов’язаний оглянути цілісність упаковки та відсутність видимих пошкоджень у присутності представника служби доставки і, у разі виявлення пошкоджень, оформити акт про невідповідність та повідомити Продавця протягом 48 годин.',
        ),
      ],
    },
    {
      id: 'copyright',
      title: '7. Авторське право, автентичність, право на повтор',
      blocks: [
        p(
          '7.1. Авторське право на твір, включно з особистими немайновими правами, належить Продавцю як автору і не передається Покупцеві разом із правом власності на фізичний об’єкт (ст. 419 Цивільного кодексу України).',
        ),
        p('7.2. Покупець не має права без письмової згоди Продавця:'),
        list(
          'відтворювати, тиражувати чи виготовляти принти й репродукції твору;',
          'використовувати зображення твору в комерційних цілях (реклама, мерчандайз, перепродаж зображень);',
          'видавати твір за власний або чужий.',
        ),
        p(
          '7.3. Замовлення Товару зі станом Тиражу «доступна для повтору» означає, що Покупець замовляє виготовлення Продавцем нової, окремої фізичної роботи за композицією вже проданого твору. Така робота є авторським повтором, а не копією, і може відрізнятися від оригіналу розміром, відтінками кольору, фактурою чи дрібними деталями.',
        ),
        p(
          '7.4. Строк виготовлення авторського повтору зазначається на картці Товару або узгоджується індивідуально при підтвердженні Замовлення; відхилення від цього строку не є підставою для відмови від договору, а підставою для узгодження сторонами нового терміну.',
        ),
      ],
    },
    {
      id: 'returns',
      title: '8. Повернення та обмін',
      blocks: [
        p(
          '8.1. Згідно з п. 5 ч. 1 ст. 9 Закону України «Про захист прав споживачів» товари, виготовлені за індивідуальним замовленням та такі, що мають індивідуально визначені властивості, не підлягають обміну чи поверненню належної якості з підстав «не підійшло» або «передумав». Оригінальні твори живопису, що продаються за цим Договором, належать до таких товарів.',
        ),
        p(
          '8.2. Незалежно від п. 8.1, у разі виявлення виробничого браку, пошкодження під час транспортування або істотної невідповідності Товару заявленому опису Покупець має право на безоплатне усунення недоліків або повернення коштів у повному розмірі. Скарга подається Продавцю протягом 48 годин з моменту отримання Товару разом із фото- чи відеофіксацією пошкодження та транспортної тари.',
        ),
        p(
          '8.3. Якщо внаслідок п. 8.2 Товар у стані «єдиний екземпляр» повертається Продавцю, його картка відновлюється до продажу на Сайті без зміни стану Тиражу. Повернення коштів здійснюється тим самим способом, яким була здійснена оплата, протягом 14 банківських днів з моменту підтвердження браку.',
        ),
        p(
          '8.4. Для Покупців-споживачів з Європейського Союзу застосовуються також імперативні норми їхнього національного законодавства щодо дистанційних договорів — див. розділ 12.',
        ),
      ],
    },
    {
      id: 'liability',
      title: '9. Відповідальність сторін',
      blocks: [
        p(
          '9.1. За невиконання або неналежне виконання умов цього Договору Сторони несуть відповідальність відповідно до чинного законодавства України.',
        ),
        p('9.2. Продавець не несе відповідальності за:'),
        list(
          'затримки доставки з вини служби доставки;',
          'дії митних, податкових чи інших державних органів країни Покупця при міжнародній доставці, включно з митом, ПДВ та іншими платежами;',
          'неточне відтворення кольору екраном пристрою Покупця;',
          'дії третіх осіб — платіжних систем, банків, хостинг-провайдерів Сайту.',
        ),
        p(
          '9.3. Загальний розмір відповідальності Продавця перед Покупцем за будь-якими претензіями, пов’язаними з Товаром, обмежується вартістю фактично сплаченого Замовлення, за винятком випадків умисного порушення Продавцем зобов’язань.',
        ),
        p(
          '9.4. Покупець самостійно відповідає за точність даних, вказаних при оформленні Замовлення; витрати, пов’язані з невірними даними, покладаються на Покупця.',
        ),
      ],
    },
    {
      id: 'force-majeure',
      title: '10. Форс-мажор',
      blocks: [
        p(
          '10.1. Сторони звільняються від відповідальності за повне або часткове невиконання зобов’язань за Договором, якщо воно викликане обставинами непереборної сили: війна, воєнні дії, введення воєнного чи надзвичайного стану, акти органів влади, відключення електроенергії та зв’язку, природні катастрофи, пандемії, а також збої в роботі служб доставки й платіжних систем, що виникли поза межами розумного контролю Сторін.',
        ),
        p(
          '10.2. Сторона, для якої настали такі обставини, зобов’язана повідомити іншу Сторону протягом 10 календарних днів. Сертифікат Торгово-промислової палати України є належним підтвердженням таких обставин.',
        ),
      ],
    },
    {
      id: 'personal-data',
      title: '11. Персональні дані',
      blocks: [
        p(
          '11.1. Оформлюючи Замовлення, Покупець надає згоду на обробку персональних даних (ПІБ, контактні дані, адреса доставки) відповідно до Закону України «Про захист персональних даних» виключно з метою виконання цього Договору.',
        ),
        p(
          '11.2. Для Покупців-нерезидентів обробка персональних даних також відповідає вимогам Загального регламенту ЄС про захист даних (GDPR) у частині, що стосується громадян ЄС.',
        ),
        p(
          '11.3. Детальні умови обробки персональних даних визначені в Політиці конфіденційності, розміщеній на Сайті, яка є невід’ємною частиною цього Договору.',
        ),
      ],
    },
    {
      id: 'disputes',
      title: '12. Вирішення спорів, застосовне право',
      blocks: [
        p(
          '12.1. Усі спори та розбіжності Сторони намагаються вирішити шляхом переговорів: Покупець звертається письмово за реквізитами, вказаними в розділі 14; відповідь надається протягом 14 календарних днів.',
        ),
        p(
          '12.2. У разі недосягнення згоди спір вирішується в судовому порядку відповідно до чинного законодавства України за місцем реєстрації Продавця, за винятком випадків, коли імперативні норми права країни споживача-нерезидента надають йому право звернення до власного суду.',
        ),
        p(
          '12.3. До Замовлень від покупців-споживачів з Європейського Союзу можуть додатково застосовуватися імперативні норми національного законодавства про захист споживачів, зокрема щодо права на відмову від дистанційного договору.',
        ),
      ],
    },
    {
      id: 'term',
      title: '13. Строк дії, порядок зміни договору',
      blocks: [
        p(
          '13.1. Договір набуває чинності для конкретного Покупця з моменту акцепту і діє до повного виконання Сторонами своїх зобов’язань.',
        ),
        p(
          '13.2. Продавець має право в односторонньому порядку вносити зміни до цієї Публічної оферти, розміщуючи оновлену версію на Сайті. Зміни набувають чинності з моменту публікації та не поширюються на Замовлення, акцептовані до такої публікації.',
        ),
        p(
          '13.3. Продовження користування Сайтом після оприлюднення змін означає згоду користувача з оновленими умовами.',
        ),
        p(
          '13.4. Визнання окремого положення цього Договору недійсним не тягне за собою недійсності інших його положень.',
        ),
      ],
    },
    {
      id: 'requisites',
      title: '14. Реквізити Продавця',
      blocks: [
        table(
          ['Поле', 'Значення'],
          [
            ['ПІБ / назва ФОП', OPERATOR.name.ua],
            ['ІПН / РНОКПП', OPERATOR.taxId],
            ['Запис в ЄДР', OPERATOR.registry],
            ['Юридична адреса', OPERATOR.address.ua],
            ['Банківські реквізити (IBAN)', OPERATOR.iban],
            ['Система оподаткування', OPERATOR.taxation.ua],
            ['Телефон', OPERATOR.phone],
            ['Email', OPERATOR.email],
            ['Сайт', OPERATOR.site],
          ],
        ),
      ],
    },
  ],
};

const en: LegalContent = {
  title: 'Contract of sale (public offer)',
  description:
    'The terms on which the Viktorumm gallery sells original paintings: subject, price, payment, delivery, copyright, returns and the seller’s details.',
  updatedLabel: 'Revision of',
  translationNote: TRANSLATION_NOTE_EN,
  intro:
    `This public offer (the “Contract”) sets out the terms on which original works of art are sold through the ${OPERATOR.site} website (the “Site”) and, under articles 633, 641 and 642 of the Civil Code of Ukraine, is the Seller’s proposal to conclude a contract of sale with any natural or legal person who accepts its terms by placing an Order on the Site.`,
  tocTitle: 'Contents',
  cookieSettingsButton: '',
  sections: [
    {
      id: 'parties',
      title: '0. The parties and the terms used',
      blocks: [
        p(
          `The Seller — ${OPERATOR.name.en}, registered as a sole proprietor under the law of Ukraine, tax number ${OPERATOR.taxId}, state register entry ${OPERATOR.registry}, who is the author and owner of the works of art presented on the Site.`,
        ),
        p(
          'The Buyer — any natural person with legal capacity, or any legal person, who has placed an Order on the Site and accepted the terms of this Contract, including a person resident outside Ukraine.',
        ),
        list(
          'Work — an original work of fine art (painting) presented on the Site with its description, image, dimensions, technique and price.',
          'Edition — the record in the Site’s system of the state of a Work’s copies. “Single copy” means the Work exists as one physical piece, and once sold its page is withdrawn from sale for good. “Available on commission” means the Seller allows a new physical work to be made to order (an artist’s repetition), and the page stays available after the current copy is sold, on the terms of section 7.',
          'Order — the Buyer’s request to purchase a particular Work, placed through the Site.',
          'Acceptance — the Buyer’s full and unconditional acceptance of this Contract, which occurs when the Order is placed and/or payment is made.',
          `Site — the online shop at ${OPERATOR.site}, owned by the Seller and the only channel through which the Works presented are sold. The Site is not a marketplace or a third-party gallery aggregator.`,
        ),
      ],
    },
    {
      id: 'subject',
      title: '1. Subject of the contract',
      blocks: [
        p(
          '1.1. The Seller undertakes to transfer ownership of the Work chosen in the Order to the Buyer, and the Buyer undertakes to accept and pay for it on the terms of this Contract.',
        ),
        p(
          '1.2. Every Work presented on the Site is an original work of art made by the Seller personally and by hand, without automated reproduction (print, lithography and the like), except where such a technique is stated explicitly in the Work’s description.',
        ),
        p(
          '1.3. The Site is not a marketplace or an aggregator: it presents the works of one artist, the Seller. All rights and obligations under this Contract arise directly with the Seller, with no third-party platform or agent as a party to the sale.',
        ),
        p(
          '1.4. The Edition state of each Work is shown on its page on the Site and is accurate at the moment the Order is placed. It is that state, as shown at that moment, which determines the parties’ rights under this Contract.',
        ),
        p(
          '1.5. Where two or more Buyers place Orders for the same copy of a Work in the “single copy” state at the same time, the Order that is first confirmed by payment under section 5 is the valid one. The other Buyers are refunded in full within 3 banking days of the clash being found.',
        ),
      ],
    },
    {
      id: 'goods',
      title: '2. The Work and its uniqueness',
      blocks: [
        p(
          '2.1. Every Work in the “single copy” Edition state exists as one physical piece. Its further reproduction, or the making of an artist’s repetition of it, is not guaranteed and does not form part of this Contract.',
        ),
        p(
          '2.2. As soon as an Order for a Work in the “single copy” state is placed, the Site withdraws that Work’s page from sale, so that two or more Orders cannot be taken for the same copy.',
        ),
        p(
          '2.3. Where several Orders are placed before the Site has marked the Work as sold, the Order first confirmed by payment is the valid one. For the others the Seller notifies the Buyer immediately that the Order cannot be fulfilled and refunds any payment received in full.',
        ),
        p(
          '2.4. Photographs, video and other material on a Work’s page are provided for information. Actual colour may differ slightly from the image because of the calibration of the Buyer’s screen, which is not grounds for a complaint about the quality of the Work.',
        ),
        p(
          '2.5. The Seller warrants that, at the time a Work’s page is published, the Work is free of third-party rights and is not under seizure or pledge.',
        ),
      ],
    },
    {
      id: 'price',
      title: '3. Price and currency',
      blocks: [
        p(
          '3.1. The official currency of price and settlement is the Ukrainian hryvnia (UAH), under articles 524 and 533 of the Civil Code of Ukraine.',
        ),
        p(
          '3.2. For the Buyer’s convenience the Site also shows the price in US dollars as indicative, non-contractual information, converted at a rate updated automatically at least once a day from the official rate of the National Bank of Ukraine. The dollar figure is informational only and is not an offer to contract in a foreign currency.',
        ),
        p(
          '3.3. The only price that is final and binding on the parties is the hryvnia price shown on the Work’s page at the moment the Order is placed. A change in the exchange rate between viewing the page and paying is not grounds for a claim against the Seller and does not change the amount payable in hryvnia.',
        ),
        p(
          '3.4. Where the Buyer pays with a card issued by a bank outside Ukraine, the amount actually debited may differ from the dollar figure shown on the Site because of the rate and fees of the issuing bank or payment system. The Seller is not responsible for that difference.',
        ),
        p(
          '3.5. The Seller may change the price of a Work unilaterally up to the moment an Order is placed. Once the Order is placed the price is fixed and cannot be changed unilaterally.',
        ),
      ],
    },
    {
      id: 'order',
      title: '4. Placing and confirming an Order',
      blocks: [
        p(
          '4.1. To place an Order the Buyer chooses a Work on the Site and provides what is needed to fulfil it: full name, telephone and email, delivery address or carrier branch, and country of delivery. Registering an account is not required.',
        ),
        p(
          '4.2. A Work is withdrawn from sale the moment an Order is placed, rather than held for a set period: from that moment its page is unavailable to other Buyers. If the Order is cancelled — by the Buyer, by the Seller, or because payment is not received — the Work returns to sale.',
        ),
        p('4.3. The Contract is concluded (accepted) at the later of:'),
        list(
          'the Order being placed on the Site;',
          'the Seller sending confirmation of the Order (by email or as a message on the Site);',
          'the Buyer paying under section 5, for those payment methods that require payment in advance.',
        ),
        p(
          '4.4. The Seller may decline an Order where the Work has already been sold to another Buyer through a technical fault or simultaneous Orders, or for other objective reasons. The Seller then notifies the Buyer immediately and, where payment was made, refunds it in full within 3 banking days.',
        ),
        p(
          '4.5. At the Buyer’s request the Seller may issue a certificate of authenticity for the work.',
        ),
      ],
    },
    {
      id: 'payment',
      title: '5. Payment',
      blocks: [
        p('5.1. Payment is made by one of the methods available on the Site when the Order is placed:'),
        list(
          'by transfer to the Seller’s bank account, using the details in section 14 and on the Order page (payment in full, in advance);',
          'cash on delivery — payment on collection at the carrier’s branch, where that method is available for the chosen Work and destination.',
        ),
        p(
          '5.2. Buyers outside Ukraine pay by transfer to the Seller’s bank account; the amount is paid in hryvnia under clauses 3.3–3.4.',
        ),
        p(
          '5.3. Payment is treated as made when the funds reach the Seller’s account, as confirmed by the bank.',
        ),
        p(
          '5.4. A settlement document is provided to the Buyer on request, to the extent required by the law of Ukraine for the tax regime the Seller operates under.',
        ),
        p(
          '5.5. Where funds are debited in error or a payment system fails, the Buyer may contact the Seller using the details in section 14.',
        ),
      ],
    },
    {
      id: 'delivery',
      title: '6. Handover, delivery, and the passing of risk and title',
      blocks: [
        p(
          '6.1. Delivery is carried out by a carrier (Nova Poshta, Ukrposhta, international couriers) at the Buyer’s expense unless the Site states otherwise. Delivery times follow the tariffs and rules of the chosen carrier; international shipments may be delayed in customs, for which the Seller is not responsible.',
        ),
        p(
          '6.2. Given the fragility of the Work, the Seller undertakes to pack it properly for transport (rigid packaging, protection from damp and deformation, “fragile” marking) and to declare a value matching the price of the Work so that the shipment can be insured.',
        ),
        p(
          '6.3. Title to the Work and the risk of its accidental loss or damage pass to the Buyer on actual handover to the Buyer or to the first carrier acting on the Buyer’s instructions (article 334 of the Civil Code of Ukraine).',
        ),
        p(
          '6.4. On collection the Buyer must inspect the packaging for integrity and visible damage in the presence of the carrier’s representative and, where damage is found, have a damage report drawn up and notify the Seller within 48 hours.',
        ),
      ],
    },
    {
      id: 'copyright',
      title: '7. Copyright, authenticity and the right of repetition',
      blocks: [
        p(
          '7.1. Copyright in the work, including moral rights, belongs to the Seller as its author and does not pass to the Buyer with ownership of the physical object (article 419 of the Civil Code of Ukraine).',
        ),
        p('7.2. Without the Seller’s written consent the Buyer may not:'),
        list(
          'reproduce the work or make prints or reproductions of it;',
          'use images of the work commercially (advertising, merchandise, resale of images);',
          'present the work as their own or as another’s.',
        ),
        p(
          '7.3. Ordering a Work in the “available on commission” Edition state means the Buyer is commissioning a new, separate physical work after the composition of one already sold. Such a work is an artist’s repetition, not a copy, and may differ from the original in size, colour, texture or small details.',
        ),
        p(
          '7.4. The time needed to make an artist’s repetition is stated on the Work’s page or agreed individually when the Order is confirmed; departing from that time is not grounds for terminating the contract, but grounds for agreeing a new one.',
        ),
      ],
    },
    {
      id: 'returns',
      title: '8. Returns and exchange',
      blocks: [
        p(
          '8.1. Under clause 5 of part 1 of article 9 of the Law of Ukraine “On consumer protection”, goods made to individual order and goods with individually determined properties cannot be exchanged or returned while of proper quality on the grounds that they “did not suit” or that the buyer changed their mind. The original paintings sold under this Contract are such goods.',
        ),
        p(
          '8.2. Regardless of clause 8.1, where a manufacturing defect, damage in transit, or a material discrepancy with the description is found, the Buyer is entitled to have the defect remedied free of charge or to a full refund. The complaint must reach the Seller within 48 hours of receiving the Work, with photographs or video of the damage and of the transport packaging.',
        ),
        p(
          '8.3. Where a Work in the “single copy” state is returned to the Seller under clause 8.2, its page is restored to sale on the Site with its Edition state unchanged. The refund is made by the same means as the payment, within 14 banking days of the defect being confirmed.',
        ),
        p(
          '8.4. For consumer Buyers in the European Union, the mandatory provisions of their own national law on distance contracts also apply — see section 12.',
        ),
      ],
    },
    {
      id: 'liability',
      title: '9. Liability',
      blocks: [
        p(
          '9.1. The parties are liable for failure to perform, or improper performance of, this Contract under the law of Ukraine.',
        ),
        p('9.2. The Seller is not responsible for:'),
        list(
          'delivery delays caused by the carrier;',
          'acts of customs, tax or other authorities in the Buyer’s country on international delivery, including duties, VAT and other charges;',
          'inaccurate colour reproduction by the Buyer’s screen;',
          'acts of third parties — payment systems, banks, the Site’s hosting providers.',
        ),
        p(
          '9.3. The Seller’s total liability to the Buyer on any claim connected with a Work is limited to the amount actually paid for the Order, except where the Seller has breached its obligations deliberately.',
        ),
        p(
          '9.4. The Buyer is responsible for the accuracy of the details given when placing an Order; costs arising from incorrect details are borne by the Buyer.',
        ),
      ],
    },
    {
      id: 'force-majeure',
      title: '10. Force majeure',
      blocks: [
        p(
          '10.1. The parties are released from liability for total or partial failure to perform where it is caused by force majeure: war, hostilities, the introduction of martial law or a state of emergency, acts of authorities, loss of power or communications, natural disasters, pandemics, and failures of carriers and payment systems beyond the parties’ reasonable control.',
        ),
        p(
          '10.2. The party affected must notify the other within 10 calendar days. A certificate of the Ukrainian Chamber of Commerce and Industry is proper evidence of such circumstances.',
        ),
      ],
    },
    {
      id: 'personal-data',
      title: '11. Personal data',
      blocks: [
        p(
          '11.1. In placing an Order the Buyer consents to the processing of personal data (name, contact details, delivery address) under the Law of Ukraine “On the protection of personal data”, solely in order to perform this Contract.',
        ),
        p(
          '11.2. For Buyers outside Ukraine, processing also follows the EU General Data Protection Regulation as it applies to data subjects in the EU.',
        ),
        p(
          '11.3. The detailed terms of processing are set out in the Privacy Policy published on the Site, which forms an integral part of this Contract.',
        ),
      ],
    },
    {
      id: 'disputes',
      title: '12. Disputes and governing law',
      blocks: [
        p(
          '12.1. The parties will try to settle any dispute by negotiation: the Buyer writes to the Seller using the details in section 14, and an answer is given within 14 calendar days.',
        ),
        p(
          '12.2. Failing agreement, the dispute is settled in court under the law of Ukraine at the Seller’s place of registration, except where mandatory provisions of the law of a non-resident consumer’s country give them the right to apply to their own court.',
        ),
        p(
          '12.3. Orders from consumer buyers in the European Union may additionally be subject to mandatory national consumer-protection provisions, in particular on the right to withdraw from a distance contract.',
        ),
      ],
    },
    {
      id: 'term',
      title: '13. Term and amendment',
      blocks: [
        p(
          '13.1. The Contract takes effect for a particular Buyer on acceptance and runs until both parties have performed their obligations in full.',
        ),
        p(
          '13.2. The Seller may amend this public offer unilaterally by publishing an updated version on the Site. Amendments take effect on publication and do not apply to Orders accepted before it.',
        ),
        p(
          '13.3. Continuing to use the Site after amendments are published means accepting the updated terms.',
        ),
        p(
          '13.4. If any provision of this Contract is held invalid, the remaining provisions are unaffected.',
        ),
      ],
    },
    {
      id: 'requisites',
      title: '14. The Seller’s details',
      blocks: [
        table(
          ['Field', 'Value'],
          [
            ['Name / sole proprietor', OPERATOR.name.en],
            ['Tax number', OPERATOR.taxId],
            ['State register entry', OPERATOR.registry],
            ['Registered address', OPERATOR.address.en],
            ['Bank details (IBAN)', OPERATOR.iban],
            ['Tax regime', OPERATOR.taxation.en],
            ['Telephone', OPERATOR.phone],
            ['Email', OPERATOR.email],
            ['Website', OPERATOR.site],
          ],
        ),
      ],
    },
  ],
};

export const OFFER: LegalDocument = { ua, en };
