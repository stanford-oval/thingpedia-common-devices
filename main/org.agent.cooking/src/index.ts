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
        if (hints && hints.filter) {
            for (let [pname, op, value] of hints.filter) {
                if (pname === 'name') {
                    if (op === '==') {
                        recipes = recipes.filter((r) => r.name === value);
                    } else if (op === '=~') {
                        recipes = recipes.filter((r) => r.name.toLowerCase().match(value.toLowerCase()));
                    }
                } else if (pname === 'ingredients') {
                    // not sure how to do this, it's a subquery
                } else if (pname === 'instructions') {
                    // not sure how to do this, it's a subquery
                } else {
                    throw new Error('Unsupported filter on recipe');
                }
            }
        }
        // replace all instructions in the recipe with the actual instruction
        // for (let recipe of recipes) {
        //     recipe.instructions =
        //         recipe.instructions.map((instructionId) => new Value.Entity(instructionId, instructionId));
        // }
        const newRecipes = [];
        for (let recipe of recipes) {
            const newRecipe = {
                id: recipe.id,
                name: recipe.name,
                ingredients: recipe.ingredients.map((ingredientId) => new Value.Entity(ingredientId, ingredientId)),
                instructions: recipe.instructions.map((instructionId) => new Value.Entity(instructionId, instructionId))
            };
            newRecipes.push(newRecipe);
        }
        return newRecipes
    }

    async get_ingredient(params, hints, env) {
        let ingredients = generatedRecipes.ingredients;
        if (hints && hints.filter) {
            for (let [pname, op, value] of hints.filter) {
                if (pname === 'ingredient') {
                    if (op === '==') {
                        ingredients = ingredients.filter((r) => r.ingredient === value);
                    } else if (op === '=~') {
                        ingredients = ingredients.filter((r) => r.ingredient.toLowerCase().match(value.toLowerCase()));
                    }
                } else if (pname === 'quantity') {
                    if (op === '==') {
                        ingredients = ingredients.filter((r) => r.quantity === value);
                    } else if (op === '=~') {
                        ingredients = ingredients.filter((r) => r.quantity.toLowerCase().match(value.toLowerCase()));
                    }
                } else if (pname === 'unit') {
                    if (op === '==') {
                        ingredients = ingredients.filter((r) => r.unit === value);
                    } else if (op === '=~') {
                        ingredients = ingredients.filter((r) => r.unit.toLowerCase().match(value.toLowerCase()));
                    }
                } else {
                    throw new Error('Unsupported filter on ingredient');
                }
            }
        }
        return ingredients
    }

    async get_instruction(params, hints, env) {
        let instructions = generatedRecipes.instructions;
        if (hints && hints.filter) {
            for (let [pname, op, value] of hints.filter) {
                if (pname === 'instruction') {
                    if (op === '==') {
                        instructions = instructions.filter((r) => r.instruction === value);
                    } else if (op === '=~') {
                        instructions = instructions.filter((r) => r.instruction.toLowerCase().match(value.toLowerCase()));
                    }
                } else if (pname === 'cook_method') {
                    if (op === '==') {
                        instructions = instructions.filter((r) => r.cook_method === value);
                    } else if (op === '=~') {
                        instructions = instructions.filter((r) => r.cook_method.toLowerCase().match(value.toLowerCase()));
                    }
                } else {
                    throw new Error('Unsupported filter on instruction');
                }
            }
        }
        return instructions
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
    
    async do_current_step() {
        const recipe = CookingAgentSkill.currentRecipe;
        const step = recipe[CookingAgentSkill.instructionIndex];
        return {
            step: step
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