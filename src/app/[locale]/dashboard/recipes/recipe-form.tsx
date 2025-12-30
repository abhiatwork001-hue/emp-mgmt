
"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import { Trash2, Plus, Calculator } from "lucide-react";
import { toast } from "sonner";
import { useRouter } from "next/navigation";
import { createFood, createCategory, updateFood } from "@/lib/actions/recipe.actions";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from "@/components/ui/dialog";
import { Separator } from "@/components/ui/separator";
import { ImageUpload } from "@/components/ui/image-upload";
import { Checkbox } from "@/components/ui/checkbox";


interface RecipeFormProps {
    categories: any[];
    globalDepartments?: any[];
    userGlobalDepartmentId?: string;
    initialData?: any; // For Edit Mode
}

export function RecipeForm({ categories: initialCategories, globalDepartments, userGlobalDepartmentId, initialData }: RecipeFormProps) {
    const router = useRouter();
    const [categories, setCategories] = useState(initialCategories);
    const [loading, setLoading] = useState(false);

    // Form State - Initialize from initialData if available
    const [formData, setFormData] = useState({
        name: initialData?.name || "",
        category: initialData?.category?._id || initialData?.category || "",
        description: initialData?.description || "",
        heroImg: initialData?.heroImg || "",
        numberOfDoses: initialData?.numberOfDoses || 1,
        yieldAmount: initialData?.yieldAmount || "",
        yieldUnit: initialData?.yieldUnit || "kg",
        portionsInHouse: initialData?.portionsInHouse || "",
        portionsTakeAway: initialData?.portionsTakeAway || "",
        expirationDays: initialData?.expirationDays || 3,
        storingTemperature: initialData?.storingTemperature || "",
        servingInHouse: initialData?.servingInHouse || "",
        servingTakeAway: initialData?.servingTakeAway || "",
        isPublished: initialData?.isPublished ?? true,
        accessibleGlobalDepartments: initialData?.accessibleGlobalDepartments || (userGlobalDepartmentId ? [userGlobalDepartmentId] : []),
        platingImages: initialData?.platingImages || [],

        // Financials
        targetFoodCostPercentage: initialData?.targetFoodCostPercentage || "",
        pvp: initialData?.pvp || "",
        ivaPercent: initialData?.ivaPercent || 23,
    });

    const [ingredients, setIngredients] = useState<any[]>(
        initialData?.ingredients?.map((i: any) => ({
            name: i.name,
            amount: i.amount || "",
            unit: i.unit,
            costPerUnit: i.costPerUnit || "",
            costForIngredient: i.costForIngredient, // Keep track if needed
        })) || [{ name: "", amount: "", unit: "kg", costPerUnit: "", supplier: "", observation: "" }]
    );

    const [instructions, setInstructions] = useState<string[]>(initialData?.instructions || [""]);
    const [cookware, setCookware] = useState<string[]>(initialData?.cookware || [""]);

    // Pricing Mode: 'manual' (Set Price -> Calc Cost%) or 'auto' (Set Cost% -> Calc Price)
    const [pricingMode, setPricingMode] = useState<'manual' | 'auto'>('manual');

    // Derived Financials
    const [financials, setFinancials] = useState({
        costTotal: initialData?.costTotal || 0,
        pvpSemIva: initialData?.pvpSemIva || 0,
        ivaAmount: initialData?.ivaAmount || 0,
        mb: initialData?.mb || 0,
        theoreticalFoodCost: initialData?.theoreticalFoodCost || 0
    });

    // Auto-format helper
    const formatText = (str: string) => {
        const s = str.trim();
        if (!s) return "";
        let formatted = s.charAt(0).toUpperCase() + s.slice(1);
        if (!formatted.endsWith(".")) formatted += ".";
        return formatted;
    };

    const cleanDecimalInput = (value: string) => {
        const cleaned = value.replace(/,/g, '.');
        if (cleaned === '' || /^\d*\.?\d*$/.test(cleaned)) return cleaned;
        return null;
    };

    const cleanDecimalInputLimited = (value: string, maxDecimals: number = 3) => {
        const cleaned = value.replace(/,/g, '.');
        // Regex: allowed digits and one dot with limited decimals
        const regex = new RegExp(`^\\d*(\\.\\d{0,${maxDecimals}})?$`);
        if (cleaned === '' || regex.test(cleaned)) return cleaned;
        return null;
    };

    const formatOnBlur = (val: any) => {
        if (!val) return val;
        const num = Number(val);
        return isNaN(num) ? val : num.toFixed(3);
    };

    // Effect: Calculate Financials
    useEffect(() => {
        const costTotal = ingredients.reduce((sum, ing) => sum + (Number(ing.amount || 0) * Number(ing.costPerUnit || 0)), 0);
        const ivaPercent = Number(formData.ivaPercent) || 0;

        // Fix: Doses = Yield / Portion Size (In House)
        const yieldVal = Number(formData.yieldAmount) || 0;
        const portionSize = Number(formData.portionsInHouse) || 0;
        const doses = (yieldVal > 0 && portionSize > 0) ? (yieldVal / portionSize) : 1;

        let pvp = Number(formData.pvp) || 0;
        let pvpSemIva = 0; // Net Unit Price
        let theoreticalFoodCost = 0;
        let totalNetSales = 0;

        if (pricingMode === 'auto') {
            // Calculate Price based on Target Food Cost
            // CostTotal / Target% = Required Total Net Sales
            const target = Number(formData.targetFoodCostPercentage) || 30;
            if (target > 0 && costTotal > 0) {
                const requiredTotalNet = costTotal / (target / 100);
                pvpSemIva = requiredTotalNet / doses;
                pvp = pvpSemIva * (1 + (ivaPercent / 100));

                totalNetSales = requiredTotalNet;
                theoreticalFoodCost = target;
            }
        } else {
            // Manual PVP -> Calculate Food Cost
            // PVP is Unit Price.
            pvpSemIva = pvp / (1 + (ivaPercent / 100));
            totalNetSales = pvpSemIva * doses;

            theoreticalFoodCost = totalNetSales > 0 ? (costTotal / totalNetSales) * 100 : 0;
        }

        const ivaAmount = pvp - pvpSemIva;

        // Margin (Batch) = Total Net Sales - Total Cost
        const mb = totalNetSales - costTotal;

        setFinancials({
            costTotal,
            pvpSemIva,
            ivaAmount,
            mb,
            theoreticalFoodCost
        });

        // Sync auto-calculated PVP back to form if in auto mode
        if (pricingMode === 'auto' && Math.abs(pvp - (Number(formData.pvp) || 0)) > 0.005) {
            setFormData(prev => ({ ...prev, pvp: parseFloat(pvp.toFixed(2)) }));
        }

    }, [ingredients, formData.pvp, formData.ivaPercent, formData.targetFoodCostPercentage, pricingMode, formData.yieldAmount, formData.portionsInHouse]);


    // Handlers
    const handleIngredientChange = (index: number, field: string, value: any) => {
        const newIngs = [...ingredients];
        newIngs[index] = { ...newIngs[index], [field]: value };
        setIngredients(newIngs);
    };

    const addIngredient = () => {
        setIngredients([...ingredients, { name: "", amount: "", unit: "kg", costPerUnit: "", supplier: "", observation: "" }]);
    };

    const removeIngredient = (index: number) => {
        const newIngs = ingredients.filter((_, i) => i !== index);
        setIngredients(newIngs);
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);

        try {
            if (!formData.name || !formData.category) {
                toast.error("Name and Category are required");
                setLoading(false);
                return;
            }

            // Prep payload
            const payload = {
                ...formData,
                // Ensure numbers
                numberOfDoses: Number(formData.numberOfDoses) || 1,
                yieldAmount: Number(formData.yieldAmount) || 0,
                portionsInHouse: Number(formData.portionsInHouse) || 0,
                portionsTakeAway: Number(formData.portionsTakeAway) || 0,
                expirationDays: Number(formData.expirationDays) || 0,
                targetFoodCostPercentage: Number(formData.targetFoodCostPercentage) || 0,
                pvp: Number(formData.pvp) || 0,

                ingredients: ingredients.map(i => ({
                    ...i,
                    amount: Number(i.amount) || 0,
                    costPerUnit: Number(i.costPerUnit) || 0,
                    costForIngredient: (Number(i.amount) || 0) * (Number(i.costPerUnit) || 0)
                })),
                instructions: instructions.filter(i => i.trim() !== ""),
                cookware: cookware.filter(c => c.trim() !== ""),

                // Save calculated financials
                costTotal: financials.costTotal,
                pvpSemIva: financials.pvpSemIva,
                ivaAmount: financials.ivaAmount,
                mb: financials.mb,
                theoreticalFoodCost: financials.theoreticalFoodCost
            };

            if (initialData?._id) {
                // UPDATE
                await updateFood(initialData._id, payload);
                toast.success("Recipe updated successfully!");
                router.push(`/dashboard/recipes/${initialData.slug}`);
            } else {
                // CREATE
                await createFood(payload);
                toast.success("Recipe created successfully!");
                router.push("/dashboard/recipes");
            }
        } catch (error) {
            console.error(error);
            toast.error("Failed to save recipe");
        } finally {
            setLoading(false);
        }
    };

    // Quick Category Creation Logic
    const [newCatName, setNewCatName] = useState("");
    const handleCreateCategory = async () => {
        if (!newCatName) return;
        try {
            const cat = await createCategory(newCatName);
            setCategories([...categories, cat]);
            setFormData({ ...formData, category: cat._id });
            setNewCatName("");
            toast.success("Category added");
        } catch (e) {
            toast.error("Failed");
        }
    };

    return (
        <form onSubmit={handleSubmit} className="space-y-8 max-w-5xl mx-auto pb-24">

            {/* Header / Basic Info */}
            <Card>
                <CardHeader>
                    <CardTitle>Basic Information</CardTitle>
                </CardHeader>
                <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-2">
                        <Label>Recipe Name</Label>
                        <Input
                            value={formData.name}
                            onChange={e => setFormData({ ...formData, name: e.target.value })}
                            placeholder="e.g. Awesome Burger"
                        />
                    </div>
                    <div className="space-y-2">
                        <Label>Category</Label>
                        <div className="flex gap-2">
                            <Select
                                value={formData.category}
                                onValueChange={v => setFormData({ ...formData, category: v })}
                            >
                                <SelectTrigger className="w-full">
                                    <SelectValue placeholder="Select Category" />
                                </SelectTrigger>
                                <SelectContent>
                                    {categories.map(c => (
                                        <SelectItem key={c._id} value={c._id}>{c.name}</SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>

                            {/* Simple Dialog to add Category */}
                            <Dialog>
                                <DialogTrigger asChild>
                                    <Button type="button" variant="outline" size="icon"><Plus className="h-4 w-4" /></Button>
                                </DialogTrigger>
                                <DialogContent>
                                    <DialogHeader><DialogTitle>New Category</DialogTitle></DialogHeader>
                                    <Input value={newCatName} onChange={e => setNewCatName(e.target.value)} placeholder="Name" />
                                    <Button onClick={handleCreateCategory} type="button">Create</Button>
                                </DialogContent>
                            </Dialog>
                        </div>
                    </div>

                    <div className="col-span-1 md:col-span-2 space-y-2">
                        <Label>Description / Briefing</Label>
                        <Textarea
                            value={formData.description}
                            onChange={e => setFormData({ ...formData, description: e.target.value })}
                        />
                    </div>

                    <div className="col-span-1 md:col-span-2 space-y-4">
                        <Label className="text-lg font-semibold block border-b pb-2">Recipe Images</Label>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            <div className="space-y-2">
                                <Label className="text-xs text-muted-foreground uppercase">Hero Image</Label>
                                <ImageUpload
                                    endpoint="recipeImage"
                                    value={formData.heroImg ? [formData.heroImg] : []}
                                    onChange={(urls) => setFormData({ ...formData, heroImg: urls[urls.length - 1] || "" })}
                                    onRemove={() => setFormData({ ...formData, heroImg: "" })}
                                />
                            </div>
                            <div className="space-y-2">
                                <Label className="text-xs text-muted-foreground uppercase">Plating / Steps (Max 4)</Label>
                                <ImageUpload
                                    endpoint="platingImages"
                                    value={formData.platingImages || []}
                                    onChange={(urls) => setFormData({ ...formData, platingImages: urls })}
                                    onRemove={(url) => setFormData({ ...formData, platingImages: (formData.platingImages || []).filter((u: string) => u !== url) })}
                                />
                            </div>
                        </div>
                    </div>

                    <div className="col-span-1 md:col-span-2 space-y-4">
                        <Label className="text-lg font-semibold block border-b pb-2">Yield & Portions</Label>
                        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                            <div className="space-y-2">
                                <Label>Total Output</Label>
                                <div className="flex gap-2">
                                    <Input
                                        type="text" inputMode="decimal"
                                        value={formData.yieldAmount}
                                        onChange={e => {
                                            const v = cleanDecimalInput(e.target.value);
                                            if (v !== null) setFormData({ ...formData, yieldAmount: v });
                                        }}
                                        placeholder="e.g. 2"
                                    />
                                    <Select
                                        value={formData.yieldUnit}
                                        onValueChange={v => setFormData({ ...formData, yieldUnit: v })}
                                    >
                                        <SelectTrigger className="w-20 px-2"><SelectValue /></SelectTrigger>
                                        <SelectContent>
                                            <SelectItem value="kg">kg</SelectItem>
                                            <SelectItem value="l">L</SelectItem>
                                            <SelectItem value="unit">Units</SelectItem>
                                        </SelectContent>
                                    </Select>
                                </div>
                            </div>
                            <div className="space-y-2">
                                <Label>Portion Size (House)</Label>
                                <Input
                                    type="text" inputMode="decimal"
                                    value={formData.portionsInHouse}
                                    onChange={e => {
                                        const v = cleanDecimalInput(e.target.value);
                                        if (v !== null) setFormData({ ...formData, portionsInHouse: v });
                                    }}
                                    placeholder={`Size in ${formData.yieldUnit || 'units'}`}
                                />
                            </div>
                            <div className="space-y-2">
                                <Label>Portion Size (Take Away)</Label>
                                <Input
                                    type="text" inputMode="decimal"
                                    value={formData.portionsTakeAway}
                                    onChange={e => {
                                        const v = cleanDecimalInput(e.target.value);
                                        if (v !== null) setFormData({ ...formData, portionsTakeAway: v });
                                    }}
                                    placeholder={`Size in ${formData.yieldUnit || 'units'}`}
                                />
                            </div>
                            <div className="space-y-2">
                                <Label>Expiration (Days)</Label>
                                <Input
                                    type="text" inputMode="numeric"
                                    value={formData.expirationDays}
                                    onChange={e => {
                                        // Allow only integers for days
                                        const v = e.target.value.replace(/[^0-9]/g, '');
                                        setFormData({ ...formData, expirationDays: v });
                                    }}
                                />
                            </div>
                        </div>
                    </div>
                </CardContent>
            </Card>

            {/* Access Control / Visibility */}
            <Card>
                <CardHeader>
                    <CardTitle>Visibility & Access</CardTitle>
                </CardHeader>
                <CardContent>
                    <div className="space-y-4">
                        <Label>Select which Departments can view this recipe:</Label>
                        {(!globalDepartments || globalDepartments.length === 0) && (
                            <p className="text-sm text-muted-foreground italic">No global departments found. Recipe will be visible to all (or strictly admins).</p>
                        )}
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                            {globalDepartments?.map(dept => (
                                <div key={dept._id} className="flex items-center space-x-2 border p-3 rounded-md bg-muted/20 hover:bg-muted/40 transition-colors">
                                    <Checkbox
                                        id={`dept-${dept._id}`}
                                        checked={formData.accessibleGlobalDepartments?.includes(dept._id)}
                                        onCheckedChange={(checked) => {
                                            const current = formData.accessibleGlobalDepartments || [];
                                            if (checked) {
                                                setFormData({ ...formData, accessibleGlobalDepartments: [...current, dept._id] });
                                            } else {
                                                setFormData({ ...formData, accessibleGlobalDepartments: current.filter((id: string) => id !== dept._id) });
                                            }
                                        }}
                                    />
                                    <Label htmlFor={`dept-${dept._id}`} className="cursor-pointer flex-1 font-medium select-none">
                                        {dept.name}
                                    </Label>
                                </div>
                            ))}
                        </div>
                        <p className="text-[10px] text-muted-foreground">* If no departments are selected, visibility may be restricted to Admins/Owners or open to all depending on strictness settings.</p>
                    </div>
                </CardContent>
            </Card>

            {/* Ingredients */}
            <Card>
                <CardHeader className="flex flex-row items-center justify-between">
                    <CardTitle>Ingredients (for {formData.numberOfDoses} doses)</CardTitle>
                    <Button type="button" variant="outline" size="sm" onClick={addIngredient}>
                        <Plus className="mr-2 h-4 w-4" /> Add Item
                    </Button>
                </CardHeader>
                <CardContent className="space-y-4">
                    {ingredients.map((ing, idx) => (
                        <div key={idx} className="grid grid-cols-12 gap-2 items-end border-b pb-4">
                            <div className="col-span-3 space-y-1">
                                <Label className="text-xs">Ingredient</Label>
                                <Input
                                    value={ing.name}
                                    onChange={e => handleIngredientChange(idx, "name", e.target.value)}
                                    placeholder="Name"
                                />
                            </div>
                            <div className="col-span-2 space-y-1">
                                <Label className="text-xs">Amount</Label>
                                <Input
                                    type="text" inputMode="decimal"
                                    value={ing.amount}
                                    onChange={e => {
                                        const v = cleanDecimalInputLimited(e.target.value, 3);
                                        if (v !== null) handleIngredientChange(idx, "amount", v);
                                    }}
                                    onBlur={() => handleIngredientChange(idx, "amount", formatOnBlur(ing.amount))}
                                    placeholder="0.000"
                                />
                            </div>
                            <div className="col-span-2 space-y-1">
                                <Label className="text-xs">Unit</Label>
                                <Select value={ing.unit} onValueChange={v => handleIngredientChange(idx, "unit", v)}>
                                    <SelectTrigger><SelectValue /></SelectTrigger>
                                    <SelectContent>
                                        {["kg", "g", "l", "ml", "units", "tbsp", "tsp"].map(u => (
                                            <SelectItem key={u} value={u}>{u}</SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                            </div>
                            <div className="col-span-2 space-y-1">
                                <Label className="text-xs">Cost/Unit (€)</Label>
                                <Input
                                    type="text" inputMode="decimal"
                                    value={ing.costPerUnit}
                                    onChange={e => {
                                        const v = cleanDecimalInput(e.target.value);
                                        if (v !== null) handleIngredientChange(idx, "costPerUnit", v);
                                    }}
                                />
                            </div>
                            <div className="col-span-2 space-y-1">
                                <Label className="text-xs">Total (€)</Label>
                                <div className="flex h-9 w-full items-center rounded-md border border-input bg-muted px-3 py-1 text-sm text-muted-foreground font-mono">
                                    {((Number(ing.amount) || 0) * (Number(ing.costPerUnit) || 0)).toFixed(2)}
                                </div>
                            </div>
                            <div className="col-span-1 flex items-center justify-end pt-5">
                                <Button type="button" variant="ghost" size="icon" onClick={() => removeIngredient(idx)}>
                                    <Trash2 className="h-4 w-4 text-destructive" />
                                </Button>
                            </div>
                        </div>
                    ))}

                    <div className="flex justify-end pt-4 font-mono text-sm">
                        Total Material Cost: <span className="font-bold ml-2">{financials.costTotal.toFixed(2)}€</span>
                    </div>
                </CardContent>
            </Card>

            {/* Execution & Storage */}
            <Card>
                <CardHeader>
                    <CardTitle>Execution & Storage</CardTitle>
                </CardHeader>
                <CardContent className="space-y-6">
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        <div className="space-y-2">
                            <Label>Storage Temp / Method</Label>
                            <Input
                                value={formData.storingTemperature}
                                onChange={e => setFormData({ ...formData, storingTemperature: e.target.value })}
                                onBlur={e => setFormData({ ...formData, storingTemperature: formatText(e.target.value) })}
                                placeholder="e.g. Refrigerated at 3°C."
                            />
                        </div>
                        <div className="space-y-2">
                            <Label>Serving (In-House)</Label>
                            <Input
                                value={formData.servingInHouse}
                                onChange={e => setFormData({ ...formData, servingInHouse: e.target.value })}
                                onBlur={e => setFormData({ ...formData, servingInHouse: formatText(e.target.value) })}
                                placeholder="e.g. Deep plate, hot."
                            />
                        </div>
                        <div className="space-y-2">
                            <Label>Serving (Take-Away)</Label>
                            <Input
                                value={formData.servingTakeAway}
                                onChange={e => setFormData({ ...formData, servingTakeAway: e.target.value })}
                                onBlur={e => setFormData({ ...formData, servingTakeAway: formatText(e.target.value) })}
                                placeholder="e.g. Box L."
                            />
                        </div>
                    </div>

                    <Separator />

                    {/* Utensils */}
                    <div className="space-y-4">
                        <div className="flex items-center justify-between">
                            <Label className="text-base font-semibold">Utensils Needed</Label>
                            <Button type="button" variant="outline" size="sm" onClick={() => setCookware([...cookware, ""])}>
                                <Plus className="w-4 h-4 mr-2" /> Add
                            </Button>
                        </div>
                        {cookware.map((item, idx) => (
                            <div key={idx} className="flex gap-2">
                                <Input
                                    value={item}
                                    onChange={e => {
                                        const newC = [...cookware];
                                        newC[idx] = e.target.value;
                                        setCookware(newC);
                                    }}
                                    onBlur={e => {
                                        const newC = [...cookware];
                                        newC[idx] = formatText(e.target.value);
                                        setCookware(newC);
                                    }}
                                    placeholder={`Utensil ${idx + 1}`}
                                />
                                <Button type="button" variant="ghost" size="icon" onClick={() => setCookware(cookware.filter((_, i) => i !== idx))}>
                                    <Trash2 className="w-4 h-4 text-destructive" />
                                </Button>
                            </div>
                        ))}
                    </div>

                    <Separator />

                    {/* Preparation Method */}
                    <div className="space-y-4">
                        <div className="flex items-center justify-between">
                            <Label className="text-base font-semibold">Preparation Method</Label>
                            <Button type="button" variant="outline" size="sm" onClick={() => setInstructions([...instructions, ""])}>
                                <Plus className="w-4 h-4 mr-2" /> Add Step
                            </Button>
                        </div>
                        {instructions.map((step, idx) => (
                            <div key={idx} className="flex gap-2 items-start">
                                <span className="mt-2 text-xs font-bold text-muted-foreground w-6">{idx + 1}.</span>
                                <Textarea
                                    value={step}
                                    onChange={e => {
                                        const newI = [...instructions];
                                        newI[idx] = e.target.value;
                                        setInstructions(newI);
                                    }}
                                    onBlur={e => {
                                        const newI = [...instructions];
                                        newI[idx] = formatText(e.target.value);
                                        setInstructions(newI);
                                    }}
                                    placeholder={`Step ${idx + 1}`}
                                    className="resize-none"
                                />
                                <Button type="button" variant="ghost" size="icon" className="mt-1" onClick={() => setInstructions(instructions.filter((_, i) => i !== idx))}>
                                    <Trash2 className="w-4 h-4 text-destructive" />
                                </Button>
                            </div>
                        ))}
                    </div>
                </CardContent>
            </Card>

            {/* Financial Calculator */}
            <Card>
                <CardHeader className="flex flex-row items-center justify-between">
                    <CardTitle className="flex items-center"><Calculator className="mr-2 h-5 w-5" /> Financial Settings</CardTitle>
                    <div className="flex items-center space-x-2 bg-muted/50 p-2 rounded-lg border">
                        <Label htmlFor="pricing-mode" className="text-sm font-medium cursor-pointer">
                            {pricingMode === 'auto' ? "Target Food Cost Mode" : "Manual Price Mode"}
                        </Label>
                        <Switch
                            id="pricing-mode"
                            checked={pricingMode === 'auto'}
                            onCheckedChange={(c) => setPricingMode(c ? 'auto' : 'manual')}
                        />
                    </div>
                </CardHeader>
                <CardContent className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    <div className="space-y-2">
                        <Label className={pricingMode === 'auto' ? "text-muted-foreground" : "font-semibold"}>Selling Price (Inc. Tax)</Label>
                        <div className="relative">
                            <span className="absolute left-3 top-2.5">€</span>
                            <Input
                                className={`pl-7 ${pricingMode === 'auto' ? "bg-muted text-muted-foreground" : ""}`}
                                type="text" inputMode="decimal"
                                value={formData.pvp}
                                onChange={e => {
                                    const v = cleanDecimalInput(e.target.value);
                                    if (v !== null) setFormData({ ...formData, pvp: v });
                                }}
                                disabled={pricingMode === 'auto'}
                            />
                        </div>
                    </div>
                    <div className="space-y-2">
                        <Label>VAT Rate (%)</Label>
                        <Select
                            value={String(formData.ivaPercent)}
                            onValueChange={v => setFormData({ ...formData, ivaPercent: Number(v) })}
                        >
                            <SelectTrigger>
                                <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="23">23%</SelectItem>
                                <SelectItem value="13">13%</SelectItem>
                                <SelectItem value="6">6%</SelectItem>
                                <SelectItem value="0">0%</SelectItem>
                            </SelectContent>
                        </Select>
                    </div>
                    <div className="space-y-2">
                        <Label className={pricingMode === 'auto' ? "font-semibold text-primary" : "text-muted-foreground"}>Target Food Cost %</Label>
                        <div className="relative">
                            <Input
                                type="text" inputMode="decimal"
                                value={formData.targetFoodCostPercentage}
                                onChange={e => {
                                    const v = cleanDecimalInput(e.target.value);
                                    if (v !== null) setFormData({ ...formData, targetFoodCostPercentage: v });
                                }}
                                className={pricingMode === 'auto' ? "border-primary" : ""}
                            />
                            <span className="absolute right-3 top-2.5 text-muted-foreground">%</span>
                        </div>
                    </div>
                </CardContent>

                <Separator />

                <CardContent className="bg-muted/30 p-6 grid grid-cols-2 md:grid-cols-4 gap-4 text-center">
                    <div>
                        <p className="text-xs text-muted-foreground uppercase">Net Price (Unit)</p>
                        <p className="text-xl font-bold">{financials.pvpSemIva.toFixed(2)}€</p>
                    </div>
                    <div>
                        <p className="text-xs text-muted-foreground uppercase">Cost / Unit (House)</p>
                        <p className="text-xl font-bold">
                            {((financials.costTotal * (Number(formData.portionsInHouse) || 0)) / (Number(formData.yieldAmount) || 1)).toFixed(2)}€
                        </p>
                    </div>
                    <div>
                        <p className="text-xs text-muted-foreground uppercase">Margin / Unit</p>
                        <p className="text-xl font-bold text-emerald-600">
                            {((financials.mb * (Number(formData.portionsInHouse) || 0)) / (Number(formData.yieldAmount) || 1)).toFixed(2)}€
                        </p>
                    </div>
                    <div>
                        <p className="text-xs text-muted-foreground uppercase">Food Cost %</p>
                        <p className={`text-xl font-bold ${financials.theoreticalFoodCost > (Number(formData.targetFoodCostPercentage) || 30) ? "text-red-500" : "text-green-600"}`}>
                            {financials.theoreticalFoodCost.toFixed(1)}%
                        </p>
                    </div>
                </CardContent>

                <Separator />

                {/* Cost Breakdown */}
                <CardContent className="space-y-2 p-6">
                    <h4 className="font-semibold text-sm uppercase text-foreground mb-4">Cost per Serving Analysis</h4>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        <div className="p-4 border rounded-lg bg-background flex flex-col justify-center items-center">
                            <p className="text-xs text-muted-foreground uppercase mb-1">Total Batch Cost</p>
                            <p className="font-bold text-2xl">{financials.costTotal.toFixed(2)}€</p>
                        </div>
                        <div className="p-4 border rounded-lg bg-background flex flex-col justify-center items-center relative overflow-hidden">
                            <div className="absolute top-0 left-0 w-1 h-full bg-blue-500"></div>
                            <p className="text-xs text-muted-foreground uppercase mb-1">In-House Cost</p>
                            <p className="font-bold text-2xl">
                                {((financials.costTotal * (Number(formData.portionsInHouse) || 0)) / (Number(formData.yieldAmount) || 1)).toFixed(2)}€
                            </p>
                            <p className="text-[10px] text-muted-foreground">per portion</p>
                        </div>
                        <div className="p-4 border rounded-lg bg-background flex flex-col justify-center items-center relative overflow-hidden">
                            <div className="absolute top-0 left-0 w-1 h-full bg-orange-500"></div>
                            <p className="text-xs text-muted-foreground uppercase mb-1">Take-Away Cost</p>
                            <p className="font-bold text-2xl">
                                {((financials.costTotal * (Number(formData.portionsTakeAway) || 0)) / (Number(formData.yieldAmount) || 1)).toFixed(2)}€
                            </p>
                            <p className="text-[10px] text-muted-foreground">per portion</p>
                        </div>
                    </div>
                </CardContent>
            </Card>

            {/* Submit Bar */}
            <div className="fixed bottom-0 left-0 right-0 p-4 bg-background border-t flex justify-end gap-4 z-50">
                <Button type="button" variant="outline" onClick={() => router.back()}>Cancel</Button>
                <Button type="submit" disabled={loading} className="w-40">
                    {loading ? "Saving..." : (initialData ? "Update Recipe" : "Create Recipe")}
                </Button>
            </div>

        </form >
    );
}
