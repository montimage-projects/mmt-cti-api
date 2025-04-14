const path = require('path');
require('dotenv').config({ path: path.resolve(__dirname, '../../../.env') });
const axios = require("axios");
const { MongoClient } = require('mongodb')

const ABUSE_API_KEY = process.env.ABUSE_API_KEY;
const SHODAN_API_KEY = process.env.SHODAN_API_KEY;
const VIRUSTOTAL_API_KEY = process.env.VIRUSTOTAL_API_KEY;
const OTX_API_KEY = process.env.OTX_API_KEY;

const ABUSE_API_BASE_URL = process.env.ABUSE_API_BASE_URL;
const VIRUSTOTAL_API_URL =  process.env.VIRUSTOTAL_API_URL;


const MONGO_URL = process.env.MONGO_URL
const DB_NAME = process.env.DB_NAME
const FETCHDATA_COLLECTION = process.env.FETCHDATA_COLLECTION

async function fetchAbuseData(ipAddress) {
  try {
    const response = await axios.get(ABUSE_API_BASE_URL, {
      headers: {
        Key: ABUSE_API_KEY,
        Accept: "application/json",
      },
      params: { ipAddress },
    });

    return response.data.data;
  } catch (error) {
    console.error(`Error fetching data from Abuse IPDB for ${ipAddress}:`, error.message);
    throw new Error("Failed to fetch data from Abuse IPDB.");
  }
}
// Function to fetch data from VirusTotal
async function fetchVirustotal(ipAddress) {
  try {
    const response = await axios.get(`${VIRUSTOTAL_API_URL}${ipAddress}`, {
      headers: {
        'x-apikey': VIRUSTOTAL_API_KEY,
      },
    });

    return response.data.data;
  } catch (error) {
    console.error(`Error fetching data from VirusTotal for ${ipAddress}:`, error.message);
    throw new Error("Failed to fetch data from VirusTotal.");
  }
}
async function fetchShodanData(ipAddress) {
  try {
    const SHODAN_API_URL = `https://api.shodan.io/shodan/host/${ipAddress}?key=${SHODAN_API_KEY}`;
    const response = await axios.get(SHODAN_API_URL);
    return response.data;
  } catch (error) {
    console.error("Error fetching Shodan data:", error.message);
    throw new Error("Failed to fetch Shodan data.");
  }
}
// Fetch OTX Data (Example)
async function fetchOTXData(ipAddress) {
  const OTX_API_URL = `https://otx.alienvault.com/api/v1/indicators/IPv4/${ipAddress}/general`;
  try {
    const response = await axios.get(OTX_API_URL, {
      headers: {
        'X-OTX-API-KEY': OTX_API_KEY
      }
    });
    return response.data;
  } catch (error) {
    console.error("Error fetching OTX data:", error.message);
    throw new Error("Failed to fetch OTX data.");
  }
}

// Save IP details to the database
async function saveFetchData(details, ip) {
  const client = new MongoClient(MONGO_URL);
  try{
    await client.connect();
    const db = client.db(DB_NAME);
    const collection = db.collection(FETCHDATA_COLLECTION);
    await collection.insertOne({
       ipAddress: ip ,
      $set: details ,
      timestamp : new Date()}
    );
  }
  catch(error){
    console.error(`Error saving IP details for ${ip}:`, error.message);
    throw new Error('Failed to save IP details.');
  } finally {
    await client.close();
  }
}

// Retrieve IP details from the database
// async function getIPDetails(ip) {
//   const client = new MongoClient(MONGO_URL);
//   try{
//     await client.connect();
//     const db = client.db(DB_NAME);
//     const collection = db.collection(FETCHDATA_COLLECTION);
  
//     return await collection.findOne({ ipAddress: ip });
//   }catch(error){
//     console.error(`Error retrieving IP details for ${ip}:`, error.message);
//     throw new Error('Failed to retrieve IP details.');
//   } finally {
//     await client.close();
//   }
// }

// Gather data for an IP address
async function gatherIpData(ipAddress) {
  try {
    const results = {};


    try {
      results.abuseData = await fetchAbuseData(ipAddress);
    } catch (error) {
      results.abuseData = { error: error.message };
    }
    try {
      results.virustotalData = await fetchVirustotal(ipAddress);
    } catch (error) {
      results.virustotalData = { error: error.message };
    }
    try {
      results.shodanData = await fetchShodanData(ipAddress);
    } catch (error) {
      results.shodanData = { error: error.message };
    }
    try {
      results.OTXData = await fetchOTXData(ipAddress);
    } catch (error) {
      results.OTXData = { error: error.message };
    }
    await saveFetchData(results,ipAddress);
    return results;
  } catch (error) {
    console.error(`Error gathering or updating data for IP ${ipAddress}:`, error.message);
    throw new Error('Failed to gather or update IP data.');
  }
}
module.exports = { gatherIpData };
