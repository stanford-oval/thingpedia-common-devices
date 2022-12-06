import {BaseDevice, Value} from "thingpedia";

import generatedRecipes from "./generated_recipe.json";
export const AllRecipes = generatedRecipes;

//{
//    "recipes": [
//    {
//      "id": "recipe_1023",
//      "name": "fried shrimp",
//      "ingredients": [
//        "ingredient_1001",
//        "ingredient_1002",
//        "ingredient_1003"
//      ],
//      "instructions": [
//        "instruction_1001",
//        "instruction_1002",
//        "instruction_1003"
//      ]
//    },
//    ],
//    "ingredients": [
//      {
//        "id": "ingredient_1001",
//        "ingredient": "shrimp",
//        "quantity": "1",
//        "unit": "count"
//      },
//      {
//        "id": "ingredient_1002",
//        "ingredient": "salt",
//        "quantity": "1",
//        "unit": "tsp"
//      }
//    ],
//    "instructions": [
//      {
//        "id": "instruction_1001",
//        "instruction": "fry shrimp in the pan",
//        "recipe": "recipe_1023",
//        "index": 1,
//        "cook_method": "fry"
//      }
//    ]


export default class CookingAgentSkill extends BaseDevice {
    static instructionIndex = 0;
    static currentRecipe = null;

    constructor(engine, state) {
        super(engine, state);
        this.uniqueId = 'org.agent.cooking';
        this.name = "Cooking Recipe Helper";
        this.description = "A cooking recipe helper";
        console.log("CookingAgent created");
    }

    async get_recipe(params, hints, env) {
        let recipes = generatedRecipes.recipes;
        const newRecipes = [];
        for (let recipe of recipes) {
            const newRecipe = {
                id: new Value.Entity(recipe.id, recipe.id),
                ingredients: recipe.ingredients.map((ingredientId) => new Value.Entity(ingredientId, ingredientId)),
                instructions: recipe.instructions.map((instructionId) => new Value.Entity(instructionId, instructionId))
            };
            newRecipes.push(newRecipe);
        }
        return newRecipes;
    }

    async get_ingredient(params, hints, env) {
        let ingredients = generatedRecipes.ingredients;
        const newIngredients = [];
        for (let ingredient of ingredients) {
            const newIngredient = {
                id: new Value.Entity(ingredient.id, ingredient.ingredient),
                quantity: String(ingredient.quantity),
                unit: String(ingredient.unit)
            };
            newIngredients.push(newIngredient);
        }
        return newIngredients;
    }

    async get_instruction(params, hints, env) {
        const recipe = generatedRecipes.recipes.filter((item) => {
            return item.name.toLowerCase() === params.recipe.display.toLowerCase();
        })[0];
        const instructions = generatedRecipes.instructions.filter((item) => {
            return (item.index === params.index) && (item.recipe === recipe.id);
        });
        const newInstructions = [];
        for (let instruction of instructions) {
            const ingredientId = 'ingredient_' + instruction.id.split('_')[1];
            const ingredient = generatedRecipes.ingredients.filter((item) => item.id === ingredientId)[0];
            const newInstruction = {
                id: new Value.Entity(instruction.id, instruction.instruction),
                cook_method: instruction.cook_method,
                ingredient: new Value.Entity(ingredient.ingredient, ingredient.ingredient)
            }
            newInstructions.push(newInstruction);
        }
        return newInstructions;
    }

    async get_unit_conversion(params, hints, env) {
        const ingredient = params.ingredient;
        const ingredient_amount = ingredient.quantity;
        const ingredient_unit = ingredient.unit;
        const unit = params.unit;
        // liquid units: ml, L, tsp, tbsp, cup, pint, quart, gallon
        const liquid_units = ['ml', 'L', 'tsp', 'tbsp', 'cup', 'pint', 'quart', 'gallon'];
        const liquid_base_conversion = {
            'ml': 1,
            'L': 1000,
            'tsp': 5,
            'tbsp': 15,
            'cup': 240,
            'pint': 480,
            'quart': 960,
            'gallon': 3840
        }
        // temperature units: C, F, K
        const temperature_units = ['C', 'F', 'K'];
        const temperature_base_conversion = {
            'C': [273.15, 1],
            'F': [255.372, 1.8],
            'K': [0, 1]
        }
        // time units: s, min, h, d, week, month, year
        const time_units = ['s', 'min', 'h', 'd', 'week', 'month', 'year'];
        const time_base_conversion = {
            's': 1,
            'min': 60,
            'h': 3600,
            'd': 86400,
            'week': 604800,
            'month': 2592000,
            'year': 31536000
        }
        // mass units: g, kg, oz, lb, cup, pint, quart, gallon
        const mass_units = ['g', 'kg', 'oz', 'lb', 'cup', 'pint', 'quart', 'gallon'];
        const mass_base_conversion = {
            'g': 1,
            'kg': 1000,
            'oz': 28.3495,
            'lb': 453.592,
            'cup': 240,
            'pint': 480,
            'quart': 960,
            'gallon': 3840
        }

        let target_amount = "";
        if (liquid_units.includes(ingredient_unit) && liquid_units.includes(unit)) {
            // convert liquid units
            let target_amount_num =
                ingredient_amount * liquid_base_conversion[ingredient_unit] / liquid_base_conversion[unit];
            target_amount = target_amount_num.toString();
        } else if (temperature_units.includes(ingredient_unit) && temperature_units.includes(unit)) {
            // convert temperature units
            let target_amount_num =
                ingredient_amount * temperature_base_conversion[ingredient_unit][1] + temperature_base_conversion[ingredient_unit][0];
            target_amount_num =
                (target_amount_num - temperature_base_conversion[unit][0]) / temperature_base_conversion[unit][1];
            target_amount = target_amount_num.toString();
        } else if (time_units.includes(ingredient_unit) && time_units.includes(unit)) {
            // convert time units
            let target_amount_num =
                ingredient_amount * time_base_conversion[ingredient_unit] / time_base_conversion[unit];
            target_amount = target_amount_num.toString();
        } else if (mass_units.includes(ingredient_unit) && mass_units.includes(unit)) {
            // convert mass units
            let target_amount_num =
                ingredient_amount * mass_base_conversion[ingredient_unit] / mass_base_conversion[unit];
            target_amount = target_amount_num.toString();
        } else {
            return {
                converted_quantity: "0",
                unit: "unknown",
                ingredient: ingredient
            }
        }
        return {
            converted_quantity: target_amount,
            unit: unit,
            ingredient: ingredient
        }
    }
    
    async do_next_step() {
        const recipe = CookingAgentSkill.currentRecipe;
        CookingAgentSkill.instructionIndex++;
        if (CookingAgentSkill.instructionIndex >= recipe.length) {
            CookingAgentSkill.instructionIndex = recipe.length;
        }
        const step = recipe[CookingAgentSkill.instructionIndex];
        return {
            step: step
        };
    }

    async do_previous_step() {
        const recipe = CookingAgentSkill.currentRecipe;
        CookingAgentSkill.instructionIndex--;
        if (CookingAgentSkill.instructionIndex < 0) {
            CookingAgentSkill.instructionIndex = 0;
            return {
                step: "You are at the beginning of the recipe."
            }
        } else {
            const step = recipe[CookingAgentSkill.instructionIndex];
            return {
                step: step
            };
        }
    }
}