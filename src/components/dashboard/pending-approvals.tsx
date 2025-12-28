import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Calendar, Users } from "lucide-react";

export function PendingApprovals() {
    return (
        <Card className="bg-[#1e293b] border-none text-white h-full">
            <CardHeader>
                <CardTitle className="text-white text-lg">Pending Approvals</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
                <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                        <Calendar className="h-4 w-4 text-gray-400" />
                        <span className="text-sm font-medium">Schedule Approvals</span>
                    </div>
                    <Button variant="secondary" size="sm" className="bg-white text-black hover:bg-gray-200">
                        Review 3
                    </Button>
                </div>
                <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                        <Users className="h-4 w-4 text-gray-400" />
                        <span className="text-sm font-medium">Employee Assignments</span>
                    </div>
                    <Button variant="secondary" size="sm" className="bg-white text-black hover:bg-gray-200">
                        Review 5
                    </Button>
                </div>
            </CardContent>
        </Card>
    );
}
