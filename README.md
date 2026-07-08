# Finance Splitter TMA

Production-ready demo Telegram Mini App для дележа расходов в компании. Первый экран сразу показывает рабочее приложение: группы, общий баланс пользователя и переход к деталям группы.

Демо работает без backend. Данные лежат в моковом state и сохраняются в `localStorage`, поэтому добавленные расходы и подтвержденные settlements остаются после перезагрузки.

## Функции

- App shell под Telegram Mini App: mobile-first layout, нижняя навигация, safe-area отступы, поддержка `themeParams`.
- Мои группы: список групп, участники, общий потраченный бюджет и баланс текущего пользователя.
- Экран группы: участники, последние расходы, быстрые действия, сумма расходов и net balance.
- Добавление расхода: сумма вводится в cents, выбор payer, category, participants, `split equally` и `manual split`.
- Балансы: `paid`, `owed`, confirmed settlements и итоговый `net` по каждому участнику.
- Settle up suggestions: минимальный список переводов от должников к кредиторам.
- Settlement simulation: можно подтвердить предложенные переводы, после этого net balances обновляются.
- История расходов: поиск, фильтр по категории и участнику.
- Реалистичные демо-группы: поездка, ужин, квартира.
- `public/assets`: `finance-trip.png`, `finance-balance.png`, `finance-cover.png`. Если asset не загрузится, UI покажет CSS fallback без битой картинки.

## Запуск

```bash
npm install
npm run dev
```

По умолчанию Vite запускается на `http://127.0.0.1:5173`.

## Проверки

```bash
npm run lint
npm run build
```

Обе команды должны проходить без ошибок.

## Demo Flow

1. Открой первый экран `Finance Splitter`.
2. Выбери группу `Istanbul Trip`, `Friday Dinner` или `Apartment 12B`.
3. Открой `Add expense`.
4. Введи сумму в cents, например `4500` для `$45.00`.
5. Выбери payer, category и участников.
6. Переключись между `Split equally` и `Manual split`.
7. Для manual split сумма всех строк должна быть ровно равна общей сумме.
8. Сохрани расход и проверь обновление группы.
9. Открой `Balance`, посмотри `paid / owed / net`.
10. Нажми `Confirm settlement simulation`, чтобы применить предложенные переводы.
11. Открой `History` и проверь фильтры.

## Money Notes

- В логике не используются float-расчеты для денег.
- Все суммы хранятся как integer cents: `amountCents`, `owedCents`, `netCents`.
- Баланс считается так: `paid_total - owed_total + settlement_paid - settlement_received`.
- Положительный `net`: человеку должны.
- Отрицательный `net`: человек должен.
- Equal split делит сумму через integer division и распределяет остаток по 1 центу первым участникам. Поэтому сумма split всегда равна исходной сумме.
- Manual split валидируется строго: сумма ручных долей должна совпадать с общей суммой в cents.

## Settle Up Notes

Алгоритм берет текущие net balances:

- debtors: участники с отрицательным balance;
- creditors: участники с положительным balance;
- каждый шаг создает перевод на `min(debt, credit)`;
- после шага закрывается один debtor или один creditor;
- результат дает минимальный практичный список переводов, пока все net balances не сходятся к нулю.

## Telegram Group Notes

Для настоящего Telegram Mini App backend позже нужен отдельный слой:

- Bot menu button для входа в приложение из личного чата или группы.
- Привязка demo group к Telegram group chat через `chat_instance` или backend-side invite token.
- Проверка Telegram init data на backend.
- Уведомления в Telegram после добавления расхода или settlement.
- Share/invite flow для участников группы.
- Текущий demo-режим специально не использует backend и не отправляет данные наружу.

## Production Notes

- Код разделен на UI и domain logic: расчеты лежат в `src/domain`.
- `localStorage` имеет версионированный ключ `finance-splitter-tma:v1`.
- Для реального production нужно заменить storage/mock API на backend API, но оставить cents-формат денег.
- Для multi-currency лучше хранить currency на уровне группы и не смешивать валюты в одном balance.
- Для Telegram production обязательно валидировать `initData`, не доверять client-side user id и settlement actions.
- Assets не являются критичной зависимостью: fallback-графика встроена в CSS.

## Структура

```text
src/
  App.tsx
  styles.css
  domain/
    calculations.ts
    demoData.ts
    money.ts
    storage.ts
    types.ts
public/
  assets/
    finance-trip.png
    finance-balance.png
    finance-cover.png
```
