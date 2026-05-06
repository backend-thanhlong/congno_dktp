# Hop Dong Server Pagination Design

## Context

The `/dashboard/hop-dong` page currently fetches every contract from `/api/contracts` and filters the result in the browser. This becomes slow and memory-heavy once the contract table grows.

The requested behavior is server-side pagination with 50 rows per page, including server-side search across the full dataset.

## Goals

- Load only 50 contracts at a time on `/dashboard/hop-dong`.
- Search on the server across all matching contracts, not only the current page.
- Keep the existing create, edit, delete, role-based actions, table layout, and contract status calculation.
- Show accurate total count and page navigation.

## Non-Goals

- No pagination changes for other dashboard pages.
- No new sorting behavior.
- No schema or migration changes.
- No redesign of the contract table.

## API Design

`GET /api/contracts` will accept query parameters:

- `page`: 1-based page number. Invalid or missing values resolve to `1`.
- `pageSize`: accepted for compatibility, but clamped to 50 for this page's behavior.
- `search`: optional text query.

The endpoint will return:

```ts
{
  data: Contract[];
  pagination: {
    page: number;
    pageSize: 50;
    total: number;
    totalPages: number;
  }
}
```

Search will match `contractNumber` and `company.name` case-insensitively where Prisma/PostgreSQL support allows. The `findMany` and `count` queries will use the same `where` condition so totals match the displayed data.

The existing include shape will remain: company, appendices, and relation counts. Dynamic contract status will continue to be calculated after fetching each page.

## Client Design

`/dashboard/hop-dong/page.tsx` will keep its client component structure.

State changes:

- Replace client-side filtered list with server response data for the current page.
- Track `page`, fixed `pageSize` of 50, `total`, `totalPages`, and `searchTerm`.
- Keep a separate input value if needed so typing can reset and fetch page 1 predictably.

Fetching:

- `fetchContracts` will call `/api/contracts?page=<page>&pageSize=50&search=<search>`.
- Initial load fetches page 1.
- Search changes reset the page to 1 and fetch from the server.
- Pagination buttons fetch previous or next page.

Table behavior:

- Header count shows the server total.
- STT is calculated as `(page - 1) * 50 + index + 1`.
- Empty state remains when no rows match.
- Add footer controls with previous/next buttons and a compact range summary such as `Hien thi 51-100 / 230`.

Mutations:

- Create and edit refresh the current server page after success.
- Delete refreshes the current page. If deleting the last row makes the current page invalid, the UI moves back one page and fetches again.

## Error Handling

- API returns `400` only for unrecoverable query parsing issues if needed; otherwise invalid pagination inputs are normalized.
- API keeps the existing `500` failure response for database errors.
- Client keeps console logging for fetch failures and stops the loading state.

## Testing

- Run `npm run lint`.
- Manually verify `/dashboard/hop-dong`:
  - first page loads 50 rows or fewer;
  - next/previous page changes data and STT;
  - search returns matches across the whole table and resets to page 1;
  - create/edit/delete refresh the displayed page.

