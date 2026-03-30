import { GoogleGenAI } from "@google/genai";

export const handler = async (event, context) => {
  // Ensure it's a POST request
  if (event.httpMethod !== "POST") {
    return {
      statusCode: 405,
      body: JSON.stringify({ error: "Method Not Allowed" }),
    };
  }

  // Security: Check for Netlify Identity user and 'admin' role
  const user = context.clientContext && context.clientContext.user;
  if (!user || !user.app_metadata || !user.app_metadata.roles || !user.app_metadata.roles.includes('admin')) {
    return {
      statusCode: 401,
      body: JSON.stringify({ error: "Unauthorized: Admin role required" }),
    };
  }

  try {
    const { prompt } = JSON.parse(event.body);
    const apiKey = process.env.GEMINI_API_KEY;

    if (!apiKey) {
      return {
        statusCode: 500,
        body: JSON.stringify({ error: "Gemini API key not configured on server" }),
      };
    }

    const ai = new GoogleGenAI({ apiKey });
    // Using gemini-3-flash-preview for fast, efficient responses
    const response = await ai.models.generateContent({
      model: "gemini-3-flash-preview",
      contents: [{ parts: [{ text: prompt }] }],
    });

    return {
      statusCode: 200,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ text: response.text }),
    };
  } catch (error) {
    console.error("Gemini Function Error:", error);
    return {
      statusCode: 500,
      body: JSON.stringify({ error: error.message }),
    };
  }
};
