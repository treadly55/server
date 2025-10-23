// --- 1. Get Your Tools ---
const express = require('express');
const fetch = require('node-fetch');
const cors = require('cors');
const fs = require('fs').promises; // <-- NEW: The File System module
const path = require('path');     // <-- NEW: Helps build file paths

const app = express();
const PORT = process.env.PORT || 3000;

// --- 2. Set Up Middleware ---
app.use(cors());
app.use(express.json()); // <-- This already handles the JSON!
app.use(express.urlencoded({ extended: true }));

// --- NEW: Make the 'public' folder accessible ---
// This lets anyone view files inside it, like our .txt file
app.use(express.static('public'));

// --- 3. Define Your Server's Jobs (Endpoints) ---

/**
 * JOB #1: "Are you live?" check.
 */
app.get('/', (req, res) => {
  res.send('Server is live and running. Ready for tasks.');
});

/**
 * JOB #2: "Ping Website" task.
 */
app.get('/run-ping-job', async (req, res) => {
  const websiteToPing = 'https://hf-object-detect-three.onrender.com';
  
  console.log('--- Ping job started ---');
  try {
    await fetch(websiteToPing);
    console.log(`Successfully pinged ${websiteToPing}`);
    res.status(200).send('Ping successful!');
  } catch (error) {
    console.error(`Failed to ping ${websiteToPing}:`, error.message);
    res.status(500).send('Ping failed.');
  }
});

/**
 * JOB #3: "Form Data Receiver" (Now with file writing!)
 * We make this 'async' to wait for the file to be written
 */
app.post('/submit-form', async (req, res) => {
  console.log('--- Form data received! ---');
  
  // 1. Log to console (as before)
  console.log(req.body); 

  // 2. Prepare data for the text file
  // We'll stringify the JSON and add a timestamp and a newline
  const submission = JSON.stringify(req.body);
  const dataToStore = `${new Date().toISOString()}: ${submission}\n`;

  // 3. Store data in a .txt file
  try {
    // Define the path to our file
    const filePath = path.join(__dirname, 'public', 'submissions.txt');
    
    // Ensure the 'public' directory exists
    // (This is good practice)
    await fs.mkdir(path.join(__dirname, 'public'), { recursive: true });
    
    // Append the new data to the file
    await fs.appendFile(filePath, dataToStore);
    
    console.log('Data saved to submissions.txt');
    
    // 4. Send "thank you"
    res.status(200).send('Form data received and saved!');

  } catch (error) {
    console.error('Error saving file:', error);
    res.status(500).send('Form data received but could not be saved.');
  }
});


// --- 4. Start The Server ---
app.listen(PORT, () => {
  console.log(`Server is listening on port ${PORT}`);
});