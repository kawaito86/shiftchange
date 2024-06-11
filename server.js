const express = require('express');
const path = require('path');
const app = express();
const PORT = process.env.PORT || 3000;

// Middleware to parse JSON bodies
app.use(express.json());

// Serve static files from the "public" directory
app.use(express.static(path.join(__dirname, 'public')));

// In-memory storage for shift requests
let shiftRequests = [];

// Endpoint to handle shift requests
app.post('/shift-request', (req, res) => {
    shiftRequests.push(req.body);
    res.status(201).send();
});

// Endpoint to retrieve all shift requests
app.get('/shift-requests', (req, res) => {
    res.json(shiftRequests);
});

// Endpoint to delete a shift request
app.delete('/shift-request', (req, res) => {
    const { username, date, originalShift, requestedShift } = req.body;
    shiftRequests = shiftRequests.filter(request => 
        request.username !== username || 
        request.date !== date || 
        request.originalShift !== originalShift || 
        request.requestedShift !== requestedShift
    );
    res.status(200).send();
});

// Start the server
app.listen(PORT, () => {
    console.log(`Server is running on http://localhost:${PORT}`);
});
