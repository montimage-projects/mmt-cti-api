const path = require('path');
require('dotenv').config({ path: path.resolve(__dirname, '../../../.env') });

const apiKeys = process.env.ALLOWED_API_KEYS 
    ? process.env.ALLOWED_API_KEYS.split(',').map(k => k.trim()) 
    : [];

function authMiddleware(req, res, next) {
    const providedKey = req.headers['x-api-key'];
    
    if (!providedKey) {
        return res.status(401).json({ error: 'Missing API key. Provide X-API-Key header.' });
    }
    
    if (!apiKeys.includes(providedKey)) {
        return res.status(403).json({ error: 'Invalid API key.' });
    }
    
    next();
}

module.exports = { authMiddleware };
