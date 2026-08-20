# Plan: Fix Search and Autocomplete Functionality

Investigate and fix the reported issue where the search and autocomplete features have stopped working, ensuring proper authentication, parameter mapping, and quota handling.

## Proposed Changes

### 1. Hardening & Debugging
- Restore clean search parameters in `src/routes/index.tsx` (already partially done).
- Add specific `console.error` logs in `src/lib/places.functions.ts` and `src/lib/places-suggest.functions.ts` to capture API errors (HTTP 400, 403, 500) within the sandbox logs.
- Verify `GOOGLE_MAPS_API_KEY` and `LOVABLE_API_KEY` presence in the runtime environment.

### 2. Autocomplete Restoration
- Ensure `SmartAutocomplete` properly triggers the `asyncSource` (`autocompleteRegion`).
- Check if `autocompleteRegion` is failing due to missing keys or invalid body structure for the new Google Places API.

### 3. Search Quota Logic
- Verify that `consume_search_quota` RPC is correctly defined and callable by the `authenticated` role.
- Confirm `is_master` bypass is working correctly for the master email.

### 4. Link Classification & Pitch Hardening
- Ensure `classifyLink` is not causing silent crashes during search result processing.
- Verify `Opportunity Score` and `Closing Probability` calculations in `src/lib/scoring.ts` are robust against missing `PlaceResult` fields.

## Technical Details
- **API**: Google Places API (New) via Lovable Connector Gateway.
- **Auth**: TanStack Start `requireSupabaseAuth` middleware + `attachSupabaseAuth` function middleware.
- **Quota**: Lifetime limit for Free users (1 search).

## Verification Plan
- **Automated**: Use `tsgo` for type checking.
- **Runtime**: Run a Playwright script that performs a search and checks for rendered `article` elements and console errors.
- **Logs**: Check `stack_modern--server-function-logs` for `[places.functions]` after test runs.
