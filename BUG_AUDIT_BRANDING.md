# Branding Audit

## Critical

- Fixed the shared brand mark in `src/components/BrandMark.jsx` so every rendered brand lockup uses `src/assets/outside-the-box-logo.png` and the shorthand reads `OTB`.
- Added the shared image mark to the authenticated workspace header in `src/components/WorkspaceShell.jsx`.
- Added the same image asset as the application favicon in `index.html`.

## High

- Verified the signed-out login page uses `BrandMark`, which now renders the shared logo asset.
- Verified the sidebar and responsive navigation use `BrandMark`, which now renders the shared logo asset.
- Added compact shared logo usage to `src/pages/AdminPage.jsx`.
- Added compact shared logo usage to `src/pages/ModeratorPage.jsx`.
- Added compact shared logo usage to `src/pages/ProfilePage.jsx`.

## Medium

- Replaced the previous wordmark styling with image-led brand styling in `src/assets/theme.css`.
- Kept `OTB` as shorthand copy next to the image mark where compact identification is useful.

## Low

- Confirmed no legacy two-letter shorthand remains in `src`.
