const express = require('express');
const { google } = require('googleapis');
const xml = require('xml');
const fs = require('fs').promises;
const path = require('path');
require('dotenv').config();
const process = require('process');
const { authenticate } = require('@google-cloud/local-auth');
const os = require('os');
const child_process = require('child_process')

const app = express();
const PORT = process.env.PORT || 6005;

const SCOPES = ['https://www.googleapis.com/auth/contacts.readonly', 'https://www.googleapis.com/auth/userinfo.profile', 'https://www.googleapis.com/auth/userinfo.email'];

const TOKEN_PATH = path.join(process.cwd(), 'token.json');
const CREDENTIALS_PATH = path.join(process.cwd(), 'credentials.json');

// Get local IP address
const networkInterfaces = os.networkInterfaces();
const connections = Object.keys(networkInterfaces);
let ip = [];
connections.forEach((connection) => {
    networkInterfaces[connection].forEach((network) => {
        if (network.family === 'IPv4' && !network.internal) {
            ip.push(network.address);
        }
    });
});
ip = ip[0];

/**
 * Loads client secrets from a local file.
 * @returns {Promise<google.auth.OAuth2>} An authorized OAuth2 client
 * @async
 * 
 * This function will load the credentials from the credentials file
 * It will then authorize the client with the credentials
 * It will then return the client
 */
async function loadSavedCredentialsIfExist() {
    try {
        const content = await fs.readFile(TOKEN_PATH);
        const credentials = JSON.parse(content);
        return google.auth.fromJSON(credentials);
    } catch (err) {
        console.error(err, 'No saved credentials found');
        return null;
    }
}

/**
 * Save credentials to a file
 * @param {object} client An authorized OAuth2 client
 * Saves the credentials to a file
 */
async function saveCredentials(client) {
    const content = await fs.readFile(CREDENTIALS_PATH);
    const keys = JSON.parse(content);
    const key = keys.installed || keys.web;
    const payload = JSON.stringify({
        type: 'authorized_user',
        client_id: key.client_id,
        client_secret: key.client_secret,
        refresh_token: client.credentials.refresh_token,
    });
    await fs.writeFile(TOKEN_PATH, payload);
}

/**
 * Create an OAuth2 client with the given credentials
 * @returns {Promise<google.auth.OAuth2>} An authorized OAuth2 client
 * @async
 * 
 * This function will authenticate the client with the given credentials
 * It will then return the client
 * If there are no saved credentials, it will authenticate the client with the given credentials
 * It will then save the credentials
 * It will then return the client
 */
async function authorize() {
    let client = await loadSavedCredentialsIfExist();
    if (client) {
        return client;
    }
    client = await authenticate({
        scopes: SCOPES,
        keyfilePath: CREDENTIALS_PATH
    });
    if (client.credentials) {
        await saveCredentials(client);
    }
    return client;
}

/**
 * Fetch contacts from Google People API
 * @param {string} auth your google auth object
 * @param {string} pageToken page token for pagination
 * @returns  {Promise<Array>} A promise that resolves to an array of contacts
 * @async
 * 
 * This function will fetch contacts from the Google People API
 * It will fetch the contacts recursively if there are more than 1000 contacts
 * It will then return the contacts
 * If there are no contacts, it will return an empty array
 * If there is an error, it will return an empty array
 */
async function fetchGoogleContacts(auth, pageToken = '') {
    const contacts = [];
    const service = google.people({ version: 'v1', auth });
    const res = await service.people.connections.list({
        resourceName: 'people/me',
        personFields: 'names,phoneNumbers',
        pageSize: 1000,
        pageToken: pageToken,
    });
    contacts.push(...res.data.connections);
    if (res.data.nextPageToken) {
        contacts.push(...await fetchGoogleContacts(auth, res.data.nextPageToken));
    }
    return contacts || [];
}

// Transform contacts to XML format
/**
 * Transform contacts to XML format
 * @param {Array} contacts array of google contacts
 * @returns {string} XML string
 * 
 * This function will transform the contacts to XML format
 * It will sort the contacts by name
 * It will then return the XML string
 * If there are no contacts, it will return an empty XML string
 */
function transformContactsToXML(contacts) {

    let phonebook = contacts.map(contact => {
        if (!contact.names || !contact.phoneNumbers) return;
        const name = contact.names?.[0]?.displayName || 'Unknown';
        const numbers = [];
        for (let i = 0; i < contact.phoneNumbers?.length; i++) {
            let phone = contact.phoneNumbers[i].value?.replace(/\D/g, '');
            if (phone.length === 11 && phone[0] === '1' && phone[1] !== ('0' || '1')) phone = phone.slice(1);
            if (
                phone.length !== 10 || phone[0] === ('0' || '1')
            ) {
                numbers.push({ Telephone: [{ _attr: { label: contact.phoneNumbers[i]?.type || 'Phone' } }, phone] });
                continue
            };
            phone = `1${phone}`;
            numbers.push({ Telephone: [{ _attr: { label: contact.phoneNumbers[i]?.type || 'Phone' } }, phone] });
        }
        return { DirectoryEntry: [{ Name: name }, ...numbers] };
    });

    phonebook = phonebook.sort((a, b) => a.DirectoryEntry[0].Name[0].localeCompare(b.DirectoryEntry[0].Name[0]));

    return xml([{ IPPhoneDirectory: phonebook }], { declaration: true });
}

// Transform contacts to Kazoo XML format
/**
 * Transform contacts to XML format with each contact having 3 phone numbers to match the format of Kazoo
 * @param {Array} contacts array of google contacts
 * @returns {string} XML string
 * 
 * This function will transform the contacts to XML format
 * It will sort the contacts by name
 * It will then return the XML string
 * If there are no contacts, it will return an empty XML string
 */
function transformContactsToKazooXML(contacts) {

    let phonebook = contacts.map(contact => {
        if (!contact.names || !contact.phoneNumbers) return;
        const name = contact.names?.[0]?.displayName || 'Unknown';
        const numbers = [];
        for (let i = 0; i < contact.phoneNumbers?.length; i++) {
            let phone = contact.phoneNumbers[i].value;
            phone = phone.replace(/\D/g, '');
            if (phone.length === 11 && phone[0] === '1' && phone[1] !== ('0' || '1')) phone = phone.slice(1);
            if (
                phone.length !== 10 || phone[0] === ('0' || '1')
            ) {
                numbers.push({ Telephone: [{ _attr: { label: contact.phoneNumbers[i]?.type || 'Phone' } }, phone] });
                continue
            };
            const phone2 = `1${phone}`;
            const phone3 = `+1${phone}`;
            numbers.push({ Telephone: [{ _attr: { label: contact.phoneNumbers[i]?.type || 'Phone' } }, phone] }, { Telephone: [{ _attr: { label: contact.phoneNumbers[i]?.type || 'Phone' } }, phone2] }, { Telephone: [{ _attr: { label: contact.phoneNumbers[i]?.type || 'Phone' } }, phone3] });
        }
        return { DirectoryEntry: [{ Name: name }, ...numbers] };
    });

    phonebook = phonebook.sort((a, b) => a.DirectoryEntry[0].Name[0].localeCompare(b.DirectoryEntry[0].Name[0]));

    return xml([{ IPPhoneDirectory: phonebook }], { declaration: true });
}

// Transform contacts to polycom XML format
/**
 * Transform contacts to XML format to match the format of Polycom
 * @param {Array} contacts array of google contacts
 * @returns {string} XML string
 * 
 * This function will transform the contacts to XML format
 * It will sort the contacts by name
 * It will then return the XML string
 * If there are no contacts, it will return an empty XML string
 * If the phone number is not 10 digits long, it will add the phone number to the XML
 * If the phone number is 10 digits long, it will add a 1 to the beginning of the phone number and then add the phone number to the XML
 * If the phone number is 11 digits long and the first digit is 1 and the second digit is not 0 or 1, it will remove the first digit and then add the phone number to the XML
 * If the phone number is 11 digits long and the first digit is not 1, it will add the phone number to the XML
 * If the phone number is not 10 digits long or the first digit is 0 or 1, it will add the phone number to the XML
 * If there are no contacts, it will return an empty XML string
 */
function transformContactsToPolyXML(contacts) {

    let phonebook = contacts.map(contact => {
        if (!contact.names || !contact.phoneNumbers) return;
        const name = contact.names?.[0]?.displayName || 'Unknown';
        const numbers = [];
        for (let i = 0; i < contact.phoneNumbers?.length; i++) {
            let phone = contact?.replace(/\D/g, '');
            if (phone.length === 11 && phone[0] === '1' && phone[1] !== ('0' || '1')) phone = phone.slice(1);
            if (
                phone.length !== 10 || phone[0] === ('0' || '1')
            ) {
                numbers.push({ ct: [phone] });
                continue
            };
            phone = `1${phone}`;
            numbers.push({ ct: [phone] });
        }
        return { item: [{ fn: name }, ...numbers] };
    });

    phonebook = phonebook.sort((a, b) => a.item[0].fn[0].localeCompare(b.item[0].fn[0]));

    return xml([{dataset:  [{ _attr: { "xmlns:xsi": "http://www.w3.org/2001/XMLSchemainstance"} } ,{ directory :[{ item_list: phonebook }]}]}], { declaration: true });
}

// Set up the view engine

app.set('views', path.join(__dirname, 'views'));
app.set('view engine', 'ejs');
app.use(express.static('public'));
app.use(express.urlencoded({ extended: true }));
app.use(express.json());

// Routes

/**
 * Home route
 * @param {object} req request object
 * @param {object} res response object
 * @returns {void} void
 * @async
 * 
 * This route will check if the user is logged in
 * If the user is logged in, it will get the user's name and email address
 * It will then render the index page with the user's name and email address
 * If the user is not logged in, it will render the index page without the user's name and email address
 * If there is an error, it will log the error and send a 500 status code
 * If the user is not logged in, it will render the index page without the user's name and email address
 * If there is an error, it will log the error and send a 500 status code
 */
app.get('/', async (req, res) => {
    let client = await loadSavedCredentialsIfExist();
    if (client) {
        try {
            const auth = await authorize();
            const service = google.people({ version: 'v1', auth });
            const userinfo = await service.people.get({
                resourceName: 'people/me',
                personFields: 'names,emailAddresses',
            });
            res.render('index', {
                logedin: true,
                name: userinfo.data.names[0].displayName,
                email: userinfo.data.emailAddresses[0].value,
                cfg: `http://${ip}:${PORT}/config.cfg`
            });
        } catch (err) {
            console.error(err, 'Error fetching user info');
            res.status(500).send('Internal server error');
        }
    } else {
        res.render('index', { logedin: false });
    }
});

/**
 * Login route
 * @param {object} req request object
 * @param {object} res response object
 * @returns {void} void
 * @async
 * 
 * This route will authorize the user
 * If the user is authorized, it will redirect to the home route
 * If there is an error, it will log the error and send a 500 status code
 */
app.get('/login', async (req, res) => {
    try {
        await authorize();
        res.redirect('/');
    } catch (err) {
        console.error(err, 'Error authorizing user for login');
        res.status(500).send('Internal server error');
    }
});

/**
 * Logout route
 * @param {object} req request object
 * @param {object} res response object
 * @returns {void} void
 * @async
 * 
 * This route will delete the token file
 * It will then redirect to the home route
 * If there is an error, it will log the error and send a 500 status code
 */
app.get('/logout', async (req, res) => {
    try {
        await fs.unlink(TOKEN_PATH);
        res.redirect('/');
    } catch (err) {
        console.error(err, 'Error deleting token file');
        res.status(500).send('Internal server error');
    }
});

/**
 * Contacts route
 * @param {object} req request object
 *  @param {object} res response object
 * @returns {void} void
 * @async
 * 
 * This route will check if the user is logged in
 * If the user is logged in, it will fetch the user's contacts
 * It will then filter the contacts to only include contacts with phone numbers
 * It will then format the phone numbers to be in the format (xxx) xxx-xxxx
 * It will then sort the contacts by name
 * It will then render the contacts page with the contacts
 * If the user is not logged in, it will redirect to the home route
 * If there is an error, it will log the error and send a 500 status code
 */
app.get('/contacts', async (req, res) => {
    let client = await loadSavedCredentialsIfExist();
    if (client) {
        try {
            const auth = await authorize();
            let contacts = await fetchGoogleContacts(auth);
            contacts = contacts.filter(contact => contact.phoneNumbers?.length > 0 && contact.names?.length > 0);
            for (let i = 0; i < contacts.length; i++) {
                for (let j = 0; j < contacts[i].phoneNumbers.length; j++) {
                    contacts[i].phoneNumbers[j].value = contacts[i].phoneNumbers[j].value.replace(/\D/g, '');
                    if (contacts[i].phoneNumbers[j].value.length === 11 && contacts[i].phoneNumbers[j].value[0] === '1' && contacts[i].phoneNumbers[j].value[1] !== ('0' || '1')) contacts[i].phoneNumbers[j].value = contacts[i].phoneNumbers[j].value.slice(1);
                    if (contacts[i].phoneNumbers[j].value.length !== 10 || contacts[i].phoneNumbers[j].value[0] === ('0' || '1')) {
                        continue
                    }
                    contacts[i].phoneNumbers[j].value = `(${contacts[i].phoneNumbers[j].value.slice(0, 3)}) ${contacts[i].phoneNumbers[j].value.slice(3, 6)}-${contacts[i].phoneNumbers[j].value.slice(6)}`;
                }
            }
            contacts = contacts.sort((a, b) => a.names[0]?.displayName.localeCompare(b.names[0]?.displayName));
            res.render('contacts', { contacts, logedin: true });
        } catch (err) {
            console.error(err, 'Error fetching contacts for contacts page');
            res.status(500).send('Internal server error');
        }
    } else {
        res.redirect('/');
    }
});

// Serve XML file
/**
 * Phonebook route
 * @param {object} req request object
 * @param {object} res response object
 * @returns {void} void
 * @async
 * 
 * This route is for phones that support XML phonebooks
 * It will generate an XML file with the user's contacts
 * It will then serve the XML file
 * The content type will be text/xml
 * The content will be the XML file
 * The XML file will have the user's contacts in the format of a phonebook
 * The XML file will have the user's contacts sorted by name
 */
app.get('/phonebook', async (req, res) => {
    try {
        const auth = await authorize();
        const contacts = await fetchGoogleContacts(auth);
        const xmlData = transformContactsToXML(contacts);

        res.set('Content-Type', 'text/xml');
        res.send(xmlData);
    }
    catch (err) {
        console.error(err, 'Error fetching contacts for phonebook');
        res.status(500).send('Internal server error');
    }
});

// Serve XML file
/**
 * Kazoo Phonebook route
 * @param {object} req request object
 * @param {object} res response object
 * @returns {void} void
 * @async
 * 
 * This route is for Kazoo phones
 * It will generate an XML file with the user's contacts
 * It will then serve the XML file
 * The content type will be text/xml
 * The content will be the XML file
 * The XML file will have the user's contacts in the format of a phonebook
 */
app.get('/kazoo/phonebook', async (req, res) => {
    try {
        const auth = await authorize();
        const contacts = await fetchGoogleContacts(auth);
        const xmlData = transformContactsToKazooXML(contacts);

        res.set('Content-Type', 'text/xml');
        res.send(xmlData);
    }
    catch (err) {
        console.error(err, 'Error fetching contacts for Kazoo phonebook');
        res.status(500).send('Internal server error');
    }
});

// Serve config file
/**
 * Yealink Config file route
 * @param {object} req request object
 * @param {object} res response object
 * @returns {void} void
 * @async
 * 
 * This route is for Yealink phones
 * It will generate a config file for Yealink phones
 * The config file will have the phonebook URL and name
 * The phonebook URL will be the phonebook route
 * The phonebook name will be the user's email address
 * The config file will also have some features enabled
 * The config file will also have a dialplan replace rule to add a 1 to the beginning of the number if it is 10 digits long
 * 
 * The config file will be served as a text file
 * The content type will be text/plain
 * The content will be the config file
 * The config file will be in the format of a Yealink config file
 */
app.get('/config.cfg', async (req, res) => {
    let pbName;
    let client = await loadSavedCredentialsIfExist();
    if (client) {
        try {
            const auth = await authorize();
            const service = google.people({ version: 'v1', auth });
            const userinfo = await service.people.get({
                resourceName: 'people/me',
                personFields: 'names,emailAddresses',
            });
            pbName = userinfo.data.emailAddresses[0].value;
        } catch (err) {
            console.error(err, 'Error fetching user info for config file');
            res.status(500).send('Internal server error');
        }
    } else {
        child_process.exec(`start http://localhost:${PORT}`);
    }

    res.set('Content-Type', 'text/plain');
    res.send(`#!version:1.0.0.1\n\nremote_phonebook.data.1.url = http://${ip}:${PORT}/phonebook\nremote_phonebook.data.1.name = Google Contacts ${pbName}\nfeatures.remote_phonebook.enable = 1\nfeatures.call_num_filter = , -()+\ndialplan.replace.prefix.1 = ([2-9]xx[2-9]xxxxxx)\ndialplan.replace.replace.1 = 1$1`);
});

// Serve XML file
/**
 * Polycom XML Directory Server route
 * @param {object} req request object
 * @param {object} res response object
 * @returns {void} void
 * @async
 * 
 * This route is for Polycom phones
 * It will only show a link to the XML file
 * The Polycom phones will need to access the XML file directly
 * Polycom phones are designed to access the XML file directly, but the url to the XML file needs to be the folder that the XML file is in
 * not the XML file itself
 * The XML file will be served at the /polycom/000000000000-directory.xml route
 * 
 */
app.get('/polycom', (req, res) => {
    res.send('<h1>Polycom XML Directory Server</h1><a href="/polycom/000000000000-directory.xml">000000000000-directory.xml</a>');
});

// Serve XML file
/**
 * Polycom XML Directory Server route
 * @param {object} req request object
 * @param {object} res response object
 * @returns {void} void
 * @async
 * 
 * This route is for Polycom phones
 * It will generate an XML file with the user's contacts
 * It will then serve the XML file
 * The content type will be text/xml
 * The content will be the XML file
 * The XML file will have the user's contacts in the format of a phonebook
 * The XML file will have the user's contacts sorted by name
 * The XML file will have the user's contacts in the format of a Polycom phonebook
 * 
 */
app.get('/polycom/000000000000-directory.xml', async (req, res) => {
    try {
        const auth = await authorize();
        const contacts = await fetchGoogleContacts(auth);
        const xmlData = transformContactsToPolyXML(contacts);

        res.set('Content-Type', 'text/xml');
        res.send(xmlData);
    }
    catch (err) {
        console.error(err, 'Error fetching contacts for Polycom phonebook');
        res.status(500).send('Internal server error');
    }
});

// Serve links
/**
 * Links route
 * @param {object} req request object
 * @param {object} res response object
 * @returns {void} void
 * 
 * This route will show links to the different routes
 * The links will be Home, Contacts, Login, Logout, Phonebook XML, Kazoo Phonebook XML, Yealink Config File, Polycom XML Directory Server
 */
app.get('/links', (req, res) => {
    res.send('<a href="/">Home</a><br><a href="/contacts">Contacts</a><br><a href="/login">Login</a><br><a href="/logout">Logout</a><br><a href="/phonebook">Phonebook XML</a><br><a href="/kazoo/phonebook">Kazoo Phonebook XML</a><br><a href="/config.cfg">Yealink Config File</a><br><a href="/polycom">Polycom XML Directory Server</a>');
});

// 404 route
/**
 * 404 route
 * @param {object} req request object
 * @param {object} res response object
 * @returns {void} void
 * 
 * This route will send a 404 status code and a 404 page not found message
 * This route will be used for any routes that are not defined
 */
app.get('*', (req, res) => {
    res.status(404).send('404 Page Not Found');
});

// Start the server
app.listen(PORT, () => {
    child_process.exec(`start http://${ip}:${PORT}`);
    console.log(`Server is running on http://${ip}:${PORT}`);
});
