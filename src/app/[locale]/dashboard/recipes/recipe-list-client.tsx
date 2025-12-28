"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Search, Plus, ChefHat, LayoutGrid, Utensils } from "lucide-react";
import Link from "next/link";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useRouter } from "next/navigation";
import Image from "next/image";

interface RecipeListClientProps {
    initialFoods: any[];
    categories: any[];
    permissions: { canCreate: boolean };
}

export function RecipeListClient({ initialFoods, categories, permissions }: RecipeListClientProps) {
    const router = useRouter();
    const [searchTerm, setSearchTerm] = useState("");
    const [selectedCategory, setSelectedCategory] = useState("all");

    // Client side filter for instant response (Server side is handled by page refresh if we hook it up, but small list is fine)
    const filteredFoods = initialFoods.filter(food => {
        const matchesSearch = food.name.toLowerCase().includes(searchTerm.toLowerCase());
        const matchesCategory = selectedCategory === "all" || food.category?._id === selectedCategory || food.category === selectedCategory;
        return matchesSearch && matchesCategory;
    });

    return (
        <div className="space-y-6">
            {/* Toolbar */}
            <div className="flex flex-col sm:flex-row gap-4 justify-between items-center bg-card p-4 rounded-lg border shadow-sm">
                <div className="flex items-center gap-2 w-full sm:w-auto flex-1">
                    <div className="relative w-full sm:max-w-xs">
                        <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                        <Input
                            placeholder="Search recipes..."
                            className="pl-8 bg-background"
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                        />
                    </div>
                    <Select value={selectedCategory} onValueChange={setSelectedCategory}>
                        <SelectTrigger className="w-[180px]">
                            <SelectValue placeholder="Category" />
                        </SelectTrigger>
                        <SelectContent>
                            <SelectItem value="all">All Categories</SelectItem>
                            {categories.map(cat => (
                                <SelectItem key={cat._id} value={cat._id}>{cat.name}</SelectItem>
                            ))}
                        </SelectContent>
                    </Select>
                </div>

                {permissions.canCreate && (
                    <Button onClick={() => router.push("/dashboard/recipes/new")} className="w-full sm:w-auto">
                        <Plus className="mr-2 h-4 w-4" /> New Recipe
                    </Button>
                )}
            </div>

            {/* Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                {filteredFoods.map((food) => (
                    <Link key={food._id} href={`/dashboard/recipes/${food._id}`} className="group">
                        <Card className="h-full overflow-hidden transition-all hover:shadow-md hover:border-primary/50">
                            <div className="aspect-video relative bg-muted flex items-center justify-center overflow-hidden">
                                {food.heroImg ? (
                                    <img
                                        src={food.heroImg}
                                        alt={food.name}
                                        className="object-cover w-full h-full group-hover:scale-105 transition-transform duration-500"
                                    />
                                ) : (
                                    <Utensils className="h-12 w-12 text-muted-foreground/30" />
                                )}
                                {!food.isActive && (
                                    <div className="absolute top-2 right-2 bg-black/60 text-white text-xs px-2 py-1 rounded">
                                        Archived
                                    </div>
                                )}
                            </div>
                            <CardHeader className="p-4 pb-2">
                                <div className="flex justify-between items-start">
                                    <Badge variant="secondary" className="mb-2 text-xs">
                                        {food.category?.name || "Uncategorized"}
                                    </Badge>
                                    <span className="text-xs font-mono text-muted-foreground">
                                        {food.costPerUnit?.toFixed(2)}€ / unit
                                    </span>
                                </div>
                                <CardTitle className="line-clamp-1 group-hover:text-primary transition-colors">
                                    {food.name}
                                </CardTitle>
                            </CardHeader>
                            <CardContent className="p-4 pt-0 text-sm text-muted-foreground line-clamp-2">
                                {food.description || "No description provided."}
                            </CardContent>
                            <CardFooter className="p-4 pt-2 border-t bg-muted/20 flex justify-between items-center text-xs text-muted-foreground">
                                <div className="flex items-center gap-1">
                                    <ChefHat className="h-3 w-3" />
                                    <span>{food.ingredients?.length || 0} Ingredients</span>
                                </div>
                                <div>
                                    {food.numberOfDoses} Doses
                                </div>
                            </CardFooter>
                        </Card>
                    </Link>
                ))}

                {filteredFoods.length === 0 && (
                    <div className="col-span-full py-12 text-center text-muted-foreground">
                        <div className="flex justify-center mb-4">
                            <LayoutGrid className="h-12 w-12 opacity-20" />
                        </div>
                        <p>No recipes found matching your filters.</p>
                    </div>
                )}
            </div>
        </div>
    );
}
