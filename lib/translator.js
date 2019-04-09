"use strict";

var _interopRequireDefault = require("@babel/runtime/helpers/interopRequireDefault");

var _defineProperty2 = _interopRequireDefault(require("@babel/runtime/helpers/defineProperty"));

var _objectSpread3 = _interopRequireDefault(require("@babel/runtime/helpers/objectSpread"));

var _slicedToArray2 = _interopRequireDefault(require("@babel/runtime/helpers/slicedToArray"));

var _fs = require("fs");

var _glob = require("glob");

var _mkdirp = require("mkdirp");

var settings = {
  langs: ['en-GB', 'de-DE', 'fr-FR'],
  defaultLang: 'de-DE'
};
var MESSAGES_PATTERN = './src/client/translate/messages/**/*.json';
var LANG_DIR = './src/client/translate/langs/';
console.log('📘 Translation starts');
/**
 * getExistedLocaleData - Get old translations to keep them.
 *
 * @langs {array}
 */

var getExistedLocaleData = function getExistedLocaleData(langs) {
  return langs.reduce(function (src, lang) {
    var path = LANG_DIR;
    var langPath = path + "".concat(lang, ".json");

    try {
      if ((0, _fs.existsSync)(path) && (0, _fs.existsSync)(langPath)) {
        if ((0, _fs.existsSync)(langPath)) {
          var file = (0, _fs.readFileSync)(langPath, 'utf8');
          var parsedFile = JSON.parse(file);
          src[lang] = parsedFile;
        }
      } else {
        if (!(0, _fs.existsSync)(path)) {
          (0, _mkdirp.sync)(LANG_DIR);
        }

        src[lang] = {};
      }

      return src;
    } catch (err) {
      console.error(err);
    }
  }, {});
};
/**
 * getExtractedMessages - Get all translations from the latest extraction.
 *
 * @langs {array}
 */


var getExtractedMessages = function getExtractedMessages(pattern) {
  return (0, _glob.sync)(pattern).map(function (filename) {
    return (0, _fs.readFileSync)(filename, 'utf8');
  }).map(function (file) {
    return JSON.parse(file);
  }).reduce(function (collection, descriptors) {
    descriptors.forEach(function (_ref) {
      var id = _ref.id,
          defaultMessage = _ref.defaultMessage;

      if (collection.hasOwnProperty(id) && collection[id] !== defaultMessage) {
        throw new Error("Duplicate message id: ".concat(id));
      }

      collection[id] = defaultMessage;
    });
    return collection;
  }, {});
};
/**
 * findKeyDifference - Find new message IDs
 * @newest  {Object} newMessageData
 * @current  {Object} currentLocaleData
 * @return {Object}
 */


var findKeyDifference = function findKeyDifference(newest, current) {
  var newKeys = Object.keys(newest);
  var currentKeys = Object.keys(current);
  var diffKeys = newKeys.filter(function (i) {
    return currentKeys.indexOf(i) === -1;
  });
  return diffKeys;
};
/**
 * updateLangWithNewMessages - Takes old locale data and returns updated version
 *
 * @langs {array}
 */


var updateLangWithNewMessages = function updateLangWithNewMessages(_ref2) {
  var existedLocaleData = _ref2.existedLocaleData,
      defaultLang = _ref2.defaultLang,
      extractedMessages = _ref2.extractedMessages;
  return Object.entries(existedLocaleData).reduce(function (updatedData, _ref3) {
    var _ref4 = (0, _slicedToArray2.default)(_ref3, 2),
        locale = _ref4[0],
        localeData = _ref4[1];

    var isDefaultLang = locale === defaultLang;
    var newMessages = findKeyDifference(extractedMessages, localeData);
    var deletedMessages = findKeyDifference(localeData, extractedMessages);
    var updatedLocaleData = localeData;

    if (newMessages.length) {
      console.log("New translations for ".concat(locale), newMessages);

      var _newMessages$reduce = newMessages.reduce(function (src, diff) {
        src.emptyVersion[diff] = '';
        src.filledVersion[diff] = extractedMessages[diff];
        return src;
      }, {
        emptyVersion: {},
        filledVersion: {}
      }),
          emptyVersion = _newMessages$reduce.emptyVersion,
          filledVersion = _newMessages$reduce.filledVersion;

      updatedLocaleData = (0, _objectSpread3.default)({}, localeData, isDefaultLang ? filledVersion : emptyVersion);
    }

    if (deletedMessages.length) {
      console.log("Deleted translations for ".concat(locale), deletedMessages);
      deletedMessages.forEach(function (deleted) {
        delete updatedLocaleData[deleted];
      });
    } // Sorting keys will help us for git diff


    var sortedLocaleData = Object.keys(updatedLocaleData).sort().reduce(function (acc, key) {
      return (0, _objectSpread3.default)({}, acc, (0, _defineProperty2.default)({}, key, updatedLocaleData[key]));
    }, {}); // set updated data

    updatedData[locale] = sortedLocaleData;
    return updatedData;
  }, {});
};
/**
 * writeUpdateToLocaleFiles - Takes updated locale data and writes into files
 *
 * @langs {array}
 */


var writeUpdateToLocaleFiles = function writeUpdateToLocaleFiles(updatedLocaleFiles) {
  return Object.keys(updatedLocaleFiles).forEach(function (lang) {
    var path = LANG_DIR + "".concat(lang, ".json");

    try {
      (0, _fs.writeFileSync)(path, JSON.stringify(updatedLocaleFiles[lang], null, 2));
    } catch (err) {
      console.error(err);
    }
  });
};
/**
 * main func - Adds new translations to locale files
 *
 * @langs {array}
 */


var main = function main(_ref5) {
  var defaultLang = _ref5.defaultLang,
      langs = _ref5.langs,
      pattern = _ref5.pattern;
  var existedLocaleData = getExistedLocaleData(langs);
  var extractedMessages = getExtractedMessages(pattern);
  var updatedLocaleData = updateLangWithNewMessages({
    existedLocaleData: existedLocaleData,
    defaultLang: defaultLang,
    extractedMessages: extractedMessages
  });
  return writeUpdateToLocaleFiles(updatedLocaleData);
};

main((0, _objectSpread3.default)({}, settings, {
  pattern: MESSAGES_PATTERN
}));