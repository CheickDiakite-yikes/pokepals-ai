
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
        Analyze this photo and assign a Rarity based on a strict 1000-POINT SCORING RUBRIC.

        SCORING RUBRIC (0-1000 Points Total):
        
        1. **Environment (0-400pts)**: 
           - 0-50pts: Plain wall, bathroom, basic room
           - 51-100pts: Nice home interior, office, car
           - 101-200pts: Restaurant, mall, gym, local park
           - 201-300pts: Beach, mountain trail, city skyline, stadium
           - 301-400pts: WORLD WONDERS (Pyramids, Eiffel Tower, Grand Canyon, Northern Lights, Machu Picchu, etc.)
        
        2. **Subject/Attire (0-300pts)**: 
           - 0-50pts: Pajamas, basic casual clothes
           - 51-100pts: Nice casual outfit
           - 101-200pts: Stylish fashion, sports uniform, business attire
           - 201-300pts: Formal wear, wedding attire, elaborate costume, cosplay, cultural dress
        
        3. **Vibe/Lighting/Composition (0-200pts)**: 
           - 0-50pts: Standard phone selfie lighting
           - 51-100pts: Good natural lighting, interesting angle
           - 101-150pts: Golden hour, neon lights, professional quality
           - 151-200pts: Dramatic shadows, cinematic composition, artistic effects
        
        4. **Extras & Special Factors (0-100pts)**: 
           - +25pts: Pet in photo
           - +25pts: Interesting prop (instrument, sports gear, artwork)
           - +25pts: Group of friends
           - +25pts: Action shot (jumping, dancing, sports)

        RARITY THRESHOLDS:
        - **EXOTIC** (Score 850-1000): Bucket-list locations, once-in-a-lifetime moments
        - **LEGENDARY** (Score 650-849): Amazing locations, special events, incredible style
        - **RARE** (Score 350-649): Good locations, nice outfits, effort shown
        - **COMMON** (Score 0-349): Everyday moments, casual settings

        TYPE SELECTION - Choose based on the PERSON'S ENERGY, not just lighting:
        IMPORTANT: DO NOT default to Ghost or Psychic! Consider ALL types equally.
        
        - **Electric**: Phone selfies, tech vibes, bright personality, energetic expressions, modern/urban
        - **Fire**: Passionate poses, warm colors, red clothing, confident energy, intense expressions
        - **Water**: Relaxed/chill vibes, blue clothing, calm expressions, poolside, bathroom selfies
        - **Fighting**: Strong poses, athletic wear, gym photos, competitive spirit, flexing
        - **Nature**: Green clothing, plants visible, outdoor settings, peaceful vibes
        - **Steel**: Sleek style, metallic accessories, professional look, structured poses
        - **Dragon**: Power poses, majestic confidence, bold fashion, commanding presence
        - **Cosmic**: Dreamy expressions, starry/sparkly elements, mystical aesthetic
        - **Psychic**: ONLY for truly mysterious/artistic photos with unusual angles or mind-bending effects
        - **Ghost**: ONLY for actual Halloween costumes, spooky makeup, or genuinely eerie settings
        
        For normal indoor selfies: prefer Electric, Fire, Water, or Fighting based on the person's expression!

        WEAKNESS - Must match type logically:
        - Fire → Water | Water → Electric | Electric → Nature
        - Nature → Fire | Cosmic → Steel | Fighting → Psychic
        - Psychic → Fighting | Ghost → Dark | Steel → Fire | Dragon → Ice

        TASK:
        1. Calculate the TOTAL SCORE (0-1000) based on the rubric above
        2. Assign Rarity based on score thresholds
        3. Choose Type based on the image's dominant vibe (BE CREATIVE - don't default to Psychic!)
        4. Set Weakness based on the type matchup chart above
        5. Invent a unique creature Name that fits the photo's energy
        6. Create 2 Moves (1 status/buff move, 1 attack move with damage)
        7. Write a fun Pokedex description referencing specific details from the photo

        Return ONLY JSON with the calculated score included.
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
