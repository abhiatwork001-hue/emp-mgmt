import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { CheckCircle2, UserPlus } from "lucide-react";

export function RecentActivity() {
    return (
        <Card className="bg-[#1e293b] border-none text-white h-full">
            <CardHeader>
                <CardTitle className="text-white text-lg">Recent Activities</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
                <div className="flex items-start gap-3">
                    <CheckCircle2 className="h-5 w-5 text-emerald-500 mt-0.5" />
                    <div className="text-sm">
                        <p className="font-medium">New schedule created for Downtown Branch</p>
                        <p className="text-gray-400 text-xs">2 hours ago</p>
                    </div>
                </div>
                <div className="flex items-start gap-3">
                    <UserPlus className="h-5 w-5 text-blue-500 mt-0.5" />
                    <div className="text-sm">
                        <p className="font-medium">2 employees assigned to Kitchen Department</p>
                        <p className="text-gray-400 text-xs">5 hours ago</p>
                    </div>
                </div>
            </CardContent>
        </Card>
    );
}
