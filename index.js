// Import necessary modules
const express = require('express');
const axios = require('axios');
const cron = require('cron');
const fs = require('fs');
const path = require('path');

// Initialize the Express app
const app = express();
app.set('view engine', 'ejs');
app.use(express.static('public'));

// Global variable to store mods data
let modsData = [];

// Ensure necessary directories exist
const directories = ['public/data', 'public/analytics', 'public/logos', 'public/analytics-chart'];

directories.forEach(dir => {
    const dirPath = path.join(__dirname, dir);
    if (!fs.existsSync(dirPath)) {
        fs.mkdirSync(dirPath, { recursive: true });
    }
});

// Utility function to save mod details to a JSON file
function saveModData(mod) {
    const modFilePath = path.join(__dirname, 'public/data', `${mod.id}.json`);
    const modData = {
        id: mod.id,
        name: mod.versions[0].name, // Assuming we want the name of the latest version
        developers: mod.developers.map(dev => dev.display_name),
        description: mod.versions[0].description, // Assuming we want the description of the latest version
        version: mod.versions[0].version,
        downloads: mod.download_count, // Total downloads for the mod
    };
    fs.writeFileSync(modFilePath, JSON.stringify(modData, null, 2));
    console.log(`Saved data for mod: ${mod.id}`);
}

// Utility function to log download counts in INI format
function logModAnalytics(mod) {
    const analyticsFilePath = path.join(__dirname, 'public/analytics', `${mod.id}.ini`);
    const timestamp = new Date().toISOString();
    const logEntry = `[${timestamp}]\ndownloads=${mod.download_count}\n\n`;

    fs.appendFileSync(analyticsFilePath, logEntry);
    console.log(`Logged downloads for mod: ${mod.id}`);
}

// Utility function to save mod logos
async function saveModLogo(mod) {
    try {
        const logoResponse = await axios.get(`https://api.geode-sdk.org/v1/mods/${mod.id}/logo`, { responseType: 'arraybuffer' });
        const logoFilePath = path.join(__dirname, 'public/logos', `${mod.id}.png`);
        fs.writeFileSync(logoFilePath, logoResponse.data);
        console.log(`Saved logo for mod: ${mod.id}`);
    } catch (error) {
        console.error(`Error saving logo for mod ${mod.id}:`, error.message);
    }
}

// Function to gather the list of mods from the Geode Index API and save them
async function fetchMods() {
    try {
        console.log("Fetching mods from Geode Index API...");

        let page = 1;
        const perPage = 100; // Fetch 100 mods at a time
        let totalModsFetched = 0;
        let totalMods = 0;
        let modsFetched = [];

        do {
            // Request to fetch mods
            const response = await axios.get('https://api.geode-sdk.org/v1/mods', {
                params: {
                    gd: 2.206,
                    geode: '3.4.0',
                    page: page,
                    per_page: perPage,
                    platforms: 'android64',
                    sort: 'downloads'
                }
            });

            // If first page, get the total mods count
            if (page === 1) {
                totalMods = response.data.payload.count;
                console.log(`Total mods available: ${totalMods}`);
            }

            // Log the response to check the data structure
            console.log(`Fetching page ${page}: ${response.data.payload.data.length} mods fetched.`);

            // Check if the data is structured as expected
            if (response.data.payload && Array.isArray(response.data.payload.data)) {
                modsFetched = response.data.payload.data;
                modsData.push(...modsFetched);
                totalModsFetched += modsFetched.length;
            } else {
                console.error("Unexpected response structure. Could not find mods array.");
                return;
            }

            // Save and log mods data
            modsFetched.forEach(mod => {
                saveModData(mod);
                saveModLogo(mod);
            });

            // Move to the next page
            page++;

        } while (totalModsFetched < totalMods);

        console.log(`Total number of mods fetched: ${totalModsFetched}`);
        console.log("All mod data fetched and saved.");
    } catch (error) {
        console.error("Error fetching mods:", error.message);
    }
}

// Function to log download counts
async function logDownloadCounts() {
    modsData.forEach(mod => logModAnalytics(mod));
    console.log('Download counts logged.');
}

// Function to update mod logos
async function updateModLogos() {
    try {
        for (const mod of modsData) {
            await saveModLogo(mod);
        }
        console.log('Mod logos updated.');
    } catch (error) {
        console.error("Error updating mod logos:", error.message);
    }
}

// Fetch mods data immediately at startup
fetchMods();

// Set up cron jobs for logging and updating logos
const logCronJob = new cron.CronJob('*/5 * * * *', async () => {
    await logDownloadCounts();
});

const updateLogosCronJob = new cron.CronJob('0 * * * *', async () => {
    await updateModLogos();
});

// Start cron jobs
logCronJob.start();
updateLogosCronJob.start();

// Serve the homepage
app.get('/', (req, res) => {
    res.render('index', { modsData: modsData || [] });
});

// Serve the mod list API for search functionality
app.get('/api/mods', (req, res) => {
    const query = req.query.q?.toLowerCase() || '';
    const filteredMods = modsData.filter(mod => mod.versions[0].name.toLowerCase().includes(query));
    res.json(filteredMods);
});

// Serve the detailed view of a mod
app.get('/mod/:id', (req, res) => {
    const modId = req.params.id;
    const mod = modsData.find(mod => mod.id === modId);

    if (!mod) {
        return res.status(404).send('Mod not found');
    }

    res.render('modDetail', { mod });
});

// Start the server
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
    console.log(`Server is running on port ${PORT}`);
});