# Google Contacts Synchronization Extension

## Overview
This Node.js Express application allows users to synchronize their Google Contacts with their SIP phone. By pulling Google Contacts through a Node.js Express server, users can keep their contacts up-to-date and easily accessible on their SIP phones.

## Our Mission
In today’s fast-paced business environment, staying connected with your contacts is crucial. As an employee, knowing who is calling you and having up-to-date contact information at your fingertips can significantly enhance your productivity and efficiency. Our mission is to bridge the gap between your SIP phone and your Google Contacts, ensuring that your contact list is always current and readily available.

Our extension allows seamless synchronization between your Google Contacts and your SIP phone. By leveraging a robust Node.js Express server, we provide a reliable solution that automatically updates your SIP phone with your latest Google Contacts. Say goodbye to the hassle of manually updating your contact list and hello to a more streamlined and efficient way of managing your business communications.

## Features
- **Google Contacts Synchronization**: Sync your Google Contacts with your SIP phone.
- **Multiple Formats Supported**: Generate XML files in various formats suitable for different phone systems (Polycom, Yealink, Kazoo, etc.).
- **User Authentication**: Securely authenticate users using Google OAuth 2.0.

## Prerequisites
Before using this application, ensure you have the following:
- Node.js and npm installed on your system.
- Google API credentials (client ID, client secret, etc.) for accessing the Google Contacts API.

## Installation
1. Clone this repository to your local machine:
```
git clone https://github.com/joshuamargareten/Google-Contacts-Sync-Yealink-.git
```
2. Navigate to the project directory:
```
cd Google-Contacts-Sync-Yealink-
```
3. Install dependencies using npm:
```
npm install
```

## Configuration
1. Obtain Google API credentials:
- Go to the [Google API Console](https://console.developers.google.com/).
- Create a new project and enable the People API.
- Create an OAuth consent screen
- Select Scopes: ```userinfo.email``` ```userinfo.profile``` ```contacts.readonly```
- Create OAuth 2.0 credentials (client ID and client secret).
- Download the credentials file (JSON format) and save it as `credentials.json` in the project directory.

## Usage
1. Start the server:
```
node index.js
```
Or you can use the start script which will run the server in background and restart the server on crashes using PM2
```
npm run start
```
2. Your web browser will open and navigate to `http://localhost:6005/`.
3. Click on the "Login" button to authenticate with your Google account.
4. After successful authentication, you will be able to access the synced contacts and other features.

## Routes
- **/**: Home route. Displays the home page with options to log in or log out.
- **/login**: Login route. Initiates the Google OAuth 2.0 authentication flow.
- **/logout**: Logout route. Clears the user's session and redirects to the home page.
- **/contacts**: Contacts route. Displays the user's synced contacts.
- **/phonebook**: Phonebook route. Generates and serves an XML file with the user's contacts suitable for phone systems supporting XML phonebooks.
- **/kazoo/phonebook**: Kazoo Phonebook route. Generates and serves an XML file with the user's contacts suitable for Kazoo phones.
- **/config.cfg**: Yealink Config file route. Generates and serves a configuration file for Yealink phones, including the phonebook URL and name.
- **/polycom**: Polycom XML Directory Server route. Displays a link to the XML file for Polycom phones.
- **/polycom/000000000000-directory.xml**: Polycom XML Directory Server route. Generates and serves an XML file with the user's contacts suitable for Polycom phones.
- **/links**: Links route. Displays links to all available routes for easy navigation.

## 404 Route
- **/**: 404 route. Displays a "Page Not Found" message for undefined routes.

## Contributing
Contributions are welcome! Feel free to open issues or pull requests for any improvements or new features.
