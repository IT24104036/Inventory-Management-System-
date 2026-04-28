---
title: "Invigo FreshGuard – Input Validation, Authentication & Error Handling Report"
author: "Assignment 03 – Progress II"
date: "April 2026"
---

# Invigo FreshGuard
## Input Validation, Authentication & Error Handling Report

**Module:** IT2021 – AIML Project | **Stage:** Assignment 03 – Progress II

---

# Table of Contents

1. System Overview
2. Page 1: Admin – User Management (`/admin/users`)
3. Page 2: Forgot Password (`/forgot-password`)
4. Page 3: Staff – Profile (`/staff/profile`)
5. Global Authentication & Route Protection
6. API Error Handling Pattern
7. Summary Validation Table

---

# 1. System Overview

**Project:** Invigo FreshGuard – Smart Inventory & Staff Management System

**Technology Stack:**

| Layer | Technology |
|-------|-----------|
| Frontend | React (Vite), React Router v6 |
| UI Library | Shadcn/UI + Tailwind CSS |
| Animations | Framer Motion |
| State | React useState / useEffect |
| HTTP Client | Fetch API (custom wrapper) |
| Backend API | REST (http://localhost:8080/api) |

**Authentication Model:**

- Session stored in `localStorage` under the key `invigo_user`
- Session payload: `{ id, username, name, role, roleName, permissions }`
- Roles: `ADMIN`, `STAFF`
- Route guards: `ProtectedRoute` (requires login) and `GuestRoute` (blocks logged-in users)

---

# 2. Page 1: Admin – User Management (`/admin/users`)

**Source File:** `src/pages/Admin.jsx`

**Access Control:** Requires ADMIN role. Non-admin users are redirected to `/login`.

This page provides full CRUD operations for staff accounts, role assignment, security monitoring, and account unlock functionality.

---

## 2.1 Create New User – Form Validation

When an administrator clicks **"Add New Staff"**, a dialog form opens with the following fields and validation rules:

| Field | Type | Validation Rule | Error Message Displayed |
|-------|------|----------------|------------------------|
| Username | Text | Required | *(form will not submit)* |
| Password | Password | 6–30 characters | "Password must be between 6 and 30 characters" |
| Full Name | Text | 2–50 characters | "Full name must be between 2 and 50 characters" |
| Email | Email | Valid format (regex) | "Invalid email address" |
| Date of Joining | Date | Cannot be a future date | "Joining date cannot be a future date" |
| Role | Select | Must select a role | *(dropdown enforces selection)* |

**Validation Logic (client-side, pre-submission):**

```
1. Trim and check password length (6 ≤ length ≤ 30)
2. Trim and check name length (2 ≤ length ≤ 50)
3. If email provided, validate against regex: /^[^\s@]+@[^\s@]+\.[^\s@]+$/
4. If doj provided, compare with today's date (must not exceed today)
5. On any failure → set error state → display red alert at top of form
```

**API Call on Submission:**

```
POST /api/admin/users
Body: { username, password, name, email, doj, role, roleName }
```

**API Error Handling:**

- On failure: `err.message || "Failed to create user"` is displayed in the form's error alert box
- On success: Dialog closes, user list refreshes automatically

---

## 2.2 Edit User – Form Validation

Two distinct edit scenarios exist:

### 2.2.1 Admin Editing Own Account (Self-Edit)

Only password change is permitted.

| Field | Validation Rule | Error Message |
|-------|----------------|---------------|
| New Password | Required | "Please enter a new password" |
| New Password | 6–30 characters | "Password must be between 6 and 30 characters" |

### 2.2.2 Admin Editing a Staff Account

| Field | Validation Rule | Error Message |
|-------|----------------|---------------|
| Username | Required | *(form prevents submission)* |
| Full Name | 2–50 characters | "Full name must be between 2 and 50 characters" |
| Email | Valid format | "Invalid email address" |
| Date of Joining | Cannot be future date | "Joining date cannot be a future date" |
| New Password | If provided: 6–30 chars | "Password must be between 6 and 30 characters" |

**Authorization Rules:**

- Admin accounts **cannot be edited** by other admins (Edit button hidden)
- Admin accounts **cannot be deleted** (Delete button hidden)
- An admin can only edit their own password (self-edit mode)
- Self-identification is determined by comparing `user.id === sessionUser.id`

**API Call:**

```
PUT /api/admin/users/{id}
Body: { name, username, email, doj, role, roleName, password (optional) }
```

---

## 2.3 Delete User (Revoke Access)

Before deletion, a browser confirmation dialog appears:

> *"Are you sure you want to revoke network access for {name}? This cannot be undone."*

Only staff (non-admin) accounts have the delete button available.

**API Call:**

```
DELETE /api/admin/users/{id}
```

**Error Handling:** `"Failed to revoke access: {error message}"`

---

## 2.4 Search, Filter & Sort

### Search & Filter Validation

| Filter | Type | Validation |
|--------|------|-----------|
| Name/Username Search | Text | Case-insensitive substring match (no validation needed) |
| Role Filter | Select dropdown | Only available roles shown |
| Date From | Date | Cannot be after "Date To" → "Start date cannot be after end date" |
| Date To | Date | Cannot be before "Date From" → "End date cannot be before start date" |

### Sorting

Users can sort by **Name**, **Role**, or **Entry Date** with ascending/descending toggle. Visual arrows (▲/▼) indicate sort direction.

---

## 2.5 Security Tab – Account Lock Monitoring

The Security tab displays staff accounts with failed login attempts:

- Shows: staff name, username, number of failed attempts
- **Unlock Button:** Resets account lock status

**API Call:**

```
PUT /api/admin/users/{id}/unlock
```

This addresses security requirements by allowing administrators to manually unblock accounts after repeated failed login attempts.

---

## 2.6 Global Error Handling (Admin Users Page)

| Scenario | Error Displayed |
|----------|----------------|
| Backend unavailable on page load | "Could not connect to the backend to load users." + Refresh button |
| User creation fails | Backend message or "Failed to create user" (red alert in dialog) |
| User update fails | Backend message or "Failed to update user" (red alert in dialog) |
| User deletion fails | "Failed to revoke access: {message}" (red alert) |

---

# 3. Page 2: Forgot Password (`/forgot-password`)

**Source File:** `src/pages/ForgotPassword.jsx`

**Access Control:** GuestRoute – logged-in users are automatically redirected to their dashboard.

This page implements a **3-step multi-stage password recovery** flow with animated transitions between steps.

---

## 3.1 Step 0 – Email Submission

**Purpose:** Identify the user account by email address.

| Field | Type | Validation Rule | Visual Feedback |
|-------|------|----------------|----------------|
| Email Address | Email | Must be non-empty | Red error message |
| Email Address | Email | Must match email regex | Red: "Invalid email address" OR Green: "Valid email address" |

**Real-Time Validation:**

As the user types, the email field shows:
- Green checkmark: "Valid email address" (when regex passes)
- Red X: "Invalid email address" (when regex fails)

The **"Send Reset Code"** button is disabled until the email is valid.

**API Call on Submission:**

```
POST /api/auth/forgot-password
Body: { email }
Response: { success: true, message: "OTP sent" }
```

**Error Handling:**

- Catches API errors: `err.message || "Something went wrong. Please try again."`
- Error displayed below the form
- After successful send: 60-second countdown timer starts before resend is allowed

---

## 3.2 Step 1 – OTP Verification

**Purpose:** Validate the one-time password sent to the user's email.

| Aspect | Detail |
|--------|--------|
| Input | 6 individual digit boxes |
| Format | Numeric digits only (0–9) |
| Validation | All 6 boxes must be filled |
| Error | "Please enter all 6 digits." |

**UX Enhancements:**

- Auto-advances focus to next box after a digit is entered
- Backspace in an empty box focuses the previous box
- Supports paste – first 6 digits extracted automatically

**Resend OTP:**

- Disabled during the 60-second countdown
- Shows countdown: "Resend in {N}s"
- Re-triggers the POST to `/api/auth/forgot-password`

**API Call:**

```
POST /api/auth/verify-otp
Body: { email, otp }
Response: { success: true }
```

**Error Handling:**

- `err.message || "Invalid OTP. Please try again."`

---

## 3.3 Step 2 – New Password Reset

**Purpose:** Set a new password for the account.

| Field | Validation Rule | Error Message |
|-------|----------------|---------------|
| New Password | Required | "Password must be at least 6 characters." |
| New Password | Minimum 6 characters | "Password must be at least 6 characters." |
| Confirm Password | Must match New Password | "Passwords do not match." |

**Password Strength Meter:**

A real-time 4-bar visual strength indicator shows:

| Password Length | Strength Label | Bar Color |
|----------------|---------------|-----------|
| < 6 characters | "Too short" | Red |
| 6–8 characters | "Fair" | Yellow |
| 9+ characters | "Strong" | Green |

**Show/Hide Password:** Both fields have individual toggle buttons (Eye / EyeOff icons).

**Submit Button State:**

- Disabled if password < 6 characters
- Disabled if passwords do not match
- Shows spinner while processing

**API Call:**

```
POST /api/auth/reset-password
Body: { email, newPassword }
Response: { success: true }
```

**Error Handling:** `err.message || "Failed to reset password. Please try again."`

---

## 3.4 Step 3 – Success Confirmation

Displays a success animation with:

- Animated checkmark icon
- Message: *"Your password has been reset successfully. You can now log in with your new password."*
- **"Go to Login"** button → navigates to `/login`

---

## 3.5 Forgot Password – Error Summary Table

| Step | Trigger | Error Message |
|------|---------|--------------|
| Step 0 | Empty email field | "Please enter your email address." |
| Step 0 | Invalid email format | "Invalid email address" (real-time) |
| Step 0 | API failure | Backend message or "Something went wrong. Please try again." |
| Step 1 | Incomplete OTP | "Please enter all 6 digits." |
| Step 1 | Wrong OTP (API) | Backend message or "Invalid OTP. Please try again." |
| Step 2 | Password too short | "Password must be at least 6 characters." |
| Step 2 | Passwords mismatch | "Passwords do not match." |
| Step 2 | API failure | Backend message or "Failed to reset password. Please try again." |

---

# 4. Page 3: Staff Profile (`/staff/profile`)

**Source File:** `src/components/StaffProfile.jsx`

**Access Control:** Requires authenticated session. If `session.id` is absent, the user is redirected to `/login`.

---

## 4.1 Session & Authorization Check

On component mount, the following check runs:

```javascript
if (!session?.id) {
    navigate("/login", { replace: true });
}
```

Session is loaded from localStorage:

```javascript
const raw = localStorage.getItem("invigo_user");
return raw ? JSON.parse(raw) : null;
```

---

## 4.2 Profile Data Loading

**API Call:**

```
GET /api/staff/profile/{id}
Response: { id, name, username, email, role, doj }
```

**Loading States:**

| State | Display |
|-------|---------|
| Loading | Spinner + "Loading your profile…" |
| Error | "Profile Unavailable" banner with Retry button |
| Success | Full profile displayed |

---

## 4.3 Profile Hero Section (Read-Only)

The top section displays user information that cannot be changed by the staff member:

| Information | Source | Editable? |
|------------|--------|-----------|
| Avatar initials | Derived from name (first letters) | No |
| Full Name | profile.name | Via Name Editor |
| @Username | profile.username | No (admin-managed) |
| Role Badge | profile.role | No (admin-managed) |
| Member Since | Formatted profile.doj | No |

---

## 4.4 Update Display Name – Validation

| Condition | Behaviour |
|-----------|-----------|
| Name field is empty/whitespace | Submit button disabled, no API call |
| Name is unchanged | Toast: "No changes" |
| Name is valid new value | API call, success toast |

**API Call:**

```
PUT /api/staff/profile/{id}
Body: { name: editName.trim() }
```

**Success Handling:**

- Updates local profile state
- Updates `localStorage` session data (name field)
- Toast notification: *"Profile updated! Your display name has been saved."*
- Button changes to "Saved!" for 3 seconds, then resets

**Error Handling:**

- Toast: `{ title: "Failed to save", description: err.message, variant: "destructive" }`

---

## 4.5 Change Password – Validation

**Form Fields:** Current Password, New Password, Confirm New Password

**Validation Rules (applied in order):**

| # | Field | Rule | Error Message |
|---|-------|------|--------------|
| 1 | Current Password | Must not be empty | "Please enter your current password." |
| 2 | New Password | Must not be empty | "Please enter a new password." |
| 3 | New Password | Minimum 8 characters | "New password must be at least 8 characters." |
| 4 | Confirm Password | Must match New Password | "New passwords do not match." |
| 5 | New Password | Must differ from Current Password | "New password must be different from your current password." |

**Real-Time Visual Feedback:**

- If Confirm Password does not match New Password, the input border turns red
- Error text "Passwords don't match" appears below the field in real-time

**Show/Hide Toggles:** All three password fields have individual visibility toggles.

**API Call:**

```
PUT /api/staff/profile/{id}
Body: { currentPassword, newPassword }
```

**Success Handling:**

- All password fields cleared
- Success banner shown for 4 seconds
- Toast: *"Password changed! Your new password is now active."*

**Error Handling:**

- `passwordError` state displays the error in a red bordered box
- Toast: `{ title: "Failed to change password", description: err.message }`
- Common backend error: "Current password is incorrect"

---

# 5. Global Authentication & Route Protection

**Source File:** `src/App.jsx`

## 5.1 ProtectedRoute Component

Wraps all authenticated pages (`/admin/*`, `/staff/*`):

```
1. Reads session from localStorage
2. If no session → redirect to /login
3. If session exists but role mismatch (e.g., staff accessing /admin/*) → redirect to /staff
4. Otherwise → render the requested page
```

## 5.2 GuestRoute Component

Wraps unauthenticated pages (`/login`, `/forgot-password`):

```
1. Reads session from localStorage
2. If session exists with ADMIN role → redirect to /admin
3. If session exists with STAFF role → redirect to /staff
4. Otherwise → render the requested page (login/forgot-password)
```

## 5.3 Route Structure

| Route | Guard | Required Role |
|-------|-------|--------------|
| `/login` | GuestRoute | None (no session) |
| `/forgot-password` | GuestRoute | None (no session) |
| `/admin/users` | ProtectedRoute | ADMIN |
| `/admin/products` | ProtectedRoute | ADMIN |
| `/admin/inventory` | ProtectedRoute | ADMIN |
| `/staff` | ProtectedRoute | Any |
| `/staff/profile` | ProtectedRoute | Any |
| `/staff/sales` | ProtectedRoute | Any |
| `/*` | None | 404 Not Found |

---

# 6. API Error Handling Pattern

All API functions in `src/lib/api.js` follow a consistent pattern:

```javascript
export const apiFunction = async (params) => {
    const response = await fetch(`${API_BASE_URL}/endpoint`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data)
    });

    if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.message || "Default error message");
    }

    return response.json();
};
```

**Key Characteristics:**

- HTTP status codes non-2xx throw an Error
- Backend error messages are extracted from JSON response body
- Fallback messages are provided when backend message is unavailable
- Errors bubble up to component-level try-catch blocks

---

# 7. Summary Validation Table

## All Validated Fields Across Three Pages

| Page | Field | Rule | Error Message |
|------|-------|------|--------------|
| Admin Users | Password (create) | 6–30 characters | "Password must be between 6 and 30 characters" |
| Admin Users | Full Name | 2–50 characters | "Full name must be between 2 and 50 characters" |
| Admin Users | Email | Valid email format | "Invalid email address" |
| Admin Users | Date of Joining | Cannot be future date | "Joining date cannot be a future date" |
| Admin Users | Date Filter Range | Start ≤ End | "Start date cannot be after end date" |
| Admin Users | Password (edit) | 6–30 chars if provided | "Password must be between 6 and 30 characters" |
| Forgot Password | Email | Valid format (real-time) | "Invalid email address" |
| Forgot Password | OTP | All 6 digits required | "Please enter all 6 digits." |
| Forgot Password | New Password | Min 6 characters | "Password must be at least 6 characters." |
| Forgot Password | Confirm Password | Must match | "Passwords do not match." |
| Staff Profile | Display Name | Non-empty | *(button disabled)* |
| Staff Profile | Current Password | Required | "Please enter your current password." |
| Staff Profile | New Password | Min 8 characters | "New password must be at least 8 characters." |
| Staff Profile | Confirm Password | Must match | "New passwords do not match." |
| Staff Profile | New Password | Must differ from current | "New password must be different from your current password." |

---

*End of Report – Invigo FreshGuard | Assignment 03 Progress II | April 2026*