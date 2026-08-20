# Plan for Fixing Google Places 400 and Restoring Lead Card Rich Features

This plan addresses the "Google Places: 400" error by hardening the search inputs and API request logic, and restores missing intelligence features to the `LeadResultCard`.

## 1. Technical Fixes for Error 400

- **Input Hardening**: Update `src/routes/index.tsx` to ensure `regionText` is correctly handled. If the user clears the location input, it will fallback to the current map center coordinates rather than sending an empty string or error message.
- **Request Debugging**: Add comprehensive logging in `src/lib/places.functions.ts` to capture the exact payload sent to the Google Places API and the raw response.
- **Payload Validation**: Ensure `locationBias` and `textQuery` are always correctly formatted. Specifically, ensure coordinates are valid numbers and `textQuery` is descriptive.

## 2. Restore Intelligence Features in Lead Card

- **Closing Probability**: Update `src/lib/scoring.ts` to include a `closing_probability` field (percentage) derived from the opportunity score.
- **Rich Lead Card Enhancements**:
    - Display **Closing Probability %** next to the score.
    - Add a new **Commercial Scripts** section with copy-to-clipboard buttons for WhatsApp outreach messages (Pitch, Introduction, Follow-up).
    - Make **Digital Presence** badges more descriptive (e.g., distinguishing between "Site Próprio" and social pages).
    - Ensure **CNPJ/Razão Social** block is always identifiable as "Dados Ocultos/Receita Federal".

## 3. Implementation Steps

### Backend & Logic
1.  **Scoring Update**: Edit `src/lib/scoring.ts` to add `closing_probability` to the `ScoredLead` interface and calculation logic.
2.  **API Hardening**: Edit `src/lib/places.functions.ts` to add logging and refine `textQuery`/`locationBias` construction.

### Frontend
3.  **Search Workflow**: Edit `src/routes/index.tsx` to improve validation and fallback logic in `runSearch`.
4.  **UI Components**: Edit `src/components/lead-result-card.tsx` to:
    - Add the probability percentage.
    - Implement the "Scripts Comerciais" (WhatsApp scripts) UI.
    - Standardize the "Dados Ocultos" display.

## Technical Details

- **Probability Mapping**: Score 80+ -> 90-95% probability; 60-79 -> 75-89%; etc.
- **Wait/wa.me Link**: Ensure WhatsApp scripts use the `wa.me` format with pre-filled text.
- **Safe Area Insets**: Ensure the new sections don't break the 44px minimum touch target rule on mobile.
