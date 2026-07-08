# План разработки: Finance Splitter TMA

## 1. Идея

Приложение помогает компании понять, кто за что заплатил и кто кому должен. Хороший сценарий для Telegram, потому что группы людей уже общаются в чатах.

## 2. MVP

- Создание группы расходов.
- Приглашение участников по Telegram.
- Добавление расхода.
- Деление поровну.
- Деление вручную.
- Баланс по группе.
- Рекомендации по settle up.
- История расходов.

## 3. Роли

- Участник: добавляет расходы и смотрит баланс.
- Создатель группы: редактирует участников и настройки.

## 4. Основные экраны

1. Мои группы: поездки, квартиры, ужины.
2. Группа: общий баланс, последние расходы, участники.
3. Добавить расход: сумма, кто платил, за кого, дата, категория.
4. Детали расхода: участники, доли, комментарии.
5. Балансы: кто должен / кому должны.
6. Settle up: минимальный список переводов.
7. История: фильтр по участнику и категории.

## 5. Данные

- `users`: telegram_id, name, username.
- `groups`: title, owner_id, currency.
- `group_members`: group_id, user_id, display_name, status.
- `expenses`: group_id, paid_by_user_id, title, amount, currency, category, paid_at.
- `expense_splits`: expense_id, user_id, amount_owed.
- `settlements`: group_id, from_user_id, to_user_id, amount, status.

## 6. Логика расчетов

- Для каждого участника считаем `paid_total`.
- Для каждого участника считаем `owed_total`.
- Баланс = `paid_total - owed_total`.
- Положительный баланс: человеку должны.
- Отрицательный баланс: человек должен.
- Для settle up сортируем должников и кредиторов, затем сводим долги минимальным количеством переводов.

## 7. Backend API

- `GET /groups`
- `POST /groups`
- `POST /groups/:id/invite`
- `GET /groups/:id`
- `POST /groups/:id/expenses`
- `GET /groups/:id/balances`
- `GET /groups/:id/settlements/suggest`
- `POST /settlements`
- `PATCH /settlements/:id/confirm`

## 8. Telegram-интеграция

- Bot menu button: "Расходы".
- Share group invite в Telegram.
- Уведомление в личку после добавления расхода.
- Inline-кнопка "Открыть баланс".
- Возможность создать группу из группового чата позже.

## 9. Технологии

- Frontend: React, Vite, TypeScript.
- Backend: Node.js + Fastify/NestJS.
- DB: PostgreSQL.
- Decimal: использовать decimal/bigint cents, не float.
- Bot: grammY или Telegraf.

## 10. Этапы

### Этап 1. Группы и участники

- Создание группы.
- Добавление участников вручную.
- Список групп пользователя.

### Этап 2. Расходы

- Добавление расхода.
- Split equally.
- Split manually.
- История расходов.

### Этап 3. Балансы

- Расчет балансов.
- Settle up suggestions.
- Подтверждение перевода.

### Этап 4. Telegram-share

- Приглашение участников.
- Уведомления о новых расходах.

### Этап 5. Полировка

- Категории.
- Фото чека как optional.
- Multi-currency как stretch goal.
- Демо-группа "Trip to Bali".

## 11. Критерии готовности

- Балансы сходятся к нулю.
- Нет ошибок округления.
- Можно добавить расход за нескольких участников.
- Можно закрыть долг.
- UI понятно объясняет, кто кому должен.
