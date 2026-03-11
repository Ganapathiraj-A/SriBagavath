# Comprehensive Visibility Logic Update

Ensure that all hub and management pages correctly respect the `hiddenScreens` configuration and `effectiveRole`, preventing unauthorized access or accidental exposure of protected admin links.

## User Review Required

> [!NOTE]
> This update applies a consistent visibility filtering pattern across several pages to ensure that links to management screens are hidden if they are configured to be so.

## Proposed Changes

### Navigation & Hub Pages

#### [MODIFY] [PageAndUserManagement.jsx](file:///home/ganapathiraj/Code/Android/SriBagavath/src/pages/PageAndUserManagement.jsx)
- Implement `effectiveRole` and `currentHiddenScreens` calculation.
- Filter the management items based on `currentHiddenScreens`.

#### [MODIFY] [AyyasSchedule.jsx](file:///home/ganapathiraj/Code/Android/SriBagavath/src/pages/AyyasSchedule.jsx)
- Hide the "Edit" button if `/schedule/manage` is in the hidden screens.

##### Receipt Viewing & Scrolling Fixes

Multiple registration screens (student and admin) have restrictive image height constraints that block scrolling, and `MyRegistrations.jsx` is missing image normalization which causes broken icons.

### MyRegistrations & Admin Screens

#### [MODIFY] [MyRegistrations.jsx](file:///home/ganapathiraj/Code/Android/SriBagavath/src/pages/MyRegistrations.jsx)
- Import and use `normalizeImageSrc` for receipt rendering.
- Use `<LazyImage height="auto" objectFit="contain" />` to allow natural image expansion.
- Ensure the parent container has `overflow-y: auto`, `max-height: 65vh`, and `flex-shrink: 0`.

#### [MODIFY] [AdminReview.jsx](file:///home/ganapathiraj/Code/Android/SriBagavath/src/pages/AdminReview.jsx)
- Update image container to `flex-shrink: 0` to prevent squishing.
- Use `<LazyImage height="auto" objectFit="contain" />`.

#### [MODIFY] [BankReconciliationRegs.jsx](file:///home/ganapathiraj/Code/Android/SriBagavath/src/pages/BankReconciliationRegs.jsx)
- Standardize with `height="auto"` and `objectFit="contain"`.

### Structural & Runtime Fixes

#### [MODIFY] [OnlineMeetings.jsx](file:///home/ganapathiraj/Code/Android/SriBagavath/src/pages/OnlineMeetings.jsx)
#### [MODIFY] [SatsangListing.jsx](file:///home/ganapathiraj/Code/Android/SriBagavath/src/pages/SatsangListing.jsx)
#### [MODIFY] [DailyZoomMeetings.jsx](file:///home/ganapathiraj/Code/Android/SriBagavath/src/pages/DailyZoomMeetings.jsx)
- Add missing `useGlobalSettings` import.

#### [MODIFY] [GlobalSettingsContext.jsx](file:///home/ganapathiraj/Code/Android/SriBagavath/src/context/GlobalSettingsContext.jsx)
- Fix memory leak by correctly handling the user settings subscription.

#### [MODIFY] [SyncManager.js](file:///home/ganapathiraj/Code/Android/SriBagavath/src/utils/SyncManager.js)
- Import `getDocCacheFirst` to resolve runtime failure.

### [Component Name]
#### [MODIFY] [PageHeader.jsx](file:///home/ganapathiraj/Code/Android/SriBagavath/src/components/PageHeader.jsx)
- Update `parentMappings` to correctly point administrative sub-pages to the "Books & Media Management" hub.
- Add missing mapping for Digital Books settings.

#### [MODIFY] [DigitalBookSettings.jsx](file:///home/ganapathiraj/Code/Android/SriBagavath/src/pages/DigitalBookSettings.jsx)
- Remove `leftAction` override to use the standardized hierarchical navigation from `PageHeader`.

#### [MODIFY] [AdminBookManagement.jsx](file:///home/ganapathiraj/Code/Android/SriBagavath/src/pages/AdminBookManagement.jsx)
- Ensure it uses the hierarchical back logic (it already does by not specifying `leftAction`, but `PageHeader` needs the mapping update).

#### [MODIFY] [ProtectedRoute.jsx](file:///home/ganapathiraj/Code/Android/SriBagavath/src/components/ProtectedRoute.jsx)
- Update component to accept and enforce `requiredRole`, `requiredAdmin`, and `allowedPermissions`.
- Implement `accessDenied` logic that evaluates strict role comparisons and permission checks (including singular and array-based).
- Retain existing `isAdmin` and `loading` guards.

#### [MODIFY] [build.sh](file:///home/ganapathiraj/Code/Android/SriBagavath/build.sh)
- Added automatic ADB detection and silent installation of the generated APK after a successful build.
- **NEW**: Integrated `nmap` fallback to automatically scan the local network for devices with port 5555 open if the last known IP fails to connect.
- This skip AAB builds as they cannot be installed directly via ADB.
build produced an APK, perform a silent install using `adb install -r`.
- Ensure this only runs for APK outputs (`dev` and `prod` flavors, not `prod-aab`).

### Permission Alignment

#### [MODIFY] [BooksAndMediaManagement.jsx](file:///home/ganapathiraj/Code/Android/SriBagavath/src/pages/BooksAndMediaManagement.jsx)
- Use `PRINT_BOOKS_MANAGEMENT` consistently.

#### [MODIFY] [AdminProgramManagement.jsx](file:///home/ganapathiraj/Code/Android/SriBagavath/src/pages/AdminProgramManagement.jsx)
- Use `PROGRAM_MANAGEMENT` for program types to match `App.jsx`.

#### [MODIFY] [ManageUsers.jsx](file:///home/ganapathiraj/Code/Android/SriBagavath/src/pages/ManageUsers.jsx)
- Review and refine the list of assignable permissions.

## Verification Plan

### Automated Tests
- None.

### Manual Verification
- Navigate to Book Management and click back -> Should go to Books & Media.
- Navigate to Digital Books Settings and click back -> Should go to Books & Media.
- Navigate to Related Videos and click back -> Should go to Books & Media.
1. Open the "Hide Screens" settings.
2. Hide specific screens (e.g., "Daily Zoom Management").
3. Verify that the "Edit" button is hidden on the "Daily Zoom Meeting" page.
4. Verify that the link is also hidden in "Page and User Management".
5. Repeat for other screens like "Online Meetings", "Satsang", etc.
6. Verify "Admin Dashboard" hides the review banner if "Review Payments" is hidden.
ttings**.
4.  Verify that **Cloud Global Settings** is no longer visible.
5.  Repeat for **Analytics & Tools**.
6.  Undo the changes and verify they reappear.
