# Plan - Busca Mágica Technical Roadmap Phase 2

Implementation of advanced data extraction, enhanced leads management, and improved business intelligence indicators.

## User Features
- **Enhanced Lead Persistence**: Automatic storage of audit results (CNPJ, social links, emails) in the database to prevent re-auditing.
- **Advanced CNPJ Insights**: Detailed partner listing and capital social visualization in the lead card.
- **Dynamic Sales Roadmap**: A more structured three-step approach logic based on lead vulnerabilities.
- **Digital Footprint Verification**: Clearer distinction between verified social links (from site) and inferred links (from phone/google).

## Technical Changes
- **Database Schema**: Add `audit_data` column to the `leads` table to store the `DigitalAudit` JSON.
- **CNPJ Integration**: Extend `extractCnpjFromHtml` to handle more edge cases and ensure `BrasilAPI` data is cached.
- **Scoring Engine**: Refine `scoreLead` weights to include CNPJ status (e.g., active vs. inactive) as a high-value signal.
- **Link Normalization**: Ensure all extracted links are sanitized before display.

## Technical Details
- **Migration**: SQL to add JSONB column to `public.leads`.
- **Logic Refactor**: Move `scoreLead` and `classifyOpportunity` logic to be more modular.
- **BrasilAPI Optimization**: Implement a retry/fallback mechanism if the primary API fails.
