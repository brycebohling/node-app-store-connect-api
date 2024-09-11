import { google } from 'googleapis';

const appleLocales = [
    { sheets: 'en', apple: 'en-US' },
    { sheets: 'nl', apple: 'nl-NL' },
    { sheets: 'fi', apple: 'fi' },
    { sheets: 'fr', apple: 'fr-FR' },
    { sheets: 'de', apple: 'de-DE' },
    { sheets: 'id', apple: 'id' },
    { sheets: 'it', apple: 'it' },
    { sheets: 'ms', apple: 'ms' },
    { sheets: 'pl', apple: 'pl' },
    { sheets: 'pt', apple: 'pt-BR' },
    { sheets: 'es', apple: 'es-MX' },
    { sheets: 'tr', apple: 'tr' },
    { sheets: 'vi', apple: 'vi' }
];

export {
    getLocalizationData,
    appleLocales
};

async function getLocalizationData() {
    const auth = await google.auth.getClient({ scopes: ['https://www.googleapis.com/auth/spreadsheets.readonly']}); 
    const sheets = google.sheets({ version: 'v4', auth });
    const range = 'Sheet1!A1:O41';
    const response = await sheets.spreadsheets.values.get({
        spreadsheetId: process.env.SHEET_ID,
        range
    });
    const data = response.data.values;
    const headers = data[0];
    const result = [];
    // make an array of objects instead of an array of arrays
    for (let i = 1; i < data.length; i++) {
        const row = data[i];
        const obj = {};
        for (let j = 0; j < headers.length; j++) {
            // lowercase and remove language suffix
            const regex = /\((.*?)\)/;
            const match = headers[j].match(regex);
            const key = match ? match[1] : headers[j];
            obj[key.toLowerCase()] = row[j];
            // obj[headers[j].toLowerCase().split('(')[0]] = row[j];
        }
        result.push(obj);
    }
    return result;
}
    
// (async () => {
//     const sheetData = await getLocalizationData();
// })();
