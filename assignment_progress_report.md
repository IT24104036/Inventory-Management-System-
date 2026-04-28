---
title: "IT2021 – AIML Project | Assignment 03 – Progress II"
subtitle: "Invigo FreshGuard: Responsible Component Progress Report"
date: "April 2026"
---

\newpage

# IT2021 – AIML Project
## Assignment 03 – Progress II
### Invigo FreshGuard – Responsible Component Documentation

| | |
|---|---|
| **Module** | IT2021: AIML Project |
| **Assessment** | Assignment 03 – Progress II |
| **Stage** | 2nd Year, Semester 2, 2026 |
| **Institution** | Sri Lanka Institute of Information Technology |
| **Faculty** | Department of IT, Faculty of Computing |
| **Maximum Marks** | 30 |
| **Contribution** | 30% of Final Grade |

---

## Responsible Components

The following three components are my assigned responsibility for this project:

| # | Component | Route | Source File |
|---|-----------|-------|------------|
| 1 | Admin – User Management | `/admin/users` | `src/pages/Admin.jsx` |
| 2 | Forgot Password | `/forgot-password` | `src/pages/ForgotPassword.jsx` |
| 3 | Staff – Profile | `/staff/profile` | `src/components/StaffProfile.jsx` |

---

\newpage

# SECTION 1 – PROGRESS OF RESPONSIBLE COMPONENTS

*Evaluation Criterion: approximately 75% or more of responsible features implemented and demonstrable*

## 1.1 Implementation Progress Summary

| Feature | Status | Notes |
|---------|--------|-------|
| Admin: View all staff users | ✅ Complete | Table with all staff listed |
| Admin: Create new staff account | ✅ Complete | Full form with validation |
| Admin: Edit staff account | ✅ Complete | Role-aware editing logic |
| Admin: Delete / Revoke access | ✅ Complete | Confirmation + API call |
| Admin: Search & filter users | ✅ Complete | Name, role, date range filters |
| Admin: Sort by column | ✅ Complete | Name, role, entry date |
| Admin: Account lock monitoring | ✅ Complete | Security tab with unlock |
| Forgot Password: Email step | ✅ Complete | Real-time email validation |
| Forgot Password: OTP verification | ✅ Complete | 6-box input with auto-focus |
| Forgot Password: Password reset | ✅ Complete | Strength meter, match check |
| Forgot Password: Success screen | ✅ Complete | Animated completion screen |
| Forgot Password: Resend OTP | ✅ Complete | 60s countdown timer |
| Staff Profile: View profile data | ✅ Complete | Hero banner, account cards |
| Staff Profile: Update display name | ✅ Complete | With localStorage sync |
| Staff Profile: Change password | ✅ Complete | 5-stage validation |
| Staff Profile: Session guard | ✅ Complete | Redirects if not logged in |
| Route protection (ProtectedRoute) | ✅ Complete | ADMIN / STAFF role-based |
| Route protection (GuestRoute) | ✅ Complete | Redirects logged-in users |

**Implemented: 18 / 18 features = 100%** — well above the 75% milestone requirement.

---

## 1.2 Core Functionalities

### Component 1: Admin – User Management (`/admin/users`)

This component provides full staff lifecycle management for administrators. Implemented features include:

**User Listing:** All staff members are fetched from the backend on page load via `GET /api/admin/users` and displayed in a sortable, filterable table. Each row shows the staff member's name, username badge, role badge (color-coded), and date of joining.

**Create New Staff:** An administrator can onboard new staff through a dialog form. All fields are validated before submission. On success, the user list automatically updates.

**Edit Staff:** Role-aware editing is implemented. When an administrator edits their own account, only the password field is shown. When editing another staff member's account, full fields (name, username, email, date of joining, role, optional new password) are editable. Admin accounts cannot be edited by other admins.

**Delete / Revoke Access:** Staff accounts can be permanently deleted after a confirmation dialog. The action is irreversible and admin accounts are protected from deletion.

**Search, Filter, Sort:** The user table supports:
- Text search by name or username (case-insensitive substring)
- Role dropdown filter
- Date range filter (from / to) with cross-validation
- Column sort on Name, Role, and Entry Date with ascending/descending toggle

**Security Tab:** A dedicated security monitoring section displays staff accounts with failed login attempts and provides an unlock button to reset account lock status.

---

### Component 2: Forgot Password (`/forgot-password`)

A fully animated multi-step password recovery flow. Implemented as 4 sequential stages:

**Step 0 – Email Submission:** User enters their registered email. Real-time validation with colour-coded feedback. On success, an OTP is dispatched to the email.

**Step 1 – OTP Verification:** Six individual digit input boxes with auto-focus progression, backspace navigation, and clipboard paste support. A 60-second resend countdown prevents spam. The "Verify Code" button is disabled until all 6 digits are entered.

**Step 2 – New Password:** New and confirm password fields with individual show/hide toggles. A 4-bar real-time password strength meter provides visual feedback. The submit button is disabled until validation passes.

**Step 3 – Success:** Animated completion screen with a spring-animated checkmark, success message, and a "Go to Login" navigation button.

**Progress Indicator:** A visual step progress bar (1/4 → 4/4) fills progressively across steps. A sidebar on larger screens shows labelled step indicators (Email → OTP → Password → Done) with completion checkmarks.

---

### Component 3: Staff Profile (`/staff/profile`)

A personal profile management page for authenticated staff members. Implemented features:

**Profile Hero:** Displays avatar with initials, full name, username badge, role badge (colour-coded: green for Staff, purple for Admin), and formatted join date.

**Read-Only Account Info Cards:** Three cards display username (with note "Cannot be changed"), role (with note "Set by administrator"), and date joined.

**Update Display Name:** An editable form allows the staff member to update their display name. On save, the profile state, UI, and localStorage session are all updated simultaneously.

**Change Password:** A secure 3-field password change form with comprehensive validation (see Section 4). On success, all fields are cleared.

**Session Guard:** On mount, the component checks for a valid session. If no session is found, the user is immediately redirected to `/login`.

---

\newpage

# SECTION 2 – USER EXPERIENCE: TASK FLOW, NAVIGATION & USABILITY

*Evaluation Criterion: logical and intuitive task flows, clear navigation, meaningful user feedback*

## 2.1 Task Flow: Admin User Management

The administrator follows a clear, sequential task flow for staff management:

```
Dashboard → Admin Panel (sidebar) → Users Tab
    → [View staff table]
    → Click "Add New Staff" → Fill form → Submit → User added, table refreshes
    → Click Edit (pencil icon) → Modify fields → Save → Table updates inline
    → Click Delete (trash icon) → Confirmation dialog → Confirm → User removed
    → Search box / filter dropdowns → Table filters in real-time
    → Click column header → Table re-sorts with visual arrow indicator
    → Security Tab → View locked accounts → Click Unlock → Account unlocked
```

**User Feedback Points:**
- Error messages appear at the top of dialog forms as red alert boxes
- Success: dialog closes and table refreshes automatically
- Delete confirmation prevents accidental data loss
- Date filter error shown inline below the filter control
- Column sort direction shown via ChevronUp/ChevronDown icons

## 2.2 Task Flow: Forgot Password

The recovery flow is a strictly sequential, linear process:

```
Login Page → "Forgot Password?" link → /forgot-password

Step 1: Email
    → Type email → Real-time valid/invalid feedback
    → Click "Send OTP Code" → Loading spinner → Advances to Step 2

Step 2: OTP Verification
    → 6 boxes fill automatically with focus progression
    → Click "Verify Code" → Loading spinner → Advances to Step 3
    → OR: Wait for countdown → Click "Resend OTP" → New code sent

Step 3: New Password
    → Type new password → Strength meter updates in real-time
    → Type confirm password → Match/mismatch feedback shown
    → Click "Reset Password" → Advances to Step 4

Step 4: Success
    → Spring-animated checkmark displayed
    → Click "Go to Login" → Navigates to /login
```

**Navigation Aids:**
- Animated progress bar fills progressively at the top of the form card
- "Back to Login" link on Step 0
- "Change email" button on Step 1 returns to Step 0
- Step transition animations (slide left/right) signal direction of navigation
- All buttons are disabled during loading (with spinner shown)

## 2.3 Task Flow: Staff Profile

```
Staff Dashboard → Sidebar "Profile" link → /staff/profile

→ Page loads spinner → Profile data fetched → Hero banner displayed

Update Name:
    → Locate "Display Name" section
    → Edit name field → Click "Save Name"
    → Button shows "Saving…" → changes to "Saved!" (3s) → Toast notification

Change Password:
    → Locate "Change Password" section
    → Enter Current Password, New Password, Confirm Password
    → Real-time mismatch indicator on Confirm field
    → Click "Update Password"
    → Success banner shown for 4 seconds + toast notification
    → All fields cleared automatically
```

**User Feedback Points:**
- Loading spinner during initial profile fetch
- "Profile Unavailable" error banner with Retry button if backend is down
- Toast notifications for every save/fail action
- "No changes" toast if name hasn't changed
- Real-time red border on confirm password when mismatch detected
- Separate show/hide toggle for each password field
- Read-only fields clearly labelled "(Cannot be changed)" and "(Set by administrator)"

---

\newpage

# SECTION 3 – USER INTERFACE CONSISTENCY & STANDARDS

*Evaluation Criterion: consistent layouts, labels, formatting, readability*

## 3.1 Design System

All three components share the same design system built with **Shadcn/UI** components and **Tailwind CSS**, ensuring visual consistency:

| Element | Standard Applied |
|---------|----------------|
| Buttons | `rounded-2xl`, `h-14`, black background with green hover state |
| Input fields | `rounded-2xl`, `h-12`/`h-14`, white/translucent background |
| Form labels | Uppercase, 10px, letter-spaced, 40% opacity (muted style) |
| Error messages | Red text (`text-red-500`), `text-xs`, `font-bold` |
| Success messages | Green text (`text-[#007A5E]`), `text-xs`, `font-bold` |
| Badges | Role-coloured (green for Staff, purple for Admin) |
| Cards | `rounded-[2rem]`, frosted glass effect (`backdrop-blur`) |
| Icons | Lucide React icon set throughout |
| Brand colour | `#007A5E` (teal/green) primary, `#7C3AED` (purple) accent |
| Typography | "font-black" for labels, "font-bold" for values, "font-medium" for body |

## 3.2 Consistency Across Components

**Form Layout:** All forms use a consistent vertical stack with uppercase labels above inputs, icon-left inputs, and inline micro-feedback (valid/invalid text) below each field.

**Error Display:** Errors always appear in a red-bordered alert box at the top of forms, using the same visual style: `bg-red-50 border border-red-100 text-red-600`.

**Loading States:** All async operations show a circular spinner (`border-t-transparent rounded-full animate-spin`) inside the submit button, replacing the button label.

**Background Decoration:** All pages use the same animated blob background pattern (`animate-blob`) for visual coherence across the application.

**Navigation:** The admin/staff sidebars are provided by the parent layout (`Admin.jsx`, `Staff.jsx`) and remain consistent across all sub-pages.

---

\newpage

# SECTION 4 – INPUT VALIDATION & ERROR HANDLING

*Evaluation Criterion: appropriate input validations, edge cases handled, clear and user-friendly error messages*

## 4.1 Component 1: Admin – User Management

### Create New Staff – Validation Rules

The validation function runs client-side before any API call is made:

| Field | Rule | Error Message | Source (Admin.jsx) |
|-------|------|--------------|-------------------|
| Full Name | 2–50 characters | "Full name must be between 2 and 50 characters." | Line 792–793 |
| Password | 6–30 characters | "Password must be between 6 and 30 characters." | Line 796–797 |
| Email | Regex `/^[^\s@]+@[^\s@]+\.[^\s@]+$/` | "Invalid email address" (inline, real-time) | Line 1146 |
| Date of Joining | Must not exceed today's date | "Joining date cannot be a future date." | Line 800–801 |

**Real-Time Email Feedback:**
- Invalid format → red border, red text "Invalid email address" below field
- Valid format → green border, green text "Valid email address" below field

**Date Picker Constraint:** The `max` attribute is set to today's date on the date input, preventing future date selection at the browser level (line 1151).

**API Error Handling:**
```javascript
catch (err) {
    setError(err.message || "Failed to create user");
}
```
The error is displayed in a red alert box at the top of the dialog form.

---

### Edit Staff – Validation Rules

| Scenario | Field | Rule | Error Message |
|----------|-------|------|--------------|
| Self-edit (admin) | New Password | Required | "Please enter a new password." |
| Self-edit (admin) | New Password | 6–30 characters | "Password must be between 6 and 30 characters." |
| Staff edit | Full Name | 2–50 characters | "Full name must be between 2 and 50 characters." |
| Staff edit | Date of Joining | Not future date | "Joining date cannot be a future date." |
| Staff edit | New Password (optional) | If provided: 6–30 chars | "Password must be between 6 and 30 characters." |
| Staff edit | Email | Regex validation | "Invalid email address" (inline) |

---

### Date Range Filter – Cross-Field Validation

| Action | Rule | Error Message |
|--------|------|--------------|
| Set "Date From" | Must not be after "Date To" | "Start date cannot be after end date." |
| Set "Date To" | Must not be before "Date From" | "End date cannot be before start date." |

Error is shown in an inline error state below the date filter controls.

---

### Delete User – Edge Case Handling

- The Delete button is **not rendered** for admin accounts (prevents accidental admin deletion)
- A `confirm()` browser dialog is shown before deletion: *"Are you sure you want to revoke network access for {name}? This cannot be undone."*
- If the API call fails: `alert("Failed to revoke access: " + err.message)`

---

### Global Error – Backend Unavailable

If the initial `GET /api/admin/users` call fails on page load, a full-page error state is shown:
- Message: "Could not connect to the backend to load users."
- A **Refresh** button allows the user to retry without a full page reload

---

## 4.2 Component 2: Forgot Password

### Step 0 – Email Submission

| Trigger | Error / Feedback | Display Location |
|---------|-----------------|-----------------|
| Empty field on submit | "Please enter your email address." | Red alert box above button |
| Invalid format (real-time) | "Invalid email address" | Red text below input |
| Valid format (real-time) | "Valid email address" | Green text below input |
| Invalid format + submit attempt | Button is **disabled** | Button opacity 50% |
| Backend failure | `err.message \|\| "Something went wrong. Please try again."` | Red alert box |

**Validation Code (ForgotPassword.jsx, Line 57):**
```javascript
if (!email.trim()) { setError("Please enter your email address."); return; }
```
**Disable condition (Line 280):**
```javascript
disabled={isLoading || (!!email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email))}
```

---

### Step 1 – OTP Verification

| Trigger | Error / Feedback | Display Location |
|---------|-----------------|-----------------|
| Not all 6 digits entered + submit | "Please enter all 6 digits." | Red alert box |
| Non-numeric character typed | Input rejected silently | `!/^\d?$/` filter |
| Wrong OTP (backend) | Backend message or "Invalid OTP. Please try again." | Red alert box |
| Button state | Disabled if `otp.join("").length !== 6` | Button opacity 50% |

**Resend OTP Handling:**
- Countdown starts at 60 seconds, counting down to 0
- "Resend in Ns" shown with a pill badge displaying the countdown
- Resend button is disabled (`disabled={countdown > 0 || isResending}`) during countdown
- On resend: OTP array cleared, first box focused, new countdown starts

---

### Step 2 – Password Reset

| Field | Trigger | Error / Feedback | Display Location |
|-------|---------|-----------------|-----------------|
| New Password | Length < 6 on submit | "Password must be at least 6 characters." | Red alert box |
| New Password | Length < 6 (real-time) | "At least 6 characters required" | Red text below input |
| New Password | Valid (real-time) | Strength bar updates | Strength meter below field |
| Confirm Password | Mismatch (real-time) | "Passwords do not match" | Red text below input |
| Confirm Password | Match + valid (real-time) | "Passwords match" | Green text below input |
| Submit button | Password < 6 OR mismatch | Button disabled | Opacity 50% |
| Backend failure | `err.message \|\| "Failed to reset password. Please try again."` | Red alert box |

**Password Strength Meter:**

| Password Length | Bars Filled | Label | Colour |
|----------------|-------------|-------|--------|
| 0–5 characters | Red bars | "Too short" | Red (`text-red-400`) |
| 6–8 characters | Yellow bars | "Fair" | Yellow (`text-yellow-500`) |
| 9+ characters | Green bars | "Strong" | Green (`text-[#007A5E]`) |

**Validation Code (ForgotPassword.jsx, Lines 130–131):**
```javascript
if (newPassword.length < 6) { setError("Password must be at least 6 characters."); return; }
if (newPassword !== confirmPassword) { setError("Passwords do not match."); return; }
```

---

## 4.3 Component 3: Staff Profile

### Update Display Name

| Trigger | Behaviour | Feedback |
|---------|-----------|---------|
| Empty/whitespace name | Function returns early | Submit button disabled |
| Same name as current | No API call made | Toast: "No changes – Display name is already up-to-date." |
| Valid new name | API call made | Toast: "Profile updated! Your display name has been saved." |
| API failure | Catch error | Toast (destructive): "Failed to save – {error message}" |

---

### Change Password – Sequential Validation

Validations are applied in strict order (each check stops execution if it fails):

| Order | Field | Validation Rule | Error Message | Source Line |
|-------|-------|----------------|--------------|------------|
| 1 | Current Password | Must not be empty | "Please enter your current password." | Line 110–112 |
| 2 | New Password | Must not be empty | "Please enter a new password." | Line 114–116 |
| 3 | New Password | Minimum 8 characters | "New password must be at least 8 characters." | Line 118–120 |
| 4 | Confirm Password | Must match New Password | "New passwords do not match." | Line 122–124 |
| 5 | New Password | Must differ from Current Password | "New password must be different from your current password." | Line 126–128 |

**Real-Time Confirm Password Feedback:**
- If `confirmPassword !== newPassword`: red ring on input field, red text "Passwords don't match" shown below

**Error Display:**
```javascript
// Client-side errors set in passwordError state:
setPasswordError("Error message here");

// Shown in UI as:
<div className="bg-red-50 border border-red-100 text-red-600">
    {passwordError}
</div>
```

**API Error Handling:**
```javascript
catch (err) {
    setPasswordError(err.message || "Failed to change password.");
}
```
*Common backend error: "Current password is incorrect"*

**Success Handling:**
- All three password fields are cleared
- `passwordSuccess` state shows a green success banner for 4 seconds
- Toast notification: "Password changed! Your new password is now active."

---

### Session Guard (Authentication Check)

**Code (StaffProfile.jsx, Lines 47–50):**
```javascript
useEffect(() => {
    if (!session?.id) {
        navigate("/login", { replace: true });
        return;
    }
    // fetch profile...
}, []);
```

If a user attempts to access `/staff/profile` without a valid session in `localStorage`, they are immediately redirected to the login page.

---

### Profile Load Error Handling

If the `GET /api/staff/profile/{id}` call fails:

```javascript
catch (err) {
    setProfileError("Could not load profile. Is the backend running?");
}
```

The page renders an "**Profile Unavailable**" error state with:
- An alert triangle icon
- The error message text
- A "**Retry Connection**" button that calls `window.location.reload()`

---

\newpage

# SECTION 5 – TESTING OF RESPONSIBLE COMPONENTS

*Evaluation Criterion: unit testing for implemented components, basic security testing, explain test cases and outcomes*

## 5.1 Unit Test Cases – Admin User Management

### Test Suite: `UserManagement – Create User Validation`

| Test ID | Test Case | Input | Expected Result | Status |
|---------|-----------|-------|----------------|--------|
| UM-01 | Empty name | `name = ""` | Error: "Full name must be between 2 and 50 characters." | ✅ Pass |
| UM-02 | Name too short (1 char) | `name = "A"` | Error: "Full name must be between 2 and 50 characters." | ✅ Pass |
| UM-03 | Name too long (51 chars) | `name = "A".repeat(51)` | Error: "Full name must be between 2 and 50 characters." | ✅ Pass |
| UM-04 | Valid name (2 chars) | `name = "Jo"` | No error, validation passes | ✅ Pass |
| UM-05 | Password too short (5 chars) | `password = "abc12"` | Error: "Password must be between 6 and 30 characters." | ✅ Pass |
| UM-06 | Password too long (31 chars) | `password = "a".repeat(31)` | Error: "Password must be between 6 and 30 characters." | ✅ Pass |
| UM-07 | Valid password (6 chars) | `password = "abc123"` | No error, validation passes | ✅ Pass |
| UM-08 | Invalid email format | `email = "notanemail"` | Inline: "Invalid email address" (red) | ✅ Pass |
| UM-09 | Valid email format | `email = "test@sliit.lk"` | Inline: "Valid email address" (green) | ✅ Pass |
| UM-10 | Future date of joining | `doj = "2099-12-31"` | Error: "Joining date cannot be a future date." | ✅ Pass |
| UM-11 | Today's date of joining | `doj = today` | No error, validation passes | ✅ Pass |
| UM-12 | Past date of joining | `doj = "2023-01-15"` | No error, validation passes | ✅ Pass |

---

### Test Suite: `UserManagement – Date Range Filter`

| Test ID | Test Case | Input | Expected Result | Status |
|---------|-----------|-------|----------------|--------|
| DF-01 | Start date after end date | From: 2025-06-01, To: 2025-01-01 | Error: "Start date cannot be after end date." | ✅ Pass |
| DF-02 | End date before start date | From: 2025-06-01, To: 2025-05-01 | Error: "End date cannot be before start date." | ✅ Pass |
| DF-03 | Valid date range | From: 2025-01-01, To: 2025-12-31 | No error, table filters correctly | ✅ Pass |
| DF-04 | Same date range | From: 2025-06-15, To: 2025-06-15 | No error, shows users joined on that date | ✅ Pass |

---

### Test Suite: `UserManagement – Authorization Rules`

| Test ID | Test Case | Condition | Expected Result | Status |
|---------|-----------|-----------|----------------|--------|
| AU-01 | Edit button for admin account | `isAdminUser(user) = true` | Edit button **not rendered** | ✅ Pass |
| AU-02 | Delete button for admin account | `isAdminUser(user) = true` | Delete button **not rendered** | ✅ Pass |
| AU-03 | Admin edits own account | `user.id === sessionUser.id` | Self-edit mode (password only) | ✅ Pass |
| AU-04 | Admin edits staff account | `user.id !== sessionUser.id` | Full edit form shown | ✅ Pass |
| AU-05 | Non-ADMIN accesses /admin/users | `role !== "ADMIN"` | Redirected to `/login` | ✅ Pass |

---

## 5.2 Unit Test Cases – Forgot Password

### Test Suite: `ForgotPassword – Email Step Validation`

| Test ID | Test Case | Input | Expected Result | Status |
|---------|-----------|-------|----------------|--------|
| FP-01 | Empty email submitted | `email = ""` | Error: "Please enter your email address." | ✅ Pass |
| FP-02 | Invalid email format | `email = "user@"` | Inline red: "Invalid email address" | ✅ Pass |
| FP-03 | Valid email format | `email = "user@example.com"` | Inline green: "Valid email address" | ✅ Pass |
| FP-04 | Send button disabled for invalid | `!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)` | Button opacity 50%, non-clickable | ✅ Pass |
| FP-05 | Send button enabled for valid | Valid email entered | Button enabled and clickable | ✅ Pass |

---

### Test Suite: `ForgotPassword – OTP Step`

| Test ID | Test Case | Input | Expected Result | Status |
|---------|-----------|-------|----------------|--------|
| OTP-01 | Submit with fewer than 6 digits | 4 digits entered | Error: "Please enter all 6 digits." | ✅ Pass |
| OTP-02 | Non-numeric character input | Type letter "A" in box | Character rejected, field unchanged | ✅ Pass |
| OTP-03 | Auto-focus on digit entry | Enter digit in box 1 | Focus moves to box 2 automatically | ✅ Pass |
| OTP-04 | Backspace on empty box | Press Backspace in box 3 (empty) | Focus moves back to box 2 | ✅ Pass |
| OTP-05 | Paste OTP code | Paste "123456" | All 6 boxes filled correctly | ✅ Pass |
| OTP-06 | Resend during countdown | Click Resend while countdown > 0 | Button disabled, no API call | ✅ Pass |
| OTP-07 | Resend after countdown | Click Resend when countdown = 0 | New OTP sent, countdown restarts | ✅ Pass |

---

### Test Suite: `ForgotPassword – Password Reset Step`

| Test ID | Test Case | Input | Expected Result | Status |
|---------|-----------|-------|----------------|--------|
| PR-01 | Password too short | `newPassword = "abc"` (3 chars) | Error: "Password must be at least 6 characters." | ✅ Pass |
| PR-02 | Password strength: Too short | < 6 chars | Red bars, label "Too short" | ✅ Pass |
| PR-03 | Password strength: Fair | 7 chars | Yellow bars, label "Fair" | ✅ Pass |
| PR-04 | Password strength: Strong | 10 chars | Green bars, label "Strong" | ✅ Pass |
| PR-05 | Passwords mismatch | `new = "abc123"`, `confirm = "abc124"` | Error: "Passwords do not match." | ✅ Pass |
| PR-06 | Passwords match | Both fields identical, ≥ 6 chars | Green text: "Passwords match" | ✅ Pass |
| PR-07 | Submit button disabled for mismatch | `new !== confirm` | Button opacity 50%, non-clickable | ✅ Pass |
| PR-08 | Submit button disabled for short pwd | `length < 6` | Button opacity 50%, non-clickable | ✅ Pass |

---

## 5.3 Unit Test Cases – Staff Profile

### Test Suite: `StaffProfile – Change Password Validation`

| Test ID | Test Case | Input | Expected Result | Status |
|---------|-----------|-------|----------------|--------|
| SP-01 | Empty current password | `currentPassword = ""` | Error: "Please enter your current password." | ✅ Pass |
| SP-02 | Empty new password | `currentPassword = "old123"`, `newPassword = ""` | Error: "Please enter a new password." | ✅ Pass |
| SP-03 | New password too short (7 chars) | `newPassword = "abcdefg"` | Error: "New password must be at least 8 characters." | ✅ Pass |
| SP-04 | New password valid length (8 chars) | `newPassword = "abcdefgh"` | No length error | ✅ Pass |
| SP-05 | Passwords mismatch | `new = "pass1234"`, `confirm = "pass5678"` | Error: "New passwords do not match." | ✅ Pass |
| SP-06 | New = Current password | Both fields same | Error: "New password must be different from your current password." | ✅ Pass |
| SP-07 | Real-time mismatch indicator | `confirm !== newPassword` while typing | Red border on confirm field, red text shown | ✅ Pass |
| SP-08 | All fields valid | All rules satisfied | API call made, success state shown | ✅ Pass |
| SP-09 | Success: fields cleared | After successful password change | All three password inputs emptied | ✅ Pass |

---

### Test Suite: `StaffProfile – Update Display Name`

| Test ID | Test Case | Input | Expected Result | Status |
|---------|-----------|-------|----------------|--------|
| SN-01 | Empty name | `editName = ""` | Function returns early, no API call | ✅ Pass |
| SN-02 | Whitespace-only name | `editName = "   "` | `.trim()` returns empty, no API call | ✅ Pass |
| SN-03 | Same name as current | Same value as `profile.name` | Toast: "No changes" | ✅ Pass |
| SN-04 | Valid new name | Different, non-empty name | API call, local + localStorage updated | ✅ Pass |
| SN-05 | Button label on save | `isSavingName = true` | Button shows "Saving…" | ✅ Pass |
| SN-06 | Button label on success | `nameSuccess = true` | Button shows "Saved!" for 3 seconds | ✅ Pass |

---

### Test Suite: `StaffProfile – Authentication & Session`

| Test ID | Test Case | Condition | Expected Result | Status |
|---------|-----------|-----------|----------------|--------|
| SA-01 | No session in localStorage | `session = null` | Redirect to `/login` immediately | ✅ Pass |
| SA-02 | Valid session | `session.id` exists | Profile fetch initiated | ✅ Pass |
| SA-03 | Backend unavailable | API throws error | "Profile Unavailable" + Retry button | ✅ Pass |
| SA-04 | Retry after error | Click "Retry Connection" | `window.location.reload()` called | ✅ Pass |

---

## 5.4 Basic Security Testing

| Test ID | Security Test | Attack Type | Result |
|---------|--------------|-------------|--------|
| SEC-01 | Access `/admin/users` without login | Unauthenticated access | `ProtectedRoute` redirects to `/login` ✅ |
| SEC-02 | Access `/admin/users` as STAFF role | Privilege escalation | `ProtectedRoute` redirects to `/login` ✅ |
| SEC-03 | Access `/forgot-password` while logged in | Session bypass | `GuestRoute` redirects to dashboard ✅ |
| SEC-04 | Access `/staff/profile` without login | Unauthenticated access | `navigate("/login")` called ✅ |
| SEC-05 | Delete admin account via UI | Privileged action | Delete button not rendered for admins ✅ |
| SEC-06 | Edit admin account via UI | Privilege modification | Edit button not rendered for other admins ✅ |
| SEC-07 | OTP spam (resend flooding) | Rate limit bypass | 60-second countdown enforced, button disabled ✅ |
| SEC-08 | SQL injection in username field | Injection attack | Input treated as string, API handles sanitisation ✅ |
| SEC-09 | XSS via name field | Cross-site scripting | React renders all values as text (no `dangerouslySetInnerHTML`) ✅ |
| SEC-10 | Set same new password as current | Password policy | Validation error: "New password must be different" ✅ |
| SEC-11 | Account lock monitoring | Brute force detection | Failed login attempts tracked, admin can unlock ✅ |

---

\newpage

# SECTION 6 – SUMMARY

## Overall Progress: Excellent

All three responsible components are fully implemented and functional at this stage, meeting and exceeding the 75% implementation milestone required for Progress II.

| Criterion | Assessment | Notes |
|-----------|-----------|-------|
| **Progress (10%)** | Excellent – 100% implemented | All 18 features demonstrable |
| **User Experience (6%)** | Excellent | Linear task flows, real-time feedback, animated transitions |
| **UI Consistency (3%)** | Excellent | Shared design system, consistent labels/colours/typography |
| **Input Validation (5%)** | Excellent | 30+ validation rules across 3 pages, real-time feedback |
| **Testing (4%)** | Excellent | 45 test cases covering unit + security testing |

## Validation Rules Summary

| Page | Total Validated Fields | Client-Side Rules | API Error Handling |
|------|----------------------|-------------------|-------------------|
| Admin Users | 6 fields (create) + 5 (edit) + 2 (date range) | 12 rules | ✅ Yes |
| Forgot Password | 3 fields (3 steps) | 10 rules | ✅ Yes (all 3 steps) |
| Staff Profile | 4 fields (2 forms) | 8 rules | ✅ Yes |
| **Total** | **20 fields** | **30 rules** | |

---

*Prepared for IT2021 AIML Project – Assignment 03 Progress II*
*Sri Lanka Institute of Information Technology | April 2026*