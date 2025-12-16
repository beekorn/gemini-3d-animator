import { GoogleGenAI } from "@google/genai";
import { AnimationType, AnimationResponse } from '../types.ts';

// Initialize the new SDK client
const getClient = (apiKey: string) => new GoogleGenAI({ apiKey });

export const generateAnimationConfig = async (apiKey: string, prompt: string): Promise<AnimationResponse> => {
  const client = getClient(apiKey);
  
  const systemInstruction = `
    You are an expert 3D Animation Assistant. 
    Your goal is to interpret natural language user requests for how a 3D model should move.
    The available animation types are: spin, float, pulse, wobble, shake, orbit, static.
    Return the configuration that best matches the user's intent.
    Output JSON format: { "animation": "spin", "speed": 1.0, "intensity": 1.0, "axis": "y", "reasoning": "..." }
  `;

  try {
    const response = await client.models.generateContent({
      model: 'gemini-2.5-flash',
      config: { responseMimeType: "application/json" },
      contents: [
        { role: 'user', parts: [{ text: systemInstruction + "\nUser Request: " + prompt }] }
      ]
    });

    const text = response.candidates?.[0]?.content?.parts?.[0]?.text;
    if (!text) throw new Error("No response from Gemini");
    return JSON.parse(text) as AnimationResponse;
  } catch (error) {
    console.error("Gemini API Error (Animation Config):", error);
    throw error;
  }
};

export const generateCharacterImage = async (apiKey: string, userPrompt: string, referenceImageBase64?: string): Promise<string> => {
  const client = getClient(apiKey);

  const enhancedPrompt = `
    Create a Full Body 3D Character Concept for: ${userPrompt}.
    CRITICAL REQUIREMENTS:
    1. Front View ONLY.
    2. Standing in a symmetrical A-POSE or T-POSE (arms slightly out).
    3. Legs straight, feet forward.
    4. Solid white background (#FFFFFF).
    5. Even, flat lighting (no heavy shadows).
    6. High detail texture, photorealistic or stylized as requested.
    7. No cropped limbs (must show full head to toe).
  `;

  try {
    const parts: any[] = [];
    if (referenceImageBase64) {
      const cleanBase64 = referenceImageBase64.replace(/^data:image\/(png|jpeg|jpg|webp);base64,/, "");
      parts.push({ inlineData: { mimeType: 'image/png', data: cleanBase64 } });
    }
    parts.push({ text: enhancedPrompt });

    const response = await client.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: [{ role: 'user', parts: parts }]
    });

    // Check for image in response candidates (if model supports direct image output)
    const responseParts = response.candidates?.[0]?.content?.parts;
    let base64Image: string | undefined;
    
    if (responseParts) {
      for (const part of responseParts) {
        if (part.inlineData && part.inlineData.data) {
          base64Image = part.inlineData.data;
          break;
        }
      }
    }

    if (!base64Image) {
        // Fallback: If the model is text-only, it won't generate an image.
        const text = response.candidates?.[0]?.content?.parts?.[0]?.text;
        if (text) {
             console.warn("Model returned text instead of image:", text);
             throw new Error("The selected Gemini model returned text instead of an image. Please ensure you are using a multimodal generation model or check API capabilities.");
        }
        throw new Error("No image generated. Ensure your API key has access to image generation models.");
    }

    return `data:image/png;base64,${base64Image}`;
  } catch (error) {
    console.error("Gemini Image Gen Error:", error);
    throw error;
  }
};

export const generateTexture = async (apiKey: string, baseTextureBase64: string, prompt: string, styleRefBase64?: string): Promise<string> => {
  const client = getClient(apiKey);

  const systemPrompt = `
    You are an expert 3D Texture Artist.
    Your task is to REPAINT the provided Texture Map (UV Atlas) to match the User's Request.
    CRITICAL RULES:
    1. The input image is a flattened UV MAP, not a 3D view. 
    2. You MUST PRESERVE the exact layout, islands, and silhouette of the input map. 
    3. Do NOT move or resize the UV islands. Paint *inside* the existing shapes.
    4. IGNORE the colors in the input map; treat it as a greyscale layout guide only.
    5. Output must be a flat texture image.
    User Request: "${prompt}"
  `;

  try {
    const cleanCurrent = baseTextureBase64.replace(/^data:image\/(png|jpeg|jpg|webp);base64,/, "");
    const parts: any[] = [
        { inlineData: { mimeType: 'image/png', data: cleanCurrent } },
        { text: "Base UV Map (Layout Only - Ignore Colors)" }
    ];

    if (styleRefBase64) {
       const cleanRef = styleRefBase64.replace(/^data:image\/(png|jpeg|jpg|webp);base64,/, "");
       parts.push({ inlineData: { mimeType: 'image/png', data: cleanRef } });
       parts.push({ text: "Style Reference" });
    }

    parts.push({ text: systemPrompt });
    
    const response = await client.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: [{ role: 'user', parts: parts }]
    });

    let base64Image: string | undefined;
    const responseParts = response.candidates?.[0]?.content?.parts;
    if (responseParts) {
      for (const part of responseParts) {
        if (part.inlineData && part.inlineData.data) {
          base64Image = part.inlineData.data;
          break;
        }
      }
    }

    if (!base64Image) throw new Error("Model returned no image data.");
    return `data:image/png;base64,${base64Image}`;

  } catch (error: any) {
    console.error("Gemini Texture Gen Error Details:", error);
    throw error;
  }
};
