const path = require('path');
require('dotenv').config({ path: path.resolve(__dirname, '../../../.env') });

const axios = require("axios");

const LLM_API_URL = process.env.LLM_API_URL;
async function analyzeWithLlama(ipAddress, ipData, userPrompt,feedback) {

  try{
    const response = await axios.post(LLM_API_URL, {
      ipAddress:ipAddress ,
      ipData:ipData,
      prompt: userPrompt,
      feedback:feedback,
    });

    return response.data.summary;  // Assuming the LLM API responds with a 'summary'
  } catch (error) {
    console.error("Error calling LLM API:", error);
    throw new Error("Failed to analyze with LLM.");
  }
}

module.exports = { analyzeWithLLM };
