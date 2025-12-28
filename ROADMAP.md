# Project Roadmap

## 🚀 Immediate Fixes & Improvements
These items should be addressed to improve the stability and user experience of the current features.

- [ ] **Skeleton Loading States**: Replace generic "Loading..." text with proper skeleton screens for Dashboard, Employee List, and Schedule Editor.
- [ ] **Error Boundaries**: Implement React Error Boundaries to catch and display graceful error messages instead of crashing the app.
- [ ] **Form Validation Feedback**: Enhance visual feedback (red borders, tailored messages) for invalid form inputs in all dialogs.
- [ ] **Mobile Responsiveness**: Refine padding and layout for smaller screens (e.g., Schedule Editor, Shift Dialog).
- [ ] **Static Placeholders**: Create empty states with illustrations for "No Shifts", "No Employees", etc. (Currently text-only).

## ✨ Planned Features
Future enhancements to expand functionality.

### 1. Advanced Scheduling
- **Shift Swapping**: Allow employees to request shift changes with colleagues.
- **Conflict Detection**: Warn managers if an employee is double-booked or exceeds contract hours.
- **Templates**: Save complex weekly structures as templates for one-click application.

### 2. Notifications System
- **Real-time Alerts**: In-app notifications for schedule publication, vacation approvals, and shift changes.
- **Push Notifications**: Leverage PWA capabilities to send push alerts to mobile devices.
- **Email Digest**: Weekly summary of upcoming shifts for employees.

### 3. Offline Capabilities
- **Service Worker**: Implement a service worker to cache the app shell and critical data.
- **Offline Actions**: Allow basic read-only access to schedule and profile when offline.

### 4. Reporting & Analytics
- **Labor Cost Tracking**: Visualize estimated labor costs vs. sales (if integration allows).
- **Attendance Reporting**: Compare scheduled hours vs. actual worked hours.

### 5. Role Granularity
- **Custom Permissions**: Allow fine-grained control over what Store Managers vs. Department Heads can do.
- **Audit Logs**: Track who changed what and when for critical actions (schedule publishing, employee deletion).
