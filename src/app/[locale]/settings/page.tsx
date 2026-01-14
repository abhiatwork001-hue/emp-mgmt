// src/app/[locale]/settings/page.tsx
import React from 'react';
import Link from 'next/link';

export default function SettingsPage() {
    return (
        <div className="p-8">
            <h1 className="text-2xl font-bold mb-4">Settings</h1>
            <p className="mb-2">Download a copy of all your personal data stored in LaGasy.</p>
            <Link
                href="/api/user/export"
                className="inline-block bg-primary-600 text-white px-4 py-2 rounded hover:bg-primary-700"
                download
            >
                Export My Data
            </Link>
        </div>
    );
}
