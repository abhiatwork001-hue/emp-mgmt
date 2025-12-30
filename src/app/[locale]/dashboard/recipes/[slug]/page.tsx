import { getFoodBySlug, checkFinancialAccess } from "@/lib/actions/recipe.actions";
import { getUserSession } from "@/lib/actions/auth.actions";
import { notFound, redirect } from "next/navigation";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { RecipeCalculator } from "@/components/recipes/recipe-calculator";
import { ProfitSimulator } from "@/components/recipes/profit-simulator";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Clock, Thermometer, Calculator, Info, Edit } from "lucide-react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { RecipeActions } from "@/components/recipes/recipe-actions";

export default async function RecipeDetailPage({ params }: { params: Promise<{ slug: string }> }) {
    const { slug } = await params;
    const session = await getUserSession();

    const food = await getFoodBySlug(slug);
    if (!food) return notFound();

    // Access Check
    // If not authenticated, redirect? Or show public view?
    // Assuming protected route.
    if (!session?.userId) {
        // redirect("/login"); 
        // Just continue for now, will fail checks
    }

    const canViewFinancials = session?.userId ? await checkFinancialAccess(session.userId) : false;
    const canEdit = canViewFinancials; // Reuse logic for now, giving Power Users edit rights.

    // Calculate Unit Cost for Simulator (CostTotal * PortionSize / Yield)
    const yieldVal = Number(food.yieldAmount) || 1;
    const portionSize = Number(food.portionsInHouse) || 0;
    const unitCost = (yieldVal > 0 && portionSize > 0) ? (food.costTotal * portionSize) / yieldVal : 0;

    return (
        <div className="p-6 md:p-8 max-w-7xl mx-auto space-y-8">
            {/* Header / Title */}
            <div className="flex flex-col md:flex-row justify-between items-start gap-4">
                <div>
                    <h1 className="text-3xl md:text-4xl font-bold tracking-tight text-foreground">
                        {food.name}
                    </h1>
                    <div className="flex items-center gap-2 mt-2">
                        <Badge variant="outline" className="text-base px-3 py-1">
                            {food.category?.name || "Uncategorized"}
                        </Badge>
                        {food.yieldAmount && (
                            <Badge variant="secondary" className="text-base px-3 py-1">
                                Yield: {food.yieldAmount} {food.yieldUnit}
                            </Badge>
                        )}
                    </div>
                </div>

                {canEdit && (
                    <div className="flex items-center gap-2">
                        <Link href={`/dashboard/recipes/${food.slug}/edit`}>
                            <Button variant="outline" className="gap-2">
                                <Edit className="w-4 h-4" /> Edit
                            </Button>
                        </Link>

                        {/* Action Buttons */}
                        <RecipeActions
                            id={food._id.toString()}
                            isActive={food.isActive}
                            isDeleted={Boolean(food.isDeleted)}
                            canDelete={canEdit /* Refine permission later per requirement: "Kitchen Head for Archive, Tech for Delete" */}
                            canArchive={canEdit}
                            userId={session?.userId}
                        />
                    </div>
                )}
            </div>


            {/* Main Info Grid - Clean Card Style */}
            <div className="grid grid-cols-1 md:grid-cols-12 gap-6">

                {/* General Info Column */}
                <div className="md:col-span-3 space-y-6">
                    <Card>
                        <CardHeader className="pb-3">
                            <CardTitle className="text-base font-semibold uppercase tracking-wider text-muted-foreground">General Info</CardTitle>
                        </CardHeader>
                        <CardContent className="space-y-4">
                            <div>
                                <span className="text-xs font-bold text-muted-foreground uppercase block mb-1">Validity</span>
                                <div className="flex items-center gap-2">
                                    <Clock className="w-4 h-4 text-primary" />
                                    <span className="font-medium">{food.expirationDays} Days</span>
                                </div>
                            </div>
                            <Separator />
                            <div>
                                <span className="text-xs font-bold text-muted-foreground uppercase block mb-1">Storage</span>
                                <div className="flex items-center gap-2">
                                    <Thermometer className="w-4 h-4 text-primary" />
                                    <span className="font-medium">{food.storingTemperature || "N/A"}</span>
                                </div>
                            </div>
                            <Separator />
                            <div>
                                <span className="text-xs font-bold text-muted-foreground uppercase block mb-1">Serving</span>
                                <div className="space-y-2 text-sm">
                                    <div className="flex justify-between">
                                        <span className="text-muted-foreground">In-House</span>
                                        <span className="font-medium">{food.servingInHouse || "-"}</span>
                                    </div>
                                    <div className="flex justify-between">
                                        <span className="text-muted-foreground">Take-Away</span>
                                        <span className="font-medium">{food.servingTakeAway || "-"}</span>
                                    </div>
                                </div>
                            </div>
                        </CardContent>
                    </Card>

                    <Card>
                        <CardHeader className="pb-3">
                            <CardTitle className="text-base font-semibold uppercase tracking-wider text-muted-foreground">Utensils</CardTitle>
                        </CardHeader>
                        <CardContent>
                            {food.cookware && food.cookware.length > 0 ? (
                                <ul className="space-y-2 text-sm">
                                    {food.cookware.map((item: string, i: number) => (
                                        <li key={i} className="flex items-start">
                                            <span className="mr-2 text-primary">•</span>
                                            {item}
                                        </li>
                                    ))}
                                </ul>
                            ) : (
                                <p className="text-muted-foreground text-sm italic">No specific utensils listed</p>
                            )}
                        </CardContent>
                    </Card>
                </div>

                {/* Ingredients / Calculator Column - Sticky for easy access */}
                <div className="md:col-span-9 lg:col-span-6">
                    <Card className="flex flex-col overflow-hidden h-[calc(100vh-8rem)] sticky top-24">
                        <CardHeader className="pb-4 bg-muted/20 border-b flex-shrink-0">
                            <CardTitle className="flex items-center gap-2">
                                <Calculator className="w-5 h-5" />
                                Ingredients & Calculator
                            </CardTitle>
                        </CardHeader>
                        <CardContent className="p-0 flex-1 relative min-h-0">
                            <RecipeCalculator
                                ingredients={food.ingredients}
                                baseDoses={food.numberOfDoses}
                                baseCost={food.costTotal}
                                yieldAmount={food.yieldAmount}
                                yieldUnit={food.yieldUnit}
                                portionsInHouse={food.portionsInHouse}
                                portionsTakeAway={food.portionsTakeAway}
                                hideFinancials={!canViewFinancials}
                            />
                        </CardContent>
                    </Card>
                </div>

                {/* Instructions & Visuals - Moves to bottom on mobile, side on huge screens or just bottom 2 cols */}
                <div className="md:col-span-12 lg:col-span-3 space-y-6">
                    {/* Visuals */}
                    <div className="space-y-4">
                        <h3 className="font-semibold text-lg flex items-center gap-2">
                            <Info className="w-4 h-4" /> Visual Reference
                        </h3>
                        <div className="grid grid-cols-2 gap-2">
                            {food.heroImg && (
                                <div className="aspect-square relative rounded-md overflow-hidden border shadow-sm col-span-2">
                                    <img src={food.heroImg} alt="Hero" className="object-cover w-full h-full" />
                                </div>
                            )}
                            {food.platingImages?.map((img: string, i: number) => (
                                <div key={i} className="aspect-square relative rounded-md overflow-hidden border shadow-sm bg-muted/50">
                                    <img src={img} alt={`Step ${i}`} className="object-cover w-full h-full" />
                                </div>
                            ))}
                        </div>
                    </div>
                </div>

                {/* Full width instructions below grid if needed, or col-span-12 */}
                <div className="md:col-span-12">
                    <Separator className="my-6" />
                    <h3 className="font-bold text-xl mb-6">Preparation Method</h3>
                    <div className="prose max-w-none">
                        {food.instructions && food.instructions.length > 0 ? (
                            <ol className="list-none space-y-6">
                                {food.instructions.map((step: string, i: number) => (
                                    <li key={i} className="flex gap-4">
                                        <div className="flex-shrink-0 w-8 h-8 rounded-full bg-primary/10 text-primary font-bold flex items-center justify-center border border-primary/20">
                                            {i + 1}
                                        </div>
                                        <div className="mt-1 text-foreground leading-relaxed text-lg">
                                            {step}
                                        </div>
                                    </li>
                                ))}
                            </ol>
                        ) : (
                            <p className="text-muted-foreground italic">No instructions provided.</p>
                        )}
                    </div>
                </div>

            </div>

        </div>
    );
}
