const path = require('path');
require('dotenv').config({ path: path.resolve(__dirname, '../../../.env') });
const express = require("express");
const router = express.Router();
const { gatherIpData } = require("../services/abuseService");
const { analyzeWithLLM } = require("../services/llmService");  // Function to analyze data with LLM
const { saveFeedback, getFeedback } = require("../services/feedbackService");

// POST /analysis - Analyze IP address using AbuseIPDB and LLM
router.post("/analysis", async (req, res) => {
  try {
    const { ipAddress, userPrompt } = req.body; // Assuming client sends an IP address in the request body
    if (!ipAddress) {
      return res.status(400).json({ error: "IP address is required." });
    }
    // Fetch data from AbuseIPDB (or other IP-related API)
    const fetchData = await gatherIpData(ipAddress);
    const feedback  = await getFeedback({
      ipAddress: ipAddress || null,
      type: "latest", 
      limit: 1
    });
    // const abuseData       = fetchData.abuseData;
    // const virustotalData  = fetchData.virustotalData;
    // const shodanData      = fetchData.shodanData;
    // const OTXData         = fetchData.OTXData;
    
    // Analyze the IP data with LLM
    const Result = await analyzeWithLLM(ipAddress, fetchData ,userPrompt, feedback);

    // Return the results from both AbuseIPDB and LLM
    res.json({ fetchData, Result });
  } catch (error) {
    console.error("Error analyzing IP address:", error);
    res.status(500).json({ error: "An error occurred while analyzing the IP address." });
  }
});


// Post Feedback
router.post("/analysis/feedback", async (req, res) => {
  try {
    // console.log("Received feedback payload:", req.body)
    const {ipAddress, summary, rating, feedback  } = req.body;
    
    if (!ipAddress || !summary || typeof rating !== 'number') {
      return res.status(400).json({ error: "Missing required fields" });
    }

    const result = await saveFeedback(ipAddress, summary, rating, feedback);
    res.status(201).json({ success: true, insertedId: result.insertedId });
  } catch (err) {
    console.error("Route error (feedback):", err); 
    res.status(500).json({ error: "Failed to save feedback" });
  }
});

// get feedback
router.get("/analysis/getFeedback", async (req, res) => {
  const { ipAddress, type, limit } = req.query;
  try {
    const result = await getFeedback({
      ipAddress: ipAddress || null,
      
      type: type || "latest", 
      limit: parseInt(limit) || 3
    });
    res.json(result);
  } catch (err) {
    res.status(500).json({ error: "Failed to fetch feedback" });
  }
});

module.exports = router;