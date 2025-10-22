const express = require('express');
const fetch = require('node-fetch');

const app = express();
const PORT = process.env.PORT || 3000;

// Job 1: Check if the server is live
app.get('/', (req, res) => {
  res.send('Server is live and running.');
});

// Job 2: The ping task
app.get('/run-ping-job', async (req, res) => {
  // !!! REPLACE THIS with the website you want to ping !!!
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

// Start the server
app.listen(PORT, () => {
  console.log(`Server is listening on port ${PORT}`);
});