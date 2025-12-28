import { getAllPositions } from "@/lib/actions/position.actions";
import { PositionFormDialog } from "@/components/positions/position-form-dialog";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Search } from "lucide-react";
import { Input } from "@/components/ui/input";
import Link from "next/link";

export default async function PositionsPage() {
    const positions = await getAllPositions();

    return (
        <div className="space-y-6">
            <div className="flex flex-col gap-1">
                <h2 className="text-3xl font-bold tracking-tight text-foreground">Positions</h2>
                <p className="text-muted-foreground">Manage job titles and hierarchy levels across the organization.</p>
            </div>

            <div className="flex items-center justify-between gap-4">
                <div className="relative flex-1 max-w-sm">
                    <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                    <Input
                        type="search"
                        placeholder="Search positions..."
                        className="pl-8 bg-card"
                    />
                </div>
                <PositionFormDialog />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {positions.map((pos: any) => (
                    <Link key={pos._id} href={`/dashboard/positions/${pos._id}`}>
                        <Card className="hover:bg-muted/50 transition-colors cursor-pointer border-border">
                            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                                <CardTitle className="text-sm font-medium">
                                    {pos.name}
                                </CardTitle>
                                {pos.isStoreSpecific ? (
                                    <Badge variant="secondary">Store</Badge>
                                ) : (
                                    <Badge variant="outline">Global</Badge>
                                )}
                            </CardHeader>
                            <CardContent>
                                <div className="text-2xl font-bold">Lvl {pos.level || 0}</div>
                                <p className="text-xs text-muted-foreground">
                                    Click to view details and employees
                                </p>
                            </CardContent>
                        </Card>
                    </Link>
                ))}
                {positions.length === 0 && (
                    <div className="col-span-full text-center py-10 text-muted-foreground">
                        No positions found. Create one to get started.
                    </div>
                )}
            </div>
        </div>
    );
}
