import { Link } from "@/i18n/routing";
import { Button } from "@/components/ui/button";
import { ShieldAlert } from "lucide-react";

export default function AccessDeniedPage() {
    return (
        <div className="flex h-screen w-full flex-col items-center justify-center bg-background p-4 text-center">
            <div className="flex h-24 w-24 items-center justify-center rounded-full bg-destructive/10 mb-6">
                <ShieldAlert className="h-12 w-12 text-destructive" />
            </div>
            <h1 className="text-4xl font-bold tracking-tight mb-2">Access Denied</h1>
            <p className="text-muted-foreground max-w-[500px] mb-8 text-lg">
                You do not have permission to access this page. Please contact your administrator if you believe this is a mistake.
            </p>
            <div className="flex gap-4">
                <Button asChild variant="outline" size="lg">
                    <Link href="/dashboard">Return to Dashboard</Link>
                </Button>
            </div>
        </div>
    );
}
