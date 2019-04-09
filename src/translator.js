import { readFileSync, existsSync, writeFileSync } from 'fs';
import { sync as globSync } from 'glob';
import { sync as mkdirpSync } from 'mkdirp';

const settings = {
    langs: ['en-GB', 'de-DE', 'fr-FR'],
    defaultLang: 'de-DE',
};
const MESSAGES_PATTERN = './src/client/translate/messages/**/*.json';
const LANG_DIR = './src/client/translate/langs/';

console.log('📘 Translation starts');
/**
 * getExistedLocaleData - Get old translations to keep them.
 *
 * @langs {array}
 */
const getExistedLocaleData = (langs) =>
    langs.reduce((src, lang) => {
        const path = LANG_DIR;
        const langPath = path + `${lang}.json`;
        try {
            if (existsSync(path) && existsSync(langPath)) {
                if (existsSync(langPath)) {
                    const file = readFileSync(langPath, 'utf8');
                    const parsedFile = JSON.parse(file);
                    src[lang] = parsedFile;
                }
            } else {
                if (!existsSync(path)) {
                    mkdirpSync(LANG_DIR);
                }
                src[lang] = {};
            }
            return src;
        } catch (err) {
            console.error(err);
        }
    }, {});
/**
 * getExtractedMessages - Get all translations from the latest extraction.
 *
 * @langs {array}
 */
const getExtractedMessages = (pattern) =>
    globSync(pattern)
        .map((filename) => readFileSync(filename, 'utf8'))
        .map((file) => JSON.parse(file))
        .reduce((collection, descriptors) => {
            descriptors.forEach(({ id, defaultMessage }) => {
                if (collection.hasOwnProperty(id) && collection[id] !== defaultMessage) {
                    throw new Error(`Duplicate message id: ${id}`);
                }
                collection[id] = defaultMessage;
            });
            return collection;
        }, {});
/**
 * findKeyDifference - Find new message IDs
 * @newest  {Object} newMessageData
 * @current  {Object} currentLocaleData
 * @return {Object}
 */
const findKeyDifference = (newest, current) => {
    const newKeys = Object.keys(newest);
    const currentKeys = Object.keys(current);
    const diffKeys = newKeys.filter((i) => currentKeys.indexOf(i) === -1);
    return diffKeys;
};
/**
 * updateLangWithNewMessages - Takes old locale data and returns updated version
 *
 * @langs {array}
 */
const updateLangWithNewMessages = ({
    existedLocaleData,
    defaultLang,
    extractedMessages,
}) =>
    Object.entries(existedLocaleData).reduce((updatedData, [locale, localeData]) => {
        const isDefaultLang = locale === defaultLang;
        const newMessages = findKeyDifference(extractedMessages, localeData);
        const deletedMessages = findKeyDifference(localeData, extractedMessages);
        let updatedLocaleData = localeData;
        if (newMessages.length) {
            console.log(`New translations for ${locale}`, newMessages);
            const { emptyVersion, filledVersion } = newMessages.reduce(
                (src, diff) => {
                    src.emptyVersion[diff] = '';
                    src.filledVersion[diff] = extractedMessages[diff];
                    return src;
                },
                { emptyVersion: {}, filledVersion: {} }
            );
            updatedLocaleData = {
                ...localeData,
                ...(isDefaultLang ? filledVersion : emptyVersion),
            };
        }
        if (deletedMessages.length) {
            console.log(`Deleted translations for ${locale}`, deletedMessages);
            deletedMessages.forEach((deleted) => {
                delete updatedLocaleData[deleted];
            });
        }
        // Sorting keys will help us for git diff
        const sortedLocaleData = Object.keys(updatedLocaleData)
            .sort()
            .reduce(
                (acc, key) => ({
                    ...acc,
                    [key]: updatedLocaleData[key],
                }),
                {}
            );
        // set updated data
        updatedData[locale] = sortedLocaleData;
        return updatedData;
    }, {});
/**
 * writeUpdateToLocaleFiles - Takes updated locale data and writes into files
 *
 * @langs {array}
 */
const writeUpdateToLocaleFiles = (updatedLocaleFiles) =>
    Object.keys(updatedLocaleFiles).forEach((lang) => {
        const path = LANG_DIR + `${lang}.json`;
        try {
            writeFileSync(path, JSON.stringify(updatedLocaleFiles[lang], null, 2));
        } catch (err) {
            console.error(err);
        }
    });
/**
 * main func - Adds new translations to locale files
 *
 * @langs {array}
 */
const main = ({ defaultLang, langs, pattern }) => {
    const existedLocaleData = getExistedLocaleData(langs);
    const extractedMessages = getExtractedMessages(pattern);
    const updatedLocaleData = updateLangWithNewMessages({
        existedLocaleData,
        defaultLang,
        extractedMessages,
    });
    return writeUpdateToLocaleFiles(updatedLocaleData);
};
main({
    ...settings,
    pattern: MESSAGES_PATTERN,
});
