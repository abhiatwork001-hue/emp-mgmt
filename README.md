# Chick - Modern Workforce Management System

[![Next.js](https://img.shields.io/badge/Next.js-14-black)](https://nextjs.org/)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.0-blue)](https://www.typescriptlang.org/)
[![Tailwind CSS](https://img.shields.io/badge/Tailwind-3.0-38B2AC)](https://tailwindcss.com/)
[![MongoDB](https://img.shields.io/badge/MongoDB-Atlas-47A248)](https://www.mongodb.com/)

**Chick** is a premium, enterprise-grade workforce management application designed for modern restaurant chains and retail businesses. It unifies scheduling, communication, and HR tasks into a single, beautiful "Glassmorphic" interface.

## 🚀 Key Features

### 📅 Advanced Scheduling
- **Shift Management:** Drag-and-drop schedule builder with conflict detection.
- **Templates:** Save and reuse weekly schedules.
- **Availability:** Employee availability tracking and time-off requests.
- **Multi-Department:** Manage shifts across "Kitchen", "Service", "Bar", etc.

### 📦 Smart Supplier Management
- **Just-in-Time Ordering:** Automated alerts for Store Managers based on supplier delivery schedules (e.g., "Order by 5 PM today for Tuesday delivery").
- **Flexible Scheduling:** Supports temporary schedules for holidays/festivals.
- **Ordering Dashboard:** Dedicated widget showing exactly what needs to be ordered today.

### 🔍 Enhanced Global Search
- **Unified Search:** Search across Employees, Stores, Recipes, Suppliers, Departments, and Directory Resources.
- **Scoped Access:** Search results are context-aware and respect role-based permissions (e.g., Managers see their store's data, Global Heads see department-wide data).
- **Rich Results:** Visual indicators for result types (Trucks for suppliers, User icons for employees).

### 💬 Real-Time Communication
- **Instant Messaging:** Direct and Group chats with real-time delivery.
- **Rich Media:** Send images, voice notes, and file attachments.
- **Notifications & Reminders:** Push notifications for messages, shift updates, and urgent ordering deadlines.
- **Announcements:** Broadcast important updates to specific roles or stores.

### 🛡️ Role-Based Access Control (RBAC)
- **Granular Permissions:** Custom views for Owners, HR, Managers, Dept Heads, and Staff.
- **Recipe Control:** Strict access control for Recipe creation (restricted to Global Kitchen Head & Tech).
- **Audit Logs:** Track every critical action (Schedule Publish, Profile Edit, Supplier Changes) with detailed history.
- **Secure:** Middleware-protected routes and API endpoints.

### 🌍 Application Features
- **Internationalization:** Native support for multiple languages (en, de).
- **Dark Mode:** Sleek visual design that adapts to user preference.
- **PWA Ready:** Designed for mobile-first usage.

## 🛠️ Technology Stack

- **Framework:** [Next.js 14](https://nextjs.org/) (App Router, Server Actions)
- **Language:** [TypeScript](https://www.typescriptlang.org/)
- **Database:** [MongoDB](https://www.mongodb.com/) (Mongoose ODM)
- **Authentication:** [NextAuth.js](https://next-auth.js.org/)
- **Styling:** [Tailwind CSS](https://tailwindcss.com/) + [shadcn/ui](https://ui.shadcn.com/)
- **Real-time:** [Pusher](https://pusher.com/)
- **File Storage:** [UploadThing](https://uploadthing.com/)
- **Validation:** [Zod](https://zod.dev/)

## 📦 Getting Started

### Prerequisites
- Node.js 18+
- MongoDB Database (Atlas or Local)
- Pusher Account (for realtime features)
- UploadThing Account (for file uploads)

### Installation

1.  **Clone the repository**
    ```bash
    git clone https://github.com/abhiatwork001-hue/emp-mgmt.git]
    cd emp-mgmt
    ```

2.  **Install dependencies**
    ```bash
    npm install
    ```

3.  **Environment Setup**
    Create a `.env` file in the root directory:
    ```env
    # Database
    MONGODB_URI=mongodb+srv://...

    # Auth
    NEXTAUTH_URL=http://localhost:3000
    NEXTAUTH_SECRET=your_super_secret_key

    # Pusher (Realtime)
    NEXT_PUBLIC_PUSHER_KEY=...
    NEXT_PUBLIC_PUSHER_CLUSTER=...
    PUSHER_APP_ID=...
    PUSHER_SECRET=...

    # UploadThing (Files)
    UPLOADTHING_SECRET=...
    UPLOADTHING_APP_ID=...

    # Email (Optional)
    EMAIL_SERVER_HOST=...
    EMAIL_SERVER_PORT=...
    EMAIL_SERVER_USER=...
    EMAIL_SERVER_PASSWORD=...
    EMAIL_FROM=...
    ```

4.  **Run Development Server**
    ```bash
    npm run dev
    ```
    Open [http://localhost:3000](http://localhost:3000) to view the app.

## 🤝 Contributing
Contributions are welcome! Please fork the repository and create a pull request for any feature enhancements or bug fixes.

## 📄 License
This project is licensed under the MIT License.
