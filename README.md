# LaGasy - Chick-fil-A Employee Management System

Developed by **LaGasy**. Licensed to **Chick-fil-A**.

## Overview
A comprehensive Employee Management System designed to handle complex staffing requirements, shift scheduling, absence management, and store operations. Built with Next.js 14, MongoDB, and modern web technologies.

## Tech Stack
- **Framework**: Next.js 14 (App Router)
- **Language**: TypeScript
- **Database**: MongoDB (Mongoose)
- **UI Components**: Shadcn UI (Radix Primitives) + Tailwind CSS
- **Authentication**: NextAuth.js
- **State Management**: React Server Components + Client Hooks
- **Icons**: Lucide React
- **Internationalization**: next-intl
- **Notifications**: Web Push (PWA) + Novu (optional integration)
- **Uploads**: UploadThing
- **Charts**: Recharts
- **Animation**: Framer Motion

## Key Features

### 1. Role-Based Access Control
- **Roles**: Super User, Admin, HR, Owner, Tech, Store Manager, Department Head, Employee.
- **Granular Permissions**: Custom visibility and action scopes per role.
- **Role Switching**: View the dashboard as different roles for testing or management.

### 2. Dashboard
- **Dynamic Widgets**: Role-specific widgets (e.g., Pending Approvals, Staff Shortage, Operations Radar).
- **KPIs & Analytics**: Real-time stats on workforce, vacancies, and performance.
- **Notices & Reminders**: Sticky notes and bulletin board for internal communication.

### 3. Schedule Management ("Shift Planner")
- **Big Calendar Interface**: Visual drag-and-drop scheduling.
- **Coverage Logic**: Automatic checks for staff shortage, max headcount, and shift gaps.
- **Shift Definitions**: Customizable shift templates (Morning, Night, etc.).
- **Swaps**: Employee-initiated shift swaps with approval workflow.

### 4. Absence & Vacation
- **Request Workflows**: 
    - Vacation requests with conflict checking (capacity constraints).
    - Absence reporting (Sick, Personal, etc.) with proof upload.
- **Analytics**: 
    - Visual trends for absenteeism and vacation usage.
    - Comparisons between Stores and Departments.
    - Heatmaps for high-absence days.
- **Balances**: Automatic calculation of used/remaining days.

### 5. Employee Profiles
- **Comprehensive Data**: Personal info, contract details, banking, documents, and emergency contacts.
- **History**: Tracking position changes, salary updates, and discipline records.
- **Evaluation**: Performance review system (Assignments, Templates, Scoring).

### 6. Store Operations
- **Supplier Ordering**: Supplier management, order constraints, alert logic for late orders.
- **Action Logs**: Audit trail of all critical actions performed in the system.
- **Legal & Compliance**: Privacy Policy, Terms, and Data Processing Agreement templates.

### 7. Mobile Experience (PWA)
- **Responsive Design**: Tailored views for mobile vs. desktop.
- **Quick Actions**: "Report Absence" and "Request Vacation" specific flows for mobile users.
- **Installable**: Manifest for adding to home screen.

## Minor/Internal Features
- **Weather Widget**: Real-time weather integration for store location.
- **Holiday Greetings**: Automated birthday and holiday widgets.
- **Translations**: Multi-language support (English/Portuguese setup).
- **Tips Distribution**: Calculation and tracking of tips allocation.
- **Credentials Manager**: Securely share store credentials (Wi-Fi, Safe codes, etc.).

## Setup & installation
1. `npm install`
2. Configure `.env.local` (MongoDB URI, Auth Secret, etc.)
3. `npm run dev`

## License
Proprietary software. Developed by LaGasy. All rights reserved.
