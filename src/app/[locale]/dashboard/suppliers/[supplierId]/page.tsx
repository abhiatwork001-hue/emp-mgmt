import { getSupplierById } from "@/lib/actions/supplier.actions";
import { notFound } from "next/navigation";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import {
    Phone, Mail, MapPin, Package, Truck,
    CalendarClock, ArrowLeft, Building2, UserCircle
} from "lucide-react";
import Link from "next/link";
import { format } from "date-fns";

interface Props {
    params: {
        supplierId: string;
        locale: string;
    };
}

export default async function SupplierDetailPage({ params }: Props) {
    const supplier = await getSupplierById(params.supplierId);

    if (!supplier) {
        notFound();
    }

    const days = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];

    return (
        <div className="space-y-6 max-w-7xl mx-auto p-4 md:p-8">
            {/* Header */}
            <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
                <div className="space-y-1">
                    <div className="flex items-center gap-2">
                        <Link href="/dashboard/suppliers">
                            <Button variant="ghost" size="icon" className="-ml-2 h-8 w-8 text-muted-foreground">
                                <ArrowLeft className="h-4 w-4" />
                            </Button>
                        </Link>
                        <h1 className="text-3xl font-bold tracking-tight">{supplier.name}</h1>
                        {supplier.active ? (
                            <Badge variant="outline" className="ml-2 bg-emerald-500/10 text-emerald-600 border-emerald-200">Active</Badge>
                        ) : (
                            <Badge variant="outline" className="ml-2 bg-muted text-muted-foreground">Inactive</Badge>
                        )}
                    </div>
                    <div className="flex items-center gap-2 text-muted-foreground pl-8">
                        <Badge variant="secondary" className="rounded-sm font-normal">
                            {supplier.category || "Uncategorized"}
                        </Badge>
                    </div>
                </div>
                {/* Actions placeholder - Edit could go here */}
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                {/* Contact Information */}
                <Card>
                    <CardHeader>
                        <CardTitle className="flex items-center gap-2 text-lg">
                            <Building2 className="h-5 w-5 text-primary" />
                            Contact Details
                        </CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-4">
                        <div className="flex items-start gap-3">
                            <UserCircle className="h-4 w-4 mt-1 text-muted-foreground" />
                            <div>
                                <p className="text-sm font-medium">Contact Person</p>
                                <p className="text-sm text-muted-foreground">{supplier.contactPerson || "N/A"}</p>
                            </div>
                        </div>
                        <Separator />
                        <div className="flex items-start gap-3">
                            <Phone className="h-4 w-4 mt-1 text-muted-foreground" />
                            <div>
                                <p className="text-sm font-medium">Phone</p>
                                <p className="text-sm text-muted-foreground">{supplier.phoneNumber || "N/A"}</p>
                            </div>
                        </div>
                        <Separator />
                        <div className="flex items-start gap-3">
                            <Mail className="h-4 w-4 mt-1 text-muted-foreground" />
                            <div>
                                <p className="text-sm font-medium">Email</p>
                                <p className="text-sm text-muted-foreground">{supplier.email || "N/A"}</p>
                            </div>
                        </div>
                        <Separator />
                        <div className="flex items-start gap-3">
                            <MapPin className="h-4 w-4 mt-1 text-muted-foreground" />
                            <div>
                                <p className="text-sm font-medium">Address</p>
                                <p className="text-sm text-muted-foreground">{supplier.address || "N/A"}</p>
                            </div>
                        </div>
                    </CardContent>
                </Card>

                {/* Delivery Schedule */}
                <Card className="md:col-span-2">
                    <CardHeader>
                        <CardTitle className="flex items-center gap-2 text-lg">
                            <Truck className="h-5 w-5 text-primary" />
                            Delivery Schedule
                        </CardTitle>
                        <CardDescription>
                            Configure when orders need to be placed to ensure delivery.
                        </CardDescription>
                    </CardHeader>
                    <CardContent>
                        {(!supplier.deliverySchedule || supplier.deliverySchedule.length === 0) ? (
                            <div className="flex flex-col items-center justify-center h-40 text-muted-foreground bg-muted/20 rounded-lg border border-dashed">
                                <CalendarClock className="h-8 w-8 mb-2 opacity-50" />
                                <p>No delivery schedule configured.</p>
                            </div>
                        ) : (
                            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                                {supplier.deliverySchedule.map((schedule: any, index: number) => (
                                    <div key={index} className="flex flex-col p-4 bg-orange-50/50 dark:bg-orange-950/10 border border-orange-100 dark:border-orange-900 rounded-lg">
                                        <div className="flex items-center justify-between mb-2">
                                            <span className="font-bold text-orange-700 dark:text-orange-400">
                                                {days[schedule.dayOfWeek]}
                                            </span>
                                            <Badge variant="outline" className="bg-background text-[10px]">
                                                Delivery
                                            </Badge>
                                        </div>
                                        <div className="text-sm space-y-1 text-muted-foreground">
                                            <div className="flex justify-between">
                                                <span>Order By:</span>
                                                <span className="font-medium text-foreground">
                                                    {days[(schedule.dayOfWeek - (schedule.orderCutoff?.leadDays || 0) + 7) % 7]}
                                                </span>
                                            </div>
                                            <div className="flex justify-between">
                                                <span>Cutoff:</span>
                                                <span className="font-medium text-foreground">{schedule.orderCutoff?.time || "17:00"}</span>
                                            </div>
                                            <div className="flex justify-between">
                                                <span>Lead Time:</span>
                                                <span>{schedule.orderCutoff?.leadDays} day(s)</span>
                                            </div>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}
                    </CardContent>
                </Card>
            </div>

            {/* Catalog Items */}
            <Card>
                <CardHeader>
                    <CardTitle className="flex items-center gap-2 text-lg">
                        <Package className="h-5 w-5 text-primary" />
                        Catalog Items
                        <Badge className="ml-2" variant="secondary">{supplier.items?.length || 0}</Badge>
                    </CardTitle>
                </CardHeader>
                <CardContent>
                    {(!supplier.items || supplier.items.length === 0) ? (
                        <div className="text-center py-10 text-muted-foreground">
                            No items in catalog.
                        </div>
                    ) : (
                        <div className="rounded-md border">
                            <div className="relative w-full overflow-auto">
                                <table className="w-full caption-bottom text-sm text-left">
                                    <thead className="[&_tr]:border-b">
                                        <tr className="border-b transition-colors hover:bg-muted/50 data-[state=selected]:bg-muted">
                                            <th className="h-12 px-4 align-middle font-medium text-muted-foreground">Item Name</th>
                                            <th className="h-12 px-4 align-middle font-medium text-muted-foreground">SKU</th>
                                            <th className="h-12 px-4 align-middle font-medium text-muted-foreground">Category</th>
                                            <th className="h-12 px-4 align-middle font-medium text-muted-foreground text-right">Unit</th>
                                            <th className="h-12 px-4 align-middle font-medium text-muted-foreground text-right">Price</th>
                                        </tr>
                                    </thead>
                                    <tbody className="[&_tr:last-child]:border-0">
                                        {supplier.items.map((item: any, i: number) => (
                                            <tr key={i} className="border-b transition-colors hover:bg-muted/50">
                                                <td className="p-4 align-middle font-medium">{item.name}</td>
                                                <td className="p-4 align-middle text-muted-foreground font-mono text-xs">{item.sku || "-"}</td>
                                                <td className="p-4 align-middle">{item.category || "-"}</td>
                                                <td className="p-4 align-middle text-right">{item.unit || "-"}</td>
                                                <td className="p-4 align-middle text-right font-mono">
                                                    {item.price ? `$${item.price.toFixed(2)}` : "-"}
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        </div>
                    )}
                </CardContent>
            </Card>
        </div>
    );
}
