import { GoogleGenAI, Type } from "@google/genai";
import { Exercise } from '../types';

const getAiClient = () => {
  // Safe access to process.env.API_KEY for browser environments
  const apiKey = (typeof process !== 'undefined' && process.env && process.env.API_KEY) || ''; 
  if (!apiKey) {
    console.warn("API Key not found in process.env");
    return null;
  }
  return new GoogleGenAI({ apiKey });
};

export const getAlternativeExercise = async (
  currentExercise: Exercise,
  unavailableEquipment: string,
  userGoal: string = "Hypertrophy"
): Promise<{ alternativeName: string; reason: string; suggestedWeightModifier: number } | null> => {
  const ai = getAiClient();
  if (!ai) return null;

  try {
    const prompt = `
      I am at the gym. My planned exercise is "${currentExercise.name}" (${currentExercise.equipment}).
      However, the "${unavailableEquipment}" is occupied or unavailable.
      Suggest ONE best alternative exercise that targets the same muscles (${currentExercise.muscleGroup}).
      Consider my goal: ${userGoal}.
      
      Also provide a weight modifier (e.g., 0.8 if the new exercise is harder/isolation, 1.0 if similar, 1.2 if easier).
    `;

    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: prompt,
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            alternativeName: { type: Type.STRING },
            reason: { type: Type.STRING },
            suggestedWeightModifier: { type: Type.NUMBER, description: "Multiplier for weight, e.g. 0.9" }
          },
          required: ["alternativeName", "reason", "suggestedWeightModifier"]
        }
      }
    });

    const text = response.text;
    if (!text) return null;
    return JSON.parse(text);

  } catch (error) {
    console.error("Gemini API Error:", error);
    return null;
  }
};