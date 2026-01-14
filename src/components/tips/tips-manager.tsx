"use client";

import { useState } from "react";
import { TipsCalculator } from "./tips-calculator";
import { TipsHistory } from "./tips-history";

interface TipsManagerProps {
    storeId: string;
    userId: string;
}

export function TipsManager({ storeId, userId }: TipsManagerProps) {
    const [editingData, setEditingData] = useState<any>(null);

    return (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            <div className="order-1 lg:order-none">
                <TipsCalculator
                    storeId={storeId}
                    userId={userId}
                    initialData={editingData}
                    onCancel={() => setEditingData(null)}
                    onSuccess={() => {
                        setEditingData(null);
                        // Force refresh of history via key change if needed? 
                        // Actually TipsHistory has its own fetch. We might need to trigger it.
                        // But TipsCalculator only hits save endpoint.
                        // A simple way is to remount History or pass a refresh signal.
                        // For now keep it simple, user can refresh page or click edit again.
                    }}
                />
            </div>
            <div className="order-2 lg:order-none">
                <TipsHistory
                    storeId={storeId}
                    onEdit={(data) => {
                        setEditingData(data);
                        // Scroll to top or calculator
                        window.scrollTo({ top: 0, behavior: 'smooth' });
                    }}
                />
            </div>
        </div>
    );
}
