import { GoogleGenAI } from "@google/genai";

export const translateMessage = async (
  text: string,
  sourceMBTI: string, // e.g., 'ENFP'
  targetMBTI: string, // e.g., 'INTJ'
): Promise<string> => {
  const apiKey = "AIzaSyDhsBu1C4OJCKeHFPYI9Bt5BCNVsCG-IuQ" || process.env.API_KEY;

  if (!apiKey) {
    return "Error: API Key is missing.";
  }

  try {
    const ai = new GoogleGenAI({ apiKey });
    const modelId = "gemini-2.5-flash";

    const systemInstruction = `
      You are an expert verbal translator between MBTI personality types.
      
      Task: Translate the following message from a ${sourceMBTI} personality to a ${targetMBTI} personality in a funny way.
      
      Origin Context (${sourceMBTI}): Understand the emotional intent, energy, and communication style of the source.
      Target Context (${targetMBTI}): Rewrite the message so it resonates with the target's cognitive functions, vocabulary, and preferred communication style, while keeping the original meaning.

      Example: 
      Source (ENFP): "OMG I just had the wildest idea!!! We should totally go skydiving tomorrow!"
      Target (INTJ): "I have proposed a high-adrenaline activity for tomorrow: skydiving. It appears to be a stimulating disruption to the routine."

      Return ONLY the translated text. Do not add quotes or explanations.
    `;

    const response = await ai.models.generateContent({
      model: modelId,
      contents: text,
      config: {
        systemInstruction: systemInstruction,
        temperature: 0.8,
      }
    });

    return response.text || "Could not generate translation.";
  } catch (error) {
    console.error("Gemini translation error:", error);
    return "Translation failed due to an API error.";
  }
};