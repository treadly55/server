// --- 1. Get Your Tools ---
const express = require('express');
const fetch = require('node-fetch');
const cors = require('cors');
const fs = require('fs').promises;
const path = require('path');
const { google } = require('googleapis');

const app = express();
const PORT = process.env.PORT || 3000;

// --- 2. Set Up Middleware ---
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(express.static('public'));

// --- 3. Google Sheets Authentication (Safer Version) ---
// We'll set up the clients, but we'll add error checking.
let googleAuthClient;
let SPREADSHEET_ID;

try {
  // Check if the Environment Variables exist
  if (!process.env.GOOGLE_CREDENTIALS) {
    throw new Error('GOOGLE_CREDENTIALS environment variable is not set.');
  }
  if (!process.env.SPREADSHEET_ID) {
    throw new Error('SPREADSHEET_ID environment variable is not set.');
  }

  // Parse the credentials
  const credentials = JSON.parse(process.env.GOOGLE_CREDENTIALS);

  // Set up the Auth client
  googleAuthClient = new google.auth.GoogleAuth({
    credentials,
    scopes: ['https://www.googleapis.com/auth/spreadsheets'],
  });

  // Get the Sheet ID
  SPREADSHEET_ID = process.env.SPREADSHEET_ID;

  console.log('Google Auth and Spreadsheet ID loaded successfully.');

} catch (error) {
  // If auth fails, the server will still run, but Sheets will be disabled.
  console.error('!!! FATAL GOOGLE AUTH ERROR !!!', error.message);
  console.error('This is likely an error in your Environment Variables. Server will run, but Google Sheets saving will be disabled.');
}

// --- 4. Define Your Server's Jobs (Endpoints) ---

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
 * JOB #3: "Form Data Receiver" (NEW ROBUST VERSION)
 */
app.post('/submit-form', (req, res) => {
  console.log('--- Form data received! ---');
  
  // 1. Log to console (Core Task)
  console.log(req.body); 

  // 2. SEND RESPONSE IMMEDIATELY
  // This is the fix. It unsticks your form.
  res.status(200).send('Form data received. Processing in background.');

  // 3. Run background tasks *after* responding
  // We don't use 'await' here because we've already sent the response.
  saveData(req.body);
});

// This is a new helper function to do the saving
async function saveData(data) {
  const { customer_name, customer_email } = data;
  const dataToStore = `${new Date().toISOString()}: ${JSON.stringify(data)}\n`;

  // --- Task A: Save to .txt file ---
  try {
    const filePath = path.join(__dirname, 'public', 'submissions.txt');
    await fs.mkdir(path.join(__dirname, 'public'), { recursive: true });
    await fs.appendFile(filePath, dataToStore);
    console.log('Data saved to submissions.txt');
  } catch (error) {
    console.error('Error saving to .txt file:', error.message);
  }

  // --- Task B: Save to Google Sheets ---
  // Check if Google Auth was successful on startup
  if (!googleAuthClient || !SPREADSHEET_ID) {
    console.error('Google Sheets saving skipped. Auth is not configured correctly.');
    return;
  }

  try {
    const sheets = google.sheets({ version: 'v4', auth: googleAuthClient });
    const newRow = [
      new Date().toISOString(),
      customer_name,
      customer_email
    ];

    await sheets.spreadsheets.values.append({
      spreadsheetId: SPREADSHEET_ID,
      range: 'Sheet1!A:C', // Assumes 'Sheet1'. Change if your tab name is different.
      valueInputOption: 'USER_ENTERED',
      resource: {
        values: [newRow],
      },
    });
    console.log('Data saved to Google Sheet successfully!');
  } catch (error) {
    console.error('Error saving to Google Sheet:', error.message);
  }
}


// --- 5. Start The Server ---
app.listen(PORT, () => {
  console.log(`Server is listening on port ${PORT}`);
});

