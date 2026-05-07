# Hop Dong Danh Muc Hang Hoa Design

## Context

The `/dashboard/hop-dong` page currently manages contract metadata only: contract number, company, dates, value, status, priority, appendices, and calculated totals. The project does not yet have a product or goods catalog model attached to contracts.

Users need to pick a contract, add a goods category for that contract, choose whether the category is `Thuoc` or `Vat tu`, then maintain line items with fields specific to that chosen type.

## Goals

- Allow each contract to have one goods category.
- Support two category types: `Thuoc` and `Vat tu`.
- Show type-specific item fields after the category type is chosen.
- Allow users with contract edit permission to create, edit, and delete category items.
- Calculate each line's `Thanh tien` from `So luong * Don gia`.
- Keep the existing contract list, pagination, search, role checks, and contract CRUD behavior intact.

## Non-Goals

- No import/export from Excel in this iteration.
- No cross-contract master catalog.
- No stock, inventory, bidding, or pharmacy workflow.
- No mixed category types within one contract.
- No changes to payment, invoice, acceptance, or appendix business logic.

## Data Model

Add enum:

```prisma
enum GoodsCategoryType {
  MEDICINE
  SUPPLY
}
```

Add one category per contract:

```prisma
model ContractGoodsCategory {
  id         String            @id @default(cuid())
  contractId String            @unique
  contract   Contract          @relation(fields: [contractId], references: [id], onDelete: Cascade)
  type       GoodsCategoryType
  medicines  MedicineItem[]
  supplies   SupplyItem[]
  createdAt  DateTime          @default(now())
  updatedAt  DateTime          @updatedAt
}
```

Add medicine line items:

```prisma
model MedicineItem {
  id             String                @id @default(cuid())
  categoryId     String
  category       ContractGoodsCategory @relation(fields: [categoryId], references: [id], onDelete: Cascade)
  orderNumber    Int
  drugName       String
  activeIngredient String
  concentration  String
  dosageForm     String
  route          String
  unitPrice      Decimal               @db.Decimal(18, 2)
  quantity       Decimal               @db.Decimal(18, 2)
  lineTotal      Decimal               @db.Decimal(18, 2)
  createdAt      DateTime              @default(now())
  updatedAt      DateTime              @updatedAt
}
```

Add supply line items:

```prisma
model SupplyItem {
  id                   String                @id @default(cuid())
  categoryId           String
  category             ContractGoodsCategory @relation(fields: [categoryId], references: [id], onDelete: Cascade)
  orderNumber          Int
  goodsName            String
  technicalRequirement String?
  quantity             Decimal               @db.Decimal(18, 2)
  unitPrice            Decimal               @db.Decimal(18, 2)
  lineTotal            Decimal               @db.Decimal(18, 2)
  createdAt            DateTime              @default(now())
  updatedAt            DateTime              @updatedAt
}
```

The `Contract` model will receive an optional `goodsCategory` relation.

## API Design

Add contract-scoped category endpoints:

- `GET /api/contracts/[id]/goods-category`: returns the category, type, and matching item list for the selected contract.
- `POST /api/contracts/[id]/goods-category`: creates the category with type `MEDICINE` or `SUPPLY`; fails if the contract already has a category.
- `PUT /api/contracts/[id]/goods-category`: updates line items for the existing category.
- `DELETE /api/contracts/[id]/goods-category`: deletes the category and all item lines.

The API will calculate `lineTotal` server-side for every submitted item. Client-submitted totals are ignored or treated as display-only so persisted totals stay consistent.

Validation:

- Contract must exist.
- Category type must be `MEDICINE` or `SUPPLY`.
- A contract cannot have more than one category.
- Medicine items require: `orderNumber`, `drugName`, `activeIngredient`, `concentration`, `dosageForm`, `route`, `unitPrice`, `quantity`.
- Supply items require: `orderNumber`, `goodsName`, `unitPrice`, `quantity`; `technicalRequirement` is optional.
- `quantity` and `unitPrice` must be non-negative numbers.

## Client Design

On `/dashboard/hop-dong`, add a `Danh muc` action for every authenticated user. Users with the existing contract edit permission (`ADMIN` or `KHOA_DUOC`) can create, save, and delete category data. Other roles can open the dialog in read-only mode.

The category interaction will open a dialog for the selected contract:

1. Header shows the contract number and company.
2. If no category exists, show `Them danh muc` with a type selector: `Thuoc` or `Vat tu`.
3. After type selection, render the matching editable table.
4. Users can add rows, edit fields inline, delete rows, and save.
5. `Thanh tien` displays automatically as `So luong * Don gia`.
6. Once created, the category type is locked. Changing type requires deleting the category and creating it again, which avoids mixing incompatible item schemas.

Medicine columns:

- `STT`
- `Ten thuoc`
- `Ten hoat chat`
- `Nong do hoac Ham luong`
- `Dang bao che`
- `Duong dung`
- `Don gia`
- `So luong`
- `Thanh tien`

Supply columns:

- `STT`
- `Ten hang hoa`
- `Yeu cau ky thuat`
- `So luong`
- `Don gia`
- `Thanh tien`

## Data Flow

Opening the dialog fetches the category for the selected contract. If the response is empty, the client stays in create mode. After the user chooses a type and adds rows, the client sends the type and line items to the API. The server validates the payload, recalculates line totals, and stores the category plus its item rows in a transaction.

Saving existing rows replaces the category's current item list with the submitted rows for that same type. This is simpler and safer than per-row patching for the first iteration, and it keeps item order predictable.

## Error Handling

- Missing contract returns `404`.
- Duplicate category creation returns `409`.
- Invalid type, required fields, or invalid numbers return `400`.
- Database failures return `500`.
- The client shows failed saves by keeping the dialog open and logging the error, matching the app's existing lightweight error handling style.

## Testing

- Run `npm run lint`.
- Run `npx prisma generate` after schema changes.
- Verify migration applies cleanly in the development database.
- Manually verify:
  - Contract list still loads and paginates.
  - A medicine category can be created, saved, reopened, edited, and deleted.
  - A supply category can be created, saved, reopened, edited, and deleted.
  - `Thanh tien` updates from `So luong * Don gia`.
  - A contract cannot create a second category without deleting the existing one.
  - Users without edit permission cannot modify category data.
