const path = require('path');
require('dotenv').config({ path: path.resolve(__dirname, '../../../.env') });
const express = require("express")
const dns = require('dns');
const { MongoClient } = require('mongodb')
const { isInSubnet } = require('is-in-subnet');
const { authMiddleware } = require('../services/authMiddleware')
const router = express.Router()

const MONGO_URL = process.env.MONGO_URL;
const DB_NAME = process.env.DB_NAME;

const ipPattern = /^(25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\.(25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\.(25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\.(25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)$/;

const subnetPattern = /^((25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\.){3}(25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\/(3[0-2]|[12]?[0-9])$/;

const domainPattern = /^[a-zA-Z0-9.-]+\.[a-zA-Z]+$/;

function checkIPInSubnets(objects, ip) {
    let responseObjects = []
    for (const doc of objects) {    
        for (const subnet of doc.data){
            if(isInSubnet(ip, subnet)){
                doc.data = subnet
                responseObjects.push(doc)
            }            
        }
    }
    return responseObjects;
}

async function resolveDNS(address) {
    return new Promise((resolve, reject) => {
    dns.lookup(address, (err, ip, family) => {
        if (err) {
        reject(err);
        } else {
        resolve(ip);
        }
    });
    });
}

async function checkIP(client, ip) {
    const db = client.db(DB_NAME);
    const collection = db.collection('dangerousIPs');
    
    let dataResponse = await collection.find({
        "type":"IP", 
        "data": {$elemMatch: {$eq: ip}}
    }).toArray();
    
    for(let obj of dataResponse){
        obj.data = ip
    }
    
    let allSubnets = await collection.find({
        "type":"SUBNET", 
    }).toArray();

    const matchedSubnets = checkIPInSubnets(allSubnets, ip)
    dataResponse = dataResponse.concat(matchedSubnets)
    
    return dataResponse;
}

async function checkSubnet(client, subnet) {
    const db = client.db(DB_NAME);
    const collection = db.collection('dangerousIPs');
    
    let dataResponse = await collection.find({
        "type":"SUBNET", 
        "data": {$elemMatch: {$eq: subnet}}
    }).toArray();
    
    for(let obj of dataResponse){
        obj.data = subnet
    }
    
    return dataResponse;
}

router.get('/ip/:address', async (req, res) => {
    const { address } = req.params;
    if (!ipPattern.test(address)) {
        return res.status(400).json({ error: 'bad input parameter' });
    }
    try {
        const client = new MongoClient(MONGO_URL);
        await client.connect();
        const dataResponse = await checkIP(client, address);
        await client.close();
        res.json(dataResponse);
    } catch (error) {
        console.error('Error:', error);
        res.status(500).json({ error: 'Internal server error', details: error.message });
    }
});

router.get('/subnet/:address', async (req, res) => {
    const { address } = req.params;
    if (!subnetPattern.test(address)) {
        return res.status(400).json({ error: 'bad input parameter' });
    }
    try {
        const client = new MongoClient(MONGO_URL);
        await client.connect();
        const dataResponse = await checkSubnet(client, address);
        await client.close();
        res.json(dataResponse);
    } catch (error) {
        console.error('Error:', error);
        res.status(500).json({ error: 'Internal server error', details: error.message });
    }
});

router.get('/check/:address', async (req, res) => {
    let { address } = req.params;
    let dataResponse = [];
    
    try {
        if(domainPattern.test(address)){
            address = await resolveDNS(address);
        }
        
        const client = new MongoClient(MONGO_URL);
        await client.connect();
        
        if(ipPattern.test(address)) {
            dataResponse = await checkIP(client, address);
        }
        else if(subnetPattern.test(address)) {
            dataResponse = await checkSubnet(client, address);
        }
        else {
            await client.close();
            return res.status(400).json({ error: 'Invalid address format', "Provided": req.params.address });
        }
        
        await client.close();
        res.json(dataResponse)
        
    } catch (error) {
        console.error('Error:', error);
        res.status(400).json({ error: 'Internal server error', details: error.message });
    }
});

router.post('/stix', authMiddleware, async (req, res) => {
    try {
        const bundle = req.body;
        
        if (!bundle || !bundle.type || bundle.type !== 'bundle') {
            return res.status(400).json({ error: 'Invalid STIX bundle format' });
        }
        
        const client = new MongoClient(MONGO_URL);
        await client.connect();
        const db = client.db(DB_NAME);
        const collection = db.collection('stix_bundles');
        
        const bundleData = {
            bundle_id: bundle.id,
            created: new Date(),
            object_count: bundle.objects ? bundle.objects.length : 0,
            objects: bundle.objects || [],
            object_types: {}
        };
        
        if (bundle.objects && Array.isArray(bundle.objects)) {
            for (const obj of bundle.objects) {
                const type = obj.type;
                bundleData.object_types[type] = (bundleData.object_types[type] || 0) + 1;
            }
        }
        
        await collection.insertOne(bundleData);
        await client.close();
        
        res.json({ 
            success: true, 
            message: 'STIX bundle received and stored',
            bundle_id: bundle.id,
            object_count: bundleData.object_count
        });
        
    } catch (error) {
        console.error('Error processing STIX bundle:', error);
        res.status(500).json({ error: 'Failed to process STIX bundle', details: error.message });
    }
});

module.exports = router;
