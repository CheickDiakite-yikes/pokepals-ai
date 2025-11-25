
import { GoogleGenAI, Type } from "@google/genai";
import { PokemonStats, ImageSize } from "../types";

// Helper to check if the AI Studio Key Selection is available and needed
export const checkAndRequestApiKey = async (): Promise<boolean> => {
    if (typeof window !== 'undefined' && (window as any).aistudio) {
        const aistudio = (window as any).aistudio;
        const hasKey = await aistudio.hasSelectedApiKey();
        if (!hasKey) {
            await aistudio.openSelectKey();
            return true;
        }
        return true;
    }
    return true;
};

const getAiClient = () => {
    return new GoogleGenAI({ apiKey: process.env.API_KEY });
};

/**
 * Step 1: Analyze the photo and invent the character's Stats/Name/Moves.
 * We do this FIRST so we can pass the text to the image generator.
 */
export const generateCardStats = async (originalImageBase64: string): Promise<PokemonStats> => {
    try {
        const ai = getAiClient();
        
        const prompt = `
        You are the 'Rarity Algorithm' for a Trading Card Game. 
        Your job is to analyze this photo and create a unique, creative trading card.

        ## STEP 1: SCENE ANALYSIS (do this silently)
        Observe and note:
        - What colors dominate? (warm/cool/neutral/vibrant)
        - What is the person's expression/energy? (happy/fierce/calm/mysterious/playful)
        - What are they wearing? (casual/sporty/formal/colorful/dark)
        - What's in the background? (indoor/outdoor/nature/urban/decorated)
        - Any props, pets, or special elements?
        - What's the overall mood/vibe?

        ## STEP 2: SCORING (0-1000 Points)
        
        **Environment (0-400pts)**: 
        - 0-50: Plain wall, basic room
        - 51-100: Nice interior, office, car
        - 101-200: Restaurant, mall, gym, local park
        - 201-300: Beach, mountain, city skyline, stadium
        - 301-400: WORLD WONDERS (Pyramids, Eiffel Tower, Grand Canyon, etc.)
        
        **Subject/Attire (0-300pts)**: 
        - 0-50: Basic casual clothes
        - 51-100: Nice outfit
        - 101-200: Stylish fashion, sports uniform, business attire
        - 201-300: Formal wear, costume, cosplay
        
        **Vibe/Lighting (0-200pts)**: 
        - 0-50: Standard lighting
        - 51-100: Good natural light, interesting angle
        - 101-150: Golden hour, neon, professional
        - 151-200: Cinematic, artistic effects
        
        **Extras (0-100pts)**: +25 each for pets, props, friends, action shots

        **Rarity**: EXOTIC (850+), LEGENDARY (650-849), RARE (350-649), COMMON (0-349)

        ## STEP 3: TYPE SELECTION (be creative!)
        
        Available types: Fire, Water, Electric, Nature, Fighting, Steel, Dragon, Cosmic, Psychic, Ghost
        
        Choose based on YOUR creative interpretation of the image. Consider:
        - Clothing colors (red→Fire, blue→Water, yellow→Electric, green→Nature)
        - Expression (fierce→Fire/Fighting, calm→Water, playful→Electric, confident→Dragon)
        - Setting (outdoors→Nature, urban→Steel/Electric, mystical→Cosmic)
        - Props/context (sports gear→Fighting, tech→Electric, nature→Nature)
        - Overall energy and personality vibes
        
        Be surprising and varied! Every image has multiple valid interpretations - pick what feels most FUN.

        ## STEP 4: WEAKNESS
        Pick a logical counter-type (e.g., Fire→Water, Electric→Nature, Fighting→Psychic, Steel→Fire, Dragon→Ice, Water→Electric)

        ## STEP 5: CREATE THE CARD
        - Invent a creative creature Name based on the photo's energy
        - Create 2 Moves (1 status/buff, 1 attack with damage)
        - Write a fun Pokedex description referencing specific details you observed
        - Include a brief justification for your type choice in the description

        Think through your analysis, then output ONLY the final JSON.
        `;

        const response = await ai.models.generateContent({
            model: 'gemini-2.5-flash',
            contents: {
                parts: [
                    { text: prompt },
                    {
                        inlineData: {
                            mimeType: 'image/jpeg',
                            data: originalImageBase64.split(',')[1]
                        }
                    }
                ]
            },
            config: {
                responseMimeType: "application/json",
                responseSchema: {
                    type: Type.OBJECT,
                    properties: {
                        name: { type: Type.STRING },
                        type: { type: Type.STRING },
                        hp: { type: Type.INTEGER },
                        attack: { type: Type.INTEGER },
                        defense: { type: Type.INTEGER },
                        description: { type: Type.STRING },
                        moves: { type: Type.ARRAY, items: { type: Type.STRING } },
                        weakness: { type: Type.STRING },
                        rarity: { type: Type.STRING, enum: ["Common", "Rare", "Legendary", "Exotic"] },
                        score: { type: Type.INTEGER }
                    },
                    required: ["name", "type", "hp", "attack", "defense", "description", "moves", "weakness", "rarity", "score"]
                }
            }
        });

        const text = response.text;
        if (!text) throw new Error("No text response from AI");
        const stats = JSON.parse(text) as PokemonStats;
        console.log("[GeminiService] Generated stats:", JSON.stringify(stats, null, 2));
        return stats;

    } catch (error: any) {
        console.error("Error generating stats:", error);
        console.error("Error details:", error.message, error.response?.data || error.details);
        return {
            name: "Glitchmon",
            type: "Digital",
            hp: 404,
            attack: 0,
            defense: 0,
            description: "An error occurred during scanning. This creature is missingno.",
            moves: ["Reboot", "Crash"],
            weakness: "Bugs",
            rarity: "Common",
            score: 0
        };
    }
};

/**
 * Step 2: Generate the Front of the card.
 * The AI MUST render the text (Name, HP, Moves) onto the image itself.
 */
export const generateCardFront = async (
    base64Image: string, 
    stats: PokemonStats,
    size: ImageSize
): Promise<string | null> => {
    try {
        const ai = getAiClient();
        const modelName = 'gemini-3-pro-image-preview';

        const prompt = `
        Create a FULL TRADING CARD DESIGN (Front Side).
        
        INPUT CONTEXT:
        - Source Image: Use this person's pose and clothes to create a stylized 3D creature.
        - Creature Name: "${stats.name}"
        - HP: "${stats.hp}"
        - Element: "${stats.type}"
        - Rarity: "${stats.rarity}"
        - Move 1: "${stats.moves[0]}"
        - Move 2: "${stats.moves[1]}" (Damage: ${stats.attack})

        DESIGN INSTRUCTIONS:
        1. **LAYOUT**: Create a professional trading card frame. 
           - Top Header: Display Name and HP clearly.
           - Center: The 3D Creature art.
           - Bottom Panel: Display the Moves and text.
        
        2. **ART STYLE**: 
           - High-quality 3D Game Asset / Toy style (like Amiibo or Skylander).
           - Do NOT use a real human face. Use a stylized creature/mascot face (animalistic or robotic).
           - **The border/frame must strictly match the '${stats.type}' theme** (e.g., if Fire, use magma borders; if Digital, use neon circuits).
           - If Rarity is LEGENDARY or EXOTIC, make the card frame look golden, holographic, or incredibly ornate.

        3. **TEXT RENDERING**: 
           - You MUST legibly write "${stats.name}" and "${stats.hp} HP" at the top of the card.
           - You MUST legibly write the move names at the bottom.
        
        Output the FINAL COMPOSITE CARD IMAGE.
        `;

        const response = await ai.models.generateContent({
            model: modelName,
            contents: {
                parts: [
                    { text: prompt },
                    {
                        inlineData: {
                            mimeType: 'image/jpeg',
                            data: base64Image.split(',')[1]
                        }
                    }
                ]
            },
            config: {
                imageConfig: {
                    imageSize: size,
                    aspectRatio: "3:4" 
                }
            }
        });

        for (const part of response.candidates?.[0]?.content?.parts || []) {
            if (part.inlineData) {
                return `data:image/png;base64,${part.inlineData.data}`;
            }
        }
        return null;

    } catch (error: any) {
        console.error("Error generating card front:", error);
        console.error("Error details:", error.message, error.response?.data || error.details);
        throw error;
    }
};

/**
 * Step 3: Generate the Back of the card.
 * The AI renders the description and lore text onto the back design.
 */
export const generateCardBack = async (
    stats: PokemonStats
): Promise<string | null> => {
    try {
        const ai = getAiClient();
        const modelName = 'gemini-3-pro-image-preview';

        const prompt = `
        Design the BACK SIDE of a Trading Card for "${stats.name}".
        
        TEXT TO INCLUDE (Legible Typography):
        - Description: "${stats.description}"
        - Type: "${stats.type}"
        - Weakness: "${stats.weakness}"
        
        VISUAL THEME:
        - Style: ${stats.type}-themed artifact.
        - If 'Digital': A high-tech datapad screen showing stats.
        - If 'Nature': An ancient stone tablet with vines.
        - If 'Fire': A burnt scroll or obsidian slab.
        - General: Glossy, high-end collectible finish.

        Ensure the Description text is readable in the center of the design.
        `;

        const response = await ai.models.generateContent({
            model: modelName,
            contents: {
                parts: [{ text: prompt }]
            },
            config: {
                imageConfig: {
                    imageSize: '1K',
                    aspectRatio: "3:4"
                }
            }
        });

        for (const part of response.candidates?.[0]?.content?.parts || []) {
            if (part.inlineData) {
                return `data:image/png;base64,${part.inlineData.data}`;
            }
        }
        return null;
    } catch (error: any) {
        console.error("Error generating card back:", error);
        console.error("Error details:", error.message, error.response?.data || error.details);
        return null; 
    }
};
