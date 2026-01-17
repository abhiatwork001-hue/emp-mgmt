"use client";

import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { useTranslations } from "next-intl";
import { ArrowRight } from "lucide-react";
import Link from "next/link";
import { Button } from "@/components/ui/button";

interface StoreStat {
    id: string;
    name: string;
    slug: string;
    employees: number;
    absences: number;
    overtime: number;
    complianceIssues: number;
    coverage: string;
}

interface StoreComparisonProps {
    stores: StoreStat[];
}

export function StoreComparison({ stores }: StoreComparisonProps) {
    const t = useTranslations("OwnerDashboard.comparison");

    return (
        <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-lg font-medium">{t("title")}</CardTitle>
                <Button variant="ghost" size="sm" className="hidden" asChild>
                    <Link href="/dashboard/stores">{t("viewAll")} <ArrowRight className="ml-2 h-4 w-4" /></Link>
                </Button>
            </CardHeader>
            <CardContent>
                <div className="rounded-md border">
                    <Table>
                        <TableHeader>
                            <TableRow className="bg-muted/50">
                                <TableHead>{t("store")}</TableHead>
                                <TableHead className="text-center">{t("staff")}</TableHead>
                                <TableHead className="text-center">{t("absences")}</TableHead>
                                <TableHead className="text-center">{t("overtime")}</TableHead>
                                <TableHead className="text-center">{t("compliance")}</TableHead>
                                <TableHead className="text-center">{t("action")}</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {stores.map((store) => (
                                <TableRow key={store.id}>
                                    <TableCell className="font-medium">{store.name}</TableCell>
                                    <TableCell className="text-center">{store.employees}</TableCell>
                                    <TableCell className="text-center">
                                        <div className={`inline-flex items-center justify-center px-2 py-1 rounded-full text-xs font-medium ${store.absences > 5 ? "bg-red-100 text-red-700" : "bg-slate-100 text-slate-700"
                                            }`}>
                                            {store.absences}
                                        </div>
                                    </TableCell>
                                    <TableCell className="text-center">{store.overtime}h</TableCell>
                                    <TableCell className="text-center">
                                        {store.complianceIssues > 0 ? (
                                            <span className="text-red-600 font-bold">{store.complianceIssues} Issues</span>
                                        ) : (
                                            <span className="text-emerald-600">OK</span>
                                        )}
                                    </TableCell>
                                    <TableCell className="text-center">
                                        <Button variant="ghost" size="sm" asChild>
                                            <Link href={`/dashboard/stores/${store.slug}`}>
                                                {t("details")}
                                            </Link>
                                        </Button>
                                    </TableCell>
                                </TableRow>
                            ))}
                        </TableBody>
                    </Table>
                </div>
            </CardContent>
        </Card>
    );
}
