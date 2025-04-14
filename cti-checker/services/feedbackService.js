const path = require('path');
require('dotenv').config({ path: path.resolve(__dirname, '../../../.env') });
const { MongoClient } = require('mongodb')

MONGO_URL = process.env.MONGO_URL
DB_NAME = process.env.DB_NAME
FEEDBACK_COLLECTION = process.env.FEEDBACK_COLLECTION

async function connectToDb() {
    try{
        const client = new MongoClient(MONGO_URL);
        await client.connect();
        // const client = await MongoClient.connect(MONGO_URL);
        const db = client.db(DB_NAME);
        return { client, db };
    }
    catch (error) {
        console.error('Error in conecting to MongoDB server', error);
    }
  }

//Save feedback
async function saveFeedback(ipAddress, summary, rating, feedback) {
    const { client, db } = await connectToDb();
    try {
      const collection = db.collection(FEEDBACK_COLLECTION)
      const feedbackDoc = {
        ipAddress,
        summary,
        rating,
        feedback: feedback || "",
        timestamp: new Date()
      };
      await collection.insertOne(feedbackDoc);
      
      return { success: true };
    }
    catch (err) {
      console.error("Error saving feedback:", err.message);
      throw new Error("Failed to save feedback.");
    } finally {
      if(client){
        await client.close();
      } 
    }
}


async function getFeedback({ipAddress , type = "latest", limit}) {
  const { client, db } = await connectToDb();
  try {
    const collection = db.collection(FEEDBACK_COLLECTION);

    const query = {};
    if (ipAddress) query.ipAddress = ipAddress;

    let sort = { timestamp: -1 }; // Default: latest
    if (type === "best") sort = { rating: -1 };
    else if (type === "worst") sort = { rating: 1 };

    const feedbacks = await collection.find(query).sort(sort).limit(limit).toArray();
    return feedbacks;

  } catch (err) {
    console.error("Error retrieving feedback:", err.message);
    throw new Error("Failed to fetch feedback from database.");
  } finally {
    if (client) {
      await client.close(); // Close only if a connection was established
    }
  }
}

module.exports = {
    saveFeedback,
    getFeedback
  };