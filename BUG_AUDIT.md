# Platform Bug Audit

Date: 2026-05-28

Scope: authenticated workspace navigation, role visibility, file access, profile/member labels, report flows, RLS-facing service calls, and UI actions.

## Critical

### Fixed: Moderator dashboard navigation routed to Admin
- Area: `src/pages/HomePage.jsx`
- Issue: The Home dashboard `Pending reports` card sent every moderator/admin user to `admin`, even though moderators no longer have full Admin access.
- Impact: Moderators could land on a blocked Admin page instead of the intended Moderator page.
- Fix: Route admins to `admin` and moderators to `moderator`.

### Fixed: Internal storage paths exposed in file cards
- Area: `src/components/FileRecord.jsx`
- Issue: File cards displayed full `storage_path` / `object_path`, which can include room or project UUIDs.
- Impact: End users could see internal identifiers.
- Fix: File cards now show only the stored filename, display name, file metadata, uploader, and Open/View.

### Fixed: Admin and Moderator report views exposed raw UUID context
- Areas: `src/pages/AdminPage.jsx`, `src/pages/ModeratorPage.jsx`, `src/services/adminService.js`, `src/services/moderationService.js`
- Issue: Reports showed `room_id`, `project_id`, target IDs, actor IDs, and target user IDs directly.
- Impact: Admin/moderator users saw raw UUIDs instead of usable context.
- Fix: Report rows now resolve room/project names, reporter identity, target labels, actor identity, and target-user labels where records are visible.

## High

### Fixed: Member and ownership fallbacks exposed UUIDs
- Areas: `src/services/chatService.js`, `src/services/projectService.js`, `src/services/fileService.js`
- Issue: Missing profile joins fell back to `user_id`, `author_id`, or `owner_id`.
- Impact: Project members, chat authors, file uploaders, and owners could appear as UUIDs.
- Fix: Fallbacks now use clean labels such as `Unknown member`, `Owner unavailable`, or `Uploader unavailable`.

### Fixed: Role values displayed as plain text in member/profile contexts
- Areas: `src/components/RoleBadge.jsx`, `src/pages/ProjectsPage.jsx`, `src/pages/ProfessionalsPage.jsx`, `src/pages/AdminPage.jsx`
- Issue: Roles were shown inconsistently or as plain strings.
- Impact: Member/admin/profile rows lacked a clear role indicator.
- Fix: Added a reusable role badge and applied it to professional profiles, project members, and admin membership rows.

### Fixed: Chat room invite selectors used profile UUID as visible fallback
- Area: `src/pages/ChatPage.jsx`
- Issue: If a profile lacked `full_name` and `email`, invite options displayed the UUID.
- Impact: Users could see raw member IDs while inviting room members.
- Fix: Fallback now shows `Profile record`.

## Medium

### Remaining: General Moderator report form still requires target IDs
- Area: `src/pages/ModeratorPage.jsx`
- Issue: The general `Report a Concern` form supports direct target IDs because reports are polymorphic.
- Impact: It works, but it is less user-friendly than selecting a live record from context.
- Recommendation: Add target search/pickers for messages, rooms, projects, profiles, and files.

### Remaining: Admin destructive actions rely on RPC/RLS for final enforcement
- Areas: `src/pages/AdminPage.jsx`, `src/services/adminService.js`
- Issue: UI is gated to admin, but final authorization depends on SQL functions and RLS.
- Impact: This is the correct production boundary, but manual SQL migrations must be applied in order.
- Recommendation: Apply all migrations in Supabase SQL Editor and verify admin RPCs exist.

### Remaining: Storage signed URL access depends on metadata/object path alignment
- Areas: `src/components/FileRecord.jsx`, `supabase/migrations/20260528_private_file_signed_access.sql`
- Issue: Signed URLs require a matching `files.storage_path` or `files.object_path` row.
- Impact: Older objects without metadata will not open.
- Recommendation: Backfill metadata for any pre-existing storage objects that should be accessible.

## Low

### Remaining: Some admin rows are dense on small screens
- Area: `src/pages/AdminPage.jsx`
- Issue: Admin rows contain several controls and labels.
- Impact: Usable, but future polish could improve scanning.
- Recommendation: Split admin controls into tabs or sections with compact detail drawers.

### Audit Notes

- No demo data or fake records were added.
- No frontend service-role key usage was introduced.
- Public sample uploads were not introduced.
- Navigation audit confirmed regular members do not receive Admin or Moderator nav items.
- Report entry points visible to regular members are contextual and labeled `Report a Concern`.
