# Class / Module Diagram

```mermaid
classDiagram
    class AuthController {
        +signup(SignupRequest) ResponseEntity
        +login(LoginRequest) ResponseEntity
    }
    class GroupController {
        +createGroup(GroupRequest) ResponseEntity
        +addMember(groupId, userId) ResponseEntity
        +getBalances(groupId) ResponseEntity
    }
    class ExpenseController {
        +addExpense(ExpenseRequest) ResponseEntity
    }

    class UserService {
        +register(SignupRequest) User
        +authenticate(LoginRequest) String
    }
    class GroupService {
        +createGroup(GroupRequest) Group
        +addMember(groupId, userId) GroupMember
        +getBalances(groupId) List~BalanceDTO~
    }
    class ExpenseService {
        +addExpense(ExpenseRequest) Expense
    }
    class SplitCalculationService {
        +calculateEqualSplit(Expense, members) List~ExpenseSplit~
        +calculateCustomSplit(Expense, shares) List~ExpenseSplit~
    }

    class UserRepository
    class GroupRepository
    class GroupMemberRepository
    class ExpenseRepository
    class ExpenseSplitRepository
    class SettlementRepository

    AuthController --> UserService
    GroupController --> GroupService
    ExpenseController --> ExpenseService
    ExpenseService --> SplitCalculationService
    UserService --> UserRepository
    GroupService --> GroupRepository
    GroupService --> GroupMemberRepository
    ExpenseService --> ExpenseRepository
    SplitCalculationService --> ExpenseSplitRepository
    GroupService --> SettlementRepository
```

**Notes**
- Controllers stay thin — no business logic, only request/response handling.
- `SplitCalculationService` is isolated from `ExpenseService` because it's the highest-risk logic (rounding, data integrity) and should be independently unit tested.
