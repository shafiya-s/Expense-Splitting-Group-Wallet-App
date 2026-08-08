# Problem Statement

## 1. Title
Expense Splitting & Group Wallet App

## 2. Domain
FinTech / Personal Finance Management

## 3. Who is the user?
- **Group Member** — a regular user who joins groups, adds their own expenses, and views balances.
- **Group Admin** — the creator/manager of a group; can add or remove members and edit group details, in addition to all Member permissions.

## 4. What problem are we solving?
Groups of friends, roommates, or colleagues frequently share expenses — rent, trips, group dinners — and currently track who-owes-whom using spreadsheets, chat threads, or memory. This leads to calculation errors, forgotten debts, and awkward conversations about money. For example, four roommates splitting a monthly grocery bill of ₹4,300 need to know exactly how much each owes after accounting for uneven contributions, and that record needs to survive weeks of ongoing shared expenses without drifting out of sync.

## 5. Proposed Solution
A full-stack web application where users:
- Create and join groups
- Add expenses to a group with a chosen split method (equal or custom shares)
- Automatically see calculated per-member balances (who owes, who is owed)
- Record settlements when a debt is paid off
- View a running history of all group expenses and settlements

## 6. Core Entities / Database Tables (6 tables)
1. **User** — id, name, email, password_hash, created_at
2. **Group** — id, name, description, created_by (FK→User), created_at
3. **GroupMember** — id, group_id (FK→Group), user_id (FK→User), role_in_group, joined_at *(junction table, resolves User↔Group many-to-many)*
4. **Expense** — id, group_id (FK→Group), paid_by (FK→User), amount, description, split_type, created_at
5. **ExpenseSplit** — id, expense_id (FK→Expense), user_id (FK→User), share_amount, is_settled
6. **Settlement** — id, group_id (FK→Group), paid_by (FK→User), paid_to (FK→User), amount, settled_on

## 7. User Roles & Permissions
| Role | Permissions |
|---|---|
| Admin | Create/edit/delete group, add/remove members, all Member permissions |
| Member | Add expenses, view balances, record settlements they're party to |

## 8. Success Criteria
- A user can create a group and add a member in under 30 seconds.
- A user can add an expense and see updated balances for all group members in under 10 seconds.
- Split calculations always sum exactly to the original expense amount (no rounding drift, verified by unit test).

## 9. Out of Scope (v1)
- Multi-currency support
- Receipt image upload / OCR
- Push notifications / email reminders
- Recurring expenses
- Native mobile app

## 10. Chosen Track
Java (Spring Boot)
