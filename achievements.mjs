import { api } from './index.mjs';
import { getLocalizationData, appleLocales } from './sheets.mjs';

// INPUTS
const appBundleId = 'com.mow.jemjunction';

// SECRETS FROM .ENV
const apiKey = process.env.KID;
const issuerId = process.env.ISS;

// LOCALIZATION DATA FROM GOOGLE SHEETS
const sheetData = await getLocalizationData();
const achievementSuffixName = '_Name';
const achievementSuffixDesc = '_Desc';
const ignoreSheetColumns = ['refname', 'imagepath'];
// HELPERS
// create private key from file
async function loadPrivateKey(apiKey) {
    const fs = await import('node:fs/promises');
    const privateKey = await fs.readFile(`../keys/AuthKey_${apiKey}.p8`, 'utf8');
    return privateKey;
}

const privateKey = await loadPrivateKey(apiKey);

const { read, readAll, create, update, remove } = await api({ issuerId, apiKey, privateKey });

// get 
const appFilter = {
    params: {
        'filter[bundleId]': appBundleId,
    }
}
const { data: apps } = await read('/apps', appFilter);
const appId = apps[0].id;

const { data: gameCenter } = await read(`/apps/${appId}/gameCenterDetail`);
const gameCenterId = gameCenter.id;

const { data: gameCenterAchievements } = await readAll(`gameCenterDetails/${gameCenterId}/gameCenterAchievements`);
const achievements = gameCenterAchievements.map(achievement => {
    return {
        id: achievement.id,
        refName: achievement.attributes.referenceName
    };
});

for (const achievement of achievements) {
    // find achievement in sheetData
    const foundLocalizationSheetDataNameRow = sheetData.find(row => row.refname === `${achievement.refName}${achievementSuffixName}`);
    const foundLocalizationSheetDataDescRow = sheetData.find(row => row.refname === `${achievement.refName}${achievementSuffixDesc}`);

    if (!foundLocalizationSheetDataNameRow || !foundLocalizationSheetDataDescRow) {
        throw new Error(`Could not find localization for achievement, ${achievement.refName}, in the sheet data`);
    }

    // get game center achievement localizations
    const { data: gameCenterAchievementLocalizations } = await readAll(`/gameCenterAchievements/${achievement.id}/localizations`);

    // for each found localization create/update the localization
    const sheetKeys = Object.keys(foundLocalizationSheetDataNameRow);
    for (const key of sheetKeys) {

        if (!ignoreSheetColumns.includes(key)) {

            const foundExisitngLocalization = gameCenterAchievementLocalizations.find(localization => localization.attributes.locale === appleLocales.find(row => row.sheets === key)?.apple);
            if (!foundExisitngLocalization) {
                // create new localization
                const newLocalization = await create({
                    type: 'gameCenterAchievementLocalizations',
                    attributes: {
                        locale: appleLocales.find(row => row.sheets === key).apple,
                        name: foundLocalizationSheetDataNameRow[key],
                        afterEarnedDescription: foundLocalizationSheetDataDescRow[key],
                        beforeEarnedDescription: foundLocalizationSheetDataDescRow[key],
                    },
                    relationships: {
                        gameCenterAchievement: {
                            data: {
                                type: 'gameCenterAchievements',
                                id: achievement.id
                            }
                        }
                    }
                });
                console.log(`new: ${newLocalization.attributes.name} - ${newLocalization.attributes.locale}`);
            } else {
                // check to see if localization needs to be updated
                const attributes = {
                };

                if (foundExisitngLocalization.attributes.name !== foundLocalizationSheetDataNameRow[key]) {
                    attributes.name = foundLocalizationSheetDataNameRow[key];
                }
                if (foundExisitngLocalization.attributes.beforeEarnedDescription !== foundLocalizationSheetDataDescRow[key]) {
                    attributes.beforeEarnedDescription = foundLocalizationSheetDataDescRow[key];
                }

                if (foundExisitngLocalization.attributes.afterEarnedDescription !== foundLocalizationSheetDataDescRow[key]) {
                    attributes.afterEarnedDescription = foundLocalizationSheetDataDescRow[key];
                }

                if (Object.keys(attributes).length > 0) {
                    // update existing localization
                    const updatedLocalization = await update(foundExisitngLocalization, { attributes });
                    console.log(`updated: ${updatedLocalization.attributes.name} - ${updatedLocalization.attributes.locale}`);
                }
            }
        }
    };
}  