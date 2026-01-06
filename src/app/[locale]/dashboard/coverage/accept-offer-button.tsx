"use client";

import { useTransition } from "react";
import { Button } from "@/components/ui/button";
import { acceptCoverageOffer } from "@/lib/actions/coverage.actions";
import { toast } from "sonner";
import { Check } from "lucide-react";
import { useRouter } from "next/navigation";

interface AcceptOfferButtonProps {
    requestId: string;
    userId: string;
}

export function AcceptOfferButton({ requestId, userId }: AcceptOfferButtonProps) {
    const [isPending, startTransition] = useTransition();
    const router = useRouter();

    const handleAccept = async () => {
        if (!confirm("Are you sure you want to accept this shift?")) return;

        startTransition(async () => {
            try {
                const res = await acceptCoverageOffer(requestId, userId);
                if (res?.success) {
                    toast.success("Shift accepted! HR will finalize soon.");
                    router.refresh();
                } else {
                    toast.error(res?.error || "Failed to accept shift");
                }
            } catch (error: any) {
                toast.error(error?.message || "Something went wrong");
            }
        });
    };

    return (
        <Button
            size="sm"
            className="font-bold italic bg-primary hover:bg-primary/90 text-white shadow-lg shadow-primary/20"
            onClick={handleAccept}
            disabled={isPending}
        >
            <Check className="h-4 w-4 mr-2" /> Accept Shift
        </Button>
    );
}
