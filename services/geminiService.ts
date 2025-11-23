
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
        Analyze this photo and assign a Rarity based on a strict 100-POINT SCORING RUBRIC.

        SCORING RUBRIC (0-100 Points):
        1. **Environment (0-30pts)**: 
           - 0pts: Plain wall/indoors. 
           - 15pts: Outdoor/Street. 
           - 30pts: Epic Landscape, Landmark, or Space.
        2. **Subject (0-30pts)**: 
           - 0pts: Casual clothes. 
           - 15pts: Stylish outfit/Accessories. 
           - 30pts: Costume, Uniform, or Formal Wear.
        3. **Vibe/Lighting (0-20pts)**: 
           - 0pts: Standard lighting. 
           - 20pts: Neon, Dramatic shadows, Golden Hour, or Filters.
        4. **Extras (0-20pts)**: 
           - +10pts per extra feature: Pets, Props (instruments, sports gear), or Group shot.

        RARITY THRESHOLDS (Based on Total Score):
        - **EXOTIC** (Score 96-100): "Glitch in the matrix", Cosplay, or Surreal Art vibes.
        - **LEGENDARY** (Score 86-95): Epic scenery, Wedding/Prom, or highly dramatic action.
        - **RARE** (Score 60-85): Cool street fashion, pets included, or expressive emotion.
        - **COMMON** (Score 0-59): Everyday selfies, Zoom calls, or relaxation.

        TASK:
        - Calculate the score internally.
        - Assign the strictly corresponding Rarity.
        - Invent a creature Name based on the visual vibe.
        - Assign an elemental Type (Fire, Water, Digital, Nature, Cosmic, Fighting, Psychic, Ghost).
        - Create 2 Moves (1 Status move, 1 Attack move).
        - Write a Pokedex description referencing the photo's context.

        Return ONLY JSON.
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
                        rarity: { type: Type.STRING, enum: ["Common", "Rare", "Legendary", "Exotic"] }
                    },
                    required: ["name", "type", "hp", "attack", "defense", "description", "moves", "weakness", "rarity"]
                }
            }
        });

        const text = response.text;
        if (!text) throw new Error("No text response from AI");
        return JSON.parse(text) as PokemonStats;

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
            rarity: "Common"
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
