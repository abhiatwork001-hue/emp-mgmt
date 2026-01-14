
import mongoose from 'mongoose';
import * as fs from 'fs';
import * as path from 'path';
import * as dotenv from 'dotenv';
import { Food, Category, Employee } from '../src/lib/models'; // Adjust path if needed

// Load environment variables from .env.local
dotenv.config({ path: path.resolve(process.cwd(), '.env.local') });
if (!process.env.MONGODB_URI) {
    console.log('.env.local loaded but MONGODB_URI not found, trying .env...');
    dotenv.config({ path: path.resolve(process.cwd(), '.env') });
}

const MONGODB_URI = process.env.MONGODB_URI;

if (!MONGODB_URI) {
    console.error('Please define the MONGODB_URI environment variable inside .env.local or .env');
    process.exit(1);
}

async function seedRecipes() {
    try {
        console.log('Connecting to MongoDB...');
        await mongoose.connect(MONGODB_URI as string);
        console.log('Connected to MongoDB.');

        // Find a system user or admin to assign as creator
        // We'll look for an employee with role 'Admin' or just the first employee found
        let creator = await Employee.findOne({ roles: 'Admin' });
        if (!creator) {
            creator = await Employee.findOne({});
            console.log('No Admin found, using first employee as creator:', creator?.firstName);
        } else {
            console.log('Using Admin as creator:', creator.firstName);
        }

        const recipesDir = path.resolve(process.cwd(), 'extracted_recipes');

        if (!fs.existsSync(recipesDir)) {
            console.error(`Directory not found: ${recipesDir}`);
            process.exit(1);
        }

        const files = fs.readdirSync(recipesDir).filter(file => file.endsWith('.json'));
        console.log(`Found ${files.length} recipe files.`);

        for (const file of files) {
            const filePath = path.join(recipesDir, file);
            const rawData = fs.readFileSync(filePath, 'utf-8');
            const recipeData = JSON.parse(rawData);

            console.log(`Processing: ${recipeData.name} (${file})`);

            // 1. Handle Category
            let categoryId = null;
            if (recipeData.categoryName) {
                let category = await Category.findOne({ name: recipeData.categoryName });
                if (!category) {
                    console.log(`  Creating category: ${recipeData.categoryName}`);
                    category = await Category.create({ name: recipeData.categoryName });
                }
                categoryId = category._id;
            }

            // 2. Prepare Food Data
            // Map extracted fields to Schema fields
            // extracted JSON expirationDays is string "3 Days" in some earlier contexts, but strict JSON has number? 
            // Checking my extracted files, most have number, e.g. "expirationDays": 3.
            // But let's verify if any strings slipped in. My recent edits wrote numbers.
            // Also ensuring strict types.

            const foodDoc = {
                name: recipeData.name,
                name_en: recipeData.name_en,
                slug: recipeData.slug,
                category: categoryId,
                description: recipeData.description,
                description_en: recipeData.description_en,
                heroImg: recipeData.heroImg || '',
                numberOfDoses: recipeData.numberOfDoses || 1,
                yieldAmount: recipeData.yieldAmount || 0,
                yieldUnit: recipeData.yieldUnit || 'Variável',
                expirationDays: typeof recipeData.expirationDays === 'number' ? recipeData.expirationDays : 3, // Default fallback
                storingTemperature: recipeData.storingTemperature || 'N/A',

                ingredients: recipeData.ingredients.map((ing: any) => ({
                    name: ing.name,
                    name_en: ing.name_en,
                    amount: ing.amount,
                    unit: ing.unit,
                    observation: '' // Default empty
                })),

                instructions: recipeData.instructions || [],
                instructions_en: recipeData.instructions_en || [],

                cookware: recipeData.cookware || [],

                isPublished: true,
                isActive: true,
                createdBy: creator?._id
            };

            // 3. Upsert Food
            // We search by slug to update existing or create new
            const result = await Food.findOneAndUpdate(
                { slug: recipeData.slug },
                foodDoc,
                { upsert: true, new: true, setDefaultsOnInsert: true }
            );

            console.log(`  Saved: ${result.name}`);
        }

        console.log('Seeding completed successfully.');
        process.exit(0);

    } catch (error) {
        console.error('Error seeding recipes:', error);
        process.exit(1);
    }
}

seedRecipes();
