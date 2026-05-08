# Hop Dong Bo Loc Chuyen Nghiep Design

## Context

The `/dashboard/hop-dong` page already uses server-side pagination with 50 rows per page and a debounced server-side search. The current API only supports `page`, `pageSize`, and `search`, so users cannot narrow contracts by operational state or reporting fields without scanning the table manually.

The requested feature is a professional filter set for the contract page. It must support both daily operations and reporting/reconciliation use cases while keeping the page compact.

## Goals

- Keep the existing debounced search behavior.
- Add an advanced filter panel under the search area, opened by a `Bo loc` button and collapsed by default.
- Let users adjust multiple advanced conditions and apply them with an explicit `Ap dung` action.
- Filter on the server before pagination, so results and totals cover the whole dataset.
- Support multi-select filters for company, contract status, priority, goods category type, and operational presence fields.
- Support date ranges for sign date and expiry date.
- Support fixed expiry presets for contracts expiring in 30, 60, or 90 days.
- Keep money columns visible but do not add money filtering in the first version.
- Do not persist filters in the URL.

## Non-Goals

- No URL query synchronization for filters.
- No saved filter presets.
- No export/reporting page in this iteration.
- No filtering by medicine or supply item names.
- No filtering by contract value, appendix value, or total value.
- No schema or migration changes.

## Recommended Approach

Use server-side filtering in the existing `/api/contracts` endpoint and keep the UI inside `/dashboard/hop-dong/page.tsx`.

Search remains a separate debounced input. Advanced filters use draft state in the open panel. Clicking `Ap dung` copies draft filters into applied filters, resets the page to `1`, and fetches contracts with all applied query parameters. Clicking `Xoa loc` clears only advanced filters and leaves the current search text untouched.

This approach fits the current server-side pagination and avoids loading every contract into the browser.

## UI Design

The existing search card becomes the filter control area:

- Top row: search input, `Bo loc` button, and `Xoa loc` button when advanced filters are active.
- The `Bo loc` button displays the count of active advanced filter groups.
- The advanced panel opens below the top row and is collapsed by default.
- The panel has three groups:
  - `Thong tin hop dong`: company, status, priority.
  - `Thoi gian`: sign date range, expiry date range, expiring-in preset.
  - `Van hanh`: goods category presence, goods category type, appendix presence, acceptance presence, payment presence, invoice presence.

Controls:

- Small fixed option sets use compact checkbox groups.
- Company uses a searchable checkbox list because the company list can grow.
- Presence filters allow `Co` and `Chua co`; choosing both is equivalent to no filter for that field.
- Date ranges use two date inputs: `Tu` and `Den`.
- Expiring-in is one of `30`, `60`, or `90` days and only matches non-terminated contracts whose expiry date is between today and the selected future date.
- Panel footer has `Ap dung`, `Xoa loc`, and a compact active-filter summary.

The table layout stays unchanged. The contract card description changes to indicate filtered results when advanced filters are active.

## API Design

Extend `GET /api/contracts` while preserving existing behavior.

Supported query parameters:

```text
page=1
pageSize=50
search=abc
companyIds=id1,id2
statuses=ACTIVE,EXPIRED,TERMINATED
priorities=HIGH,NORMAL,LOW
signDateFrom=2026-01-01
signDateTo=2026-12-31
expiryDateFrom=2026-01-01
expiryDateTo=2026-12-31
expiringInDays=30 | 60 | 90
goodsCategoryPresence=HAS | NONE
goodsCategoryTypes=MEDICINE,SUPPLY
appendixPresence=HAS | NONE
acceptancePresence=HAS | NONE
paymentPresence=HAS | NONE
invoicePresence=HAS | NONE
```

Rules:

- `companyIds`: maps to `companyId in [...]`.
- `priorities`: maps to `priority in [...]`.
- `statuses`:
  - `TERMINATED`: persisted status is `TERMINATED`.
  - `ACTIVE`: persisted status is not `TERMINATED` and `expiryDate >= today`.
  - `EXPIRED`: persisted status is not `TERMINATED` and `expiryDate < today`.
- Date range `To` values are interpreted as the end of the selected day.
- `expiringInDays` uses today through today plus 30/60/90 days, and excludes terminated contracts.
- Goods category presence uses relation null checks.
- Goods category type uses `goodsCategory.type in [...]`.
- Appendix, acceptance, payment, and invoice presence use relation `some` or `none`.
- If both presence values are selected for a field, the filter is ignored for that field.

The response shape remains:

```ts
{
  data: Contract[];
  pagination: {
    page: number;
    pageSize: 50;
    total: number;
    totalPages: number;
  };
}
```

## Client State And Data Flow

Add typed filter state:

- `draftFilters`: values currently being edited in the open panel.
- `appliedFilters`: values used for the last fetch.
- `isFilterPanelOpen`: panel visibility.
- `companyFilterSearch`: local search text for the company checkbox list.

Fetching:

- `fetchContracts(page, searchTerm, appliedFilters)` serializes filters into `URLSearchParams`.
- Search debounce still updates `searchTerm` and resets page to `1`.
- Applying filters sets page to `1` and updates `appliedFilters`.
- Clearing filters sets page to `1`, resets `draftFilters` and `appliedFilters`, and keeps `searchInput`.

The active filter count is computed from `appliedFilters`, counting filter groups rather than every selected checkbox.

## Error Handling

- Invalid enum values are ignored rather than causing hard failures.
- Invalid dates are ignored.
- Invalid `expiringInDays` values are ignored unless they are `30`, `60`, or `90`.
- API failures keep the existing console logging and loading-state reset.
- Empty filtered results reuse the current empty table state.

## Testing

- Run `npm run lint`.
- Manually verify:
  - Search still debounces and resets to page 1.
  - Advanced filters only change results after clicking `Ap dung`.
  - `Xoa loc` clears advanced filters but keeps search text.
  - Company, status, priority, date ranges, expiring-in, goods category, and relation presence filters return correct totals.
  - Pagination reflects filtered totals and STT still uses the server page.
  - Create, edit, and delete still refresh the current filtered result set.
