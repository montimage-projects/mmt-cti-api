const express = require("express");
const router = express.Router();
const ChartJSImage = require('chart.js-image');
const path = require('path');
const axios = require('axios');


function groupDataByInterval(data, intervalType) {
    const groupedData = {};

    data.forEach(entry => {
        const date = new Date(entry.updated);
        const key = groupKey(date, intervalType);

        if (!groupedData[key]) {
            groupedData[key] = [];
        }

        groupedData[key].push(entry);
    });

    return groupedData;
}

function groupKey(date, intervalType) {
    if (intervalType === 'day') {
        return date.toISOString().split('T')[0];
    } else if (intervalType === 'week') {
        const startOfWeek = new Date(date);
        startOfWeek.setDate(date.getDate() - date.getDay());
        return startOfWeek.toISOString().split('T')[0];
    } else if (intervalType === 'month') {
        return date.toISOString().split('-').slice(0, 2).join('-');
    }
}

function processData(data, groupBy = 'day') {
    const x = [];
    const y = [];

    const groupedData = groupDataByInterval(data, groupBy);

    for (const day in groupedData) {
        y.push(groupedData[day].length);
        x.push(day);
    }

    return { x, y };
}

async function buildChart(label, x, y){
    const line_chart = ChartJSImage().chart({
        "type": "line",
        "data": {
            "labels": x,
            "datasets": [
            {
                "fill":false,
                "borderColor": "gray",
                "backgroundColor":"black",
                "label": label,
                "data": y
            },
            ]
        },
        "options": {
            "title": {
            "display": true,
            "text": "Number of attempts over time"
            },
            "scales": {
            "xAxes": [
                {
                "scaleLabel": {
                    "display": true,
                    "labelString": "Days"
                }
                }
            ],
            "yAxes": [
                {
                "stacked": true,
                "scaleLabel": {
                    "display": true,
                    "labelString": "N° Connections"
                }
                }
            ]
            }
        }
        })
        .backgroundColor('transparent')
        .width(500) // 500px
        .height(300); // 300px
        
    const relativeImagePath = '../imgs/chart.png';
    const absoluteImagePath = path.resolve(__dirname, relativeImagePath);
    
    await line_chart.toFile(absoluteImagePath) // Promise<()>

    return absoluteImagePath
}


router.get("/chart/address/:ADDRESS", async (req, res) => {
    const { ADDRESS } = req.params;
    const { GROUPBY } = req.query;

    
    // Regular Expression to check IP IPv4 format
    const ipPattern = /^(25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\.(25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\.(25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\.(25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)$/;
    
    // Regular Expression to check SUBNET format
    const subnetPattern = /^((25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\.){3}(25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\/(3[0-2]|[12]?[0-9])$/;
    
    // Regular expression for domains
    const domainPattern = /^[a-zA-Z0-9.-]+\.[a-zA-Z]+$/;
    
    if(ipPattern.test(ADDRESS) || subnetPattern.test(ADDRESS) || domainPattern.test(ADDRESS)){
        
        const addressCheckerResponse = await axios.get(`http://127.0.0.1:4000/check/${ADDRESS}`)
        
        try {
            const data = addressCheckerResponse.data
            
            const processedData = processData(data, GROUPBY)
            
            const absoluteImagePath = await buildChart(ADDRESS, processedData.x, processedData.y)
            
            console.log(absoluteImagePath);
            res.sendFile(absoluteImagePath);
    
        } catch (error) {
            res.status(400).json({"Internal server error": error})
        }

    }
    else{
        res.status(400).json({ error: 'bad input parameter', "Returned address": ADDRESS });
    }

});

// Adicione uma nova rota para obter apenas o caminho da imagem
router.get("/chartPath/address/:ADDRESS", async (req, res) => {
    const { ADDRESS } = req.params;
    const { GROUPBY } = req.query;

    
    // Regular Expression to check IP IPv4 format
    const ipPattern = /^(25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\.(25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\.(25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\.(25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)$/;
    
    // Regular Expression to check SUBNET format
    const subnetPattern = /^((25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\.){3}(25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\/(3[0-2]|[12]?[0-9])$/;
    
    // Regular expression for domains
    const domainPattern = /^[a-zA-Z0-9.-]+\.[a-zA-Z]+$/;
    
    if(ipPattern.test(ADDRESS) || subnetPattern.test(ADDRESS) || domainPattern.test(ADDRESS)){
        
        const addressCheckerResponse = await axios.get(`http://127.0.0.1:4000/check/${ADDRESS}`)
        
        try {
            const data = addressCheckerResponse.data;
            const processedData = processData(data, GROUPBY);
            var imagePath = await buildChart(ADDRESS, processedData.x, processedData.y);
            imagePath = '/imgs/' + path.basename(imagePath)
            res.json({ imagePath });
        
        } catch (error) {
            res.status(400).json({ "Internal server error": error });
        }

    }
    else{
        res.status(400).json({ error: 'bad input parameter', "Returned address": ADDRESS });
    }
});

router.get("/chart/credential/:CREDENTIAL", async (req, res) => {
    const { CREDENTIAL } = req.params;
    const { GROUPBY } = req.query;
        
    try {
        const passwordResponse = await axios.get(`http://127.0.0.1:4000/password/${CREDENTIAL}`)
        const usernameResponse = await axios.get(`http://127.0.0.1:4000/username/${CREDENTIAL}`)
        
        
        const data = passwordResponse.data.concat(usernameResponse.data)
        
        const processedData = processData(data, GROUPBY)
        
        const absoluteImagePath = await buildChart(CREDENTIAL, processedData.x, processedData.y)
        
        res.sendFile(absoluteImagePath);

    } catch (error) {
        res.status(400).json({"Internal server error": error})
    }



});

module.exports = router;
