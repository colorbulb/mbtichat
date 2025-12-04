import { GoogleGenAI } from "@google/genai";
import { ChatMessage, User } from "../types";

const apiKey = "AIzaSyDhsBu1C4OJCKeHFPYI9Bt5BCNVsCG-IuQ" || process.env.API_KEY;

export const translateMessage = async (
  text: string,
  sourceMBTI: string, // e.g., 'ENFP'
  targetMBTI: string, // e.g., 'INTJ'
): Promise<string> => {
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

/**
 * Super translate - translates with context from previous 20 messages
 */
export const superTranslateMessage = async (
  messages: ChatMessage[],
  currentMessageIndex: number,
  sourceMBTI: string,
  targetMBTI: string
): Promise<string> => {
  if (!apiKey) {
    return "Error: API Key is missing.";
  }

  try {
    const ai = new GoogleGenAI({ apiKey });
    const modelId = "gemini-2.5-flash";

    // Get previous 20 messages (or as many as available)
    const startIndex = Math.max(0, currentMessageIndex - 20);
    const contextMessages = messages.slice(startIndex, currentMessageIndex + 1);
    const currentMessage = messages[currentMessageIndex];

    const contextText = contextMessages
      .map((msg, idx) => {
        const sender = idx === contextMessages.length - 1 ? 'Current' : (msg.senderId === currentMessage.senderId ? 'Same sender' : 'Other');
        // Only include text messages in context, skip images/stickers
        if (msg.imageUrl || msg.stickerUrl) {
          return `[${sender}]: [Non-text message]`;
        }
        return `[${sender}]: ${msg.text || ''}`;
      })
      .filter(line => line && !line.endsWith(': ')) // Remove empty lines
      .join('\n');

    const systemInstruction = `
      You are an expert verbal translator between MBTI personality types with full conversation context.
      
      Task: Translate the CURRENT message (the last one in the context) from a ${sourceMBTI} personality to a ${targetMBTI} personality, considering the full conversation context.
      
      Context: You have access to the previous 20 messages in this conversation. Use this context to understand the conversation flow, tone, and meaning.
      
      Origin Context (${sourceMBTI}): Understand the emotional intent, energy, and communication style of the source.
      Target Context (${targetMBTI}): Rewrite the CURRENT message so it resonates with the target's cognitive functions, vocabulary, and preferred communication style, while keeping the original meaning AND maintaining conversation flow.

      Return ONLY the translated text of the CURRENT message. Do not add quotes or explanations.
    `;

    const prompt = `Conversation Context:\n${contextText}\n\nTranslate the CURRENT message:`;

    console.log('🔍 [Gemini] Super translate prompt:', prompt);
    console.log('🔍 [Gemini] Context messages count:', contextMessages.length);
    console.log('🔍 [Gemini] Current message:', currentMessage.text);

    const response = await ai.models.generateContent({
      model: modelId,
      contents: prompt,
      config: {
        systemInstruction: systemInstruction,
        temperature: 0.8,
      }
    });

    console.log('🔍 [Gemini] Super translate raw response:', response);
    console.log('🔍 [Gemini] Super translate response.text:', response.text);
    console.log('🔍 [Gemini] Super translate response type:', typeof response.text);

    const translation = response.text || "Could not generate translation.";
    
    // Clean up the translation - remove any [image] or [Image] markers that might have been returned
    const cleanedTranslation = translation.replace(/\[image\]/gi, '').trim();
    
    console.log('🔍 [Gemini] Super translate cleaned translation:', cleanedTranslation);
    
    return cleanedTranslation || translation;
  } catch (error) {
    console.error("❌ [Gemini] Super translation error:", error);
    return "Translation failed due to an API error.";
  }
};

/**
 * Get AI suggestions based on user's profile
 */
export const getAISuggestions = async (
  currentUser: User,
  partnerUser: User
): Promise<string> => {
  if (!apiKey) {
    return "Error: API Key is missing.";
  }

  try {
    const ai = new GoogleGenAI({ apiKey });
    const modelId = "gemini-2.5-flash";

    const systemInstruction = `
      You are a dating and relationship expert AI assistant. Based on two users' profiles, provide helpful suggestions for conversation topics, activities, or relationship advice.
      
      Be friendly, helpful, and specific. Provide 3-5 concrete suggestions.
    `;

    const prompt = `
      User 1 (${currentUser.username}):
      - MBTI: ${currentUser.mbti}
      - Age: ${currentUser.age}
      - Gender: ${currentUser.gender}
      - Hobbies: ${currentUser.hobbies?.join(', ') || 'None listed'}
      - Red Flags: ${currentUser.redFlags?.join(', ') || 'None listed'}
      - Bio: ${currentUser.bio || 'No bio'}
      
      User 2 (${partnerUser.username}):
      - MBTI: ${partnerUser.mbti}
      - Age: ${partnerUser.age}
      - Gender: ${partnerUser.gender}
      - Hobbies: ${partnerUser.hobbies?.join(', ') || 'None listed'}
      - Red Flags: ${partnerUser.redFlags?.join(', ') || 'None listed'}
      - Bio: ${partnerUser.bio || 'No bio'}
      
      Based on their MBTI types, hobbies, red flags, and profiles, provide helpful suggestions for:
      1. Conversation topics they might enjoy
      2. Activities they could do together
      3. Things to be aware of based on their red flags
      4. How their MBTI types might interact
      
      Format as a friendly, helpful response with specific suggestions.
    `;

    const response = await ai.models.generateContent({
      model: modelId,
      contents: prompt,
      config: {
        systemInstruction: systemInstruction,
        temperature: 0.9,
      }
    });

    return response.text || "Could not generate suggestions.";
  } catch (error) {
    console.error("Gemini AI suggestions error:", error);
    return "Failed to generate suggestions due to an API error.";
  }
};