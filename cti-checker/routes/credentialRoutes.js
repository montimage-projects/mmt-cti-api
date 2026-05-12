const path = require('path');
require('dotenv').config({ path: path.resolve(__dirname, '../../../.env') });
const express = require("express")
const { MongoClient } = require('mongodb')
const router = express.Router()

const MONGO_URL = process.env.MONGO_URL;
const DB_NAME = process.env.DB_NAME;

//defining route to check if a password has been used by a bot in the honeyPot
router.get('/password/:password', async (req, res) => {
    const { password } = req.params;
    let dataResponse;

    try {
        
        //opening connections
        const client = new MongoClient(MONGO_URL);
        await client.connect();
        const db = client.db(DB_NAME);
        const collection = db.collection('weakCredentials');
        
        //searcing for password
        dataResponse = await collection.find({
            "source": "Montimage Credentials HoneyPot",
            "credentials.passwords": password
            }).toArray()

        for(let obj of dataResponse){
            obj.credentials.passwords = [password, " ... "]
            obj.credentials.usernames = "..."
        }
        
        // Closing Conection
        await client.close();
        


    } catch (error) {
        console.error('Error in conecting to MongoDB server', error);
    }

    res.json(dataResponse)

})


//defining route to check if a password has been used by a bot in the honeyPot
router.get('/username/:username', async (req, res) => {
    const { username } = req.params;
    let dataResponse;
    try {
        
        //opening connections
        const client = new MongoClient(MONGO_URL);
        await client.connect();
        const db = client.db(DB_NAME);
        const collection = db.collection('weakCredentials');
        
        //searcing for password
        dataResponse = await collection.find({
            "source": "Montimage Credentials HoneyPot",
            "credentials.usernames": username
            }).toArray()

        for(let obj of dataResponse){
            obj.credentials.passwords = " ... "
            obj.credentials.usernames = [username, " ... "]
        }
        
        // Closing Conection
        await client.close();
        


    } catch (error) {
        console.error('Error in conecting to MongoDB server', error);
    }

    res.json(dataResponse)

})


module.exports = router;
