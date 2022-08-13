import fs, { readFileSync, promises } from 'fs';
import crypto from 'crypto';
import fetch from 'node-fetch';
import WebSocket from 'ws';
import path, { dirname } from 'path';
import { fileURLToPath } from 'url';
import cookieParser from 'cookie-parser';
import express from 'express';
import multer from 'multer';
import cors from 'cors';
import tmi from 'tmi.js';
import * as pg from 'pg';
import SibApiV3Sdk from 'sib-api-v3-sdk';
import childProcess from 'child_process';

const absPath = (path) => new URL(path, import.meta.url);
const readJson = (path) => JSON.parse(String(readFileSync(path)));
const init = () => {
    const configFile = process.env.APP_CONFIG || '';
    if (configFile === '') {
        process.exit(2);
    }
    const config = readJson(configFile);
    config.twitch.auto_tags = readJson(absPath('./config_data/tags_auto.json'));
    config.twitch.manual_tags = readJson(absPath('./config_data/tags_manual.json'));
    return config;
};
const config = init();

function withHeaders(headers, opts = {}) {
    const options = opts || {};
    options.headers = (options.headers || {});
    for (const k in headers) {
        options.headers[k] = headers[k];
    }
    return options;
}
function asJson(data) {
    return {
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
    };
}
function asQueryArgs(data) {
    const q = [];
    for (const k in data) {
        const pair = [k, data[k]].map(encodeURIComponent);
        q.push(pair.join('='));
    }
    if (q.length === 0) {
        return '';
    }
    return `?${q.join('&')}`;
}
const request = async (method, url, opts = {}) => {
    const options = opts || {};
    options.method = method;
    return await fetch(url, options);
};
var xhr = {
    withHeaders,
    asJson,
    asQueryArgs,
    get: async (url, opts = {}) => request('get', url, opts),
    post: async (url, opts = {}) => request('post', url, opts),
    delete: async (url, opts = {}) => request('delete', url, opts),
    patch: async (url, opts = {}) => request('patch', url, opts),
    put: async (url, opts = {}) => request('put', url, opts),
};

const MS = 1;
const SECOND = 1000 * MS;
const MINUTE = 60 * SECOND;
const HOUR = 60 * MINUTE;
const DAY = 24 * HOUR;
const MONTH = 30 * DAY;
const YEAR = 365 * DAY;
var LogLevel;
(function (LogLevel) {
    LogLevel["INFO"] = "info";
    LogLevel["WARN"] = "warn";
    LogLevel["DEBUG"] = "debug";
    LogLevel["ERROR"] = "error";
})(LogLevel || (LogLevel = {}));
// error | info | log | debug
let logEnabled = []; // always log errors
const setLogLevel = (logLevel) => {
    switch (logLevel) {
        case LogLevel.ERROR:
            logEnabled = [LogLevel.ERROR];
            break;
        case LogLevel.WARN:
            logEnabled = [LogLevel.ERROR, LogLevel.WARN];
            break;
        case LogLevel.INFO:
            logEnabled = [LogLevel.ERROR, LogLevel.WARN, LogLevel.INFO];
            break;
        case LogLevel.DEBUG:
            logEnabled = [LogLevel.ERROR, LogLevel.WARN, LogLevel.INFO, LogLevel.DEBUG];
            break;
    }
};
setLogLevel(LogLevel.INFO);
const logger = (prefix, ...pre) => {
    const b = prefix;
    const fn = (t) => (...args) => {
        if (logEnabled.includes(t)) {
            console[t](dateformat('hh:mm:ss', new Date()), `[${b}]`, ...pre, ...args);
        }
    };
    return {
        error: fn(LogLevel.ERROR),
        warn: fn(LogLevel.WARN),
        info: fn(LogLevel.INFO),
        debug: fn(LogLevel.DEBUG),
    };
};
const unicodeLength = (str) => {
    return [...str].length;
};
const dateformat = (format, date) => {
    return format.replace(/(hh|mm|ss)/g, (m0, m1) => {
        switch (m1) {
            case 'hh': return pad(date.getHours(), '00');
            case 'mm': return pad(date.getMinutes(), '00');
            case 'ss': return pad(date.getSeconds(), '00');
            default: return m0;
        }
    });
};
const pad = (x, pad) => {
    const str = `${x}`;
    if (str.length >= pad.length) {
        return str;
    }
    return pad.substr(0, pad.length - str.length) + str;
};
function nonce(length) {
    let text = "";
    const possible = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789";
    for (let i = 0; i < length; i++) {
        text += possible.charAt(Math.floor(Math.random() * possible.length));
    }
    return text;
}
const mustParseHumanDuration = (duration, allowNegative = false) => {
    if (duration === '') {
        throw new Error("unable to parse duration");
    }
    const d = `${duration}`.trim();
    if (!d) {
        throw new Error("unable to parse duration");
    }
    const checkNegative = (val) => {
        if (val < 0 && !allowNegative) {
            throw new Error("negative value not allowed");
        }
        return val;
    };
    if (d.match(/^-?\d+$/)) {
        return checkNegative(parseInt(d, 10));
    }
    const m1 = d.match(/^(-?(?:\d*)\.(?:\d*))(d|h|m|s)$/);
    if (m1) {
        const value = parseFloat(m1[1]);
        if (isNaN(value)) {
            throw new Error("unable to parse duration");
        }
        const unit = m1[2];
        let ms = 0;
        if (unit === 'd') {
            ms = value * DAY;
        }
        else if (unit === 'h') {
            ms = value * HOUR;
        }
        else if (unit === 'm') {
            ms = value * MINUTE;
        }
        else if (unit === 's') {
            ms = value * SECOND;
        }
        return checkNegative(Math.round(ms));
    }
    const m = d.match(/^(-?)(?:(\d+)d)?\s?(?:(\d+)h)?\s?(?:(\d+)m)?\s?(?:(\d+)s)?\s?(?:(\d+)ms)?$/);
    if (!m) {
        throw new Error("unable to parse duration");
    }
    const neg = m[1] ? -1 : 1;
    const D = m[2] ? parseInt(m[2], 10) : 0;
    const H = m[3] ? parseInt(m[3], 10) : 0;
    const M = m[4] ? parseInt(m[4], 10) : 0;
    const S = m[5] ? parseInt(m[5], 10) : 0;
    const MS = m[6] ? parseInt(m[6], 10) : 0;
    return checkNegative(neg * ((S * SECOND)
        + (M * MINUTE)
        + (H * HOUR)
        + (D * DAY)
        + (MS)));
};
const parseHumanDuration = (duration, allowNegative = false) => {
    try {
        return mustParseHumanDuration(duration, allowNegative);
    }
    catch (e) {
        return 0;
    }
};
const humanDuration = (durationMs, units = ['ms', 's', 'm', 'h', 'd']) => {
    let duration = durationMs;
    const d = Math.floor(duration / DAY);
    duration = duration % DAY;
    const h = Math.floor(duration / HOUR);
    duration = duration % HOUR;
    const m = Math.floor(duration / MINUTE);
    duration = duration % MINUTE;
    const s = Math.floor(duration / SECOND);
    duration = duration % SECOND;
    const ms = duration;
    const rawparts = [ms, s, m, h, d];
    // remove leading and trailing empty values
    let start = 0;
    while (start < rawparts.length && rawparts[start] === 0) {
        start++;
    }
    let end = rawparts.length - 1;
    while (end >= 0 && rawparts[end] === 0) {
        end--;
    }
    const parts = [];
    for (let i = start; i <= end; i++) {
        parts.unshift(`${rawparts[i]}${units[i]}`);
    }
    return parts.join(' ');
};
const hash = (str) => {
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
        const chr = str.charCodeAt(i);
        hash = ((hash << 5) - hash) + chr;
        hash |= 0; // Convert to 32bit integer
    }
    return hash;
};
function arrayMove(arr, oldIndex, newIndex) {
    if (newIndex >= arr.length) {
        let k = newIndex - arr.length + 1;
        while (k--) {
            arr.push(undefined);
        }
    }
    arr.splice(newIndex, 0, arr.splice(oldIndex, 1)[0]);
    return arr; // return, but array is also modified in place
}
const shuffle = (array) => {
    let counter = array.length;
    // While there are elements in the array
    while (counter > 0) {
        // Pick a random index
        const index = Math.floor(Math.random() * counter);
        // Decrease counter by 1
        counter--;
        // And swap the last element with it
        const temp = array[counter];
        array[counter] = array[index];
        array[index] = temp;
    }
    return array;
};
const getProp = (obj, keys, defaultVal) => {
    let x = obj;
    for (const key of keys) {
        if (typeof x !== 'object' || x === null) {
            return defaultVal;
        }
        if (!Object.keys(x).includes(key)) {
            return defaultVal;
        }
        x = x[key];
    }
    return x;
};

const log$x = logger('fn.ts');
function mimeToExt(mime) {
    if (/image\//.test(mime)) {
        return mime.replace('image/', '');
    }
    return '';
}
function decodeBase64Image(base64Str) {
    const matches = base64Str.match(/^data:([A-Za-z-+/]+);base64,(.+)$/);
    if (!matches || matches.length !== 3) {
        throw new Error('Invalid base64 string');
    }
    return {
        type: matches[1],
        data: Buffer.from(matches[2], 'base64'),
    };
}
function getRandomInt(min, max) {
    min = Math.ceil(min);
    max = Math.floor(max);
    return Math.floor(Math.random() * (max - min + 1)) + min;
}
function getRandom(array) {
    return array[getRandomInt(0, array.length - 1)];
}
const fnRandom = (values) => () => getRandom(values);
const sleep = (ms) => {
    return new Promise((resolve, _reject) => {
        setTimeout(resolve, ms);
    });
};
const sayFn = (client, target) => (msg) => {
    // in case no target is given we use the configured channels
    // we should be able to use client.channels or client.getChannels()
    // but they are always empty :/
    const targets = target ? [target] : client.opts.channels;
    targets.forEach(t => {
        // TODO: fix this somewhere else?
        // client can only say things in lowercase channels
        t = t.toLowerCase();
        log$x.info(`saying in ${t}: ${msg}`);
        client.say(t, msg).catch((e) => {
            log$x.info(e);
        });
    });
};
const parseCommandFromTriggerAndMessage = (msg, trigger) => {
    if (trigger.type !== 'command') {
        return null;
    }
    return parseCommandFromCmdAndMessage(msg, trigger.data.command, trigger.data.commandExact);
};
const parseCommandFromCmdAndMessage = (msg, command, commandExact) => {
    if (msg === command
        || (!commandExact && msg.startsWith(command + ' '))) {
        const name = msg.substring(0, command.length).trim();
        const args = msg.substring(command.length).trim().split(' ').filter(s => !!s);
        return { name, args };
    }
    return null;
};
const _toInt = (value) => parseInt(`${value}`, 10);
const _increase = (value, by) => (_toInt(value) + _toInt(by));
const _decrease = (value, by) => (_toInt(value) - _toInt(by));
const applyVariableChanges = async (cmdDef, contextModule, rawCmd, context) => {
    if (!cmdDef.variableChanges) {
        return;
    }
    const variables = contextModule.bot.getUserVariables(contextModule.user);
    for (const variableChange of cmdDef.variableChanges) {
        const op = variableChange.change;
        const name = await doReplacements(variableChange.name, rawCmd, context, cmdDef, contextModule.bot, contextModule.user);
        const value = await doReplacements(variableChange.value, rawCmd, context, cmdDef, contextModule.bot, contextModule.user);
        // check if there is a local variable for the change
        if (cmdDef.variables) {
            const idx = cmdDef.variables.findIndex(v => (v.name === name));
            if (idx !== -1) {
                if (op === 'set') {
                    cmdDef.variables[idx].value = value;
                }
                else if (op === 'increase_by') {
                    cmdDef.variables[idx].value = _increase(cmdDef.variables[idx].value, value);
                }
                else if (op === 'decrease_by') {
                    cmdDef.variables[idx].value = _decrease(cmdDef.variables[idx].value, value);
                }
                continue;
            }
        }
        const globalVars = await variables.all();
        const idx = globalVars.findIndex(v => (v.name === name));
        if (idx !== -1) {
            if (op === 'set') {
                await variables.set(name, value);
            }
            else if (op === 'increase_by') {
                await variables.set(name, _increase(globalVars[idx].value, value));
            }
            else if (op === 'decrease_by') {
                await variables.set(name, _decrease(globalVars[idx].value, value));
            }
            //
            continue;
        }
    }
    contextModule.saveCommands();
};
async function replaceAsync(str, regex, asyncFn) {
    const promises = [];
    str.replace(regex, (match, ...args) => {
        const promise = asyncFn(match, ...args);
        promises.push(promise);
        return match;
    });
    if (!promises.length) {
        return str;
    }
    const data = await Promise.all(promises);
    return str.replace(regex, () => data.shift() || '');
}
const doReplacements = async (text, command, context, originalCmd, bot, user) => {
    const replaces = [
        {
            regex: /\$args(?:\((\d*)(:?)(\d*)\))?/g,
            replacer: async (_m0, m1, m2, m3) => {
                if (!command) {
                    return '';
                }
                let from = 0;
                let to = command.args.length;
                if (m1 !== '' && m1 !== undefined) {
                    from = parseInt(m1, 10);
                    to = from;
                }
                if (m2 !== '' && m1 !== undefined) {
                    to = command.args.length - 1;
                }
                if (m3 !== '' && m1 !== undefined) {
                    to = parseInt(m3, 10);
                }
                if (from === to) {
                    const index = from;
                    if (index < command.args.length) {
                        return command.args[index];
                    }
                    return '';
                }
                return command.args.slice(from, to + 1).join(' ');
            },
        },
        {
            regex: /\$rand\(\s*(\d+)?\s*,\s*?(\d+)?\s*\)/g,
            replacer: async (_m0, m1, m2) => {
                const min = typeof m1 === 'undefined' ? 1 : parseInt(m1, 10);
                const max = typeof m2 === 'undefined' ? 100 : parseInt(m2, 10);
                return `${getRandomInt(min, max)}`;
            },
        },
        {
            regex: /\$var\(([^)]+)\)/g,
            replacer: async (_m0, m1) => {
                if (!originalCmd || !originalCmd.variables) {
                    return '';
                }
                if (!bot || !user) {
                    return '';
                }
                const v = originalCmd.variables.find(v => v.name === m1);
                const val = v ? v.value : (await bot.getUserVariables(user).get(m1));
                return val === null ? '' : String(val);
            },
        },
        {
            regex: /\$bot\.(version|date|website|github|features)/g,
            replacer: async (_m0, m1) => {
                if (!bot) {
                    return '';
                }
                if (m1 === 'version') {
                    return bot.getBuildVersion();
                }
                if (m1 === 'date') {
                    return bot.getBuildDate();
                }
                if (m1 === 'website') {
                    return 'https://hyottoko.club';
                }
                if (m1 === 'github') {
                    return 'https://github.com/zutatensuppe/robyottoko';
                }
                if (m1 === 'features') {
                    return 'this twitch bot has commands, media commands, timers, translation commands, user-submitted drawings widget, png-tuber, song requests, captions (speech-to-text)!';
                }
                return '';
            },
        },
        {
            regex: /\$user(?:\(([^)]+)\)|())\.(name|profile_image_url|recent_clip_url|last_stream_category)/g,
            replacer: async (_m0, m1, m2, m3) => {
                if (!context) {
                    return '';
                }
                const username = m1 || m2 || context.username;
                if (username === context.username && m3 === 'name') {
                    return String(context['display-name']);
                }
                if (!bot || !user) {
                    return '';
                }
                const helixClient = bot.getUserTwitchClientManager(user).getHelixClient();
                if (!helixClient) {
                    return '';
                }
                const twitchUser = await helixClient.getUserByName(username);
                if (!twitchUser) {
                    return '';
                }
                if (m3 === 'name') {
                    return String(twitchUser.display_name);
                }
                if (m3 === 'profile_image_url') {
                    return String(twitchUser.profile_image_url);
                }
                if (m3 === 'recent_clip_url') {
                    const end = new Date();
                    const start = new Date(end.getTime() - 30 * DAY);
                    const maxDurationSeconds = 30;
                    const clip = await helixClient.getClipByUserId(twitchUser.id, start.toISOString(), end.toISOString(), maxDurationSeconds);
                    return String(clip?.embed_url || '');
                }
                if (m3 === 'last_stream_category') {
                    const channelInfo = await helixClient.getChannelInformation(twitchUser.id);
                    return String(channelInfo?.game_name || '');
                }
                return '';
            },
        },
        {
            regex: /\$customapi\(([^$)]*)\)\['([A-Za-z0-9_ -]+)'\]/g,
            replacer: async (_m0, m1, m2) => {
                try {
                    const url = await doReplacements(m1, command, context, originalCmd, bot, user);
                    // both of getText and JSON.parse can fail, so everything in a single try catch
                    const resp = await xhr.get(url);
                    const txt = await resp.text();
                    return String(JSON.parse(txt)[m2]);
                }
                catch (e) {
                    log$x.error(e);
                    return '';
                }
            },
        },
        {
            regex: /\$customapi\(([^$)]*)\)/g,
            replacer: async (_m0, m1) => {
                try {
                    const url = await doReplacements(m1, command, context, originalCmd, bot, user);
                    const resp = await xhr.get(url);
                    return await resp.text();
                }
                catch (e) {
                    log$x.error(e);
                    return '';
                }
            },
        },
        {
            regex: /\$urlencode\(([^$)]*)\)/g,
            replacer: async (_m0, m1) => {
                const value = await doReplacements(m1, command, context, originalCmd, bot, user);
                return encodeURIComponent(value);
            },
        },
        {
            regex: /\$calc\((\d+)([*/+-])(\d+)\)/g,
            replacer: async (_m0, arg1, op, arg2) => {
                const arg1Int = parseInt(arg1, 10);
                const arg2Int = parseInt(arg2, 10);
                switch (op) {
                    case '+':
                        return `${(arg1Int + arg2Int)}`;
                    case '-':
                        return `${(arg1Int - arg2Int)}`;
                    case '/':
                        return `${(arg1Int / arg2Int)}`;
                    case '*':
                        return `${(arg1Int * arg2Int)}`;
                }
                return '';
            },
        },
    ];
    let replaced = String(text);
    let orig;
    do {
        orig = replaced;
        for (const replace of replaces) {
            replaced = await replaceAsync(replaced, replace.regex, replace.replacer);
        }
    } while (orig !== replaced);
    return replaced;
};
const joinIntoChunks = (strings, glue, maxChunkLen) => {
    const chunks = [];
    let chunk = [];
    for (let i = 0; i < strings.length; i++) {
        chunk.push(strings[i]);
        if (chunk.join(glue).length > maxChunkLen) {
            chunk.pop();
            chunks.push(chunk.join(glue));
            chunk = [];
            chunk.push(strings[i]);
        }
    }
    chunks.push(chunk.join(glue));
    return chunks;
};
const parseISO8601Duration = (duration) => {
    // P(n)Y(n)M(n)DT(n)H(n)M(n)S
    const m = duration.match(/^P(?:(\d+)Y)?(?:(\d+)M)?(?:(\d+)D)?(?:T(?:(\d+)H)?(?:(\d+)M)?(?:(\d+)S)?)?$/);
    if (!m) {
        return 0;
    }
    const Y = m[1] ? parseInt(m[1], 10) : 0;
    const Mo = m[2] ? parseInt(m[2], 10) : 0;
    const D = m[3] ? parseInt(m[3], 10) : 0;
    const H = m[4] ? parseInt(m[4], 10) : 0;
    const M = m[5] ? parseInt(m[5], 10) : 0;
    const S = m[6] ? parseInt(m[6], 10) : 0;
    // note: we just calculate month as having 30 days,
    // because knowledge about what exact year it is is missing
    return ((S * SECOND)
        + (M * MINUTE)
        + (H * HOUR)
        + (D * DAY)
        + (Mo * MONTH)
        + (Y * YEAR));
};
const passwordSalt = () => {
    return nonce(10);
};
const passwordHash = (plainPass, salt) => {
    const hash = crypto.createHmac('sha512', config.secret);
    hash.update(`${salt}${plainPass}`);
    return hash.digest('hex');
};
const findIdxFuzzy = (array, search, keyFn = String) => {
    let idx = findIdxBySearchExact(array, search, keyFn);
    if (idx === -1) {
        idx = findIdxBySearchExactStartsWith(array, search, keyFn);
    }
    if (idx === -1) {
        idx = findIdxBySearchExactWord(array, search, keyFn);
    }
    if (idx === -1) {
        idx = findIdxBySearchExactPart(array, search, keyFn);
    }
    if (idx === -1) {
        idx = findIdxBySearchInOrder(array, search, keyFn);
    }
    if (idx === -1) {
        idx = findIdxBySearch(array, search, keyFn);
    }
    return idx;
};
const accentFolded = (str) => {
    // @see https://stackoverflow.com/a/37511463/392905 + comments about ł
    return str.normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/\u0142/g, "l");
};
const findShortestIdx = (array, indexes, keyFn) => {
    let shortestIdx = -1;
    let shortest = 0;
    array.forEach((item, idx) => {
        const len = keyFn(item).length;
        if (indexes.includes(idx) && (shortestIdx === -1 || len < shortest)) {
            shortest = len;
            shortestIdx = idx;
        }
    });
    return shortestIdx;
};
const findIdxBySearchExact = (array, search, keyFn = String) => {
    const searchLower = accentFolded(search.toLowerCase());
    const indexes = [];
    array.forEach((item, index) => {
        if (accentFolded(keyFn(item).toLowerCase()) === searchLower) {
            indexes.push(index);
        }
    });
    return findShortestIdx(array, indexes, keyFn);
};
const findIdxBySearchExactStartsWith = (array, search, keyFn = String) => {
    const searchLower = accentFolded(search.toLowerCase());
    const indexes = [];
    array.forEach((item, index) => {
        if (accentFolded(keyFn(item).toLowerCase()).startsWith(searchLower)) {
            indexes.push(index);
        }
    });
    return findShortestIdx(array, indexes, keyFn);
};
const findIdxBySearchExactWord = (array, search, keyFn = String) => {
    const searchLower = accentFolded(search.toLowerCase());
    const indexes = [];
    array.forEach((item, index) => {
        const keyLower = accentFolded(keyFn(item).toLowerCase());
        const idx = keyLower.indexOf(searchLower);
        if (idx === -1) {
            return;
        }
        const idxBefore = idx - 1;
        if (idxBefore >= 0 && keyLower[idxBefore].match(/\w/)) {
            return;
        }
        const idxAfter = idx + searchLower.length;
        if (idxAfter < keyLower.length && keyLower[idxAfter].match(/\w/)) {
            return;
        }
        indexes.push(index);
    });
    return findShortestIdx(array, indexes, keyFn);
};
const findIdxBySearchExactPart = (array, search, keyFn = String) => {
    const searchLower = accentFolded(search.toLowerCase());
    const indexes = [];
    array.forEach((item, index) => {
        if (accentFolded(keyFn(item).toLowerCase()).indexOf(searchLower) !== -1) {
            indexes.push(index);
        }
    });
    return findShortestIdx(array, indexes, keyFn);
};
const findIdxBySearchInOrder = (array, search, keyFn = String) => {
    const split = accentFolded(search).split(/\s+/);
    const regexArgs = split.map(arg => arg.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'));
    const regex = new RegExp(regexArgs.join('.*'), 'i');
    const indexes = [];
    array.forEach((item, index) => {
        if (accentFolded(keyFn(item)).match(regex)) {
            indexes.push(index);
        }
    });
    return findShortestIdx(array, indexes, keyFn);
};
const findIdxBySearch = (array, search, keyFn = String) => {
    const split = accentFolded(search).split(/\s+/);
    const regexArgs = split.map(arg => arg.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'));
    const regexes = regexArgs.map(arg => new RegExp(arg, 'i'));
    return array.findIndex(item => {
        const str = accentFolded(keyFn(item));
        for (const regex of regexes) {
            if (!str.match(regex)) {
                return false;
            }
        }
        return true;
    });
};
/**
 * Determines new volume from an input and a current volume.
 * If the input cannot be parsed, the current volume is returned.
 */
const determineNewVolume = (input, currentVal) => {
    if (input.match(/^\+\d+$/)) {
        // prefixed with + means increase volume by an amount
        const val = parseInt(input.substring(1), 10);
        if (isNaN(val)) {
            return currentVal;
        }
        return currentVal + val;
    }
    if (input.match(/^-\d+$/)) {
        // prefixed with - means decrease volume by an amount
        const val = parseInt(input.substring(1), 10);
        if (isNaN(val)) {
            return currentVal;
        }
        return currentVal - val;
    }
    // no prefix, just set the volume to the input
    const val = parseInt(input, 10);
    if (isNaN(val)) {
        return currentVal;
    }
    return val;
};
var fn = {
    applyVariableChanges,
    logger,
    mimeToExt,
    decodeBase64Image,
    sayFn,
    parseCommandFromTriggerAndMessage,
    parseCommandFromCmdAndMessage,
    passwordSalt,
    passwordHash,
    getRandomInt,
    getRandom,
    sleep,
    fnRandom,
    parseISO8601Duration,
    doReplacements,
    joinIntoChunks,
    findIdxFuzzy,
    findIdxBySearchExactPart,
    findIdxBySearchInOrder,
    findIdxBySearch,
};

const TABLE$7 = 'robyottoko.token';
var TokenType;
(function (TokenType) {
    TokenType["API_KEY"] = "api_key";
    TokenType["AUTH"] = "auth";
    TokenType["PASSWORD_RESET"] = "password_reset";
    TokenType["PUB"] = "pub";
    TokenType["REGISTRATION"] = "registration";
})(TokenType || (TokenType = {}));
function generateToken(length) {
    // edit the token allowed characters
    const a = 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ1234567890'.split('');
    const b = [];
    for (let i = 0; i < length; i++) {
        const j = parseInt((Math.random() * (a.length - 1)).toFixed(0), 10);
        b[i] = a[j];
    }
    return b.join('');
}
class Tokens {
    constructor(db) {
        this.db = db;
    }
    async getByUserIdAndType(user_id, type) {
        return await this.db.get(TABLE$7, { user_id, type });
    }
    async insert(tokenInfo) {
        return await this.db.insert(TABLE$7, tokenInfo);
    }
    async createToken(user_id, type) {
        const token = generateToken(32);
        const tokenObj = { user_id, type, token };
        await this.insert(tokenObj);
        return tokenObj;
    }
    async getOrCreateToken(user_id, type) {
        return (await this.getByUserIdAndType(user_id, type))
            || (await this.createToken(user_id, type));
    }
    async getByTokenAndType(token, type) {
        return (await this.db.get(TABLE$7, { token, type })) || null;
    }
    async delete(token) {
        return await this.db.delete(TABLE$7, { token });
    }
    async generateAuthTokenForUserId(user_id) {
        return await this.createToken(user_id, TokenType.AUTH);
    }
}

class Auth {
    constructor(userRepo, tokenRepo) {
        this.userRepo = userRepo;
        this.tokenRepo = tokenRepo;
    }
    async getTokenInfoByTokenAndType(token, type) {
        return await this.tokenRepo.getByTokenAndType(token, type);
    }
    async getUserById(id) {
        return await this.userRepo.get({ id, status: 'verified' });
    }
    async getUserByNameAndPass(name, plainPass) {
        const user = await this.userRepo.get({ name, status: 'verified' });
        if (!user || user.pass !== passwordHash(plainPass, user.salt)) {
            return null;
        }
        return user;
    }
    async getUserAuthToken(user_id) {
        return (await this.tokenRepo.generateAuthTokenForUserId(user_id)).token;
    }
    async destroyToken(token) {
        return await this.tokenRepo.delete(token);
    }
    addAuthInfoMiddleware() {
        return async (req, _res, next) => {
            const token = req.cookies['x-token'] || null;
            const tokenInfo = await this.getTokenInfoByTokenAndType(token, TokenType.AUTH);
            if (tokenInfo) {
                const user = await this.userRepo.getById(tokenInfo.user_id);
                if (user) {
                    req.token = tokenInfo.token;
                    req.user = {
                        id: user.id,
                        name: user.name,
                        email: user.email,
                        status: user.status,
                        groups: await this.userRepo.getGroups(user.id)
                    };
                }
                else {
                    req.token = null;
                    req.user = null;
                }
            }
            else {
                req.token = null;
                req.user = null;
            }
            next();
        };
    }
    async userFromWidgetToken(token, type) {
        const tokenInfo = await this.getTokenInfoByTokenAndType(token, `widget_${type}`);
        if (tokenInfo) {
            return await this.getUserById(tokenInfo.user_id);
        }
        return null;
    }
    async userFromPubToken(token) {
        const tokenInfo = await this.getTokenInfoByTokenAndType(token, TokenType.PUB);
        if (tokenInfo) {
            return await this.getUserById(tokenInfo.user_id);
        }
        return null;
    }
    async wsTokenFromProtocol(protocol, tokenType) {
        let proto = Array.isArray(protocol) && protocol.length === 2
            ? protocol[1]
            : protocol;
        if (Array.isArray(protocol) && protocol.length === 1) {
            proto = protocol[0];
        }
        if (Array.isArray(proto)) {
            return null;
        }
        if (tokenType) {
            const tokenInfo = await this.getTokenInfoByTokenAndType(proto, tokenType);
            if (tokenInfo) {
                return tokenInfo;
            }
            return null;
        }
        let tokenInfo = await this.getTokenInfoByTokenAndType(proto, TokenType.AUTH);
        if (tokenInfo) {
            return tokenInfo;
        }
        tokenInfo = await this.getTokenInfoByTokenAndType(proto, TokenType.PUB);
        if (tokenInfo) {
            return tokenInfo;
        }
        return null;
    }
}

class ModuleManager {
    constructor() {
        this.instances = {};
    }
    add(userId, mod) {
        this.instances[userId] = this.instances[userId] || [];
        this.instances[userId].push(mod);
    }
    all(userId) {
        return this.instances[userId] || [];
    }
    get(userId, name) {
        for (const m of this.all(userId)) {
            if (m.name === name) {
                return m;
            }
        }
        return null;
    }
}

const log$w = logger("WebSocketServer.ts");
class WebSocketServer {
    constructor() {
        this._websocketserver = null;
    }
    listen(bot) {
        this._websocketserver = new WebSocket.Server(bot.getConfig().ws);
        this._websocketserver.on('connection', async (socket, request) => {
            // note: here the socket is already set in _websocketserver.clients !
            // but it has no user_id or module set yet!
            const pathname = new URL(bot.getConfig().ws.connectstring).pathname;
            const relpathfull = request.url?.substring(pathname.length) || '';
            const token = socket.protocol;
            const widget_path_to_module_map = {
                widget_avatar: 'avatar',
                widget_avatar_receive: 'avatar',
                widget_drawcast_control: 'drawcast',
                widget_drawcast_draw: 'drawcast',
                widget_drawcast_receive: 'drawcast',
                widget_media: 'general',
                widget_pomo: 'pomo',
                'widget_speech-to-text': 'speech-to-text',
                'widget_speech-to-text_receive': 'speech-to-text',
                widget_sr: 'sr',
            };
            const relpath = relpathfull.startsWith('/') ? relpathfull.substring(1) : relpathfull;
            const widgetModule = widget_path_to_module_map[relpath];
            const token_type = widgetModule ? relpath : null;
            const moduleName = widgetModule || relpath;
            const tokenInfo = await bot.getAuth().wsTokenFromProtocol(token, token_type);
            if (tokenInfo) {
                socket.user_id = tokenInfo.user_id;
            }
            else if (process.env.VITE_ENV === 'development') {
                socket.user_id = parseInt(token, 10);
            }
            socket.module = moduleName;
            log$w.info('added socket: ', moduleName, socket.protocol);
            log$w.info('socket count: ', this.sockets().filter(s => s.module === socket.module).length);
            socket.on('close', () => {
                log$w.info('removed socket: ', moduleName, socket.protocol);
                log$w.info('socket count: ', this.sockets().filter(s => s.module === socket.module).length);
            });
            if (request.url?.indexOf(pathname) !== 0) {
                log$w.info('bad request url: ', request.url);
                socket.close();
                return;
            }
            if (!socket.user_id) {
                log$w.info('not found token: ', token, relpath);
                socket.close();
                return;
            }
            // user connected
            bot.getEventHub().emit('wss_user_connected', socket);
            const m = bot.getModuleManager().get(socket.user_id, moduleName);
            // log.info('found a module?', moduleName, !!m)
            if (m) {
                const evts = m.getWsEvents();
                if (evts && evts['conn']) {
                    // log.info('connected!', moduleName, !!m)
                    evts['conn'](socket);
                }
            }
            socket.on('message', (data) => {
                try {
                    const unknownData = data;
                    const d = JSON.parse(unknownData);
                    if (d.type && d.type === 'ping') {
                        socket.send(JSON.stringify({ type: 'pong' }));
                        return;
                    }
                    if (m && d.event) {
                        const evts = m.getWsEvents();
                        if (evts && evts[d.event]) {
                            evts[d.event](socket, d);
                        }
                    }
                }
                catch (e) {
                    log$w.error('socket on message', e);
                }
            });
        });
    }
    isUserConnected(user_id) {
        return !!this.sockets().find(s => s.user_id === user_id);
    }
    _notify(socket, data) {
        log$w.info(`notifying ${socket.user_id} ${socket.module} (${data.event})`);
        socket.send(JSON.stringify(data));
    }
    notifyOne(user_ids, moduleName, data, socket) {
        const isConnectedSocket = this.sockets().includes(socket);
        if (isConnectedSocket
            && socket.user_id
            && user_ids.includes(socket.user_id)
            && socket.module === moduleName) {
            this._notify(socket, data);
        }
        else {
            log$w.error('tried to notify invalid socket', socket.user_id, socket.module, user_ids, moduleName, isConnectedSocket);
        }
    }
    notifyAll(user_ids, moduleName, data) {
        this.sockets().forEach((s) => {
            if (s.user_id && user_ids.includes(s.user_id) && s.module === moduleName) {
                this._notify(s, data);
            }
        });
    }
    sockets() {
        if (!this._websocketserver) {
            return [];
        }
        const sockets = [];
        this._websocketserver.clients.forEach((s) => {
            sockets.push(s);
        });
        return sockets;
    }
    close() {
        if (this._websocketserver) {
            this._websocketserver.close();
        }
    }
}

const log$v = logger('Templates.ts');
class Templates {
    constructor(baseDir) {
        this.templates = {};
        this.baseDir = baseDir;
    }
    add(templatePath) {
        const templatePathAbsolute = path.join(this.baseDir, templatePath);
        this.templates[templatePath] = { templatePathAbsolute, templateContents: null };
    }
    async render(templatePath, data) {
        const tmpl = this.templates[templatePath];
        if (tmpl.templateContents === null) {
            try {
                tmpl.templateContents = (await promises.readFile(tmpl.templatePathAbsolute)).toString();
            }
            catch (e) {
                log$v.error('error loading template', e);
                tmpl.templateContents = '';
            }
        }
        return tmpl.templateContents.replace(/\{\{(.*?)\}\}/g, (m0, m1) => {
            return data[m1.trim()] || '';
        });
    }
}

const log$u = logger('oauth.ts');
const TABLE$6 = 'robyottoko.oauth_token';
const getMatchingAccessToken = async (channelId, bot, user) => {
    const twitchChannels = await bot.getTwitchChannels().allByUserId(user.id);
    const channel = twitchChannels.find(c => c.channel_id === channelId && c.access_token);
    return channel ? channel.access_token : null;
};
/**
 * Tries to refresh the access token and returns the new token
 * if successful, otherwise null.
 */
const tryRefreshAccessToken = async (accessToken, bot, user) => {
    const client = bot.getUserTwitchClientManager(user).getHelixClient();
    if (!client) {
        return null;
    }
    const twitchChannels = (await bot.getTwitchChannels().allByUserId(user.id))
        .filter(channel => channel.access_token === accessToken);
    if (twitchChannels.length === 0) {
        return null;
    }
    // there should only be 1 channel per accessToken
    const twitchChannel = twitchChannels[0];
    // try to refresh the token, if possible
    const row = await bot.getDb().get(TABLE$6, {
        access_token: accessToken,
    });
    if (!row || !row.refresh_token) {
        // we have no information about that token
        // or at least no way to refresh it
        return null;
    }
    const refreshResp = await client.refreshAccessToken(row.refresh_token);
    if (!refreshResp) {
        return null;
    }
    // update the token in the database
    await bot.getDb().insert(TABLE$6, {
        user_id: user.id,
        channel_id: twitchChannel.channel_id,
        access_token: refreshResp.access_token,
        refresh_token: refreshResp.refresh_token,
        scope: refreshResp.scope.join(','),
        token_type: refreshResp.token_type,
        expires_at: new Date(new Date().getTime() + refreshResp.expires_in * 1000),
    });
    twitchChannel.access_token = refreshResp.access_token;
    await bot.getTwitchChannels().save(twitchChannel);
    log$u.info('tryRefreshAccessToken - refreshed an access token');
    return refreshResp.access_token;
};
// TODO: check if anything has to be put in a try catch block
const refreshExpiredTwitchChannelAccessToken = async (twitchChannel, bot, user) => {
    const client = bot.getUserTwitchClientManager(user).getHelixClient();
    if (!client) {
        return { error: false, refreshed: false };
    }
    if (!twitchChannel.access_token) {
        return { error: false, refreshed: false };
    }
    if (!twitchChannel.channel_id) {
        const channelId = await client.getUserIdByNameCached(twitchChannel.channel_name, bot.getCache());
        if (!channelId) {
            return { error: false, refreshed: false };
        }
        twitchChannel.channel_id = channelId;
    }
    const resp = await client.validateOAuthToken(twitchChannel.channel_id, twitchChannel.access_token);
    if (resp.valid) {
        // token is valid, check next :)
        return { error: false, refreshed: false };
    }
    // try to refresh the token, if possible
    const row = await bot.getDb().get(TABLE$6, {
        access_token: twitchChannel.access_token,
    });
    if (!row || !row.refresh_token) {
        // we have no information about that token
        // or at least no way to refresh it
        return { error: 'no_refresh_token_found', refreshed: false };
    }
    const refreshResp = await client.refreshAccessToken(row.refresh_token);
    if (!refreshResp) {
        // there was something wrong when refreshing
        return { error: 'refresh_oauth_token_failed', refreshed: false };
    }
    // update the token in the database
    await bot.getDb().insert(TABLE$6, {
        user_id: user.id,
        channel_id: twitchChannel.channel_id,
        access_token: refreshResp.access_token,
        refresh_token: refreshResp.refresh_token,
        scope: refreshResp.scope.join(','),
        token_type: refreshResp.token_type,
        expires_at: new Date(new Date().getTime() + refreshResp.expires_in * 1000),
    });
    // update the twitch channel in the database
    twitchChannel.access_token = refreshResp.access_token;
    await bot.getTwitchChannels().save(twitchChannel);
    log$u.info('refreshExpiredTwitchChannelAccessToken - refreshed an access token');
    return { error: false, refreshed: true };
};
// TODO: check if anything has to be put in a try catch block
const handleOAuthCodeCallback = async (code, redirectUri, bot, user) => {
    const client = bot.getUserTwitchClientManager(user).getHelixClient();
    if (!client) {
        return { error: true, updated: false };
    }
    const resp = await client.getAccessTokenByCode(code, redirectUri);
    if (!resp) {
        return { error: true, updated: false };
    }
    // get the user that corresponds to the token
    const userResp = await client.getUser(resp.access_token);
    if (!userResp) {
        return { error: true, updated: false };
    }
    // store the token
    await bot.getDb().insert(TABLE$6, {
        user_id: user.id,
        channel_id: userResp.id,
        access_token: resp.access_token,
        refresh_token: resp.refresh_token,
        scope: resp.scope.join(','),
        token_type: resp.token_type,
        expires_at: new Date(new Date().getTime() + resp.expires_in * 1000),
    });
    let updated = false;
    const twitchChannels = await bot.getTwitchChannels().allByUserId(user.id);
    for (const twitchChannel of twitchChannels) {
        if (!twitchChannel.channel_id) {
            const channelId = await client.getUserIdByNameCached(twitchChannel.channel_name, bot.getCache());
            if (!channelId) {
                continue;
            }
            twitchChannel.channel_id = channelId;
        }
        if (twitchChannel.channel_id !== userResp.id) {
            continue;
        }
        twitchChannel.access_token = resp.access_token;
        await bot.getTwitchChannels().save(twitchChannel);
        updated = true;
    }
    return { error: false, updated };
};

var CommandTriggerType;
(function (CommandTriggerType) {
    CommandTriggerType["COMMAND"] = "command";
    CommandTriggerType["REWARD_REDEMPTION"] = "reward_redemption";
    CommandTriggerType["FOLLOW"] = "follow";
    CommandTriggerType["SUB"] = "sub";
    CommandTriggerType["BITS"] = "bits";
    CommandTriggerType["RAID"] = "raid";
    CommandTriggerType["TIMER"] = "timer";
    CommandTriggerType["FIRST_CHAT"] = "first_chat";
})(CommandTriggerType || (CommandTriggerType = {}));
var CommandAction;
(function (CommandAction) {
    // general
    CommandAction["TEXT"] = "text";
    CommandAction["MEDIA"] = "media";
    CommandAction["MEDIA_VOLUME"] = "media_volume";
    CommandAction["COUNTDOWN"] = "countdown";
    CommandAction["DICT_LOOKUP"] = "dict_lookup";
    CommandAction["MADOCHAN_CREATEWORD"] = "madochan_createword";
    CommandAction["CHATTERS"] = "chatters";
    CommandAction["SET_CHANNEL_TITLE"] = "set_channel_title";
    CommandAction["SET_CHANNEL_GAME_ID"] = "set_channel_game_id";
    CommandAction["ADD_STREAM_TAGS"] = "add_stream_tags";
    CommandAction["REMOVE_STREAM_TAGS"] = "remove_stream_tags";
    // song request
    CommandAction["SR_CURRENT"] = "sr_current";
    CommandAction["SR_UNDO"] = "sr_undo";
    CommandAction["SR_GOOD"] = "sr_good";
    CommandAction["SR_BAD"] = "sr_bad";
    CommandAction["SR_STATS"] = "sr_stats";
    CommandAction["SR_PREV"] = "sr_prev";
    CommandAction["SR_NEXT"] = "sr_next";
    CommandAction["SR_JUMPTONEW"] = "sr_jumptonew";
    CommandAction["SR_CLEAR"] = "sr_clear";
    CommandAction["SR_RM"] = "sr_rm";
    CommandAction["SR_SHUFFLE"] = "sr_shuffle";
    CommandAction["SR_RESET_STATS"] = "sr_reset_stats";
    CommandAction["SR_LOOP"] = "sr_loop";
    CommandAction["SR_NOLOOP"] = "sr_noloop";
    CommandAction["SR_PAUSE"] = "sr_pause";
    CommandAction["SR_UNPAUSE"] = "sr_unpause";
    CommandAction["SR_HIDEVIDEO"] = "sr_hidevideo";
    CommandAction["SR_SHOWVIDEO"] = "sr_showvideo";
    CommandAction["SR_REQUEST"] = "sr_request";
    CommandAction["SR_RE_REQUEST"] = "sr_re_request";
    CommandAction["SR_ADDTAG"] = "sr_addtag";
    CommandAction["SR_RMTAG"] = "sr_rmtag";
    CommandAction["SR_VOLUME"] = "sr_volume";
    CommandAction["SR_FILTER"] = "sr_filter";
    CommandAction["SR_PRESET"] = "sr_preset";
    CommandAction["SR_QUEUE"] = "sr_queue";
})(CommandAction || (CommandAction = {}));
var CountdownActionType;
(function (CountdownActionType) {
    CountdownActionType["TEXT"] = "text";
    CountdownActionType["MEDIA"] = "media";
    CountdownActionType["DELAY"] = "delay";
})(CountdownActionType || (CountdownActionType = {}));

var CommandRestrict;
(function (CommandRestrict) {
    CommandRestrict["MOD"] = "mod";
    CommandRestrict["SUB"] = "sub";
    CommandRestrict["BROADCASTER"] = "broadcaster";
})(CommandRestrict || (CommandRestrict = {}));
const MOD_OR_ABOVE = [
    CommandRestrict.MOD,
    CommandRestrict.BROADCASTER,
];
[
    { value: CommandRestrict.BROADCASTER, label: "Broadcaster" },
    { value: CommandRestrict.MOD, label: "Moderators" },
    { value: CommandRestrict.SUB, label: "Subscribers" },
];
const isBroadcaster = (ctx) => ctx['room-id'] === ctx['user-id'];
const isMod = (ctx) => !!ctx.mod;
const isSubscriber = (ctx) => !!ctx.subscriber;
const mayExecute = (context, cmd) => {
    if (!cmd.restrict_to || cmd.restrict_to.length === 0) {
        return true;
    }
    if (cmd.restrict_to.includes(CommandRestrict.MOD) && isMod(context)) {
        return true;
    }
    if (cmd.restrict_to.includes(CommandRestrict.SUB) && isSubscriber(context)) {
        return true;
    }
    if (cmd.restrict_to.includes(CommandRestrict.BROADCASTER) && isBroadcaster(context)) {
        return true;
    }
    return false;
};

const newText = () => '';
const newSoundMediaFile = (obj = null) => ({
    filename: getProp(obj, ['filename'], ''),
    file: getProp(obj, ['file'], ''),
    urlpath: getProp(obj, ['urlpath'], ''),
    volume: getProp(obj, ['volume'], 100),
});
const newMediaFile = (obj = null) => ({
    filename: getProp(obj, ['filename'], ''),
    file: getProp(obj, ['file'], ''),
    urlpath: getProp(obj, ['urlpath'], ''),
});
const newMediaVideo = (obj = null) => ({
    // video identified by url
    url: getProp(obj, ['url'], ''),
    volume: getProp(obj, ['volume'], 100),
});
const newMedia = (obj = null) => ({
    widgetIds: getProp(obj, ['widgetIds'], []),
    sound: newSoundMediaFile(obj?.sound),
    image: newMediaFile(obj?.image),
    image_url: getProp(obj, ['image_url'], ''),
    video: newMediaVideo(obj?.video),
    minDurationMs: getProp(obj, ['minDurationMs'], '1s'),
});
const newTrigger = (type) => ({
    type,
    data: {
        // for trigger type "command" (todo: should only exist if type is command, not always)
        command: '',
        commandExact: false,
        // for trigger type "timer" (todo: should only exist if type is timer, not always)
        minInterval: 0,
        minLines: 0,
        // for trigger type "first_chat"
        since: 'stream',
    },
});
const newSubscribeTrigger = () => newTrigger(CommandTriggerType.SUB);
const newFollowTrigger = () => newTrigger(CommandTriggerType.FOLLOW);
const newBitsTrigger = () => newTrigger(CommandTriggerType.BITS);
const newRaidTrigger = () => newTrigger(CommandTriggerType.RAID);
const newRewardRedemptionTrigger = (command = '') => {
    const trigger = newTrigger(CommandTriggerType.REWARD_REDEMPTION);
    trigger.data.command = command;
    return trigger;
};
const newCommandTrigger = (command = '', commandExact = false) => {
    const trigger = newTrigger(CommandTriggerType.COMMAND);
    trigger.data.command = command;
    trigger.data.commandExact = commandExact;
    return trigger;
};
const triggersEqual = (a, b) => {
    if (a.type !== b.type) {
        return false;
    }
    if (a.type === CommandTriggerType.COMMAND) {
        if (a.data.command === b.data.command) {
            // no need to check for commandExact here (i think^^)
            return true;
        }
    }
    else if (a.type === CommandTriggerType.REWARD_REDEMPTION) {
        if (a.data.command === b.data.command) {
            return true;
        }
    }
    else if (a.type === CommandTriggerType.TIMER) {
        if (a.data.minInterval === b.data.minInterval
            && a.data.minLines === b.data.minLines) {
            return true;
        }
    }
    else if (a.type === CommandTriggerType.FIRST_CHAT) {
        return true;
    }
    else if (a.type === CommandTriggerType.SUB) {
        return true;
    }
    else if (a.type === CommandTriggerType.FOLLOW) {
        return true;
    }
    else if (a.type === CommandTriggerType.BITS) {
        return true;
    }
    else if (a.type === CommandTriggerType.RAID) {
        return true;
    }
    return false;
};
const commandHasAnyTrigger = (command, triggers) => {
    for (const cmdTrigger of command.triggers) {
        for (const trigger of triggers) {
            if (triggersEqual(cmdTrigger, trigger)) {
                return true;
            }
        }
    }
    return false;
};
const getUniqueCommandsByTriggers = (commands, triggers) => {
    const tmp = commands.filter((command) => commandHasAnyTrigger(command, triggers));
    return tmp.filter((item, i, ar) => ar.indexOf(item) === i);
};
const commands = {
    add_stream_tags: {
        Name: () => "add_stream_tags command",
        Description: () => "Add streamtag",
        NewCommand: () => ({
            id: nonce(10),
            createdAt: JSON.stringify(new Date()),
            triggers: [newCommandTrigger()],
            action: CommandAction.ADD_STREAM_TAGS,
            restrict_to: MOD_OR_ABOVE,
            variables: [],
            variableChanges: [],
            data: {
                tag: ''
            },
        }),
        RequiresAccessToken: () => true,
    },
    chatters: {
        Name: () => "chatters command",
        Description: () => "Outputs the people who chatted during the stream.",
        NewCommand: () => ({
            id: nonce(10),
            createdAt: JSON.stringify(new Date()),
            triggers: [newCommandTrigger()],
            action: CommandAction.CHATTERS,
            restrict_to: [],
            variables: [],
            variableChanges: [],
            data: {},
        }),
        RequiresAccessToken: () => false,
    },
    countdown: {
        Name: () => "countdown",
        Description: () => "Add a countdown or messages spaced by time intervals.",
        NewCommand: () => ({
            id: nonce(10),
            createdAt: JSON.stringify(new Date()),
            triggers: [newCommandTrigger()],
            action: CommandAction.COUNTDOWN,
            restrict_to: [],
            variables: [],
            variableChanges: [],
            data: {
                type: 'auto',
                step: '',
                steps: '3',
                interval: '1s',
                intro: 'Starting countdown...',
                outro: 'Done!',
                actions: []
            },
        }),
        RequiresAccessToken: () => false,
    },
    dict_lookup: {
        Name: () => "dictionary lookup",
        Description: () => "Outputs the translation for the searched word.",
        NewCommand: () => ({
            id: nonce(10),
            createdAt: JSON.stringify(new Date()),
            triggers: [newCommandTrigger()],
            action: CommandAction.DICT_LOOKUP,
            restrict_to: [],
            variables: [],
            variableChanges: [],
            data: {
                lang: 'ja',
                phrase: '',
            },
        }),
        RequiresAccessToken: () => false,
    },
    madochan_createword: {
        Name: () => "madochan",
        Description: () => "Creates a word for a definition.",
        NewCommand: () => ({
            id: nonce(10),
            createdAt: JSON.stringify(new Date()),
            triggers: [newCommandTrigger()],
            action: CommandAction.MADOCHAN_CREATEWORD,
            restrict_to: [],
            variables: [],
            variableChanges: [],
            data: {
                // TODO: use from same resource as server
                model: '100epochs800lenhashingbidirectional.h5',
                weirdness: '1',
            },
        }),
        RequiresAccessToken: () => false,
    },
    media: {
        Name: () => "media command",
        Description: () => "Display an image and/or play a sound.",
        NewCommand: () => ({
            id: nonce(10),
            createdAt: JSON.stringify(new Date()),
            triggers: [newCommandTrigger()],
            action: CommandAction.MEDIA,
            restrict_to: [],
            variables: [],
            variableChanges: [],
            data: newMedia(),
        }),
        RequiresAccessToken: () => false,
    },
    media_volume: {
        Name: () => "media volume command",
        Description: () => `Sets the media volume to <code>&lt;VOLUME&gt;</code> (argument to this command, min 0, max 100).
    <br />
    If no argument is given, just outputs the current volume`,
        NewCommand: () => ({
            id: nonce(10),
            createdAt: JSON.stringify(new Date()),
            triggers: [newCommandTrigger()],
            action: CommandAction.MEDIA_VOLUME,
            restrict_to: MOD_OR_ABOVE,
            variables: [],
            variableChanges: [],
            data: {},
        }),
        RequiresAccessToken: () => false,
    },
    text: {
        Name: () => "command",
        Description: () => "Send a message to chat",
        NewCommand: () => ({
            id: nonce(10),
            createdAt: JSON.stringify(new Date()),
            triggers: [newCommandTrigger()],
            action: CommandAction.TEXT,
            restrict_to: [],
            variables: [],
            variableChanges: [],
            data: {
                text: [newText()],
            },
        }),
        RequiresAccessToken: () => false,
    },
    remove_stream_tags: {
        Name: () => "remove_stream_tags command",
        Description: () => "Remove streamtag",
        NewCommand: () => ({
            id: nonce(10),
            createdAt: JSON.stringify(new Date()),
            triggers: [newCommandTrigger()],
            action: CommandAction.REMOVE_STREAM_TAGS,
            restrict_to: MOD_OR_ABOVE,
            variables: [],
            variableChanges: [],
            data: {
                tag: ''
            },
        }),
        RequiresAccessToken: () => true,
    },
    set_channel_game_id: {
        Name: () => "change stream category command",
        Description: () => "Change the stream category",
        NewCommand: () => ({
            id: nonce(10),
            createdAt: JSON.stringify(new Date()),
            triggers: [newCommandTrigger()],
            action: CommandAction.SET_CHANNEL_GAME_ID,
            restrict_to: MOD_OR_ABOVE,
            variables: [],
            variableChanges: [],
            data: {
                game_id: ''
            },
        }),
        RequiresAccessToken: () => true,
    },
    set_channel_title: {
        Name: () => "change stream title command",
        Description: () => "Change the stream title",
        NewCommand: () => ({
            id: nonce(10),
            createdAt: JSON.stringify(new Date()),
            triggers: [newCommandTrigger()],
            action: CommandAction.SET_CHANNEL_TITLE,
            restrict_to: MOD_OR_ABOVE,
            variables: [],
            variableChanges: [],
            data: {
                title: ''
            },
        }),
        RequiresAccessToken: () => true,
    },
    sr_current: {
        Name: () => "sr_current",
        Description: () => "Show what song is currently playing",
        NewCommand: () => ({
            id: nonce(10),
            createdAt: JSON.stringify(new Date()),
            action: CommandAction.SR_CURRENT,
            triggers: [newCommandTrigger('!sr current', true)],
            restrict_to: [],
            variables: [],
            variableChanges: [],
            data: {},
        }),
        RequiresAccessToken: () => false,
    },
    sr_undo: {
        Name: () => "sr_undo",
        Description: () => "Remove the song that was last added by oneself.",
        NewCommand: () => ({
            id: nonce(10),
            createdAt: JSON.stringify(new Date()),
            action: CommandAction.SR_UNDO,
            triggers: [newCommandTrigger('!sr undo', true)],
            restrict_to: [],
            variables: [],
            variableChanges: [],
            data: {},
        }),
        RequiresAccessToken: () => false,
    },
    sr_good: {
        Name: () => "sr_good",
        Description: () => "Vote the current song up",
        NewCommand: () => ({
            id: nonce(10),
            createdAt: JSON.stringify(new Date()),
            action: CommandAction.SR_GOOD,
            triggers: [newCommandTrigger('!sr good', true)],
            restrict_to: [],
            variables: [],
            variableChanges: [],
            data: {},
        }),
        RequiresAccessToken: () => false,
    },
    sr_bad: {
        Name: () => "sr_bad",
        Description: () => "Vote the current song down",
        NewCommand: () => ({
            id: nonce(10),
            createdAt: JSON.stringify(new Date()),
            action: CommandAction.SR_BAD,
            triggers: [newCommandTrigger('!sr bad', true)],
            restrict_to: [],
            variables: [],
            variableChanges: [],
            data: {},
        }),
        RequiresAccessToken: () => false,
    },
    sr_stats: {
        Name: () => "sr_stats",
        Description: () => "Show stats about the playlist",
        NewCommand: () => ({
            id: nonce(10),
            createdAt: JSON.stringify(new Date()),
            action: CommandAction.SR_STATS,
            triggers: [newCommandTrigger('!sr stats', true), newCommandTrigger('!sr stat', true)],
            restrict_to: [],
            variables: [],
            variableChanges: [],
            data: {},
        }),
        RequiresAccessToken: () => false,
    },
    sr_prev: {
        Name: () => "sr_prev",
        Description: () => "Skip to the previous song",
        NewCommand: () => ({
            id: nonce(10),
            createdAt: JSON.stringify(new Date()),
            action: CommandAction.SR_PREV,
            triggers: [newCommandTrigger('!sr prev', true)],
            restrict_to: MOD_OR_ABOVE,
            variables: [],
            variableChanges: [],
            data: {},
        }),
        RequiresAccessToken: () => false,
    },
    sr_next: {
        Name: () => "sr_next",
        Description: () => "Skip to the next song",
        NewCommand: () => ({
            id: nonce(10),
            createdAt: JSON.stringify(new Date()),
            action: CommandAction.SR_NEXT,
            triggers: [newCommandTrigger('!sr next', true), newCommandTrigger('!sr skip', true)],
            restrict_to: MOD_OR_ABOVE,
            variables: [],
            variableChanges: [],
            data: {},
        }),
        RequiresAccessToken: () => false,
    },
    sr_jumptonew: {
        Name: () => "sr_jumptonew",
        Description: () => "Jump to the next unplayed song",
        NewCommand: () => ({
            id: nonce(10),
            createdAt: JSON.stringify(new Date()),
            action: CommandAction.SR_JUMPTONEW,
            triggers: [newCommandTrigger('!sr jumptonew', true)],
            restrict_to: MOD_OR_ABOVE,
            variables: [],
            variableChanges: [],
            data: {},
        }),
        RequiresAccessToken: () => false,
    },
    sr_clear: {
        Name: () => "sr_clear",
        Description: () => "Clear the playlist",
        NewCommand: () => ({
            id: nonce(10),
            createdAt: JSON.stringify(new Date()),
            action: CommandAction.SR_CLEAR,
            triggers: [newCommandTrigger('!sr clear', true)],
            restrict_to: MOD_OR_ABOVE,
            variables: [],
            variableChanges: [],
            data: {},
        }),
        RequiresAccessToken: () => false,
    },
    sr_rm: {
        Name: () => "sr_rm",
        Description: () => "Remove the current song from the playlist",
        NewCommand: () => ({
            id: nonce(10),
            createdAt: JSON.stringify(new Date()),
            action: CommandAction.SR_RM,
            triggers: [newCommandTrigger('!sr rm', true)],
            restrict_to: MOD_OR_ABOVE,
            variables: [],
            variableChanges: [],
            data: {},
        }),
        RequiresAccessToken: () => false,
    },
    sr_shuffle: {
        Name: () => "sr_shuffle",
        Description: () => `Shuffle the playlist (current song unaffected).
    <br />
    Non-played and played songs will be shuffled separately and non-played
    songs will be put after currently playing song.`,
        NewCommand: () => ({
            id: nonce(10),
            createdAt: JSON.stringify(new Date()),
            action: CommandAction.SR_SHUFFLE,
            triggers: [newCommandTrigger('!sr shuffle', true)],
            restrict_to: MOD_OR_ABOVE,
            variables: [],
            variableChanges: [],
            data: {},
        }),
        RequiresAccessToken: () => false,
    },
    sr_reset_stats: {
        Name: () => "sr_reset_stats",
        Description: () => "Reset all statistics of all songs",
        NewCommand: () => ({
            id: nonce(10),
            createdAt: JSON.stringify(new Date()),
            action: CommandAction.SR_RESET_STATS,
            triggers: [newCommandTrigger('!sr resetStats', true)],
            restrict_to: MOD_OR_ABOVE,
            variables: [],
            variableChanges: [],
            data: {},
        }),
        RequiresAccessToken: () => false,
    },
    sr_loop: {
        Name: () => "sr_loop",
        Description: () => "Loop the current song",
        NewCommand: () => ({
            id: nonce(10),
            createdAt: JSON.stringify(new Date()),
            action: CommandAction.SR_LOOP,
            triggers: [newCommandTrigger('!sr loop', true)],
            restrict_to: MOD_OR_ABOVE,
            variables: [],
            variableChanges: [],
            data: {},
        }),
        RequiresAccessToken: () => false,
    },
    sr_noloop: {
        Name: () => "sr_noloop",
        Description: () => "Stop looping the current song",
        NewCommand: () => ({
            id: nonce(10),
            createdAt: JSON.stringify(new Date()),
            action: CommandAction.SR_NOLOOP,
            triggers: [newCommandTrigger('!sr noloop', true), newCommandTrigger('!sr unloop', true)],
            restrict_to: MOD_OR_ABOVE,
            variables: [],
            variableChanges: [],
            data: {},
        }),
        RequiresAccessToken: () => false,
    },
    sr_pause: {
        Name: () => "sr_pause",
        Description: () => "Pause currently playing song",
        NewCommand: () => ({
            id: nonce(10),
            createdAt: JSON.stringify(new Date()),
            action: CommandAction.SR_PAUSE,
            triggers: [newCommandTrigger('!sr pause', true)],
            restrict_to: MOD_OR_ABOVE,
            variables: [],
            variableChanges: [],
            data: {},
        }),
        RequiresAccessToken: () => false,
    },
    sr_unpause: {
        Name: () => "sr_unpause",
        Description: () => "Unpause currently paused song",
        NewCommand: () => ({
            id: nonce(10),
            createdAt: JSON.stringify(new Date()),
            action: CommandAction.SR_UNPAUSE,
            triggers: [newCommandTrigger('!sr nopause', true), newCommandTrigger('!sr unpause', true)],
            restrict_to: MOD_OR_ABOVE,
            variables: [],
            variableChanges: [],
            data: {},
        }),
        RequiresAccessToken: () => false,
    },
    sr_hidevideo: {
        Name: () => "sr_hidevideo",
        Description: () => "Hide video for current song",
        NewCommand: () => ({
            id: nonce(10),
            createdAt: JSON.stringify(new Date()),
            action: CommandAction.SR_HIDEVIDEO,
            triggers: [newCommandTrigger('!sr hidevideo', true)],
            restrict_to: MOD_OR_ABOVE,
            variables: [],
            variableChanges: [],
            data: {},
        }),
        RequiresAccessToken: () => false,
    },
    sr_showvideo: {
        Name: () => "sr_showvideo",
        Description: () => "Show video for current song",
        NewCommand: () => ({
            id: nonce(10),
            createdAt: JSON.stringify(new Date()),
            action: CommandAction.SR_SHOWVIDEO,
            triggers: [newCommandTrigger('!sr showvideo', true)],
            restrict_to: MOD_OR_ABOVE,
            variables: [],
            variableChanges: [],
            data: {},
        }),
        RequiresAccessToken: () => false,
    },
    sr_request: {
        Name: () => "sr_request",
        Description: () => `
    Search for <code>&lt;SEARCH&gt;</code> (argument to this command)
    at youtube (by id or by title)
    and queue the first result in the playlist (after the first found
    batch of unplayed songs).`,
        NewCommand: () => ({
            id: nonce(10),
            createdAt: JSON.stringify(new Date()),
            action: CommandAction.SR_REQUEST,
            triggers: [newCommandTrigger('!sr')],
            restrict_to: [],
            variables: [],
            variableChanges: [],
            data: {},
        }),
        RequiresAccessToken: () => false,
    },
    sr_re_request: {
        Name: () => "sr_re_request",
        Description: () => `
    Search for <code>&lt;SEARCH&gt;</code> (argument to this command)
    in the current playlist and queue the first result in the playlist
    (after the first found batch of unplayed songs).`,
        NewCommand: () => ({
            id: nonce(10),
            createdAt: JSON.stringify(new Date()),
            action: CommandAction.SR_RE_REQUEST,
            triggers: [newCommandTrigger('!resr')],
            restrict_to: [],
            variables: [],
            variableChanges: [],
            data: {},
        }),
        RequiresAccessToken: () => false,
    },
    sr_addtag: {
        Name: () => "sr_addtag",
        Description: () => "Add tag <code>&lt;TAG&gt;</code> (argument to this command) to the current song",
        NewCommand: () => ({
            id: nonce(10),
            createdAt: JSON.stringify(new Date()),
            action: CommandAction.SR_ADDTAG,
            triggers: [newCommandTrigger('!sr tag'), newCommandTrigger('!sr addtag')],
            restrict_to: MOD_OR_ABOVE,
            variables: [],
            variableChanges: [],
            data: {
                tag: "",
            },
        }),
        RequiresAccessToken: () => false,
    },
    sr_rmtag: {
        Name: () => "sr_rmtag",
        Description: () => "Remove tag <code>&lt;TAG&gt;</code> (argument to this command) from the current song",
        NewCommand: () => ({
            id: nonce(10),
            createdAt: JSON.stringify(new Date()),
            action: CommandAction.SR_RMTAG,
            triggers: [newCommandTrigger('!sr rmtag')],
            restrict_to: MOD_OR_ABOVE,
            variables: [],
            variableChanges: [],
            data: {},
        }),
        RequiresAccessToken: () => false,
    },
    sr_volume: {
        Name: () => "sr_volume",
        Description: () => `Sets the song request volume to <code>&lt;VOLUME&gt;</code> (argument to this command, min 0, max 100).
    <br />
    If no argument is given, just outputs the current volume`,
        NewCommand: () => ({
            id: nonce(10),
            createdAt: JSON.stringify(new Date()),
            action: CommandAction.SR_VOLUME,
            triggers: [newCommandTrigger('!sr volume')],
            restrict_to: MOD_OR_ABOVE,
            variables: [],
            variableChanges: [],
            data: {},
        }),
        RequiresAccessToken: () => false,
    },
    sr_filter: {
        Name: () => "sr_filter",
        Description: () => `Play only songs with the given tag <code>&lt;TAG&gt;</code> (argument to this command). If no tag
  is given, play all songs.`,
        NewCommand: () => ({
            id: nonce(10),
            createdAt: JSON.stringify(new Date()),
            action: CommandAction.SR_FILTER,
            triggers: [newCommandTrigger('!sr filter')],
            restrict_to: MOD_OR_ABOVE,
            variables: [],
            variableChanges: [],
            data: {},
        }),
        RequiresAccessToken: () => false,
    },
    sr_preset: {
        Name: () => "sr_preset",
        Description: () => `Switches to the preset <code>&lt;PRESET&gt;</code> (argument to this command) if it exists.
  If no arguments are given, outputs all available presets.`,
        NewCommand: () => ({
            id: nonce(10),
            createdAt: JSON.stringify(new Date()),
            action: CommandAction.SR_PRESET,
            triggers: [newCommandTrigger('!sr preset')],
            restrict_to: MOD_OR_ABOVE,
            variables: [],
            variableChanges: [],
            data: {},
        }),
        RequiresAccessToken: () => false,
    },
    sr_queue: {
        Name: () => "sr_queue",
        Description: () => `Shows the next 3 songs that will play.`,
        NewCommand: () => ({
            id: nonce(10),
            createdAt: JSON.stringify(new Date()),
            action: CommandAction.SR_QUEUE,
            triggers: [newCommandTrigger('!sr queue')],
            restrict_to: [],
            variables: [],
            variableChanges: [],
            data: {},
        }),
        RequiresAccessToken: () => false,
    },
};

const log$t = logger('CommandExecutor.ts');
class CommandExecutor {
    async executeMatchingCommands(bot, user, rawCmd, target, context, triggers) {
        const promises = [];
        const ctx = { rawCmd, target, context };
        for (const m of bot.getModuleManager().all(user.id)) {
            const cmdDefs = getUniqueCommandsByTriggers(m.getCommands(), triggers);
            promises.push(this.tryExecuteCommands(m, cmdDefs, ctx));
        }
        await Promise.all(promises);
    }
    async tryExecuteCommands(contextModule, cmdDefs, ctx) {
        const promises = [];
        for (const cmdDef of cmdDefs) {
            if (!ctx.context || !mayExecute(ctx.context, cmdDef)) {
                continue;
            }
            log$t.info(`${ctx.target}| * Executing ${ctx.rawCmd?.name || '<unknown>'} command`);
            // eslint-disable-next-line no-async-promise-executor
            const p = new Promise(async (resolve) => {
                await fn.applyVariableChanges(cmdDef, contextModule, ctx.rawCmd, ctx.context);
                const r = await cmdDef.fn(ctx);
                if (r) {
                    log$t.info(`${ctx.target}| * Returned: ${r}`);
                }
                log$t.info(`${ctx.target}| * Executed ${ctx.rawCmd?.name || '<unknown>'} command`);
                resolve(true);
            });
            promises.push(p);
        }
        await Promise.all(promises);
    }
}

const log$s = logger('SubscribeEventHandler.ts');
class SubscribeEventHandler {
    // TODO: use better type info
    async handle(bot, user, data) {
        log$s.info('handle');
        const rawCmd = {
            name: 'channel.subscribe',
            args: [],
        };
        const target = data.event.broadcaster_user_name;
        const context = {
            "room-id": data.event.broadcaster_user_id,
            "user-id": data.event.user_id,
            "display-name": data.event.user_name,
            username: data.event.user_login,
            mod: false,
            subscriber: true,
            badges: {},
        };
        const trigger = newSubscribeTrigger();
        const exec = new CommandExecutor();
        await exec.executeMatchingCommands(bot, user, rawCmd, target, context, [trigger]);
    }
}

const log$r = logger('FollowEventHandler.ts');
class FollowEventHandler {
    // TODO: use better type info
    async handle(bot, user, data) {
        log$r.info('handle');
        const rawCmd = {
            name: 'channel.follow',
            args: [],
        };
        const target = data.event.broadcaster_user_name;
        const context = {
            "room-id": data.event.broadcaster_user_id,
            "user-id": data.event.user_id,
            "display-name": data.event.user_name,
            username: data.event.user_login,
            mod: false,
            subscriber: false,
            badges: {},
        };
        const trigger = newFollowTrigger();
        const exec = new CommandExecutor();
        await exec.executeMatchingCommands(bot, user, rawCmd, target, context, [trigger]);
    }
}

const log$q = logger('CheerEventHandler.ts');
class CheerEventHandler {
    // TODO: use better type info
    async handle(bot, user, data) {
        log$q.info('handle');
        const rawCmd = {
            name: 'channel.cheer',
            args: [],
        };
        const target = data.event.broadcaster_user_name;
        const context = {
            "room-id": data.event.broadcaster_user_id,
            "user-id": data.event.user_id,
            "display-name": data.event.user_name,
            username: data.event.user_login,
            mod: false,
            subscriber: false,
            badges: {},
        };
        const trigger = newBitsTrigger();
        const exec = new CommandExecutor();
        await exec.executeMatchingCommands(bot, user, rawCmd, target, context, [trigger]);
    }
}

const log$p = logger('ChannelPointRedeemEventHandler.ts');
class ChannelPointRedeemEventHandler {
    async handle(bot, user, data) {
        log$p.info('handle');
        const rawCmd = {
            name: data.event.reward.title,
            args: data.event.user_input ? [data.event.user_input] : [],
        };
        const target = data.event.broadcaster_user_name;
        const context = {
            "room-id": data.event.broadcaster_user_id,
            "user-id": data.event.user_id,
            "display-name": data.event.user_name,
            username: data.event.user_login,
            mod: false,
            subscriber: false,
            badges: {}
        };
        const trigger = newRewardRedemptionTrigger(data.event.reward.title);
        const exec = new CommandExecutor();
        await exec.executeMatchingCommands(bot, user, rawCmd, target, context, [trigger]);
    }
}

// https://dev.twitch.tv/docs/eventsub/eventsub-subscription-types
var SubscriptionType;
(function (SubscriptionType) {
    SubscriptionType["ChannelFollow"] = "channel.follow";
    SubscriptionType["ChannelCheer"] = "channel.cheer";
    SubscriptionType["ChannelRaid"] = "channel.raid";
    SubscriptionType["ChannelSubscribe"] = "channel.subscribe";
    SubscriptionType["ChannelPointsCustomRewardRedemptionAdd"] = "channel.channel_points_custom_reward_redemption.add";
    SubscriptionType["StreamOnline"] = "stream.online";
    SubscriptionType["StreamOffline"] = "stream.offline";
})(SubscriptionType || (SubscriptionType = {}));
const ALL_SUBSCRIPTIONS_TYPES = Object.values(SubscriptionType);

const log$o = logger('StreamOnlineEventHandler.ts');
class StreamOnlineEventHandler {
    async handle(bot, data) {
        log$o.info('handle');
        // insert new stream
        await bot.getDb().insert('robyottoko.streams', {
            broadcaster_user_id: data.event.broadcaster_user_id,
            started_at: new Date(data.event.started_at),
        });
    }
}

const log$n = logger('StreamOfflineEventHandler.ts');
class StreamOfflineEventHandler {
    async handle(bot, data) {
        log$n.info('handle');
        // get last started stream for broadcaster
        // if it exists and it didnt end yet set ended_at date
        const stream = await bot.getDb().get('robyottoko.streams', {
            broadcaster_user_id: data.event.broadcaster_user_id,
        }, [{ started_at: -1 }]);
        if (stream) {
            if (!stream.ended_at) {
                await bot.getDb().update('robyottoko.streams', {
                    ended_at: new Date(),
                }, { id: stream.id });
            }
        }
    }
}

const log$m = logger('RaidEventHandler.ts');
class RaidEventHandler {
    // TODO: use better type info
    async handle(bot, user, data) {
        log$m.info('handle');
        const rawCmd = {
            name: 'channel.raid',
            args: [],
        };
        const target = data.event.broadcaster_user_name;
        const context = {
            "room-id": data.event.to_broadcaster_user_id,
            "user-id": data.event.from_broadcaster_user_id,
            "display-name": data.event.from_broadcaster_user_name,
            username: data.event.from_broadcaster_user_login,
            mod: false,
            subscriber: false,
            badges: {},
        };
        const trigger = newRaidTrigger();
        const exec = new CommandExecutor();
        await exec.executeMatchingCommands(bot, user, rawCmd, target, context, [trigger]);
    }
}

const log$l = logger('twitch/index.ts');
const createRouter$3 = (templates, bot) => {
    const verifyTwitchSignature = (req, res, next) => {
        const body = Buffer.from(req.rawBody, 'utf8');
        const msg = `${req.headers['twitch-eventsub-message-id']}${req.headers['twitch-eventsub-message-timestamp']}${body}`;
        const hmac = crypto.createHmac('sha256', bot.getConfig().twitch.eventSub.transport.secret);
        hmac.update(msg);
        const expected = `sha256=${hmac.digest('hex')}`;
        if (req.headers['twitch-eventsub-message-signature'] !== expected) {
            log$l.debug(req);
            log$l.error('bad message signature', {
                got: req.headers['twitch-eventsub-message-signature'],
                expected,
            });
            res.status(403).send({ reason: 'bad message signature' });
            return;
        }
        return next();
    };
    const router = express.Router();
    // twitch calls this url after auth
    // from here we render a js that reads the token and shows it to the user
    router.get('/redirect_uri', async (req, res) => {
        if (!req.user) {
            // a user that is not logged in may not visit to redirect_uri
            res.status(401).send({ reason: 'not logged in' });
            return;
        }
        // in success case:
        // http://localhost:3000/
        // ?code=gulfwdmys5lsm6qyz4xiz9q32l10
        // &scope=channel%3Amanage%3Apolls+channel%3Aread%3Apolls
        // &state=c3ab8aa609ea11e793ae92361f002671
        if (req.query.code) {
            const code = `${req.query.code}`;
            const redirectUri = `${bot.getConfig().http.url}/twitch/redirect_uri`;
            const result = await handleOAuthCodeCallback(code, redirectUri, bot, req.user);
            if (result.error) {
                res.status(500).send("Something went wrong!");
                return;
            }
            if (result.updated) {
                const changedUser = await bot.getUsers().getById(req.user.id);
                if (changedUser) {
                    bot.getEventHub().emit('user_changed', changedUser);
                }
                else {
                    log$l.error(`updating user twitch channels: user doesn't exist after saving it: ${req.user.id}`);
                }
            }
            res.send(await templates.render('templates/twitch_redirect_uri.html', {}));
            return;
        }
        // in error case:
        // http://localhost:3000/
        // ?error=access_denied
        // &error_description=The+user+denied+you+access
        // &state=c3ab8aa609ea11e793ae92361f002671
        res.status(403).send({ reason: req.query });
    });
    router.post('/event-sub/', express.json({ verify: (req, _res, buf) => { req.rawBody = buf; } }), verifyTwitchSignature, async (req, res) => {
        // log.debug(req.body)
        // log.debug(req.headers)
        if (req.headers['twitch-eventsub-message-type'] === 'webhook_callback_verification') {
            log$l.info(`got verification request, challenge: ${req.body.challenge}`);
            res.write(req.body.challenge);
            res.send();
            return;
        }
        if (req.headers['twitch-eventsub-message-type'] === 'notification') {
            log$l.info(`got notification request: ${req.body.subscription.type}`);
            const row = await bot.getDb().get('robyottoko.event_sub', {
                subscription_id: req.body.subscription.id,
            });
            if (!row) {
                log$l.info('unknown subscription_id');
                res.status(400).send({ reason: 'unknown subscription_id' });
                return;
            }
            const userId = row.user_id;
            // const userId = 2
            const user = await bot.getUsers().getById(userId);
            if (!user) {
                log$l.info('unknown user');
                res.status(400).send({ reason: 'unknown user' });
                return;
            }
            if (req.body.subscription.type === SubscriptionType.ChannelSubscribe) {
                await (new SubscribeEventHandler()).handle(bot, user, req.body);
            }
            else if (req.body.subscription.type === SubscriptionType.ChannelFollow) {
                await (new FollowEventHandler()).handle(bot, user, req.body);
            }
            else if (req.body.subscription.type === SubscriptionType.ChannelCheer) {
                await (new CheerEventHandler()).handle(bot, user, req.body);
            }
            else if (req.body.subscription.type === SubscriptionType.ChannelRaid) {
                await (new RaidEventHandler()).handle(bot, user, req.body);
            }
            else if (req.body.subscription.type === SubscriptionType.ChannelPointsCustomRewardRedemptionAdd) {
                await (new ChannelPointRedeemEventHandler()).handle(bot, user, req.body);
            }
            else if (req.body.subscription.type === SubscriptionType.StreamOnline) {
                await (new StreamOnlineEventHandler()).handle(bot, req.body);
            }
            else if (req.body.subscription.type === SubscriptionType.StreamOffline) {
                await (new StreamOfflineEventHandler()).handle(bot, req.body);
            }
            res.send();
            return;
        }
        res.status(400).send({ reason: 'unhandled sub type' });
    });
    return router;
};

const log$k = logger('TwitchHelixClient.ts');
const API_BASE = 'https://api.twitch.tv/helix';
const TOKEN_ENDPOINT = 'https://id.twitch.tv/oauth2/token';
const apiUrl = (path) => `${API_BASE}${path}`;
function getBestEntryFromCategorySearchItems(searchString, resp) {
    const idx = findIdxFuzzy(resp.data, searchString, (item) => item.name);
    return idx === -1 ? null : resp.data[idx];
}
async function executeRequestWithRetry(accessToken, req, bot, user) {
    const resp = await req(accessToken);
    if (resp.status !== 401) {
        return resp;
    }
    // try to refresh the token and try again
    const newAccessToken = await tryRefreshAccessToken(accessToken, bot, user);
    if (!newAccessToken) {
        return resp;
    }
    log$k.warn('retrying with refreshed token');
    return await req(newAccessToken);
}
class TwitchHelixClient {
    constructor(clientId, clientSecret) {
        this.clientId = clientId;
        this.clientSecret = clientSecret;
    }
    _authHeaders(accessToken) {
        return {
            'Client-ID': this.clientId,
            'Authorization': `Bearer ${accessToken}`,
        };
    }
    async withAuthHeaders(opts = {}) {
        const accessToken = await this.getAccessToken();
        return withHeaders(this._authHeaders(accessToken), opts);
    }
    async getAccessTokenByCode(code, redirectUri) {
        const url = TOKEN_ENDPOINT + asQueryArgs({
            client_id: this.clientId,
            client_secret: this.clientSecret,
            grant_type: 'authorization_code',
            code,
            redirect_uri: redirectUri,
        });
        try {
            const resp = await xhr.post(url);
            if (!resp.ok) {
                const txt = await resp.text();
                log$k.warn('unable to get access_token by code', txt);
                return null;
            }
            return (await resp.json());
        }
        catch (e) {
            log$k.error(url, e);
            return null;
        }
    }
    // https://dev.twitch.tv/docs/authentication/refresh-tokens
    async refreshAccessToken(refreshToken) {
        const url = TOKEN_ENDPOINT + asQueryArgs({
            client_id: this.clientId,
            client_secret: this.clientSecret,
            grant_type: 'refresh_token',
            refresh_token: refreshToken,
        });
        try {
            const resp = await xhr.post(url);
            if (resp.status === 401) {
                const txt = await resp.text();
                log$k.warn('tried to refresh access_token with an invalid refresh token', txt);
                return null;
            }
            if (!resp.ok) {
                const txt = await resp.text();
                log$k.warn('unable to refresh access_token', txt);
                return null;
            }
            return (await resp.json());
        }
        catch (e) {
            log$k.error(url, e);
            return null;
        }
    }
    // https://dev.twitch.tv/docs/authentication/getting-tokens-oauth/
    async getAccessToken() {
        const url = TOKEN_ENDPOINT + asQueryArgs({
            client_id: this.clientId,
            client_secret: this.clientSecret,
            grant_type: 'client_credentials',
        });
        let json;
        try {
            const resp = await xhr.post(url);
            if (!resp.ok) {
                const txt = await resp.text();
                log$k.warn('unable to get access_token', txt);
                return '';
            }
            json = (await resp.json());
            return json.access_token;
        }
        catch (e) {
            log$k.error(url, json, e);
            return '';
        }
    }
    async getUser(accessToken) {
        const url = apiUrl(`/users`);
        let json;
        try {
            const resp = await xhr.get(url, withHeaders(this._authHeaders(accessToken), {}));
            json = (await resp.json());
            return json.data[0];
        }
        catch (e) {
            log$k.error(url, json, e);
            return null;
        }
    }
    // https://dev.twitch.tv/docs/api/reference#get-users
    async _getUserBy(query) {
        const url = apiUrl('/users') + asQueryArgs(query);
        let json;
        try {
            const resp = await xhr.get(url, await this.withAuthHeaders());
            json = (await resp.json());
            return json.data[0];
        }
        catch (e) {
            log$k.error(url, json, e);
            return null;
        }
    }
    async getUserById(userId) {
        return await this._getUserBy({ id: userId });
    }
    async getUserByName(userName) {
        return await this._getUserBy({ login: userName });
    }
    async getUserIdByNameCached(userName, cache) {
        const cacheKey = `TwitchHelixClient::getUserIdByNameCached(${userName})`;
        let userId = await cache.get(cacheKey);
        if (userId === undefined) {
            userId = await this._getUserIdByNameUncached(userName);
            await cache.set(cacheKey, userId, Infinity);
        }
        return `${userId}`;
    }
    async _getUserIdByNameUncached(userName) {
        const user = await this.getUserByName(userName);
        return user ? String(user.id) : '';
    }
    // https://dev.twitch.tv/docs/api/reference#get-clips
    async getClipByUserId(userId, startedAtRfc3339, endedAtRfc3339, maxDurationSeconds) {
        const url = apiUrl('/clips') + asQueryArgs({
            broadcaster_id: userId,
            started_at: startedAtRfc3339,
            ended_at: endedAtRfc3339,
        });
        let json;
        try {
            const resp = await xhr.get(url, await this.withAuthHeaders());
            json = (await resp.json());
            const filtered = json.data.filter(item => item.duration <= maxDurationSeconds);
            return filtered[0];
        }
        catch (e) {
            log$k.error(url, json, e);
            return null;
        }
    }
    async getStreamByUserIdCached(userId, cache) {
        const cacheKey = `TwitchHelixClient::getStreamByUserIdCached(${userId})`;
        let stream = await cache.get(cacheKey);
        if (stream === undefined) {
            stream = await this.getStreamByUserId(userId);
            await cache.set(cacheKey, stream, 30 * SECOND);
        }
        return stream;
    }
    // https://dev.twitch.tv/docs/api/reference#get-streams
    async getStreamByUserId(userId) {
        const url = apiUrl('/streams') + asQueryArgs({ user_id: userId });
        let json;
        try {
            const resp = await xhr.get(url, await this.withAuthHeaders());
            json = (await resp.json());
            return json.data[0] || null;
        }
        catch (e) {
            log$k.error(url, json, e);
            return null;
        }
    }
    async getSubscriptions() {
        const url = apiUrl('/eventsub/subscriptions');
        try {
            const resp = await xhr.get(url, await this.withAuthHeaders());
            return await resp.json();
        }
        catch (e) {
            log$k.error(url, e);
            return null;
        }
    }
    async deleteSubscription(id) {
        const url = apiUrl('/eventsub/subscriptions') + asQueryArgs({ id: id });
        try {
            const resp = await xhr.delete(url, await this.withAuthHeaders());
            return await resp.text();
        }
        catch (e) {
            log$k.error(url, e);
            return null;
        }
    }
    // https://dev.twitch.tv/docs/eventsub/manage-subscriptions#subscribing-to-events
    async createSubscription(subscription) {
        const url = apiUrl('/eventsub/subscriptions');
        try {
            const resp = await xhr.post(url, await this.withAuthHeaders(asJson(subscription)));
            const json = await resp.json();
            return json;
        }
        catch (e) {
            log$k.error(url, e);
            return null;
        }
    }
    // https://dev.twitch.tv/docs/api/reference#search-categories
    async searchCategory(searchString) {
        const url = apiUrl('/search/categories') + asQueryArgs({ query: searchString });
        let json;
        try {
            const resp = await xhr.get(url, await this.withAuthHeaders());
            json = (await resp.json());
            return getBestEntryFromCategorySearchItems(searchString, json);
        }
        catch (e) {
            log$k.error(url, json);
            return null;
        }
    }
    // https://dev.twitch.tv/docs/api/reference#get-channel-information
    async getChannelInformation(broadcasterId) {
        const url = apiUrl('/channels') + asQueryArgs({ broadcaster_id: broadcasterId });
        let json;
        try {
            const resp = await xhr.get(url, await this.withAuthHeaders());
            json = (await resp.json());
            return json.data[0];
        }
        catch (e) {
            log$k.error(url, json);
            return null;
        }
    }
    // https://dev.twitch.tv/docs/api/reference#modify-channel-information
    async modifyChannelInformation(accessToken, broadcasterId, data, bot, user) {
        const url = apiUrl('/channels') + asQueryArgs({ broadcaster_id: broadcasterId });
        const req = async (token) => {
            return await xhr.patch(url, withHeaders(this._authHeaders(token), asJson(data)));
        };
        try {
            return await executeRequestWithRetry(accessToken, req, bot, user);
        }
        catch (e) {
            log$k.error(url, e);
            return null;
        }
    }
    async getAllTags() {
        const allTags = [];
        let cursor = null;
        const first = 100;
        do {
            const url = apiUrl('/tags/streams') + asQueryArgs(cursor ? { after: cursor, first } : { first });
            const resp = await xhr.get(url, await this.withAuthHeaders());
            const json = (await resp.json());
            const entries = json.data;
            allTags.push(...entries);
            cursor = json.pagination.cursor; // is undefined when there are no more pages
        } while (cursor);
        return allTags;
    }
    // https://dev.twitch.tv/docs/api/reference#get-stream-tags
    async getStreamTags(broadcasterId) {
        const url = apiUrl('/streams/tags') + asQueryArgs({ broadcaster_id: broadcasterId });
        try {
            const resp = await xhr.get(url, await this.withAuthHeaders());
            return (await resp.json());
        }
        catch (e) {
            log$k.error(url, e);
            return null;
        }
    }
    // https://dev.twitch.tv/docs/api/reference#get-custom-reward
    async getChannelPointsCustomRewards(accessToken, broadcasterId, bot, user) {
        const url = apiUrl('/channel_points/custom_rewards') + asQueryArgs({ broadcaster_id: broadcasterId });
        const req = async (token) => {
            return await xhr.get(url, withHeaders(this._authHeaders(token)));
        };
        try {
            const resp = await executeRequestWithRetry(accessToken, req, bot, user);
            const json = await resp.json();
            if (json.error) {
                return null;
            }
            return json;
        }
        catch (e) {
            console.log(url, e);
            return null;
        }
    }
    async getAllChannelPointsCustomRewards(twitchChannels, bot, user) {
        const rewards = {};
        for (const twitchChannel of twitchChannels) {
            if (!twitchChannel.access_token || !twitchChannel.channel_id) {
                continue;
            }
            const res = await this.getChannelPointsCustomRewards(twitchChannel.access_token, twitchChannel.channel_id, bot, user);
            if (res) {
                rewards[twitchChannel.channel_name] = res.data.map(entry => entry.title);
            }
        }
        return rewards;
    }
    // https://dev.twitch.tv/docs/api/reference#replace-stream-tags
    async replaceStreamTags(accessToken, broadcasterId, tagIds, bot, user) {
        const url = apiUrl('/streams/tags') + asQueryArgs({ broadcaster_id: broadcasterId });
        const req = async (token) => {
            return await xhr.put(url, withHeaders(this._authHeaders(token), asJson({ tag_ids: tagIds })));
        };
        try {
            return await executeRequestWithRetry(accessToken, req, bot, user);
        }
        catch (e) {
            console.log(url, e);
            return null;
        }
    }
    async validateOAuthToken(broadcasterId, accessToken) {
        const url = apiUrl('/channels') + asQueryArgs({ broadcaster_id: broadcasterId });
        let json;
        try {
            const resp = await xhr.get(url, withHeaders(this._authHeaders(accessToken)));
            const json = (await resp.json());
            return { valid: json.data[0] ? true : false, data: json };
        }
        catch (e) {
            return { valid: false, data: json };
        }
    }
}

const TABLE$5 = 'robyottoko.variables';
class Variables {
    constructor(db, userId) {
        this.db = db;
        this.userId = userId;
    }
    async set(name, value) {
        await this.db.upsert(TABLE$5, {
            name,
            user_id: this.userId,
            value: JSON.stringify(value),
        }, {
            name,
            user_id: this.userId,
        });
    }
    async get(name) {
        const row = await this.db.get(TABLE$5, { name, user_id: this.userId });
        return row ? JSON.parse(row.value) : null;
    }
    async all() {
        const rows = await this.db.getMany(TABLE$5, { user_id: this.userId });
        return rows.map(row => ({
            name: row.name,
            value: JSON.parse(row.value),
        }));
    }
    async replace(variables) {
        const names = variables.map(v => v.name);
        await this.db.delete(TABLE$5, { user_id: this.userId, name: { '$nin': names } });
        for (const { name, value } of variables) {
            await this.set(name, value);
        }
    }
}

const getChatters = async (db, channelId, since) => {
    const whereObject = db._buildWhere({
        broadcaster_user_id: channelId,
        created_at: { '$gte': since },
    });
    return (await db._getMany(`select display_name from robyottoko.chat_log ${whereObject.sql} group by display_name`, whereObject.values)).map(r => r.display_name);
};

const createRouter$2 = (bot) => {
    const router = express.Router();
    router.use(cors());
    router.get('/chatters', async (req, res) => {
        if (!req.query.apiKey) {
            res.status(403).send({ ok: false, error: 'api key missing' });
            return;
        }
        const apiKey = String(req.query.apiKey);
        const t = await bot.getTokens().getByTokenAndType(apiKey, TokenType.API_KEY);
        if (!t) {
            res.status(403).send({ ok: false, error: 'invalid api key' });
            return;
        }
        const user = await bot.getUsers().getById(t.user_id);
        if (!user) {
            res.status(400).send({ ok: false, error: 'user_not_found' });
            return;
        }
        if (!req.query.channel) {
            res.status(400).send({ ok: false, error: 'channel missing' });
            return;
        }
        const channelName = String(req.query.channel);
        const helixClient = new TwitchHelixClient(bot.getConfig().twitch.tmi.identity.client_id, bot.getConfig().twitch.tmi.identity.client_secret);
        const channelId = await helixClient.getUserIdByNameCached(channelName, bot.getCache());
        if (!channelId) {
            res.status(400).send({ ok: false, error: 'unable to determine channel id' });
            return;
        }
        let dateSince;
        if (req.query.since) {
            try {
                dateSince = new Date(String(req.query.since));
            }
            catch (e) {
                res.status(400).send({ ok: false, error: 'unable to parse since' });
                return;
            }
        }
        else {
            const stream = await helixClient.getStreamByUserIdCached(channelId, bot.getCache());
            if (!stream) {
                res.status(400).send({ ok: false, error: 'stream not online at the moment' });
                return;
            }
            dateSince = new Date(stream.started_at);
        }
        const userNames = await getChatters(bot.getDb(), channelId, dateSince);
        res.status(200).send({ ok: true, data: { chatters: userNames, since: dateSince } });
    });
    return router;
};

const createRouter$1 = (bot, requireLoginApi) => {
    const router = express.Router();
    router.get('/me', requireLoginApi, async (req, res) => {
        res.send({
            user: req.user,
            token: req.cookies['x-token'],
        });
    });
    router.post('/_reset_password', express.json(), async (req, res) => {
        const plainPass = req.body.pass || null;
        const token = req.body.token || null;
        if (!plainPass || !token) {
            res.status(400).send({ reason: 'bad request' });
            return;
        }
        const tokenObj = await bot.getTokens().getByTokenAndType(token, TokenType.PASSWORD_RESET);
        if (!tokenObj) {
            res.status(400).send({ reason: 'bad request' });
            return;
        }
        const originalUser = await bot.getUsers().getById(tokenObj.user_id);
        if (!originalUser) {
            res.status(404).send({ reason: 'user_does_not_exist' });
            return;
        }
        const pass = fn.passwordHash(plainPass, originalUser.salt);
        const user = { id: originalUser.id, pass };
        await bot.getUsers().save(user);
        await bot.getTokens().delete(tokenObj.token);
        res.send({ success: true });
    });
    router.post('/_request_password_reset', express.json(), async (req, res) => {
        const email = req.body.email || null;
        if (!email) {
            res.status(400).send({ reason: 'bad request' });
            return;
        }
        const user = await bot.getUsers().get({ email, status: 'verified' });
        if (!user) {
            res.status(404).send({ reason: 'user not found' });
            return;
        }
        const token = await bot.getTokens().createToken(user.id, TokenType.PASSWORD_RESET);
        bot.getMail().sendPasswordResetMail({ user, token });
        res.send({ success: true });
    });
    router.post('/_resend_verification_mail', express.json(), async (req, res) => {
        const email = req.body.email || null;
        if (!email) {
            res.status(400).send({ reason: 'bad request' });
            return;
        }
        const user = await bot.getUsers().getByEmail(email);
        if (!user) {
            res.status(404).send({ reason: 'email not found' });
            return;
        }
        if (user.status !== 'verification_pending') {
            res.status(400).send({ reason: 'already verified' });
            return;
        }
        const token = await bot.getTokens().createToken(user.id, TokenType.REGISTRATION);
        bot.getMail().sendRegistrationMail({ user, token });
        res.send({ success: true });
    });
    router.post('/_register', express.json(), async (req, res) => {
        const salt = fn.passwordSalt();
        const user = {
            name: req.body.user,
            pass: fn.passwordHash(req.body.pass, salt),
            salt: salt,
            email: req.body.email,
            status: 'verification_pending',
            tmi_identity_username: '',
            tmi_identity_password: '',
            tmi_identity_client_id: '',
            tmi_identity_client_secret: '',
        };
        let tmpUser = await bot.getUsers().getByEmail(user.email);
        if (tmpUser) {
            if (tmpUser.status === 'verified') {
                // user should use password reset function
                res.status(400).send({ reason: 'verified_mail_already_exists' });
            }
            else {
                // user should use resend registration mail function
                res.status(400).send({ reason: 'unverified_mail_already_exists' });
            }
            return;
        }
        tmpUser = await bot.getUsers().getByName(user.name);
        if (tmpUser) {
            if (tmpUser.status === 'verified') {
                // user should use password reset function
                res.status(400).send({ reason: 'verified_name_already_exists' });
            }
            else {
                // user should use resend registration mail function
                res.status(400).send({ reason: 'unverified_name_already_exists' });
            }
            return;
        }
        const userId = await bot.getUsers().createUser(user);
        if (!userId) {
            res.status(400).send({ reason: 'unable to create user' });
            return;
        }
        const token = await bot.getTokens().createToken(userId, TokenType.REGISTRATION);
        bot.getMail().sendRegistrationMail({ user, token });
        res.send({ success: true });
    });
    return router;
};

const log$j = logger('api/index.ts');
const createRouter = (bot) => {
    const requireLoginApi = (req, res, next) => {
        if (!req.token) {
            res.status(401).send({});
            return;
        }
        return next();
    };
    const uploadDir = './data/uploads';
    const storage = multer.diskStorage({
        destination: uploadDir,
        filename: function (req, file, cb) {
            cb(null, `${nonce(6)}-${file.originalname}`);
        }
    });
    const upload = multer({ storage }).single('file');
    const router = express.Router();
    router.post('/upload', requireLoginApi, (req, res) => {
        upload(req, res, (err) => {
            if (err) {
                log$j.error(err);
                res.status(400).send("Something went wrong!");
                return;
            }
            if (!req.file) {
                log$j.error(err);
                res.status(400).send("Something went wrong!");
                return;
            }
            const uploadedFile = {
                fieldname: req.file.fieldname,
                originalname: req.file.originalname,
                encoding: req.file.encoding,
                mimetype: req.file.mimetype,
                destination: req.file.destination,
                filename: req.file.filename,
                filepath: req.file.path,
                size: req.file.size,
                urlpath: `/uploads/${encodeURIComponent(req.file.filename)}`,
            };
            res.send(uploadedFile);
        });
    });
    router.get('/conf', async (req, res) => {
        res.send({
            wsBase: bot.getConfig().ws.connectstring,
        });
    });
    router.post('/logout', requireLoginApi, async (req, res) => {
        if (req.token) {
            await bot.getAuth().destroyToken(req.token);
            res.clearCookie("x-token");
        }
        res.send({ success: true });
    });
    router.post('/_handle-token', express.json(), async (req, res) => {
        const token = req.body.token || null;
        if (!token) {
            res.status(400).send({ reason: 'invalid_token' });
            return;
        }
        const tokenObj = await bot.getTokens().getByTokenAndType(token, TokenType.REGISTRATION);
        if (!tokenObj) {
            res.status(400).send({ reason: 'invalid_token' });
            return;
        }
        await bot.getUsers().save({ status: 'verified', id: tokenObj.user_id });
        await bot.getTokens().delete(tokenObj.token);
        res.send({ type: 'registration-verified' });
        // new user was registered. module manager should be notified about this
        // so that bot doesnt need to be restarted :O
        const user = await bot.getUsers().getById(tokenObj.user_id);
        if (user) {
            bot.getEventHub().emit('user_registration_complete', user);
        }
        else {
            log$j.error(`registration: user doesn't exist after saving it: ${tokenObj.user_id}`);
        }
        return;
    });
    router.post('/widget/create_url', requireLoginApi, express.json(), async (req, res) => {
        const type = req.body.type;
        const pub = req.body.pub;
        const url = await bot.getWidgets().createWidgetUrl(type, req.user.id);
        res.send({
            url: pub ? (await bot.getWidgets().pubUrl(url)) : url
        });
    });
    router.get('/page/index', requireLoginApi, async (req, res) => {
        const mappedWidgets = await bot.getWidgets().getWidgetInfos(req.user.id);
        res.send({ widgets: mappedWidgets });
    });
    router.get('/page/variables', requireLoginApi, async (req, res) => {
        const variables = new Variables(bot.getDb(), req.user.id);
        res.send({ variables: await variables.all() });
    });
    router.post('/save-variables', requireLoginApi, express.json(), async (req, res) => {
        const variables = new Variables(bot.getDb(), req.user.id);
        await variables.replace(req.body.variables || []);
        res.send();
    });
    router.get('/data/global', async (req, res) => {
        res.send({
            registeredUserCount: await bot.getUsers().countVerifiedUsers(),
            streamingUserCount: await bot.getTwitchChannels().countUniqueUsersStreaming(),
        });
    });
    router.get('/page/settings', requireLoginApi, async (req, res) => {
        const user = await bot.getUsers().getById(req.user.id);
        res.send({
            user: {
                id: user.id,
                name: user.name,
                salt: user.salt,
                email: user.email,
                status: user.status,
                tmi_identity_username: user.tmi_identity_username,
                tmi_identity_password: user.tmi_identity_password,
                tmi_identity_client_id: user.tmi_identity_client_id,
                tmi_identity_client_secret: user.tmi_identity_client_secret,
                groups: await bot.getUsers().getGroups(user.id)
            },
            twitchChannels: await bot.getTwitchChannels().allByUserId(req.user.id),
        });
    });
    router.post('/save-settings', requireLoginApi, express.json(), async (req, res) => {
        if (!req.user.groups.includes('admin')) {
            if (req.user.id !== req.body.user.id) {
                // editing other user than self
                res.status(401).send({ reason: 'not_allowed_to_edit_other_users' });
                return;
            }
        }
        const originalUser = await bot.getUsers().getById(req.body.user.id);
        if (!originalUser) {
            res.status(404).send({ reason: 'user_does_not_exist' });
            return;
        }
        const user = {
            id: req.body.user.id,
        };
        if (req.body.user.pass) {
            user.pass = fn.passwordHash(req.body.user.pass, originalUser.salt);
        }
        if (req.body.user.email) {
            user.email = req.body.user.email;
        }
        if (req.user.groups.includes('admin')) {
            user.tmi_identity_client_id = req.body.user.tmi_identity_client_id;
            user.tmi_identity_client_secret = req.body.user.tmi_identity_client_secret;
            user.tmi_identity_username = req.body.user.tmi_identity_username;
            user.tmi_identity_password = req.body.user.tmi_identity_password;
        }
        const twitch_channels = req.body.twitch_channels.map((channel) => {
            channel.user_id = user.id;
            return channel;
        });
        await bot.getUsers().save(user);
        await bot.getTwitchChannels().saveUserChannels(user.id, twitch_channels);
        const changedUser = await bot.getUsers().getById(user.id);
        if (changedUser) {
            bot.getEventHub().emit('user_changed', changedUser);
        }
        else {
            log$j.error(`save-settings: user doesn't exist after saving it: ${user.id}`);
        }
        res.send();
    });
    router.post('/twitch/user-id-by-name', requireLoginApi, express.json(), async (req, res) => {
        let clientId;
        let clientSecret;
        if (!req.user.groups.includes('admin')) {
            const u = await bot.getUsers().getById(req.user.id);
            clientId = u.tmi_identity_client_id || bot.getConfig().twitch.tmi.identity.client_id;
            clientSecret = u.tmi_identity_client_secret || bot.getConfig().twitch.tmi.identity.client_secret;
        }
        else {
            clientId = req.body.client_id;
            clientSecret = req.body.client_secret;
        }
        if (!clientId) {
            res.status(400).send({ reason: 'need client id' });
            return;
        }
        if (!clientSecret) {
            res.status(400).send({ reason: 'need client secret' });
            return;
        }
        try {
            // todo: maybe fill twitchChannels instead of empty array
            const client = new TwitchHelixClient(clientId, clientSecret);
            res.send({ id: await client.getUserIdByNameCached(req.body.name, bot.getCache()) });
        }
        catch (e) {
            res.status(500).send("Something went wrong!");
        }
    });
    router.post('/auth', express.json(), async (req, res) => {
        const user = await bot.getAuth().getUserByNameAndPass(req.body.user, req.body.pass);
        if (!user) {
            res.status(401).send({ reason: 'bad credentials' });
            return;
        }
        const token = await bot.getAuth().getUserAuthToken(user.id);
        res.cookie('x-token', token, { maxAge: 1 * YEAR, httpOnly: true });
        res.send();
    });
    router.use('/user', createRouter$1(bot, requireLoginApi));
    router.use('/pub/v1', createRouter$2(bot));
    return router;
};

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const log$i = logger('WebServer.ts');
class WebServer {
    constructor() {
        this.handle = null;
    }
    async listen(bot) {
        const app = express();
        const templates = new Templates(__dirname);
        templates.add('../public/static/widgets/index.html');
        templates.add('templates/twitch_redirect_uri.html');
        const indexFile = path.resolve(`${__dirname}/../../build/public/index.html`);
        app.get('/pub/:id', async (req, res, _next) => {
            const row = await bot.getDb().get('robyottoko.pub', {
                id: req.params.id,
            });
            if (row && row.target) {
                req.url = row.target;
                // @ts-ignore
                req.app.handle(req, res);
                return;
            }
            res.status(404).send();
        });
        const requireLogin = (req, res, next) => {
            if (!req.token) {
                if (req.method === 'GET') {
                    res.redirect(302, '/login');
                }
                else {
                    res.status(401).send('not allowed');
                }
                return;
            }
            return next();
        };
        app.use(cookieParser());
        app.use(bot.getAuth().addAuthInfoMiddleware());
        app.use('/', express.static('./build/public'));
        app.use('/static', express.static('./public/static'));
        app.use('/uploads', express.static('./data/uploads'));
        app.use('/api', createRouter(bot));
        app.use('/twitch', createRouter$3(templates, bot));
        app.get('/widget/:widget_type/:widget_token/', async (req, res, _next) => {
            const type = req.params.widget_type;
            const token = req.params.widget_token;
            const user = (await bot.getAuth().userFromWidgetToken(token, type))
                || (await bot.getAuth().userFromPubToken(token));
            if (!user) {
                res.status(404).send();
                return;
            }
            log$i.debug(`/widget/:widget_type/:widget_token/`, type, token);
            const w = bot.getWidgets().getWidgetDefinitionByType(type);
            if (w) {
                res.send(await templates.render('../public/static/widgets/index.html', {
                    widget: w.type,
                    title: w.title,
                    wsUrl: bot.getConfig().ws.connectstring,
                    widgetToken: token,
                }));
                return;
            }
            res.status(404).send();
        });
        app.all('/login', async (_req, res, _next) => {
            res.sendFile(indexFile);
        });
        app.all('/password-reset', async (_req, res, _next) => {
            res.sendFile(indexFile);
        });
        app.all('*', requireLogin, express.json({ limit: '50mb' }), async (req, res, next) => {
            const method = req.method.toLowerCase();
            const key = req.url;
            for (const m of bot.getModuleManager().all(req.user.id)) {
                const map = m.getRoutes();
                if (map && map[method] && map[method][key]) {
                    await map[method][key](req, res, next);
                    return;
                }
            }
            res.sendFile(indexFile);
        });
        const httpConf = bot.getConfig().http;
        this.handle = app.listen(httpConf.port, httpConf.hostname, () => log$i.info(`server running on http://${httpConf.hostname}:${httpConf.port}`));
    }
    close() {
        if (this.handle) {
            this.handle.close();
        }
    }
}

const log$h = logger('ChatEventHandler.ts');
const rolesLettersFromTwitchChatContext = (context) => {
    const roles = [];
    if (isMod(context)) {
        roles.push('M');
    }
    if (isSubscriber(context)) {
        roles.push('S');
    }
    if (isBroadcaster(context)) {
        roles.push('B');
    }
    return roles;
};
const determineStreamStartDate = async (context, helixClient) => {
    const stream = await helixClient.getStreamByUserId(context['room-id']);
    if (stream) {
        return new Date(stream.started_at);
    }
    const date = new Date(new Date().getTime() - (5 * MINUTE));
    log$h.info(`No stream is running atm for channel ${context['room-id']}. Using fake start date ${date}.`);
    return date;
};
const determineIsFirstChatStream = async (bot, user, context) => {
    const helixClient = bot.getUserTwitchClientManager(user).getHelixClient();
    if (!helixClient) {
        return false;
    }
    const minDate = await determineStreamStartDate(context, helixClient);
    return await bot.getChatLog().isFirstChatSince(context, minDate);
};
class ChatEventHandler {
    async handle(bot, user, target, context, msg) {
        const roles = rolesLettersFromTwitchChatContext(context);
        log$h.debug(`${context.username}[${roles.join('')}]@${target}: ${msg}`);
        bot.getChatLog().insert(context, msg);
        let _isFirstChatAlltime = null;
        const isFirstChatAlltime = async () => {
            if (_isFirstChatAlltime === null) {
                _isFirstChatAlltime = await bot.getChatLog().isFirstChatAllTime(context);
            }
            return _isFirstChatAlltime;
        };
        let _isFirstChatStream = null;
        const isFirstChatStream = async () => {
            if (_isFirstChatStream === null) {
                _isFirstChatStream = await determineIsFirstChatStream(bot, user, context);
            }
            return _isFirstChatStream;
        };
        const isRelevantFirstChatTrigger = async (trigger) => {
            if (trigger.type !== CommandTriggerType.FIRST_CHAT) {
                return false;
            }
            if (trigger.data.since === 'alltime') {
                return await isFirstChatAlltime();
            }
            if (trigger.data.since === 'stream') {
                return await isFirstChatStream();
            }
            return false;
        };
        const createTriggers = async (m) => {
            let commandTriggers = [];
            const triggers = [];
            for (const command of m.getCommands()) {
                for (const trigger of command.triggers) {
                    if (trigger.type === CommandTriggerType.COMMAND) {
                        commandTriggers.push(trigger);
                    }
                    else if (await isRelevantFirstChatTrigger(trigger)) {
                        triggers.push(trigger);
                    }
                }
            }
            // make sure longest commands are found first
            // so that in case commands `!draw` and `!draw bad` are set up
            // and `!draw bad` is written in chat, that command only will be
            // executed and not also `!draw`
            commandTriggers = commandTriggers.sort((a, b) => b.data.command.length - a.data.command.length);
            let rawCmd = null;
            for (const trigger of commandTriggers) {
                rawCmd = fn.parseCommandFromTriggerAndMessage(msg, trigger);
                if (!rawCmd) {
                    continue;
                }
                triggers.push(trigger);
                break;
            }
            return { triggers, rawCmd };
        };
        const client = bot.getUserTwitchClientManager(user).getChatClient();
        const chatMessageContext = { client, target, context, msg };
        for (const m of bot.getModuleManager().all(user.id)) {
            const { triggers, rawCmd } = await createTriggers(m);
            if (triggers.length > 0) {
                const exec = new CommandExecutor();
                await exec.executeMatchingCommands(bot, user, rawCmd, target, context, triggers);
            }
            await m.onChatMsg(chatMessageContext);
        }
    }
}

// @ts-ignore
logger('TwitchClientManager.ts');
const isDevTunnel = (url) => url.match(/^https:\/\/[a-z0-9-]+\.(?:loca\.lt|ngrok\.io)\//);
const shouldDeleteSubscription = (configuredTransport, subscription, twitchChannelIds) => {
    return configuredTransport.method === subscription.transport.method
        && (configuredTransport.callback === subscription.transport.callback
            || (isDevTunnel(configuredTransport.callback) && isDevTunnel(subscription.transport.callback)))
        && twitchChannelIds.includes(subscription.condition.broadcaster_user_id);
};
class TwitchClientManager {
    constructor(bot, user) {
        this.chatClient = null;
        this.helixClient = null;
        this.identity = null;
        this.bot = bot;
        this.user = user;
        this.log = logger('TwitchClientManager.ts', `${user.name}|`);
    }
    async accessTokenRefreshed(user) {
        this.user = user;
        await this.init('access_token_refreshed');
    }
    async userChanged(user) {
        this.user = user;
        await this.init('user_change');
    }
    async init(reason) {
        let connectReason = reason;
        const cfg = this.bot.getConfig().twitch;
        const user = this.user;
        this.log = logger('TwitchClientManager.ts', `${user.name}|`);
        await this._disconnectChatClient();
        const twitchChannels = await this.bot.getTwitchChannels().allByUserId(user.id);
        if (twitchChannels.length === 0) {
            this.log.info(`* No twitch channels configured at all`);
            return;
        }
        const identity = (user.tmi_identity_username
            && user.tmi_identity_password
            && user.tmi_identity_client_id) ? {
            username: user.tmi_identity_username,
            password: user.tmi_identity_password,
            client_id: user.tmi_identity_client_id,
            client_secret: user.tmi_identity_client_secret,
        } : {
            username: cfg.tmi.identity.username,
            password: cfg.tmi.identity.password,
            client_id: cfg.tmi.identity.client_id,
            client_secret: cfg.tmi.identity.client_secret,
        };
        this.identity = identity;
        // connect to chat via tmi (to all channels configured)
        const chatClient = new tmi.client({
            identity: {
                username: identity.username,
                password: identity.password,
                client_id: identity.client_id,
            },
            channels: twitchChannels.map(ch => ch.channel_name),
            connection: {
                reconnect: true,
            }
        });
        this.chatClient = chatClient;
        chatClient.on('message', async (target, context, msg, self) => {
            if (self) {
                return;
            } // Ignore messages from the bot
            await (new ChatEventHandler()).handle(this.bot, this.user, target, context, msg);
        });
        // Called every time the bot connects to Twitch chat
        chatClient.on('connected', (addr, port) => {
            this.log.info(`* Connected to ${addr}:${port}`);
            for (const channel of twitchChannels) {
                if (!channel.bot_status_messages) {
                    continue;
                }
                // note: this can lead to multiple messages if multiple users
                //       have the same channels set up
                const say = this.bot.sayFn(user, channel.channel_name);
                if (connectReason === 'init') {
                    say('⚠️ Bot rebooted - please restart timers...');
                }
                else if (connectReason === 'access_token_refreshed') ;
                else if (connectReason === 'user_change') {
                    say('✅ User settings updated...');
                }
                else {
                    say('✅ Reconnected...');
                }
            }
            // set connectReason to empty, everything from now is just a reconnect
            // due to disconnect from twitch
            connectReason = '';
        });
        // register EventSub
        // @see https://dev.twitch.tv/docs/eventsub
        const helixClient = new TwitchHelixClient(identity.client_id, identity.client_secret);
        this.helixClient = helixClient;
        if (this.chatClient) {
            try {
                await this.chatClient.connect();
            }
            catch (e) {
                // this can happen when calling close before the connection
                // could be established
                this.log.error('error when connecting', e);
            }
        }
        await this.registerSubscriptions(twitchChannels);
    }
    async registerSubscriptions(twitchChannels) {
        if (!this.helixClient) {
            this.log.error('registerSubscriptions: helixClient not initialized');
            return;
        }
        const twitchChannelIds = twitchChannels.map(ch => `${ch.channel_id}`);
        const transport = this.bot.getConfig().twitch.eventSub.transport;
        // delete all subscriptions
        const deletePromises = [];
        const allSubscriptions = await this.helixClient.getSubscriptions();
        for (const subscription of allSubscriptions.data) {
            if (shouldDeleteSubscription(transport, subscription, twitchChannelIds)) {
                deletePromises.push(this.deleteSubscription(subscription));
            }
        }
        await Promise.all(deletePromises);
        const createPromises = [];
        // create all subscriptions
        for (const twitchChannel of twitchChannels) {
            for (const subscriptionType of ALL_SUBSCRIPTIONS_TYPES) {
                createPromises.push(this.registerSubscription(subscriptionType, twitchChannel));
            }
        }
        await Promise.all(createPromises);
    }
    async deleteSubscription(subscription) {
        if (!this.helixClient) {
            return;
        }
        await this.helixClient.deleteSubscription(subscription.id);
        await this.bot.getDb().delete('robyottoko.event_sub', {
            user_id: this.user.id,
            subscription_id: subscription.id,
        });
        this.log.info(`${subscription.type} subscription deleted`);
    }
    async registerSubscription(subscriptionType, twitchChannel) {
        if (!this.helixClient) {
            return;
        }
        if (!twitchChannel.channel_id) {
            return;
        }
        const subscription = {
            type: subscriptionType,
            version: '1',
            transport: this.bot.getConfig().twitch.eventSub.transport,
            condition: {
                broadcaster_user_id: `${twitchChannel.channel_id}`,
            },
        };
        const resp = await this.helixClient.createSubscription(subscription);
        if (resp && resp.data && resp.data.length > 0) {
            await this.bot.getDb().insert('robyottoko.event_sub', {
                user_id: this.user.id,
                subscription_id: resp.data[0].id,
            });
            this.log.info(`${subscriptionType} subscription registered`);
        }
        this.log.debug(resp);
    }
    async _disconnectChatClient() {
        if (this.chatClient) {
            try {
                await this.chatClient.disconnect();
                this.chatClient = null;
            }
            catch (e) {
                this.log.info(e);
            }
        }
    }
    getChatClient() {
        return this.chatClient;
    }
    getHelixClient() {
        return this.helixClient;
    }
    getIdentity() {
        return this.identity;
    }
}

const log$g = logger('ModuleStorage.ts');
const TABLE$4 = 'robyottoko.module';
class ModuleStorage {
    constructor(db, userId) {
        this.db = db;
        this.userId = userId;
    }
    async load(key, def) {
        try {
            const where = { user_id: this.userId, key };
            const row = await this.db.get(TABLE$4, where);
            const data = row ? JSON.parse('' + row.data) : null;
            return data ? Object.assign({}, def, data) : def;
        }
        catch (e) {
            log$g.error(e);
            return def;
        }
    }
    async save(key, rawData) {
        const where = { user_id: this.userId, key };
        const data = JSON.stringify(rawData);
        const dbData = Object.assign({}, where, { data });
        await this.db.upsert(TABLE$4, dbData, where);
    }
}

const TABLE$3 = 'robyottoko.user';
class Users {
    constructor(db) {
        this.db = db;
    }
    async get(by) {
        return await this.db.get(TABLE$3, by) || null;
    }
    async all() {
        return await this.db.getMany(TABLE$3);
    }
    async getById(id) {
        return await this.get({ id });
    }
    async getByEmail(email) {
        return await this.get({ email });
    }
    async getByName(name) {
        return await this.get({ name });
    }
    async save(user) {
        await this.db.upsert(TABLE$3, user, { id: user.id });
    }
    async getGroups(id) {
        const rows = await this.db._getMany(`
select g.name from robyottoko.user_group g
inner join robyottoko.user_x_user_group x on x.user_group_id = g.id
where x.user_id = $1`, [id]);
        return rows.map(r => r.name);
    }
    async createUser(user) {
        return (await this.db.insert(TABLE$3, user));
    }
    async countVerifiedUsers() {
        const rows = await this.db.getMany(TABLE$3, { status: 'verified' });
        return rows.length;
    }
}

const TABLE$2 = 'robyottoko.twitch_channel';
class TwitchChannels {
    constructor(db) {
        this.db = db;
    }
    async save(channel) {
        await this.db.upsert(TABLE$2, channel, {
            user_id: channel.user_id,
            channel_name: channel.channel_name,
        });
    }
    async countUniqueUsersStreaming() {
        const channels = await this.db.getMany(TABLE$2, { is_streaming: true });
        const userIds = [...new Set(channels.map(c => c.user_id))];
        return userIds.length;
    }
    async allByUserId(user_id) {
        return await this.db.getMany(TABLE$2, { user_id });
    }
    async saveUserChannels(user_id, channels) {
        for (const channel of channels) {
            await this.save(channel);
        }
        await this.db.delete(TABLE$2, {
            user_id: user_id,
            channel_name: { '$nin': channels.map(c => c.channel_name) }
        });
    }
}

const TABLE$1 = 'robyottoko.cache';
const log$f = logger('Cache.ts');
class Cache {
    constructor(db) {
        this.db = db;
    }
    async set(key, value, lifetime) {
        if (value === undefined) {
            log$f.error(`unable to store undefined value for cache key: ${key}`);
            return;
        }
        const expiresAt = lifetime === Infinity ? null : (new Date(new Date().getTime() + lifetime));
        const valueStr = JSON.stringify(value);
        await this.db.upsert(TABLE$1, { key, value: valueStr, expires_at: expiresAt }, { key });
    }
    async get(key) {
        // get *non-expired* cache entry from db
        const row = await this.db._get('SELECT * from robyottoko.cache WHERE key = $1 AND (expires_at IS NULL OR expires_at > $2)', [key, new Date()]);
        return row ? JSON.parse(row.value) : undefined;
    }
}

const E_CANCELED = new Error('request for lock canceled');

var __awaiter$2 = function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
class Semaphore {
    constructor(_maxConcurrency, _cancelError = E_CANCELED) {
        this._maxConcurrency = _maxConcurrency;
        this._cancelError = _cancelError;
        this._queue = [];
        this._waiters = [];
        if (_maxConcurrency <= 0) {
            throw new Error('semaphore must be initialized to a positive value');
        }
        this._value = _maxConcurrency;
    }
    acquire() {
        const locked = this.isLocked();
        const ticketPromise = new Promise((resolve, reject) => this._queue.push({ resolve, reject }));
        if (!locked)
            this._dispatch();
        return ticketPromise;
    }
    runExclusive(callback) {
        return __awaiter$2(this, void 0, void 0, function* () {
            const [value, release] = yield this.acquire();
            try {
                return yield callback(value);
            }
            finally {
                release();
            }
        });
    }
    waitForUnlock() {
        return __awaiter$2(this, void 0, void 0, function* () {
            if (!this.isLocked()) {
                return Promise.resolve();
            }
            const waitPromise = new Promise((resolve) => this._waiters.push({ resolve }));
            return waitPromise;
        });
    }
    isLocked() {
        return this._value <= 0;
    }
    /** @deprecated Deprecated in 0.3.0, will be removed in 0.4.0. Use runExclusive instead. */
    release() {
        if (this._maxConcurrency > 1) {
            throw new Error('this method is unavailable on semaphores with concurrency > 1; use the scoped release returned by acquire instead');
        }
        if (this._currentReleaser) {
            const releaser = this._currentReleaser;
            this._currentReleaser = undefined;
            releaser();
        }
    }
    cancel() {
        this._queue.forEach((ticket) => ticket.reject(this._cancelError));
        this._queue = [];
    }
    _dispatch() {
        const nextTicket = this._queue.shift();
        if (!nextTicket)
            return;
        let released = false;
        this._currentReleaser = () => {
            if (released)
                return;
            released = true;
            this._value++;
            this._resolveWaiters();
            this._dispatch();
        };
        nextTicket.resolve([this._value--, this._currentReleaser]);
    }
    _resolveWaiters() {
        this._waiters.forEach((waiter) => waiter.resolve());
        this._waiters = [];
    }
}

var __awaiter$1 = function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
class Mutex {
    constructor(cancelError) {
        this._semaphore = new Semaphore(1, cancelError);
    }
    acquire() {
        return __awaiter$1(this, void 0, void 0, function* () {
            const [, releaser] = yield this._semaphore.acquire();
            return releaser;
        });
    }
    runExclusive(callback) {
        return this._semaphore.runExclusive(() => callback());
    }
    isLocked() {
        return this._semaphore.isLocked();
    }
    waitForUnlock() {
        return this._semaphore.waitForUnlock();
    }
    /** @deprecated Deprecated in 0.3.0, will be removed in 0.4.0. Use runExclusive instead. */
    release() {
        this._semaphore.release();
    }
    cancel() {
        return this._semaphore.cancel();
    }
}

// @ts-ignore
const { Client } = pg.default;
const log$e = logger('Db.ts');
const mutex = new Mutex();
class Db {
    constructor(connectStr, patchesDir) {
        this.patchesDir = patchesDir;
        this.dbh = new Client(connectStr);
    }
    async connect() {
        await this.dbh.connect();
    }
    async close() {
        await this.dbh.end();
    }
    async patch(verbose = true) {
        await this.run('CREATE TABLE IF NOT EXISTS public.db_patches ( id TEXT PRIMARY KEY);', []);
        const files = fs.readdirSync(this.patchesDir);
        const patches = (await this.getMany('public.db_patches')).map(row => row.id);
        for (const f of files) {
            if (patches.includes(f)) {
                if (verbose) {
                    log$e.info(`➡ skipping already applied db patch: ${f}`);
                }
                continue;
            }
            const contents = fs.readFileSync(`${this.patchesDir}/${f}`, 'utf-8');
            const all = contents.split(';').map(s => s.trim()).filter(s => !!s);
            try {
                try {
                    await this.run('BEGIN');
                    for (const q of all) {
                        await this.run(q);
                    }
                    await this.run('COMMIT');
                }
                catch (e) {
                    await this.run('ROLLBACK');
                    throw e;
                }
                await this.insert('public.db_patches', { id: f });
                log$e.info(`✓ applied db patch: ${f}`);
            }
            catch (e) {
                log$e.error(`✖ unable to apply patch: ${f} ${e}`);
                return;
            }
        }
    }
    _buildWhere(where, $i = 1) {
        const wheres = [];
        const values = [];
        for (const k of Object.keys(where)) {
            if (where[k] === null) {
                wheres.push(k + ' IS NULL');
                continue;
            }
            if (typeof where[k] === 'object') {
                let prop = '$nin';
                if (where[k][prop]) {
                    if (where[k][prop].length > 0) {
                        wheres.push(k + ' NOT IN (' + where[k][prop].map(() => `$${$i++}`) + ')');
                        values.push(...where[k][prop]);
                    }
                    continue;
                }
                prop = '$in';
                if (where[k][prop]) {
                    if (where[k][prop].length > 0) {
                        wheres.push(k + ' IN (' + where[k][prop].map(() => `$${$i++}`) + ')');
                        values.push(...where[k][prop]);
                    }
                    continue;
                }
                prop = "$gte";
                if (where[k][prop]) {
                    wheres.push(k + ` >= $${$i++}`);
                    values.push(where[k][prop]);
                    continue;
                }
                prop = "$lte";
                if (where[k][prop]) {
                    wheres.push(k + ` <= $${$i++}`);
                    values.push(where[k][prop]);
                    continue;
                }
                prop = "$lte";
                if (where[k][prop]) {
                    wheres.push(k + ` <= $${$i++}`);
                    values.push(where[k][prop]);
                    continue;
                }
                prop = '$gt';
                if (where[k][prop]) {
                    wheres.push(k + ` > $${$i++}`);
                    values.push(where[k][prop]);
                    continue;
                }
                prop = '$lt';
                if (where[k][prop]) {
                    wheres.push(k + ` < $${$i++}`);
                    values.push(where[k][prop]);
                    continue;
                }
                prop = '$ne';
                if (where[k][prop]) {
                    wheres.push(k + ` != $${$i++}`);
                    values.push(where[k][prop]);
                    continue;
                }
                // TODO: implement rest of mongo like query args ($eq, $lte, $in...)
                throw new Error('not implemented: ' + JSON.stringify(where[k]));
            }
            wheres.push(k + ` = $${$i++}`);
            values.push(where[k]);
        }
        return {
            sql: wheres.length > 0 ? ' WHERE ' + wheres.join(' AND ') : '',
            values,
            $i,
        };
    }
    _buildOrderBy(orderBy) {
        const sorts = [];
        for (const s of orderBy) {
            const k = Object.keys(s)[0];
            sorts.push(k + ' ' + (s[k] > 0 ? 'ASC' : 'DESC'));
        }
        return sorts.length > 0 ? ' ORDER BY ' + sorts.join(', ') : '';
    }
    async _get(query, params = []) {
        try {
            return (await this.dbh.query(query, params)).rows[0] || null;
        }
        catch (e) {
            log$e.info('_get', query, params);
            console.error(e);
            throw e;
        }
    }
    async run(query, params = []) {
        try {
            return await this.dbh.query(query, params);
        }
        catch (e) {
            log$e.info('run', query, params);
            console.error(e);
            throw e;
        }
    }
    async _getMany(query, params = []) {
        try {
            return (await this.dbh.query(query, params)).rows || [];
        }
        catch (e) {
            log$e.info('_getMany', query, params);
            console.error(e);
            throw e;
        }
    }
    async get(table, whereRaw = {}, orderBy = []) {
        const where = this._buildWhere(whereRaw);
        const orderBySql = this._buildOrderBy(orderBy);
        const sql = 'SELECT * FROM ' + table + where.sql + orderBySql;
        return await this._get(sql, where.values);
    }
    async getMany(table, whereRaw = {}, orderBy = []) {
        const where = this._buildWhere(whereRaw);
        const orderBySql = this._buildOrderBy(orderBy);
        const sql = 'SELECT * FROM ' + table + where.sql + orderBySql;
        return await this._getMany(sql, where.values);
    }
    async delete(table, whereRaw = {}) {
        const where = this._buildWhere(whereRaw);
        const sql = 'DELETE FROM ' + table + where.sql;
        return await this.run(sql, where.values);
    }
    async exists(table, whereRaw) {
        return !!await this.get(table, whereRaw);
    }
    async upsert(table, data, check, idcol = null) {
        return mutex.runExclusive(async () => {
            if (!await this.exists(table, check)) {
                return await this.insert(table, data, idcol);
            }
            await this.update(table, data, check);
            if (idcol === null) {
                return 0; // dont care about id
            }
            return (await this.get(table, check))[idcol]; // get id manually
        });
    }
    async insert(table, data, idcol = null) {
        const keys = Object.keys(data);
        const values = keys.map(k => data[k]);
        let $i = 1;
        let sql = 'INSERT INTO ' + table
            + ' (' + keys.join(',') + ')'
            + ' VALUES (' + keys.map(() => `$${$i++}`).join(',') + ')';
        if (idcol) {
            sql += ` RETURNING ${idcol}`;
            return (await this.run(sql, values)).rows[0][idcol];
        }
        await this.run(sql, values);
        return 0;
    }
    async update(table, data, whereRaw = {}) {
        const keys = Object.keys(data);
        if (keys.length === 0) {
            return;
        }
        let $i = 1;
        const values = keys.map(k => data[k]);
        const setSql = ' SET ' + keys.map((k) => `${k} = $${$i++}`).join(',');
        const where = this._buildWhere(whereRaw, $i);
        const sql = 'UPDATE ' + table + setSql + where.sql;
        await this.run(sql, [...values, ...where.values]);
    }
}

// @ts-ignore
const log$d = logger('Mail.ts');
class Mail {
    constructor(cfg) {
        const defaultClient = SibApiV3Sdk.ApiClient.instance;
        const apiKey = defaultClient.authentications['api-key'];
        apiKey.apiKey = cfg.sendinblue_api_key;
        this.apiInstance = new SibApiV3Sdk.TransactionalEmailsApi();
    }
    sendPasswordResetMail(passwordReset) {
        const mail = new SibApiV3Sdk.SendSmtpEmail();
        mail.subject = "{{params.subject}}";
        mail.htmlContent = `<html><body>
      <h1>Hello {{params.username}}</h1>
      <p>To reset your password for <a href="https://hyottoko.club">hyottoko.club</a>
      click the following link:</p>
      <p><a href="{{params.link}}">{{params.link}}</a></p>
      </body></html>`;
        mail.sender = { name: "Hyottoko.club", email: "noreply@hyottoko.club" };
        mail.to = [{
                email: passwordReset.user.email,
                name: passwordReset.user.name,
            }];
        mail.params = {
            username: passwordReset.user.name,
            subject: "Password Reset for Hyottoko.club",
            link: `https://hyottoko.club/password-reset?t=${passwordReset.token.token}`
        };
        this.send(mail);
    }
    sendRegistrationMail(registration) {
        const mail = new SibApiV3Sdk.SendSmtpEmail();
        mail.subject = "{{params.subject}}";
        mail.htmlContent = `<html><body>
      <h1>Hello {{params.username}}</h1>
      <p>Thank you for registering an account at <a href="https://hyottoko.club">hyottoko.club</a>.</p>
      <p>Please confirm your registration by clicking the following link:</p>
      <p><a href="{{params.link}}">{{params.link}}</a></p>
      </body></html>`;
        mail.sender = { name: "Hyottoko.club", email: "noreply@hyottoko.club" };
        mail.to = [{
                email: registration.user.email,
                name: registration.user.name,
            }];
        mail.params = {
            username: registration.user.name,
            subject: "User Registration on Hyottoko.club",
            link: `https://hyottoko.club/login?t=${registration.token.token}`
        };
        this.send(mail);
    }
    send(mail) {
        this.apiInstance.sendTransacEmail(mail).then(function (data) {
            log$d.info('API called successfully. Returned data: ' + JSON.stringify(data));
        }, function (error) {
            log$d.error(error);
        });
    }
}

function mitt(n){return {all:n=n||new Map,on:function(t,e){var i=n.get(t);i?i.push(e):n.set(t,[e]);},off:function(t,e){var i=n.get(t);i&&(e?i.splice(i.indexOf(e)>>>0,1):n.set(t,[]));},emit:function(t,e){var i=n.get(t);i&&i.slice().map(function(n){n(e);}),(i=n.get("*"))&&i.slice().map(function(n){n(t,e);});}}}

const log$c = logger('countdown.ts');
const countdown = (originalCmd, bot, user) => async (ctx) => {
    const sayFn = bot.sayFn(user, ctx.target);
    const doReplacements = async (text) => {
        return await fn.doReplacements(text, ctx.rawCmd, ctx.context, originalCmd, bot, user);
    };
    const say = async (text) => {
        return sayFn(await doReplacements(text));
    };
    const parseDuration = async (str) => {
        return mustParseHumanDuration(await doReplacements(str));
    };
    const settings = originalCmd.data;
    const t = (settings.type || 'auto');
    let actionDefs = [];
    if (t === 'auto') {
        const steps = parseInt(await doReplacements(`${settings.steps}`), 10);
        const msgStep = settings.step || "{step}";
        const msgIntro = settings.intro || null;
        const msgOutro = settings.outro || null;
        if (msgIntro) {
            actionDefs.push({ type: CountdownActionType.TEXT, value: msgIntro.replace(/\{steps\}/g, `${steps}`) });
            actionDefs.push({ type: CountdownActionType.DELAY, value: settings.interval || '1s' });
        }
        for (let step = steps; step > 0; step--) {
            actionDefs.push({
                type: CountdownActionType.TEXT,
                value: msgStep.replace(/\{steps\}/g, `${steps}`).replace(/\{step\}/g, `${step}`),
            });
            actionDefs.push({ type: CountdownActionType.DELAY, value: settings.interval || '1s' });
        }
        if (msgOutro) {
            actionDefs.push({ type: CountdownActionType.TEXT, value: msgOutro.replace(/\{steps\}/g, `${steps}`) });
        }
    }
    else if (t === 'manual') {
        actionDefs = settings.actions;
    }
    const actions = [];
    for (const a of actionDefs) {
        if (a.type === CountdownActionType.TEXT) {
            actions.push(async () => say(`${a.value}`));
        }
        else if (a.type === CountdownActionType.MEDIA) {
            actions.push(async () => {
                bot.getWebSocketServer().notifyAll([user.id], 'general', {
                    event: 'playmedia',
                    data: a.value,
                });
            });
        }
        else if (a.type === CountdownActionType.DELAY) {
            let duration;
            try {
                duration = (await parseDuration(`${a.value}`)) || 0;
            }
            catch (e) {
                log$c.error(e.message, a.value);
                return;
            }
            actions.push(async () => await fn.sleep(duration));
        }
    }
    for (let i = 0; i < actions.length; i++) {
        await actions[i]();
    }
};

const createWord = async (createWordRequestData) => {
    const url = 'https://madochan.hyottoko.club/api/v1/_create_word';
    const resp = await xhr.post(url, asJson(createWordRequestData));
    const json = (await resp.json());
    return json;
};
var Madochan = {
    createWord,
    defaultModel: '100epochs800lenhashingbidirectional.h5',
    defaultWeirdness: 1,
};

const log$b = logger('madochanCreateWord.ts');
const madochanCreateWord = (originalCmd, bot, user) => async (ctx) => {
    if (!ctx.rawCmd) {
        return;
    }
    const model = `${originalCmd.data.model}` || Madochan.defaultModel;
    const weirdness = parseInt(originalCmd.data.weirdness, 10) || Madochan.defaultWeirdness;
    const say = bot.sayFn(user, ctx.target);
    const definition = ctx.rawCmd.args.join(' ');
    say(`Generating word for "${definition}"...`);
    try {
        const data = await Madochan.createWord({ model, weirdness, definition });
        if (data.word === '') {
            say(`Sorry, I could not generate a word :("`);
        }
        else {
            say(`"${definition}": ${data.word}`);
        }
    }
    catch (e) {
        log$b.error(e);
        say(`Error occured, unable to generate a word :("`);
    }
};

const randomText = (originalCmd, bot, user) => async (ctx) => {
    const texts = originalCmd.data.text;
    const say = bot.sayFn(user, ctx.target);
    say(await fn.doReplacements(fn.getRandom(texts), ctx.rawCmd, ctx.context, originalCmd, bot, user));
};

const log$a = logger('playMedia.ts');
const isTwitchClipUrl = (url) => {
    return !!url.match(/^https:\/\/clips\.twitch\.tv\/.+/);
};
const downloadVideo = async (originalUrl) => {
    // if video url looks like a twitch clip url, dl it first
    const filename = `${hash(originalUrl)}-clip.mp4`;
    const outfile = `./data/uploads/${filename}`;
    if (!fs.existsSync(outfile)) {
        log$a.debug(`downloading the video to ${outfile}`);
        const child = childProcess.execFile(config.youtubeDlBinary, [originalUrl, '-o', outfile]);
        await new Promise((resolve) => {
            child.on('close', resolve);
        });
    }
    else {
        log$a.debug(`video exists at ${outfile}`);
    }
    return `/uploads/${filename}`;
};
const prepareData = async (ctx, originalCmd, bot, user) => {
    const doReplaces = async (str) => {
        return await fn.doReplacements(str, ctx.rawCmd, ctx.context, originalCmd, bot, user);
    };
    const data = originalCmd.data;
    data.image_url = await doReplaces(data.image_url);
    if (!data.video.url) {
        return data;
    }
    log$a.debug(`video url is defined: ${data.video.url}`);
    data.video.url = await doReplaces(data.video.url);
    if (!data.video.url) {
        log$a.debug('no video url found');
    }
    else if (isTwitchClipUrl(data.video.url)) {
        // video url looks like a twitch clip url, dl it first
        log$a.debug(`twitch clip found: ${data.video.url}`);
        data.video.url = await downloadVideo(data.video.url);
    }
    else {
        // otherwise assume it is already a playable video url
        // TODO: youtube videos maybe should also be downloaded
        log$a.debug('video is assumed to be directly playable via html5 video element');
    }
    return data;
};
const playMedia = (originalCmd, bot, user) => async (ctx) => {
    bot.getWebSocketServer().notifyAll([user.id], 'general', {
        event: 'playmedia',
        data: await prepareData(ctx, originalCmd, bot, user),
        id: originalCmd.id
    });
};

const log$9 = logger('chatters.ts');
const chatters = (bot, user) => async (ctx) => {
    const helixClient = bot.getUserTwitchClientManager(user).getHelixClient();
    if (!ctx.context || !helixClient) {
        log$9.info('context', ctx.context);
        log$9.info('helixClient', helixClient);
        log$9.info('unable to execute chatters command, client, context, or helixClient missing');
        return;
    }
    const say = bot.sayFn(user, ctx.target);
    const stream = await helixClient.getStreamByUserId(ctx.context['room-id']);
    if (!stream) {
        say(`It seems this channel is not live at the moment...`);
        return;
    }
    const userNames = await getChatters(bot.getDb(), ctx.context['room-id'], new Date(stream.started_at));
    if (userNames.length === 0) {
        say(`It seems nobody chatted? :(`);
        return;
    }
    say(`Thank you for chatting!`);
    fn.joinIntoChunks(userNames, ', ', 500).forEach(msg => {
        say(msg);
    });
};

const log$8 = logger('setChannelTitle.ts');
const setChannelTitle = (originalCmd, bot, user) => async (ctx) => {
    const helixClient = bot.getUserTwitchClientManager(user).getHelixClient();
    if (!ctx.rawCmd || !ctx.context || !helixClient) {
        log$8.info('command', ctx.rawCmd);
        log$8.info('context', ctx.context);
        log$8.info('helixClient', helixClient);
        log$8.info('unable to execute setChannelTitle, client, command, context, or helixClient missing');
        return;
    }
    const channelId = ctx.context['room-id'];
    const say = bot.sayFn(user, ctx.target);
    const title = originalCmd.data.title === '' ? '$args()' : originalCmd.data.title;
    const tmpTitle = await fn.doReplacements(title, ctx.rawCmd, ctx.context, originalCmd, bot, user);
    if (tmpTitle === '') {
        const info = await helixClient.getChannelInformation(channelId);
        if (info) {
            say(`Current title is "${info.title}".`);
        }
        else {
            say(`❌ Unable to determine current title.`);
        }
        return;
    }
    // helix api returns 204 status code even if the title is too long and
    // cant actually be set. but there is no error returned in that case :(
    const len = unicodeLength(tmpTitle);
    const max = 140;
    if (len > max) {
        say(`❌ Unable to change title because it is too long (${len}/${max} characters).`);
        return;
    }
    const accessToken = await getMatchingAccessToken(channelId, bot, user);
    if (!accessToken) {
        say(`❌ Not authorized to change title.`);
        return;
    }
    const resp = await helixClient.modifyChannelInformation(accessToken, channelId, { title: tmpTitle }, bot, user);
    if (resp?.status === 204) {
        say(`✨ Changed title to "${tmpTitle}".`);
    }
    else {
        say('❌ Unable to change title.');
    }
};

const log$7 = logger('setChannelGameId.ts');
const setChannelGameId = (originalCmd, bot, user) => async (ctx) => {
    const helixClient = bot.getUserTwitchClientManager(user).getHelixClient();
    if (!ctx.rawCmd || !ctx.context || !helixClient) {
        log$7.info('command', ctx.rawCmd);
        log$7.info('context', ctx.context);
        log$7.info('helixClient', helixClient);
        log$7.info('unable to execute setChannelGameId, client, command, context, or helixClient missing');
        return;
    }
    const channelId = ctx.context['room-id'];
    const say = bot.sayFn(user, ctx.target);
    const gameId = originalCmd.data.game_id === '' ? '$args()' : originalCmd.data.game_id;
    const tmpGameId = await fn.doReplacements(gameId, ctx.rawCmd, ctx.context, originalCmd, bot, user);
    if (tmpGameId === '') {
        const info = await helixClient.getChannelInformation(channelId);
        if (info) {
            say(`Current category is "${info.game_name}".`);
        }
        else {
            say(`❌ Unable to determine current category.`);
        }
        return;
    }
    const category = await helixClient.searchCategory(tmpGameId);
    if (!category) {
        say('🔎 Category not found.');
        return;
    }
    const accessToken = await getMatchingAccessToken(channelId, bot, user);
    if (!accessToken) {
        say(`❌ Not authorized to update category.`);
        return;
    }
    const resp = await helixClient.modifyChannelInformation(accessToken, channelId, { game_id: category.id }, bot, user);
    if (resp?.status === 204) {
        say(`✨ Changed category to "${category.name}".`);
    }
    else {
        say('❌ Unable to update category.');
    }
};

const searchWord$1 = async (keyword, page = 1) => {
    const url = 'https://jisho.org/api/v1/search/words' + asQueryArgs({
        keyword: keyword,
        page: page,
    });
    const resp = await xhr.get(url);
    const json = (await resp.json());
    return json.data;
};
var JishoOrg = {
    searchWord: searchWord$1,
};

const LANG_TO_URL_MAP = {
    de: 'https://www.dict.cc/',
    ru: 'https://enru.dict.cc/',
    es: 'https://enes.dict.cc/',
    it: 'https://enit.dict.cc/',
    fr: 'https://enfr.dict.cc/',
    pt: 'https://enpt.dict.cc/',
};
/**
 * Exctract searched words and word lists for both languages
 * from a dict.cc result html
 * TODO: change from regex to parsing the html ^^
 */
const extractInfo = (text) => {
    const stringToArray = (str) => {
        const arr = [];
        str.replace(/"([^"]*)"/g, (m, m1) => {
            arr.push(m1);
            return m;
        });
        return arr;
    };
    const arrayByRegex = (regex) => {
        const m = text.match(regex);
        return m ? stringToArray(m[1]) : [];
    };
    const m = text.match(/<link rel="canonical" href="https:\/\/[^.]+\.dict\.cc\/\?s=([^"]+)">/);
    const words = m ? decodeURIComponent(m[1]).split('+') : [];
    if (!words.length) {
        return { words, arr1: [], arr2: [] };
    }
    return {
        words,
        arr1: arrayByRegex(/var c1Arr = new Array\((.*)\);/),
        arr2: arrayByRegex(/var c2Arr = new Array\((.*)\);/),
    };
};
const parseResult = (text) => {
    const normalize = (str) => {
        return str.toLowerCase().replace(/[.!?]/, '');
    };
    const info = extractInfo(text);
    const matchedWords = info.words;
    if (!matchedWords) {
        return [];
    }
    const arr1 = info.arr1;
    const arr2 = info.arr2;
    const arr1NoPunct = arr1.map(item => normalize(item));
    const arr2NoPunct = arr2.map(item => normalize(item));
    const results = [];
    const collectResults = (searchWords, fromArrSearch, fromArr, toArr) => {
        const _results = [];
        for (const i in fromArr) {
            if (!fromArrSearch[i]) {
                continue;
            }
            if (!searchWords.includes(fromArrSearch[i])) {
                continue;
            }
            if (fromArr[i] === toArr[i]) {
                // from and to is exactly the same, so skip it
                continue;
            }
            const idx = _results.findIndex(item => item.from === fromArr[i]);
            if (idx < 0) {
                _results.push({ from: fromArr[i], to: [toArr[i]] });
            }
            else if (!_results[idx].to.includes(toArr[i])) {
                _results[idx].to.push(toArr[i]);
            }
        }
        results.push(..._results);
    };
    const matchedSentence = normalize(matchedWords.join(' '));
    if (arr1NoPunct.includes(matchedSentence)) {
        const fromArrSearch = arr1NoPunct;
        const fromArr = arr1;
        const toArr = arr2;
        const searchWords = [matchedSentence];
        collectResults(searchWords, fromArrSearch, fromArr, toArr);
    }
    if (arr2NoPunct.includes(matchedSentence)) {
        const fromArrSearch = arr2NoPunct;
        const fromArr = arr2;
        const toArr = arr1;
        const searchWords = [matchedSentence];
        collectResults(searchWords, fromArrSearch, fromArr, toArr);
    }
    if (results.length === 0) {
        let fromArrSearch = [];
        let fromArr = [];
        let toArr = [];
        let searchWords = [];
        for (const matchedWord of matchedWords) {
            if (arr1.includes(matchedWord)) {
                fromArr = fromArrSearch = arr1;
                toArr = arr2;
            }
            else {
                fromArr = fromArrSearch = arr2;
                toArr = arr1;
            }
        }
        searchWords = matchedWords;
        collectResults(searchWords, fromArrSearch, fromArr, toArr);
    }
    return results;
};
const searchWord = async (keyword, lang) => {
    const baseUrl = LANG_TO_URL_MAP[lang];
    if (!baseUrl) {
        return [];
    }
    const url = baseUrl + asQueryArgs({ s: keyword });
    const resp = await xhr.get(url);
    const text = await resp.text();
    return parseResult(text);
};
var DictCc = {
    searchWord,
    parseResult,
    LANG_TO_URL_MAP,
};

const jishoOrgLookup = async (phrase) => {
    const data = await JishoOrg.searchWord(phrase);
    if (data.length === 0) {
        return [];
    }
    const e = data[0];
    const j = e.japanese[0];
    const d = e.senses[0].english_definitions;
    return [{
            from: phrase,
            to: [`${j.word} (${j.reading}) ${d.join(', ')}`],
        }];
};
const LANG_TO_FN = {
    ja: jishoOrgLookup,
};
for (const key of Object.keys(DictCc.LANG_TO_URL_MAP)) {
    LANG_TO_FN[key] = (phrase) => DictCc.searchWord(phrase, key);
}
const dictLookup = (originalCmd, bot, user) => async (ctx) => {
    if (!ctx.rawCmd) {
        return [];
    }
    const say = bot.sayFn(user, ctx.target);
    const tmpLang = await fn.doReplacements(originalCmd.data.lang, ctx.rawCmd, ctx.context, originalCmd, bot, user);
    const dictFn = LANG_TO_FN[tmpLang] || null;
    if (!dictFn) {
        say(`Sorry, language not supported: "${tmpLang}"`);
        return;
    }
    // if no phrase is setup, use all args given to command
    const phrase = originalCmd.data.phrase === '' ? '$args()' : originalCmd.data.phrase;
    const tmpPhrase = await fn.doReplacements(phrase, ctx.rawCmd, ctx.context, originalCmd, bot, user);
    const items = await dictFn(tmpPhrase);
    if (items.length === 0) {
        say(`Sorry, I didn't find anything for "${tmpPhrase}" in language "${tmpLang}"`);
        return;
    }
    for (const item of items) {
        say(`Phrase "${item.from}": ${item.to.join(", ")}`);
    }
};

const log$6 = logger('setStreamTags.ts');
const addStreamTags = (originalCmd, bot, user) => async (ctx) => {
    const helixClient = bot.getUserTwitchClientManager(user).getHelixClient();
    if (!ctx.rawCmd || !ctx.context || !helixClient) {
        log$6.info('command', ctx.rawCmd);
        log$6.info('context', ctx.context);
        log$6.info('helixClient', helixClient);
        log$6.info('unable to execute addStreamTags, client, command, context, or helixClient missing');
        return;
    }
    const channelId = ctx.context['room-id'];
    const say = bot.sayFn(user, ctx.target);
    const tag = originalCmd.data.tag === '' ? '$args()' : originalCmd.data.tag;
    const tmpTag = await fn.doReplacements(tag, ctx.rawCmd, ctx.context, originalCmd, bot, user);
    const tagsResponse = await helixClient.getStreamTags(channelId);
    if (!tagsResponse) {
        say(`❌ Unable to fetch current tags.`);
        return;
    }
    if (tmpTag === '') {
        const names = tagsResponse.data.map(entry => entry.localization_names['en-us']);
        say(`Current tags: ${names.join(', ')}`);
        return;
    }
    const idx = findIdxFuzzy(config.twitch.manual_tags, tmpTag, (item) => item.name);
    if (idx === -1) {
        say(`❌ No such tag: ${tmpTag}`);
        return;
    }
    const tagEntry = config.twitch.manual_tags[idx];
    const newTagIds = tagsResponse.data.map(entry => entry.tag_id);
    if (newTagIds.includes(tagEntry.id)) {
        const names = tagsResponse.data.map(entry => entry.localization_names['en-us']);
        say(`✨ Tag ${tagEntry.name} already exists, current tags: ${names.join(', ')}`);
        return;
    }
    newTagIds.push(tagEntry.id);
    const newSettableTagIds = newTagIds.filter(tagId => !config.twitch.auto_tags.find(t => t.id === tagId));
    if (newSettableTagIds.length > 5) {
        const names = tagsResponse.data.map(entry => entry.localization_names['en-us']);
        say(`❌ Too many tags already exist, current tags: ${names.join(', ')}`);
        return;
    }
    const accessToken = await getMatchingAccessToken(channelId, bot, user);
    if (!accessToken) {
        say(`❌ Not authorized to add tag: ${tagEntry.name}`);
        return;
    }
    const resp = await helixClient.replaceStreamTags(accessToken, channelId, newSettableTagIds, bot, user);
    if (!resp || resp.status < 200 || resp.status >= 300) {
        log$6.error(resp);
        say(`❌ Unable to add tag: ${tagEntry.name}`);
        return;
    }
    say(`✨ Added tag: ${tagEntry.name}`);
};

const log$5 = logger('setStreamTags.ts');
const removeStreamTags = (originalCmd, bot, user) => async (ctx) => {
    const helixClient = bot.getUserTwitchClientManager(user).getHelixClient();
    if (!ctx.rawCmd || !ctx.context || !helixClient) {
        log$5.info('command', ctx.rawCmd);
        log$5.info('context', ctx.context);
        log$5.info('helixClient', helixClient);
        log$5.info('unable to execute removeStreamTags, client, command, context, or helixClient missing');
        return;
    }
    const channelId = ctx.context['room-id'];
    const say = bot.sayFn(user, ctx.target);
    const tag = originalCmd.data.tag === '' ? '$args()' : originalCmd.data.tag;
    const tmpTag = await fn.doReplacements(tag, ctx.rawCmd, ctx.context, originalCmd, bot, user);
    const tagsResponse = await helixClient.getStreamTags(channelId);
    if (!tagsResponse) {
        say(`❌ Unable to fetch current tags.`);
        return;
    }
    if (tmpTag === '') {
        const names = tagsResponse.data.map(entry => entry.localization_names['en-us']);
        say(`Current tags: ${names.join(', ')}`);
        return;
    }
    const manualTags = tagsResponse.data.filter(entry => !entry.is_auto);
    const idx = findIdxFuzzy(manualTags, tmpTag, (item) => item.localization_names['en-us']);
    if (idx === -1) {
        const autoTags = tagsResponse.data.filter(entry => entry.is_auto);
        const idx = findIdxFuzzy(autoTags, tmpTag, (item) => item.localization_names['en-us']);
        if (idx === -1) {
            say(`❌ No such tag is currently set: ${tmpTag}`);
        }
        else {
            say(`❌ Unable to remove automatic tag: ${autoTags[idx].localization_names['en-us']}`);
        }
        return;
    }
    const newTagIds = manualTags.filter((_value, index) => index !== idx).map(entry => entry.tag_id);
    const newSettableTagIds = newTagIds.filter(tagId => !config.twitch.auto_tags.find(t => t.id === tagId));
    const accessToken = await getMatchingAccessToken(channelId, bot, user);
    if (!accessToken) {
        say(`❌ Not authorized to remove tag: ${manualTags[idx].localization_names['en-us']}`);
        return;
    }
    const resp = await helixClient.replaceStreamTags(accessToken, channelId, newSettableTagIds, bot, user);
    if (!resp || resp.status < 200 || resp.status >= 300) {
        say(`❌ Unable to remove tag: ${manualTags[idx].localization_names['en-us']}`);
        return;
    }
    say(`✨ Removed tag: ${manualTags[idx].localization_names['en-us']}`);
};

logger('GeneralModule.ts');
class GeneralModule {
    constructor(bot, user) {
        this.name = 'general';
        this.interval = null;
        this.channelPointsCustomRewards = {};
        // @ts-ignore
        return (async () => {
            this.bot = bot;
            this.user = user;
            const initData = await this.reinit();
            this.data = initData.data;
            this.commands = initData.commands;
            this.timers = initData.timers;
            if (initData.shouldSave) {
                await this.bot.getUserModuleStorage(this.user).save(this.name, this.data);
            }
            this.inittimers();
            return this;
        })();
    }
    async userChanged(user) {
        this.user = user;
    }
    inittimers() {
        if (this.interval) {
            clearInterval(this.interval);
            this.interval = null;
        }
        this.interval = setInterval(() => {
            const now = new Date().getTime();
            this.timers.forEach(async (t) => {
                if (t.lines >= t.minLines && now > t.next) {
                    const cmdDef = t.command;
                    const rawCmd = null;
                    const target = null;
                    const context = null;
                    await fn.applyVariableChanges(cmdDef, this, rawCmd, context);
                    await cmdDef.fn({ rawCmd, target, context });
                    t.lines = 0;
                    t.next = now + t.minInterval;
                }
            });
        }, 1 * SECOND);
    }
    fix(commands) {
        const fixedCommands = (commands || []).map((cmd) => {
            if (cmd.command) {
                cmd.triggers = [newCommandTrigger(cmd.command, cmd.commandExact || false)];
                delete cmd.command;
            }
            cmd.variables = cmd.variables || [];
            cmd.variableChanges = cmd.variableChanges || [];
            if (cmd.action === CommandAction.TEXT) {
                if (!Array.isArray(cmd.data.text)) {
                    cmd.data.text = [cmd.data.text];
                }
            }
            if (cmd.action === CommandAction.MEDIA) {
                if (cmd.data.excludeFromGlobalWidget) {
                    cmd.data.widgetIds = [cmd.id];
                }
                else if (typeof cmd.data.widgetIds === 'undefined') {
                    cmd.data.widgetIds = [];
                }
                if (typeof cmd.data.excludeFromGlobalWidget !== 'undefined') {
                    delete cmd.data.excludeFromGlobalWidget;
                }
                cmd.data.minDurationMs = cmd.data.minDurationMs || 0;
                cmd.data.sound.volume = cmd.data.sound.volume || 100;
                if (!cmd.data.sound.urlpath && cmd.data.sound.file) {
                    cmd.data.sound.urlpath = `/uploads/${encodeURIComponent(cmd.data.sound.file)}`;
                }
                if (!cmd.data.image.urlpath && cmd.data.image.file) {
                    cmd.data.image.urlpath = `/uploads/${encodeURIComponent(cmd.data.image.file)}`;
                }
                if (!cmd.data.image_url || cmd.data.image_url === 'undefined') {
                    cmd.data.image_url = '';
                }
                if (!cmd.data.video) {
                    cmd.data.video = {
                        url: cmd.data.video || cmd.data.twitch_clip?.url || '',
                        volume: cmd.data.twitch_clip?.volume || 100,
                    };
                }
                if (typeof cmd.data.twitch_clip !== 'undefined') {
                    delete cmd.data.twitch_clip;
                }
            }
            if (cmd.action === CommandAction.COUNTDOWN) {
                cmd.data.actions = (cmd.data.actions || []).map((action) => {
                    if (typeof action.value === 'string') {
                        return action;
                    }
                    if (action.value.sound && !action.value.sound.urlpath && action.value.sound.file) {
                        action.value.sound.urlpath = `/uploads/${encodeURIComponent(action.value.sound.file)}`;
                    }
                    if (action.value.image && !action.value.image.urlpath && action.value.image.file) {
                        action.value.image.urlpath = `/uploads/${encodeURIComponent(action.value.image.file)}`;
                    }
                    return action;
                });
            }
            if (cmd.action === 'jisho_org_lookup') {
                cmd.action = CommandAction.DICT_LOOKUP;
                cmd.data = { lang: 'ja', phrase: '' };
            }
            cmd.triggers = (cmd.triggers || []).map((trigger) => {
                trigger.data.minLines = parseInt(trigger.data.minLines, 10) || 0;
                if (trigger.data.minSeconds) {
                    trigger.data.minInterval = trigger.data.minSeconds * 1000;
                }
                return trigger;
            });
            return cmd;
        });
        let shouldSave = false;
        // add ids to commands that dont have one yet
        for (const command of fixedCommands) {
            if (!command.id) {
                command.id = nonce(10);
                shouldSave = true;
            }
            if (!command.createdAt) {
                command.createdAt = JSON.stringify(new Date());
                shouldSave = true;
            }
        }
        return {
            commands: fixedCommands,
            shouldSave,
        };
    }
    async reinit() {
        const data = await this.bot.getUserModuleStorage(this.user).load(this.name, {
            commands: [],
            settings: {
                volume: 100,
            },
            adminSettings: {
                showImages: true,
                autocommands: []
            },
        });
        const fixed = this.fix(data.commands);
        data.commands = fixed.commands;
        if (!data.adminSettings) {
            data.adminSettings = {};
        }
        if (typeof data.adminSettings.showImages === 'undefined') {
            data.adminSettings.showImages = true;
        }
        if (typeof data.adminSettings.autocommands === 'undefined') {
            data.adminSettings.autocommands = [];
        }
        if (!data.adminSettings.autocommands.includes('!bot')) {
            const txtCommand = commands.text.NewCommand();
            txtCommand.triggers = [newCommandTrigger('!bot')];
            txtCommand.data.text = ['Version $bot.version $bot.website < - $bot.features - Source code at $bot.github'];
            data.commands.push(txtCommand);
            data.adminSettings.autocommands.push('!bot');
            fixed.shouldSave = true;
        }
        const commands$1 = [];
        const timers = [];
        data.commands.forEach((cmd) => {
            if (cmd.triggers.length === 0) {
                return;
            }
            let cmdObj = null;
            switch (cmd.action) {
                case CommandAction.MEDIA_VOLUME:
                    cmdObj = Object.assign({}, cmd, { fn: this.mediaVolumeCmd.bind(this) });
                    break;
                case CommandAction.MADOCHAN_CREATEWORD:
                    cmdObj = Object.assign({}, cmd, { fn: madochanCreateWord(cmd, this.bot, this.user) });
                    break;
                case CommandAction.DICT_LOOKUP:
                    cmdObj = Object.assign({}, cmd, { fn: dictLookup(cmd, this.bot, this.user) });
                    break;
                case CommandAction.TEXT:
                    cmdObj = Object.assign({}, cmd, { fn: randomText(cmd, this.bot, this.user) });
                    break;
                case CommandAction.MEDIA:
                    cmdObj = Object.assign({}, cmd, { fn: playMedia(cmd, this.bot, this.user) });
                    break;
                case CommandAction.COUNTDOWN:
                    cmdObj = Object.assign({}, cmd, { fn: countdown(cmd, this.bot, this.user) });
                    break;
                case CommandAction.CHATTERS:
                    cmdObj = Object.assign({}, cmd, { fn: chatters(this.bot, this.user) });
                    break;
                case CommandAction.SET_CHANNEL_TITLE:
                    cmdObj = Object.assign({}, cmd, { fn: setChannelTitle(cmd, this.bot, this.user) });
                    break;
                case CommandAction.SET_CHANNEL_GAME_ID:
                    cmdObj = Object.assign({}, cmd, { fn: setChannelGameId(cmd, this.bot, this.user) });
                    break;
                case CommandAction.ADD_STREAM_TAGS:
                    cmdObj = Object.assign({}, cmd, { fn: addStreamTags(cmd, this.bot, this.user) });
                    break;
                case CommandAction.REMOVE_STREAM_TAGS:
                    cmdObj = Object.assign({}, cmd, { fn: removeStreamTags(cmd, this.bot, this.user) });
                    break;
            }
            if (!cmdObj) {
                return;
            }
            for (const trigger of cmd.triggers) {
                if (trigger.type === CommandTriggerType.FIRST_CHAT) {
                    commands$1.push(cmdObj);
                }
                else if (trigger.type === CommandTriggerType.COMMAND) {
                    // TODO: check why this if is required, maybe for protection against '' command?
                    if (trigger.data.command) {
                        commands$1.push(cmdObj);
                    }
                }
                else if (trigger.type === CommandTriggerType.REWARD_REDEMPTION) {
                    // TODO: check why this if is required, maybe for protection against '' command?
                    if (trigger.data.command) {
                        commands$1.push(cmdObj);
                    }
                }
                else if (trigger.type === CommandTriggerType.FOLLOW) {
                    commands$1.push(cmdObj);
                }
                else if (trigger.type === CommandTriggerType.SUB) {
                    commands$1.push(cmdObj);
                }
                else if (trigger.type === CommandTriggerType.RAID) {
                    commands$1.push(cmdObj);
                }
                else if (trigger.type === CommandTriggerType.BITS) {
                    commands$1.push(cmdObj);
                }
                else if (trigger.type === CommandTriggerType.TIMER) {
                    const interval = parseHumanDuration(trigger.data.minInterval);
                    if (trigger.data.minLines || interval) {
                        timers.push({
                            lines: 0,
                            minLines: trigger.data.minLines,
                            minInterval: interval,
                            command: cmdObj,
                            next: new Date().getTime() + interval,
                        });
                    }
                }
            }
        });
        return { data, commands: commands$1, timers, shouldSave: fixed.shouldSave };
    }
    getRoutes() {
        return {};
    }
    async _channelPointsCustomRewards() {
        const helixClient = this.bot.getUserTwitchClientManager(this.user).getHelixClient();
        if (helixClient) {
            const twitchChannels = await this.bot.getTwitchChannels().allByUserId(this.user.id);
            return await helixClient.getAllChannelPointsCustomRewards(twitchChannels, this.bot, this.user);
        }
        return {};
    }
    async wsdata(eventName) {
        return {
            event: eventName,
            data: {
                commands: this.data.commands,
                settings: this.data.settings,
                adminSettings: this.data.adminSettings,
                globalVariables: await this.bot.getUserVariables(this.user).all(),
                channelPointsCustomRewards: this.channelPointsCustomRewards,
                mediaWidgetUrl: await this.bot.getWidgets().getWidgetUrl('media', this.user.id),
            },
        };
    }
    async updateClient(eventName, ws) {
        this.bot.getWebSocketServer().notifyOne([this.user.id], this.name, await this.wsdata(eventName), ws);
    }
    async updateClients(eventName) {
        this.bot.getWebSocketServer().notifyAll([this.user.id], this.name, await this.wsdata(eventName));
    }
    async save() {
        await this.bot.getUserModuleStorage(this.user).save(this.name, this.data);
        const initData = await this.reinit();
        this.data = initData.data;
        this.commands = initData.commands;
        this.timers = initData.timers;
    }
    async saveCommands() {
        await this.save();
    }
    getWsEvents() {
        return {
            'conn': async (ws) => {
                this.channelPointsCustomRewards = await this._channelPointsCustomRewards();
                await this.updateClient('init', ws);
            },
            'save': async (_ws, data) => {
                const fixed = this.fix(data.commands);
                this.data.commands = fixed.commands;
                this.data.settings = data.settings;
                this.data.adminSettings = data.adminSettings;
                await this.save();
            },
        };
    }
    async volume(vol) {
        if (vol < 0) {
            vol = 0;
        }
        if (vol > 100) {
            vol = 100;
        }
        this.data.settings.volume = vol;
        await this.save();
    }
    async mediaVolumeCmd(ctx) {
        if (!ctx.rawCmd) {
            return;
        }
        const say = this.bot.sayFn(this.user, ctx.target);
        if (ctx.rawCmd.args.length === 0) {
            say(`Current volume: ${this.data.settings.volume}`);
        }
        else {
            const newVolume = determineNewVolume(ctx.rawCmd.args[0], this.data.settings.volume);
            await this.volume(newVolume);
            say(`New volume: ${this.data.settings.volume}`);
        }
    }
    getCommands() {
        return this.commands;
    }
    async onChatMsg(_chatMessageContext) {
        this.timers.forEach(t => {
            t.lines++;
        });
    }
}

const log$4 = logger('Youtube.ts');
const get = async (url, args) => {
    args.key = config.modules.sr.google.api_key;
    const resp = await xhr.get(url + asQueryArgs(args));
    return await resp.json();
};
const fetchDataByYoutubeId = async (youtubeId) => {
    let json;
    try {
        json = await get('https://www.googleapis.com/youtube/v3/videos', {
            part: 'snippet,status,contentDetails',
            id: youtubeId,
            fields: 'items(id,snippet,status,contentDetails)',
        });
        return json.items[0];
    }
    catch (e) {
        log$4.error(e, json, youtubeId);
        return null;
    }
};
const extractYoutubeId = (str) => {
    const patterns = [
        /youtu\.be\/(.*?)(?:\?|"|$)/i,
        /\.youtube\.com\/(?:watch\?v=|v\/|embed\/)([^&"'#]*)/i,
    ];
    for (const pattern of patterns) {
        const m = str.match(pattern);
        if (m) {
            return m[1];
        }
    }
    // https://stackoverflow.com/questions/6180138/whats-the-maximum-length-of-a-youtube-video-id
    if (str.match(/^[a-z0-9_-]{11}$/i)) {
        // the string may still not be a youtube id
        return str;
    }
    return null;
};
const getYoutubeIdsBySearch = async (searchterm) => {
    const searches = [
        `"${searchterm}"`,
        searchterm,
    ];
    const ids = [];
    for (const q of searches) {
        const json = await get('https://www.googleapis.com/youtube/v3/search', {
            part: 'snippet',
            q: q,
            type: 'video',
            videoEmbeddable: 'true',
        });
        try {
            for (const item of json.items) {
                ids.push(item.id.videoId);
            }
        }
        catch (e) {
            log$4.info(e);
        }
    }
    return ids;
};
const getUrlById = (id) => `https://youtu.be/${id}`;
var Youtube = {
    fetchDataByYoutubeId,
    extractYoutubeId,
    getYoutubeIdsBySearch,
    getUrlById,
};

const default_custom_css_preset = (obj = null) => ({
    name: getProp(obj, ['name'], ''),
    css: getProp(obj, ['css'], ''),
    showProgressBar: getProp(obj, ['showProgressBar'], false),
    showThumbnails: typeof obj?.showThumbnails === 'undefined' || obj.showThumbnails === true ? 'left' : obj.showThumbnails,
    maxItemsShown: getProp(obj, ['maxItemsShown'], -1),
});
const default_commands = (list = null) => {
    if (Array.isArray(list)) {
        // TODO: sanitize items
        return list;
    }
    return [
        // default commands for song request
        commands.sr_current.NewCommand(),
        commands.sr_undo.NewCommand(),
        commands.sr_good.NewCommand(),
        commands.sr_bad.NewCommand(),
        commands.sr_stats.NewCommand(),
        commands.sr_prev.NewCommand(),
        commands.sr_next.NewCommand(),
        commands.sr_jumptonew.NewCommand(),
        commands.sr_clear.NewCommand(),
        commands.sr_rm.NewCommand(),
        commands.sr_shuffle.NewCommand(),
        commands.sr_reset_stats.NewCommand(),
        commands.sr_loop.NewCommand(),
        commands.sr_noloop.NewCommand(),
        commands.sr_pause.NewCommand(),
        commands.sr_unpause.NewCommand(),
        commands.sr_hidevideo.NewCommand(),
        commands.sr_showvideo.NewCommand(),
        commands.sr_request.NewCommand(),
        commands.sr_re_request.NewCommand(),
        commands.sr_addtag.NewCommand(),
        commands.sr_rmtag.NewCommand(),
        commands.sr_volume.NewCommand(),
        commands.sr_filter.NewCommand(),
        commands.sr_preset.NewCommand(),
        commands.sr_queue.NewCommand(),
    ];
};
const default_settings$4 = (obj = null) => ({
    volume: getProp(obj, ['volume'], 100),
    initAutoplay: getProp(obj, ['initAutoplay'], true),
    hideVideoImage: {
        file: getProp(obj, ['hideVideoImage', 'file'], ''),
        filename: getProp(obj, ['hideVideoImage', 'filename'], ''),
        urlpath: obj?.hideVideoImage?.urlpath ? obj.hideVideoImage.urlpath : (obj?.hideVideoImage?.file ? `/uploads/${encodeURIComponent(obj.hideVideoImage.file)}` : '')
    },
    maxSongLength: {
        viewer: getProp(obj, ['maxSongLength', 'viewer'], 0),
        mod: getProp(obj, ['maxSongLength', 'mod'], 0),
        sub: getProp(obj, ['maxSongLength', 'sub'], 0),
    },
    maxSongsQueued: {
        viewer: parseInt(String(getProp(obj, ['maxSongsQueued', 'viewer'], 0)), 10),
        mod: parseInt(String(getProp(obj, ['maxSongsQueued', 'mod'], 0)), 10),
        sub: parseInt(String(getProp(obj, ['maxSongsQueued', 'sub'], 0)), 10),
    },
    customCss: getProp(obj, ['customCss'], ''),
    customCssPresets: getProp(obj, ['customCssPresets'], []).map(default_custom_css_preset),
    showProgressBar: getProp(obj, ['showProgressBar'], false),
    showThumbnails: typeof obj?.showThumbnails === 'undefined' || obj.showThumbnails === true ? 'left' : obj.showThumbnails,
    maxItemsShown: getProp(obj, ['maxItemsShown'], -1),
});

const log$3 = logger('SongrequestModule.ts');
const ADD_TYPE = {
    NOT_ADDED: 0,
    ADDED: 1,
    REQUEUED: 2,
    EXISTED: 3,
};
const NOT_ADDED_REASON = {
    TOO_MANY_QUEUED: 0,
    TOO_LONG: 1,
    NOT_FOUND_IN_PLAYLIST: 2,
    NOT_FOUND: 3,
};
const default_playlist_item = (item = null) => {
    return {
        id: item?.id || 0,
        tags: item?.tags || [],
        yt: item?.yt || '',
        title: item?.title || '',
        timestamp: item?.timestamp || 0,
        hidevideo: !!(item?.hidevideo),
        last_play: item?.last_play || 0,
        plays: item?.plays || 0,
        goods: item?.goods || 0,
        bads: item?.bads || 0,
        user: item?.user || '',
    };
};
const default_playlist = (list = null) => {
    if (Array.isArray(list)) {
        return list.map(item => default_playlist_item(item));
    }
    return [];
};
class SongrequestModule {
    constructor(bot, user) {
        this.name = 'sr';
        this.channelPointsCustomRewards = {};
        // @ts-ignore
        return (async () => {
            this.bot = bot;
            this.user = user;
            const initData = await this.reinit();
            this.data = {
                filter: initData.data.filter,
                playlist: initData.data.playlist,
                commands: initData.data.commands,
                settings: initData.data.settings,
                stacks: initData.data.stacks,
            };
            this.commands = initData.commands;
            if (initData.shouldSave) {
                await this.bot.getUserModuleStorage(this.user).save(this.name, this.data);
            }
            return this;
        })();
    }
    async userChanged(user) {
        this.user = user;
    }
    async reinit() {
        let shouldSave = false;
        const data = await this.bot.getUserModuleStorage(this.user).load(this.name, {
            filter: {
                tag: '',
            },
            settings: default_settings$4(),
            playlist: default_playlist(),
            commands: default_commands(),
            stacks: {},
        });
        // make sure items have correct structure
        // needed by rest of the code
        // TODO: maybe use same code as in save function
        data.playlist = default_playlist(data.playlist);
        data.settings = default_settings$4(data.settings);
        data.commands = default_commands(data.commands);
        // add ids to commands that dont have one yet
        for (const command of data.commands) {
            if (!command.id) {
                command.id = nonce(10);
                shouldSave = true;
            }
            if (!command.createdAt) {
                command.createdAt = JSON.stringify(new Date());
                shouldSave = true;
            }
        }
        return {
            data: {
                playlist: data.playlist,
                settings: data.settings,
                commands: data.commands,
                filter: data.filter,
                stacks: data.stacks,
            },
            commands: this.initCommands(data.commands),
            shouldSave,
        };
    }
    initCommands(rawCommands) {
        const map = {
            sr_current: this.cmdSrCurrent.bind(this),
            sr_undo: this.cmdSrUndo.bind(this),
            sr_good: this.cmdSrGood.bind(this),
            sr_bad: this.cmdSrBad.bind(this),
            sr_stats: this.cmdSrStats.bind(this),
            sr_prev: this.cmdSrPrev.bind(this),
            sr_next: this.cmdSrNext.bind(this),
            sr_jumptonew: this.cmdSrJumpToNew.bind(this),
            sr_clear: this.cmdSrClear.bind(this),
            sr_rm: this.cmdSrRm.bind(this),
            sr_shuffle: this.cmdSrShuffle.bind(this),
            sr_reset_stats: this.cmdSrResetStats.bind(this),
            sr_loop: this.cmdSrLoop.bind(this),
            sr_noloop: this.cmdSrNoloop.bind(this),
            sr_pause: this.cmdSrPause.bind(this),
            sr_unpause: this.cmdSrUnpause.bind(this),
            sr_hidevideo: this.cmdSrHidevideo.bind(this),
            sr_showvideo: this.cmdSrShowvideo.bind(this),
            sr_request: this.cmdSr.bind(this),
            sr_re_request: this.cmdResr.bind(this),
            sr_addtag: this.cmdSrAddTag.bind(this),
            sr_rmtag: this.cmdSrRmTag.bind(this),
            sr_volume: this.cmdSrVolume.bind(this),
            sr_filter: this.cmdSrFilter.bind(this),
            sr_preset: this.cmdSrPreset.bind(this),
            sr_queue: this.cmdSrQueue.bind(this),
        };
        const commands = [];
        rawCommands.forEach((cmd) => {
            if (cmd.triggers.length === 0 || !map[cmd.action]) {
                return;
            }
            commands.push(Object.assign({}, cmd, { fn: map[cmd.action](cmd) }));
        });
        return commands;
    }
    saveCommands() {
        // pass
        // TODO: save, because variable changes could have happened
    }
    getRoutes() {
        return {
            post: {
                '/api/sr/import': async (req, res, _next) => {
                    try {
                        this.data.settings = default_settings$4(req.body.settings);
                        this.data.playlist = default_playlist(req.body.playlist);
                        this.save();
                        this.updateClients('init');
                        res.send({ error: false });
                    }
                    catch (e) {
                        res.status(400).send({ error: true });
                    }
                },
            },
            get: {
                '/api/sr/export': async (_req, res, _next) => {
                    res.send({
                        settings: this.data.settings,
                        playlist: this.data.playlist,
                    });
                },
            },
        };
    }
    async save() {
        await this.bot.getUserModuleStorage(this.user).save(this.name, {
            filter: this.data.filter,
            playlist: this.data.playlist.map(item => {
                item.title = item.title || '';
                item.timestamp = item.timestamp || new Date().getTime();
                item.last_play = item.last_play || 0;
                item.user = item.user || '';
                item.plays = item.plays || 0;
                item.goods = item.goods || 0;
                item.bads = item.bads || 0;
                item.tags = item.tags || [];
                return item;
            }),
            commands: this.data.commands,
            settings: this.data.settings,
            stacks: this.data.stacks,
        });
    }
    async wsdata(eventName) {
        return {
            event: eventName,
            data: {
                // ommitting youtube cache data and stacks
                filter: this.data.filter,
                playlist: this.data.playlist,
                settings: this.data.settings,
                commands: this.data.commands,
                globalVariables: await this.bot.getUserVariables(this.user).all(),
                channelPointsCustomRewards: this.channelPointsCustomRewards,
                widgetUrl: await this.bot.getWidgets().getWidgetUrl('sr', this.user.id),
            }
        };
    }
    async updateClient(eventName, ws) {
        this.bot.getWebSocketServer().notifyOne([this.user.id], this.name, await this.wsdata(eventName), ws);
    }
    async updateClients(eventName) {
        this.bot.getWebSocketServer().notifyAll([this.user.id], this.name, await this.wsdata(eventName));
    }
    async _channelPointsCustomRewards() {
        const helixClient = this.bot.getUserTwitchClientManager(this.user).getHelixClient();
        if (!helixClient) {
            return {};
        }
        const twitchChannels = await this.bot.getTwitchChannels().allByUserId(this.user.id);
        if (!twitchChannels) {
            return {};
        }
        return await helixClient.getAllChannelPointsCustomRewards(twitchChannels, this.bot, this.user);
    }
    getWsEvents() {
        return {
            'conn': async (ws) => {
                this.channelPointsCustomRewards = await this._channelPointsCustomRewards();
                await this.updateClient('init', ws);
            },
            'play': async (_ws, { id }) => {
                const idx = this.data.playlist.findIndex(item => item.id === id);
                if (idx < 0) {
                    return;
                }
                this.data.playlist = [].concat(this.data.playlist.slice(idx), this.data.playlist.slice(0, idx));
                this.incStat('plays');
                this.data.playlist[idx].last_play = new Date().getTime();
                await this.save();
                await this.updateClients('playIdx');
            },
            'ended': async (_ws) => {
                const item = this.data.playlist.shift();
                if (item) {
                    this.data.playlist.push(item);
                }
                await this.save();
                await this.updateClients('onEnded');
            },
            'save': async (_ws, data) => {
                this.data.commands = data.commands;
                this.data.settings = data.settings;
                await this.save();
                const initData = await this.reinit();
                this.data = initData.data;
                this.commands = initData.commands;
                await this.updateClients('save');
            },
            'ctrl': async (_ws, { ctrl, args }) => {
                switch (ctrl) {
                    case 'volume':
                        this.volume(...args);
                        break;
                    case 'pause':
                        this.pause();
                        break;
                    case 'unpause':
                        this.unpause();
                        break;
                    case 'loop':
                        this.loop();
                        break;
                    case 'noloop':
                        this.noloop();
                        break;
                    case 'good':
                        this.like();
                        break;
                    case 'bad':
                        this.dislike();
                        break;
                    case 'prev':
                        await this.prev();
                        break;
                    case 'skip':
                        await this.next();
                        break;
                    case 'resetStats':
                        await this.resetStats();
                        break;
                    case 'resetStatIdx':
                        this.resetStatIdx(...args);
                        break;
                    case 'clear':
                        this.clear();
                        break;
                    case 'rm':
                        this.remove();
                        break;
                    case 'shuffle':
                        this.shuffle();
                        break;
                    case 'playIdx':
                        this.playIdx(...args);
                        break;
                    case 'rmIdx':
                        this.rmIdx(...args);
                        break;
                    case 'goodIdx':
                        this.goodIdx(...args);
                        break;
                    case 'badIdx':
                        this.badIdx(...args);
                        break;
                    case 'sr':
                        this.request(...args);
                        break;
                    case 'resr':
                        this.resr(...args);
                        break;
                    case 'move':
                        this.move(...args);
                        break;
                    case 'rmtag':
                        this.rmTag(...args);
                        break;
                    case 'addtag':
                        this.addTag(...args);
                        break;
                    case 'updatetag':
                        this.updateTag(...args);
                        break;
                    case 'filter':
                        this.filter(...args);
                        break;
                    case 'videoVisibility':
                        await this.videoVisibility(...args);
                        break;
                    case 'setAllToPlayed':
                        this.setAllToPlayed();
                        break;
                }
            },
        };
    }
    async add(str, userName, maxLenMs, maxQueued) {
        const countQueuedSongsByUser = () => this.data.playlist.filter(item => item.user === userName && item.plays === 0).length;
        const isTooLong = (ytData) => {
            if (maxLenMs > 0) {
                const songLenMs = fn.parseISO8601Duration(ytData.contentDetails.duration);
                if (maxLenMs < songLenMs) {
                    return true;
                }
            }
            return false;
        };
        if (maxQueued > 0 && countQueuedSongsByUser() >= maxQueued) {
            return { addType: ADD_TYPE.NOT_ADDED, idx: -1, reason: NOT_ADDED_REASON.TOO_MANY_QUEUED };
        }
        const youtubeUrl = str.trim();
        let youtubeId = null;
        let youtubeData = null;
        const tmpYoutubeId = Youtube.extractYoutubeId(youtubeUrl);
        if (tmpYoutubeId) {
            const tmpYoutubeData = await this.loadYoutubeData(tmpYoutubeId);
            if (tmpYoutubeData) {
                if (isTooLong(tmpYoutubeData)) {
                    return { addType: ADD_TYPE.NOT_ADDED, idx: -1, reason: NOT_ADDED_REASON.TOO_LONG };
                }
                youtubeId = tmpYoutubeId;
                youtubeData = tmpYoutubeData;
            }
        }
        if (!youtubeData) {
            const youtubeIds = await Youtube.getYoutubeIdsBySearch(youtubeUrl);
            if (youtubeIds) {
                const reasons = [];
                for (const tmpYoutubeId of youtubeIds) {
                    const tmpYoutubeData = await this.loadYoutubeData(tmpYoutubeId);
                    if (!tmpYoutubeData) {
                        continue;
                    }
                    if (isTooLong(tmpYoutubeData)) {
                        reasons.push(NOT_ADDED_REASON.TOO_LONG);
                        continue;
                    }
                    youtubeId = tmpYoutubeId;
                    youtubeData = tmpYoutubeData;
                    break;
                }
                if (!youtubeId || !youtubeData) {
                    if (reasons.includes(NOT_ADDED_REASON.TOO_LONG)) {
                        return { addType: ADD_TYPE.NOT_ADDED, idx: -1, reason: NOT_ADDED_REASON.TOO_LONG };
                    }
                }
            }
        }
        if (!youtubeId || !youtubeData) {
            return { addType: ADD_TYPE.NOT_ADDED, idx: -1, reason: NOT_ADDED_REASON.NOT_FOUND };
        }
        const tmpItem = this.createItem(youtubeId, youtubeData, userName);
        const { addType, idx, reason } = await this.addToPlaylist(tmpItem);
        if (addType === ADD_TYPE.ADDED) {
            this.data.stacks[userName] = this.data.stacks[userName] || [];
            this.data.stacks[userName].push(youtubeId);
        }
        return { addType, idx, reason };
    }
    determinePrevIndex() {
        let index = -1;
        for (let i = 0; i < this.data.playlist.length; i++) {
            const item = this.data.playlist[i];
            if (this.data.filter.tag === '' || item.tags.includes(this.data.filter.tag)) {
                index = i;
            }
        }
        return index;
    }
    determineNextIndex() {
        for (let i = 0; i < this.data.playlist.length; i++) {
            if (i === 0) {
                continue;
            }
            const item = this.data.playlist[i];
            if (this.data.filter.tag === '' || item.tags.includes(this.data.filter.tag)) {
                return i;
            }
        }
        return -1;
    }
    determineFirstIndex() {
        return this.data.playlist.findIndex(item => this.data.filter.tag === '' || item.tags.includes(this.data.filter.tag));
    }
    incStat(stat, idx = -1) {
        if (idx === -1) {
            idx = this.determineFirstIndex();
        }
        if (idx === -1) {
            return;
        }
        if (this.data.playlist.length > idx) {
            this.data.playlist[idx][stat]++;
        }
    }
    async videoVisibility(visible, idx = -1) {
        if (idx === -1) {
            idx = this.determineFirstIndex();
        }
        if (idx === -1) {
            return;
        }
        if (this.data.playlist.length > idx) {
            this.data.playlist[idx].hidevideo = visible ? false : true;
        }
        await this.save();
        await this.updateClients('video');
    }
    async durationUntilIndex(idx) {
        if (idx <= 0) {
            return 0;
        }
        let durationTotalMs = 0;
        for (const item of this.data.playlist.slice(0, idx)) {
            const d = await this.loadYoutubeData(item.yt);
            // sometimes songs in the playlist may not be available on yt anymore
            // then we just dont add that to the duration calculation
            if (d) {
                durationTotalMs += fn.parseISO8601Duration(d.contentDetails.duration);
            }
        }
        return durationTotalMs;
    }
    async stats(userName) {
        const countTotal = this.data.playlist.length;
        let durationTotal = 0;
        if (countTotal > 0) {
            for (const item of this.data.playlist) {
                const d = await this.loadYoutubeData(item.yt);
                // sometimes songs in the playlist may not be available on yt anymore
                // then we just dont add that to the duration calculation
                if (d) {
                    durationTotal += fn.parseISO8601Duration(d.contentDetails.duration);
                }
            }
        }
        return {
            count: {
                byUser: this.data.playlist.filter(item => item.user === userName).length,
                total: countTotal,
            },
            duration: {
                human: humanDuration(durationTotal),
            },
        };
    }
    async resetStats() {
        this.data.playlist = this.data.playlist.map(item => {
            item.plays = 0;
            item.goods = 0;
            item.bads = 0;
            return item;
        });
        await this.save();
        await this.updateClients('stats');
    }
    async playIdx(idx) {
        if (this.data.playlist.length === 0) {
            return;
        }
        while (idx-- > 0) {
            const item = this.data.playlist.shift();
            if (item) {
                this.data.playlist.push(item);
            }
        }
        await this.save();
        await this.updateClients('skip');
    }
    async rmIdx(idx) {
        if (this.data.playlist.length === 0) {
            return;
        }
        this.data.playlist.splice(idx, 1);
        await this.save();
        if (idx === 0) {
            await this.updateClients('remove');
        }
        else {
            await this.updateClients('init');
        }
    }
    async resetStatIdx(stat, idx) {
        if (idx >= 0 && idx < this.data.playlist.length) {
            if (stat === 'plays') {
                this.data.playlist[idx].plays = 0;
            }
            else if (stat === 'goods') {
                this.data.playlist[idx].goods = 0;
            }
            else if (stat === 'bads') {
                this.data.playlist[idx].bads = 0;
            }
        }
        await this.save();
        await this.updateClients('stats');
    }
    async goodIdx(idx) {
        this.incStat('goods', idx);
        await this.save();
        await this.updateClients('stats');
    }
    async badIdx(idx) {
        this.incStat('bads', idx);
        await this.save();
        await this.updateClients('stats');
    }
    async request(str) {
        // this comes from backend, always unlimited length
        const maxLen = 0;
        const maxQueued = 0;
        await this.add(str, this.user.name, maxLen, maxQueued);
    }
    findSongIdxByYoutubeId(youtubeId) {
        return this.data.playlist.findIndex(item => item.yt === youtubeId);
    }
    async like() {
        this.incStat('goods');
        await this.save();
        await this.updateClients('stats');
    }
    async filter(filter) {
        this.data.filter = filter;
        await this.save();
        await this.updateClients('filter');
    }
    async addTag(tag, idx = -1) {
        if (idx === -1) {
            idx = this.determineFirstIndex();
        }
        if (idx === -1) {
            return;
        }
        if (this.data.playlist.length > idx) {
            if (!this.data.playlist[idx].tags.includes(tag)) {
                this.data.playlist[idx].tags.push(tag);
                await this.save();
                await this.updateClients('tags');
            }
        }
    }
    async updateTag(oldTag, newTag) {
        this.data.playlist = this.data.playlist.map(item => {
            item.tags = [...new Set(item.tags.map(tag => {
                    return tag === oldTag ? newTag : tag;
                }))];
            return item;
        });
        await this.save();
        await this.updateClients('tags');
    }
    async rmTag(tag, idx = -1) {
        if (idx === -1) {
            idx = this.determineFirstIndex();
        }
        if (idx === -1) {
            return;
        }
        if (this.data.playlist.length > idx) {
            if (this.data.playlist[idx].tags.includes(tag)) {
                this.data.playlist[idx].tags = this.data.playlist[idx].tags.filter(t => t !== tag);
                await this.save();
                await this.updateClients('tags');
            }
        }
    }
    async volume(vol) {
        if (vol < 0) {
            vol = 0;
        }
        if (vol > 100) {
            vol = 100;
        }
        this.data.settings.volume = parseInt(`${vol}`, 10);
        await this.save();
        await this.updateClients('settings');
    }
    async pause() {
        await this.updateClients('pause');
    }
    async unpause() {
        await this.updateClients('unpause');
    }
    async loop() {
        await this.updateClients('loop');
    }
    async noloop() {
        await this.updateClients('noloop');
    }
    async dislike() {
        this.incStat('bads');
        await this.save();
        await this.updateClients('stats');
    }
    async settings(settings) {
        this.data.settings = settings;
        await this.save();
        await this.updateClients('settings');
    }
    async prev() {
        const index = this.determinePrevIndex();
        if (index >= 0) {
            await this.playIdx(index);
        }
    }
    async next() {
        const index = this.determineNextIndex();
        if (index >= 0) {
            await this.playIdx(index);
        }
    }
    async jumptonew() {
        if (this.data.playlist.length === 0) {
            return;
        }
        const index = this.data.playlist.findIndex(item => item.plays === 0);
        if (index === -1) {
            // no unplayed songs left
            return;
        }
        for (let i = 0; i < index; i++) {
            const item = this.data.playlist.shift();
            if (item) {
                this.data.playlist.push(item);
            }
        }
        await this.save();
        await this.updateClients('skip');
    }
    async clear() {
        this.data.playlist = [];
        await this.save();
        await this.updateClients('init');
    }
    async setAllToPlayed() {
        this.data.playlist = this.data.playlist.map(item => {
            item.plays = item.plays || 1;
            return item;
        });
        await this.save();
        await this.updateClients('init');
    }
    async shuffle() {
        if (this.data.playlist.length < 3) {
            return;
        }
        const rest = this.data.playlist.slice(1);
        this.data.playlist = [
            this.data.playlist[0],
            ...shuffle(rest.filter(item => item.plays === 0)),
            ...shuffle(rest.filter(item => item.plays > 0)),
        ];
        await this.save();
        await this.updateClients('shuffle');
    }
    async move(oldIndex, newIndex) {
        if (oldIndex >= this.data.playlist.length) {
            return;
        }
        if (newIndex >= this.data.playlist.length) {
            return;
        }
        this.data.playlist = arrayMove(this.data.playlist, oldIndex, newIndex);
        await this.save();
        await this.updateClients('move');
    }
    async remove() {
        if (this.data.playlist.length === 0) {
            return null;
        }
        const removedItem = this.data.playlist.shift();
        await this.save();
        await this.updateClients('remove');
        return removedItem || null;
    }
    async undo(username) {
        if (this.data.playlist.length === 0) {
            return false;
        }
        if ((this.data.stacks[username] || []).length === 0) {
            return false;
        }
        const youtubeId = this.data.stacks[username].pop();
        const idx = this.data.playlist
            .findIndex(item => item.yt === youtubeId && item.user === username);
        if (idx === -1) {
            return false;
        }
        const item = this.data.playlist[idx];
        await this.rmIdx(idx);
        return item;
    }
    async answerAddRequest(addResponseData) {
        const idx = addResponseData.idx;
        const reason = addResponseData.reason;
        const addType = addResponseData.addType;
        if (addType === ADD_TYPE.NOT_ADDED) {
            if (reason === NOT_ADDED_REASON.NOT_FOUND) {
                return `No song found`;
            }
            else if (reason === NOT_ADDED_REASON.NOT_FOUND_IN_PLAYLIST) {
                return `Song not found in playlist`;
            }
            else if (reason === NOT_ADDED_REASON.TOO_LONG) {
                return `Song too long`;
            }
            else if (reason === NOT_ADDED_REASON.TOO_MANY_QUEUED) {
                return `Too many songs queued`;
            }
            else {
                return `Could not process that song request`;
            }
        }
        const item = idx >= 0 ? this.data.playlist[idx] : null;
        if (!item) {
            return `Could not process that song request`;
        }
        let info;
        if (idx < 0) {
            info = ``;
        }
        else if (idx === 0) {
            info = `[Position ${idx + 1}, playing now]`;
        }
        else {
            const last_play = this.data.playlist[0].last_play || 0;
            const diffMs = last_play ? (new Date().getTime() - last_play) : 0;
            const diff = Math.round(diffMs / 1000) * 1000;
            const durationMs = await this.durationUntilIndex(idx) - diff;
            const timePrediction = durationMs <= 0 ? '' : `, will play in ~${humanDuration(durationMs)}`;
            info = `[Position ${idx + 1}${timePrediction}]`;
        }
        if (addType === ADD_TYPE.ADDED) {
            return `🎵 Added "${item.title}" (${Youtube.getUrlById(item.yt)}) to the playlist! ${info}`;
        }
        else if (addType === ADD_TYPE.REQUEUED) {
            return `🎵 "${item.title}" (${Youtube.getUrlById(item.yt)}) was already in the playlist and only moved up. ${info}`;
        }
        else if (addType === ADD_TYPE.EXISTED) {
            return `🎵 "${item.title}" (${Youtube.getUrlById(item.yt)}) was already in the playlist. ${info}`;
        }
        else {
            return `Could not process that song request`;
        }
    }
    cmdSrCurrent(_originalCommand) {
        return async (ctx) => {
            if (!ctx.rawCmd || !ctx.context) {
                return;
            }
            const say = this.bot.sayFn(this.user, ctx.target);
            if (this.data.playlist.length === 0) {
                say(`Playlist is empty`);
                return;
            }
            const cur = this.data.playlist[0];
            // todo: error handling, title output etc..
            say(`Currently playing: ${cur.title} (${Youtube.getUrlById(cur.yt)}, ${cur.plays}x plays, requested by ${cur.user})`);
        };
    }
    cmdSrUndo(_originalCommand) {
        return async (ctx) => {
            if (!ctx.rawCmd || !ctx.context) {
                return;
            }
            const say = this.bot.sayFn(this.user, ctx.target);
            const undid = await this.undo(ctx.context['display-name']);
            if (!undid) {
                say(`Could not undo anything`);
            }
            else {
                say(`Removed "${undid.title}" from the playlist!`);
            }
        };
    }
    cmdResr(_originalCommand) {
        return async (ctx) => {
            if (!ctx.rawCmd || !ctx.context) {
                log$3.error('cmdResr: client, command or context empty');
                return;
            }
            const say = this.bot.sayFn(this.user, ctx.target);
            if (ctx.rawCmd.args.length === 0) {
                say(`Usage: !resr SEARCH`);
                return;
            }
            const searchterm = ctx.rawCmd.args.join(' ');
            const addResponseData = await this.resr(searchterm);
            say(await this.answerAddRequest(addResponseData));
        };
    }
    cmdSrGood(_originalCommand) {
        return async (_ctx) => {
            await this.like();
        };
    }
    cmdSrBad(_originalCommand) {
        return async (_ctx) => {
            await this.dislike();
        };
    }
    cmdSrStats(_originalCommand) {
        return async (ctx) => {
            if (!ctx.rawCmd || !ctx.context) {
                return;
            }
            const say = this.bot.sayFn(this.user, ctx.target);
            const stats = await this.stats(ctx.context['display-name']);
            let number = `${stats.count.byUser}`;
            const verb = stats.count.byUser === 1 ? 'was' : 'were';
            if (stats.count.byUser === 1) {
                number = 'one';
            }
            else if (stats.count.byUser === 0) {
                number = 'none';
            }
            const countStr = `There are ${stats.count.total} songs in the playlist, `
                + `${number} of which ${verb} requested by ${ctx.context['display-name']}.`;
            const durationStr = `The total duration of the playlist is ${stats.duration.human}.`;
            say([countStr, durationStr].join(' '));
        };
    }
    cmdSrPrev(_originalCommand) {
        return async (_ctx) => {
            await this.prev();
        };
    }
    cmdSrNext(_originalCommand) {
        return async (_ctx) => {
            await this.next();
        };
    }
    cmdSrJumpToNew(_originalCommand) {
        return async (_ctx) => {
            await this.jumptonew();
        };
    }
    cmdSrClear(_originalCommand) {
        return async (_ctx) => {
            await this.clear();
        };
    }
    cmdSrRm(_originalCommand) {
        return async (ctx) => {
            if (!ctx.target) {
                return;
            }
            const removedItem = await this.remove();
            if (removedItem) {
                const say = this.bot.sayFn(this.user, ctx.target);
                say(`Removed "${removedItem.title}" from the playlist.`);
            }
        };
    }
    cmdSrShuffle(_originalCommand) {
        return async (_ctx) => {
            await this.shuffle();
        };
    }
    cmdSrResetStats(_originalCommand) {
        return async (_ctx) => {
            await this.resetStats();
        };
    }
    cmdSrLoop(_originalCommand) {
        return async (ctx) => {
            const say = this.bot.sayFn(this.user, ctx.target);
            await this.loop();
            say('Now looping the current song');
        };
    }
    cmdSrNoloop(_originalCommand) {
        return async (ctx) => {
            const say = this.bot.sayFn(this.user, ctx.target);
            await this.noloop();
            say('Stopped looping the current song');
        };
    }
    cmdSrAddTag(originalCmd) {
        return async (ctx) => {
            if (!ctx.rawCmd) {
                return;
            }
            let tag = originalCmd.data?.tag || '$args';
            tag = await fn.doReplacements(tag, ctx.rawCmd, ctx.context, originalCmd, this.bot, this.user);
            if (tag === "") {
                return;
            }
            const say = this.bot.sayFn(this.user, ctx.target);
            await this.addTag(tag);
            say(`Added tag "${tag}"`);
        };
    }
    cmdSrRmTag(_originalCommand) {
        return async (ctx) => {
            if (!ctx.rawCmd) {
                return;
            }
            if (!ctx.rawCmd.args.length) {
                return;
            }
            const say = this.bot.sayFn(this.user, ctx.target);
            const tag = ctx.rawCmd.args.join(' ');
            await this.rmTag(tag);
            say(`Removed tag "${tag}"`);
        };
    }
    cmdSrPause(_originalCommand) {
        return async (_ctx) => {
            await this.pause();
        };
    }
    cmdSrUnpause(_originalCommand) {
        return async (_ctx) => {
            await this.unpause();
        };
    }
    cmdSrVolume(_originalCommand) {
        return async (ctx) => {
            if (!ctx.rawCmd) {
                return;
            }
            const say = this.bot.sayFn(this.user, ctx.target);
            if (ctx.rawCmd.args.length === 0) {
                say(`Current volume: ${this.data.settings.volume}`);
            }
            else {
                const newVolume = determineNewVolume(ctx.rawCmd.args[0], this.data.settings.volume);
                await this.volume(newVolume);
                say(`New volume: ${this.data.settings.volume}`);
            }
        };
    }
    cmdSrHidevideo(_originalCommand) {
        return async (ctx) => {
            const say = this.bot.sayFn(this.user, ctx.target);
            await this.videoVisibility(false);
            say(`Video is now hidden.`);
        };
    }
    cmdSrShowvideo(_originalCommand) {
        return async (ctx) => {
            const say = this.bot.sayFn(this.user, ctx.target);
            await this.videoVisibility(true);
            say(`Video is now shown.`);
        };
    }
    cmdSrFilter(_originalCommand) {
        return async (ctx) => {
            if (!ctx.rawCmd || !ctx.context) {
                return;
            }
            const say = this.bot.sayFn(this.user, ctx.target);
            const tag = ctx.rawCmd.args.join(' ');
            await this.filter({ tag });
            if (tag !== '') {
                say(`Playing only songs tagged with "${tag}"`);
            }
            else {
                say(`Playing all songs`);
            }
        };
    }
    cmdSrQueue(_originalCommand) {
        return async (ctx) => {
            const say = this.bot.sayFn(this.user, ctx.target);
            const titles = this.data.playlist.slice(1, 4).map(item => item.title);
            if (titles.length === 1) {
                say(`${titles.length} song queued ("${titles.join('" → "')}").`);
            }
            else if (titles.length > 1) {
                say(`${titles.length} songs queued ("${titles.join('" → "')}").`);
            }
            else {
                say('No songs queued.');
            }
        };
    }
    cmdSrPreset(_originalCommand) {
        return async (ctx) => {
            if (!ctx.rawCmd || !ctx.context) {
                return;
            }
            const say = this.bot.sayFn(this.user, ctx.target);
            const presetName = ctx.rawCmd.args.join(' ');
            if (presetName === '') {
                if (this.data.settings.customCssPresets.length) {
                    say(`Presets: ${this.data.settings.customCssPresets.map(preset => preset.name).join(', ')}`);
                }
                else {
                    say(`No presets configured`);
                }
            }
            else {
                const preset = this.data.settings.customCssPresets.find(preset => preset.name === presetName);
                if (preset) {
                    this.data.settings.customCss = preset.css;
                    say(`Switched to preset: ${presetName}`);
                }
                else {
                    say(`Preset does not exist: ${presetName}`);
                }
                // TODO: is a save missing here?
                await this.updateClients('settings');
            }
        };
    }
    cmdSr(_originalCommand) {
        return async (ctx) => {
            if (!ctx.rawCmd || !ctx.context) {
                return;
            }
            const say = this.bot.sayFn(this.user, ctx.target);
            if (ctx.rawCmd.args.length === 0) {
                say(`Usage: !sr YOUTUBE-URL`);
                return;
            }
            const str = ctx.rawCmd.args.join(' ');
            let maxLenMs;
            let maxQueued;
            if (isBroadcaster(ctx.context)) {
                maxLenMs = 0;
                maxQueued = 0;
            }
            else if (isMod(ctx.context)) {
                maxLenMs = parseHumanDuration(this.data.settings.maxSongLength.mod);
                maxQueued = this.data.settings.maxSongsQueued.mod;
            }
            else if (isSubscriber(ctx.context)) {
                maxLenMs = parseHumanDuration(this.data.settings.maxSongLength.sub);
                maxQueued = this.data.settings.maxSongsQueued.sub;
            }
            else {
                maxLenMs = parseHumanDuration(this.data.settings.maxSongLength.viewer);
                maxQueued = this.data.settings.maxSongsQueued.viewer;
            }
            const addResponseData = await this.add(str, ctx.context['display-name'], maxLenMs, maxQueued);
            say(await this.answerAddRequest(addResponseData));
        };
    }
    async loadYoutubeData(youtubeId) {
        const key = `youtubeData_${youtubeId}_20210717_2`;
        let d = await this.bot.getCache().get(key);
        if (d === undefined) {
            d = await Youtube.fetchDataByYoutubeId(youtubeId);
            if (d) {
                await this.bot.getCache().set(key, d, Infinity);
            }
        }
        return d;
    }
    findInsertIndex() {
        let found = -1;
        for (let i = 0; i < this.data.playlist.length; i++) {
            if (this.data.playlist[i].plays === 0) {
                found = i;
            }
            else if (found >= 0) {
                break;
            }
        }
        return (found === -1 ? 0 : found) + 1;
    }
    createItem(youtubeId, youtubeData, userName) {
        return {
            id: Math.random(),
            yt: youtubeId,
            title: youtubeData.snippet.title,
            timestamp: new Date().getTime(),
            user: userName,
            plays: 0,
            goods: 0,
            bads: 0,
            tags: [],
            last_play: 0,
        };
    }
    async addToPlaylist(tmpItem) {
        const idx = this.findSongIdxByYoutubeId(tmpItem.yt);
        let insertIndex = this.findInsertIndex();
        if (idx < 0) {
            this.data.playlist.splice(insertIndex, 0, tmpItem);
            await this.save();
            await this.updateClients('add');
            return {
                addType: ADD_TYPE.ADDED,
                idx: insertIndex,
                reason: -1,
            };
        }
        if (insertIndex > idx) {
            insertIndex = insertIndex - 1;
        }
        if (insertIndex === idx) {
            return {
                addType: ADD_TYPE.EXISTED,
                idx: insertIndex,
                reason: -1,
            };
        }
        this.data.playlist = arrayMove(this.data.playlist, idx, insertIndex);
        await this.save();
        await this.updateClients('add');
        return {
            addType: ADD_TYPE.REQUEUED,
            idx: insertIndex,
            reason: -1,
        };
    }
    async resr(str) {
        const idx = findIdxFuzzy(this.data.playlist, str, (item) => item.title);
        if (idx < 0) {
            return {
                addType: ADD_TYPE.NOT_ADDED,
                idx: -1,
                reason: NOT_ADDED_REASON.NOT_FOUND_IN_PLAYLIST,
            };
        }
        let insertIndex = this.findInsertIndex();
        if (insertIndex > idx) {
            insertIndex = insertIndex - 1;
        }
        if (insertIndex === idx) {
            return {
                addType: ADD_TYPE.EXISTED,
                idx: insertIndex,
                reason: -1,
            };
        }
        this.data.playlist = arrayMove(this.data.playlist, idx, insertIndex);
        await this.save();
        await this.updateClients('add');
        return {
            addType: ADD_TYPE.REQUEUED,
            idx: insertIndex,
            reason: -1,
        };
    }
    getCommands() {
        return this.commands;
    }
    async onChatMsg(_chatMessageContext) {
        // pass
    }
}

class VoteModule {
    constructor(bot, user) {
        this.name = 'vote';
        // @ts-ignore
        return (async () => {
            this.bot = bot;
            this.user = user;
            this.storage = bot.getUserModuleStorage(user);
            this.data = await this.reinit();
            return this;
        })();
    }
    async userChanged(user) {
        this.user = user;
    }
    async reinit() {
        const data = await this.storage.load(this.name, {
            votes: {},
        });
        return data;
    }
    async save() {
        await this.storage.save(this.name, {
            votes: this.data.votes,
        });
    }
    getRoutes() {
        return {};
    }
    saveCommands() {
        // pass
    }
    getWsEvents() {
        return {};
    }
    async vote(type, thing, target, context) {
        const say = this.bot.sayFn(this.user, target);
        this.data.votes[type] = this.data.votes[type] || {};
        this.data.votes[type][context['display-name']] = thing;
        say(`Thanks ${context['display-name']}, registered your "${type}" vote: ${thing}`);
        await this.save();
    }
    async playCmd(ctx) {
        if (!ctx.rawCmd || !ctx.context || !ctx.target) {
            return;
        }
        const say = this.bot.sayFn(this.user, ctx.target);
        if (ctx.rawCmd.args.length === 0) {
            say(`Usage: !play THING`);
            return;
        }
        const thing = ctx.rawCmd.args.join(' ');
        const type = 'play';
        await this.vote(type, thing, ctx.target, ctx.context);
    }
    async voteCmd(ctx) {
        if (!ctx.rawCmd || !ctx.context || !ctx.target) {
            return;
        }
        const say = this.bot.sayFn(this.user, ctx.target);
        // maybe open up for everyone, but for now use dedicated
        // commands like !play THING
        if (!isMod(ctx.context) && !isBroadcaster(ctx.context)) {
            say('Not allowed to execute !vote command');
        }
        if (ctx.rawCmd.args.length < 2) {
            say(`Usage: !vote TYPE THING`);
            return;
        }
        if (ctx.rawCmd.args[0] === 'show') {
            const type = ctx.rawCmd.args[1];
            if (!this.data.votes[type]) {
                say(`No votes for "${type}".`);
                return;
            }
            const usersByValues = {};
            for (const user of Object.keys(this.data.votes[type])) {
                const val = this.data.votes[type][user];
                usersByValues[val] = usersByValues[val] || [];
                usersByValues[val].push(user);
            }
            const list = [];
            for (const val of Object.keys(usersByValues)) {
                list.push({ value: val, users: usersByValues[val] });
            }
            list.sort((a, b) => {
                return b.users.length - a.users.length;
            });
            const medals = ['🥇', '🥈', '🥉'];
            let i = 0;
            for (const item of list.slice(0, 3)) {
                say(`${medals[i]} ${item.value}: ${item.users.length} vote${item.users.length > 1 ? 's' : ''} (${item.users.join(', ')})`);
                i++;
            }
            return;
        }
        if (ctx.rawCmd.args[0] === 'clear') {
            if (!isBroadcaster(ctx.context)) {
                say('Not allowed to execute !vote clear');
            }
            const type = ctx.rawCmd.args[1];
            if (this.data.votes[type]) {
                delete this.data.votes[type];
            }
            await this.save();
            say(`Cleared votes for "${type}". ✨`);
            return;
        }
        const type = ctx.rawCmd.args[0];
        const thing = ctx.rawCmd.args.slice(1).join(' ');
        await this.vote(type, thing, ctx.target, ctx.context);
    }
    getCommands() {
        return [
            { triggers: [newCommandTrigger('!vote')], fn: this.voteCmd.bind(this) },
            // make configurable
            { triggers: [newCommandTrigger('!play')], fn: this.playCmd.bind(this) },
        ];
    }
    async onChatMsg(_chatMessageContext) {
        // pass
    }
}

const default_settings$3 = (obj = null) => ({
    status: {
        enabled: getProp(obj, ['status', 'enabled'], false),
    },
    styles: {
        // page background color
        bgColor: getProp(obj, ['styles', 'bgColor'], '#ff00ff'),
        bgColorEnabled: getProp(obj, ['styles', 'bgColorEnabled'], true),
        // vertical align of text (top|bottom)
        vAlign: getProp(obj, ['styles', 'vAlign'], 'bottom'),
        // recognized text
        recognition: {
            fontFamily: getProp(obj, ['styles', 'recognition', 'fontFamily'], 'sans-serif'),
            fontSize: getProp(obj, ['styles', 'recognition', 'fontSize'], '30pt'),
            fontWeight: getProp(obj, ['styles', 'recognition', 'fontWeight'], '400'),
            strokeWidth: getProp(obj, ['styles', 'recognition', 'strokeWidth'], '8pt'),
            strokeColor: getProp(obj, ['styles', 'recognition', 'strokeColor'], '#292929'),
            color: getProp(obj, ['styles', 'recognition', 'color'], '#ffff00'),
        },
        // translated text
        translation: {
            fontFamily: getProp(obj, ['styles', 'translation', 'fontFamily'], 'sans-serif'),
            fontSize: getProp(obj, ['styles', 'translation', 'fontSize'], '30pt'),
            fontWeight: getProp(obj, ['styles', 'translation', 'fontWeight'], '400'),
            strokeWidth: getProp(obj, ['styles', 'translation', 'strokeWidth'], '8pt'),
            strokeColor: getProp(obj, ['styles', 'translation', 'strokeColor'], '#292929'),
            color: getProp(obj, ['styles', 'translation', 'color'], '#cbcbcb'),
        }
    },
    recognition: {
        display: getProp(obj, ['recognition', 'display'], true),
        lang: getProp(obj, ['recognition', 'lang'], 'ja'),
        synthesize: getProp(obj, ['recognition', 'synthesize'], false),
        synthesizeLang: getProp(obj, ['recognition', 'synthesizeLang'], ''),
    },
    translation: {
        enabled: getProp(obj, ['translation', 'enabled'], true),
        langSrc: getProp(obj, ['translation', 'langSrc'], 'ja'),
        langDst: getProp(obj, ['translation', 'langDst'], 'en'),
        synthesize: getProp(obj, ['translation', 'synthesize'], false),
        synthesizeLang: getProp(obj, ['translation', 'synthesizeLang'], ''),
    },
});

class SpeechToTextModule {
    constructor(bot, user) {
        this.name = 'speech-to-text';
        // @ts-ignore
        return (async () => {
            this.bot = bot;
            this.user = user;
            this.data = await this.reinit();
            return this;
        })();
    }
    async userChanged(user) {
        this.user = user;
    }
    async reinit() {
        const data = await this.bot.getUserModuleStorage(this.user).load(this.name, {});
        return {
            settings: default_settings$3(data.settings),
        };
    }
    saveCommands() {
        // pass
    }
    getRoutes() {
        return {};
    }
    async wsdata(eventName) {
        return {
            event: eventName,
            data: {
                settings: this.data.settings,
                controlWidgetUrl: await this.bot.getWidgets().getWidgetUrl('speech-to-text', this.user.id),
                displayWidgetUrl: await this.bot.getWidgets().getWidgetUrl('speech-to-text_receive', this.user.id),
            }
        };
    }
    async updateClient(eventName, ws) {
        this.bot.getWebSocketServer().notifyOne([this.user.id], this.name, await this.wsdata(eventName), ws);
    }
    async updateClients(eventName) {
        this.bot.getWebSocketServer().notifyAll([this.user.id], this.name, await this.wsdata(eventName));
    }
    getWsEvents() {
        return {
            'onVoiceResult': async (_ws, { text }) => {
                let translated = '';
                if (this.data.settings.translation.enabled) {
                    const scriptId = config.modules.speechToText.google.scriptId;
                    const query = `https://script.google.com/macros/s/${scriptId}/exec` + asQueryArgs({
                        text: text,
                        source: this.data.settings.translation.langSrc,
                        target: this.data.settings.translation.langDst,
                    });
                    const resp = await xhr.get(query);
                    translated = await resp.text();
                }
                this.bot.getWebSocketServer().notifyAll([this.user.id], this.name, {
                    event: 'text',
                    data: {
                        recognized: text,
                        translated: translated,
                    },
                });
            },
            'conn': async (ws) => {
                await this.updateClient('init', ws);
            },
            'save': async (_ws, { settings }) => {
                this.data.settings = settings;
                this.bot.getUserModuleStorage(this.user).save(this.name, this.data);
                await this.reinit();
                await this.updateClients('init');
            },
        };
    }
    getCommands() {
        return [];
    }
    async onChatMsg(_chatMessageContext) {
        // pass
    }
}

// todo: fallbacks for file and filename
const default_profile_image = (obj) => {
    if (!obj) {
        return null;
    }
    return {
        file: obj.file,
        filename: obj.filename,
        urlpath: (!obj.urlpath && obj.file) ? `/uploads/${encodeURIComponent(obj.file)}` : obj.urlpath,
    };
};
// todo: fallbacks for file, filename and volume
const default_notification_sound = (obj) => {
    if (!obj) {
        return null;
    }
    return {
        file: obj.file,
        filename: obj.filename,
        urlpath: (!obj.urlpath && obj.file) ? `/uploads/${encodeURIComponent(obj.file)}` : obj.urlpath,
        volume: obj.volume,
    };
};
const default_settings$2 = (obj = null) => ({
    submitButtonText: getProp(obj, ['submitButtonText'], 'Submit'),
    // leave empty to not require confirm
    submitConfirm: getProp(obj, ['submitConfirm'], ''),
    recentImagesTitle: getProp(obj, ['recentImagesTitle'], ''),
    canvasWidth: getProp(obj, ['canvasWidth'], 720),
    canvasHeight: getProp(obj, ['canvasHeight'], 405),
    customDescription: getProp(obj, ['customDescription'], ''),
    customProfileImage: (!obj || typeof obj.customProfileImage === 'undefined') ? null : default_profile_image(obj.customProfileImage),
    palette: getProp(obj, ['palette'], [
        // row 1
        '#000000', '#808080', '#ff0000', '#ff8000', '#ffff00', '#00ff00',
        '#00ffff', '#0000ff', '#ff00ff', '#ff8080', '#80ff80',
        // row 2
        '#ffffff', '#c0c0c0', '#800000', '#804000', '#808000', '#008000',
        '#008080', '#000080', '#800080', '#8080ff', '#ffff80',
    ]),
    displayDuration: getProp(obj, ['displayDuration'], 5000),
    displayLatestForever: getProp(obj, ['displayLatestForever'], false),
    displayLatestAutomatically: getProp(obj, ['displayLatestAutomatically'], false),
    autofillLatest: getProp(obj, ['autofillLatest'], false),
    notificationSound: (!obj || typeof obj.notificationSound === 'undefined') ? null : default_notification_sound(obj.notificationSound),
    requireManualApproval: getProp(obj, ['requireManualApproval'], false),
    favoriteLists: getProp(obj, ['favoriteLists'], [{
            list: getProp(obj, ['favorites'], []),
            title: getProp(obj, ['favoriteImagesTitle'], ''),
        }]),
});
const default_images = (list = null) => {
    if (Array.isArray(list)) {
        // TODO: sanitize
        return list;
    }
    return [];
};

const log$2 = logger('DrawcastModule.ts');
class DrawcastModule {
    constructor(bot, user) {
        this.name = 'drawcast';
        // @ts-ignore
        return (async () => {
            this.bot = bot;
            this.user = user;
            this.data = await this.reinit();
            return this;
        })();
    }
    async userChanged(user) {
        this.user = user;
    }
    _loadAllImages() {
        try {
            // todo: probably better to store latest x images in db
            const rel = `/uploads/drawcast/${this.user.id}`;
            const path = `./data${rel}`;
            return fs.readdirSync(path)
                .map((name) => ({
                name: name,
                time: fs.statSync(path + '/' + name).mtime.getTime()
            }))
                .sort((a, b) => b.time - a.time)
                .map((v) => ({
                path: `${rel}/${v.name}`,
                approved: true,
            }));
        }
        catch (e) {
            return [];
        }
    }
    saveCommands() {
        // pass
    }
    async reinit() {
        const data = await this.bot.getUserModuleStorage(this.user).load(this.name, {});
        if (!data.images) {
            data.images = this._loadAllImages();
        }
        return {
            settings: default_settings$2(data.settings),
            images: default_images(data.images),
        };
    }
    async save() {
        await this.bot.getUserModuleStorage(this.user).save(this.name, this.data);
    }
    getRoutes() {
        return {
            get: {
                '/api/drawcast/all-images/': async (_req, res, _next) => {
                    res.send(this.data.images);
                },
            },
        };
    }
    async drawUrl() {
        return await this.bot.getWidgets().getPublicWidgetUrl('drawcast_draw', this.user.id);
    }
    async receiveUrl() {
        return await this.bot.getWidgets().getWidgetUrl('drawcast_receive', this.user.id);
    }
    async controlUrl() {
        return await this.bot.getWidgets().getWidgetUrl('drawcast_control', this.user.id);
    }
    async wsdata(eventName) {
        return {
            event: eventName,
            data: {
                settings: this.data.settings,
                images: this.data.images,
                drawUrl: await this.drawUrl(),
                controlWidgetUrl: await this.controlUrl(),
                receiveWidgetUrl: await this.receiveUrl(),
            },
        };
    }
    getWsEvents() {
        return {
            'conn': async (ws) => {
                this.bot.getWebSocketServer().notifyOne([this.user.id], this.name, {
                    event: 'init',
                    data: {
                        settings: this.data.settings,
                        images: this.data.images.filter(image => image.approved).slice(0, 20),
                        drawUrl: await this.drawUrl(),
                        controlWidgetUrl: await this.controlUrl(),
                        receiveWidgetUrl: await this.receiveUrl(),
                    }
                }, ws);
            },
            'approve_image': async (_ws, { path }) => {
                const image = this.data.images.find(item => item.path === path);
                if (!image) {
                    // should not happen
                    log$2.error(`approve_image: image not found: ${path}`);
                    return;
                }
                image.approved = true;
                this.data.images = this.data.images.filter(item => item.path !== image.path);
                this.data.images.unshift(image);
                await this.save();
                this.bot.getWebSocketServer().notifyAll([this.user.id], this.name, {
                    event: 'approved_image_received',
                    data: { nonce: '', img: image.path, mayNotify: false },
                });
            },
            'deny_image': async (_ws, { path }) => {
                const image = this.data.images.find(item => item.path === path);
                if (!image) {
                    // should not happen
                    log$2.error(`deny_image: image not found: ${path}`);
                    return;
                }
                this.data.images = this.data.images.filter(item => item.path !== image.path);
                await this.save();
                this.bot.getWebSocketServer().notifyAll([this.user.id], this.name, {
                    event: 'denied_image_received',
                    data: { nonce: '', img: image.path, mayNotify: false },
                });
            },
            'post': async (_ws, data) => {
                const rel = `/uploads/drawcast/${this.user.id}`;
                const img = fn.decodeBase64Image(data.data.img);
                const name = `${(new Date()).toJSON()}-${nonce(6)}.${fn.mimeToExt(img.type)}`;
                const dirPath = `./data${rel}`;
                const filePath = `${dirPath}/${name}`;
                const urlPath = `${rel}/${name}`;
                fs.mkdirSync(dirPath, { recursive: true });
                fs.writeFileSync(filePath, img.data);
                const approved = this.data.settings.requireManualApproval ? false : true;
                this.data.images.unshift({ path: urlPath, approved });
                await this.save();
                const event = approved ? 'approved_image_received' : 'image_received';
                this.bot.getWebSocketServer().notifyAll([this.user.id], this.name, {
                    event: event,
                    data: { nonce: data.data.nonce, img: urlPath, mayNotify: true },
                });
            },
            'save': async (_ws, { settings }) => {
                this.data.settings = settings;
                await this.save();
                this.data = await this.reinit();
                this.bot.getWebSocketServer().notifyAll([this.user.id], this.name, {
                    event: 'init',
                    data: {
                        settings: this.data.settings,
                        images: this.data.images.filter(image => image.approved).slice(0, 20),
                        drawUrl: await this.drawUrl(),
                        controlWidgetUrl: await this.controlUrl(),
                        receiveWidgetUrl: await this.receiveUrl(),
                    }
                });
            },
        };
    }
    getCommands() {
        return [];
    }
    async onChatMsg(_chatMessageContext) {
        // pass
    }
}

const default_avatar_definition = (def = null) => {
    return {
        name: getProp(def, ['name'], ''),
        width: getProp(def, ['width'], 64),
        height: getProp(def, ['height'], 64),
        stateDefinitions: getProp(def, ['stateDefinitions'], []),
        slotDefinitions: getProp(def, ['slotDefinitions'], []),
        state: getProp(def, ['state'], { slots: {}, lockedState: '' }),
    };
};
const default_state$1 = (obj = null) => ({
    tuberIdx: getProp(obj, ['tuberIdx'], -1),
});
const default_settings$1 = (obj = null) => ({
    styles: {
        // page background color
        bgColor: getProp(obj, ['styles', 'bgColor'], '#80ff00'),
        bgColorEnabled: getProp(obj, ['styles', 'bgColorEnabled'], true),
    },
    avatarDefinitions: getProp(obj, ['avatarDefinitions'], []).map(default_avatar_definition),
});

const log$1 = logger('AvatarModule.ts');
class AvatarModule {
    constructor(bot, user) {
        this.name = 'avatar';
        // @ts-ignore
        return (async () => {
            this.bot = bot;
            this.user = user;
            this.data = await this.reinit();
            return this;
        })();
    }
    async userChanged(user) {
        this.user = user;
    }
    async save() {
        await this.bot.getUserModuleStorage(this.user).save(this.name, this.data);
    }
    saveCommands() {
        // pass
    }
    async reinit() {
        const data = await this.bot.getUserModuleStorage(this.user).load(this.name, {});
        return {
            settings: default_settings$1(data.settings),
            state: default_state$1(data.state),
        };
    }
    getRoutes() {
        return {};
    }
    async wsdata(event) {
        return {
            event,
            data: {
                settings: this.data.settings,
                state: this.data.state,
                controlWidgetUrl: await this.bot.getWidgets().getWidgetUrl('avatar', this.user.id),
                displayWidgetUrl: await this.bot.getWidgets().getWidgetUrl('avatar_receive', this.user.id),
            }
        };
    }
    updateClient(data, ws) {
        this.bot.getWebSocketServer().notifyOne([this.user.id], this.name, data, ws);
    }
    updateClients(data) {
        this.bot.getWebSocketServer().notifyAll([this.user.id], this.name, data);
    }
    getWsEvents() {
        return {
            'conn': async (ws) => {
                this.updateClient(await this.wsdata('init'), ws);
            },
            'save': async (_ws, data) => {
                this.data.settings = data.settings;
                await this.save();
                this.data = await this.reinit();
                this.updateClients(await this.wsdata('init'));
            },
            'ctrl': async (_ws, data) => {
                if (data.data.ctrl === "setSlot") {
                    const tuberIdx = data.data.args[0];
                    const slotName = data.data.args[1];
                    const itemIdx = data.data.args[2];
                    try {
                        this.data.settings.avatarDefinitions[tuberIdx].state.slots[slotName] = itemIdx;
                        await this.save();
                    }
                    catch (e) {
                        log$1.error('ws ctrl: unable to setSlot', tuberIdx, slotName, itemIdx);
                    }
                }
                else if (data.data.ctrl === "lockState") {
                    const tuberIdx = data.data.args[0];
                    const lockedState = data.data.args[1];
                    try {
                        this.data.settings.avatarDefinitions[tuberIdx].state.lockedState = lockedState;
                        await this.save();
                    }
                    catch (e) {
                        log$1.error('ws ctrl: unable to lockState', tuberIdx, lockedState);
                    }
                }
                else if (data.data.ctrl === "setTuber") {
                    const tuberIdx = data.data.args[0];
                    this.data.state.tuberIdx = tuberIdx;
                    await this.save();
                }
                // just pass the ctrl on to the clients
                this.updateClients({ event: 'ctrl', data });
            },
        };
    }
    getCommands() {
        return [];
    }
    async onChatMsg(_chatMessageContext) {
        // pass
    }
}

const default_effect = (obj = null) => ({
    chatMessage: getProp(obj, ['chatMessage'], ''),
    sound: getProp(obj, ['sound'], { file: '', filename: '', urlpath: '', volume: 100 }),
});
const default_notification = (obj = null) => ({
    effect: default_effect(getProp(obj, ['effect'], null)),
    offsetMs: getProp(obj, ['offsetMs'], ''),
});
const default_settings = (obj = null) => ({
    fontFamily: getProp(obj, ['fontFamily'], ''),
    fontSize: getProp(obj, ['fontSize'], '72px'),
    color: getProp(obj, ['color'], ''),
    timerFormat: getProp(obj, ['timerFormat'], '{mm}:{ss}'),
    showTimerWhenFinished: getProp(obj, ['showTimerWhenFinished'], true),
    finishedText: getProp(obj, ['finishedText'], ''),
    startEffect: default_effect(getProp(obj, ['startEffect'], null)),
    endEffect: default_effect(getProp(obj, ['endEffect'], null)),
    stopEffect: default_effect(getProp(obj, ['stopEffect'], null)),
    notifications: getProp(obj, ['notifications'], []).map(default_notification),
});
const default_state = (obj = null) => ({
    running: getProp(obj, ['running'], false),
    durationMs: getProp(obj, ['durationMs'], (25 * 60 * 1000)),
    startTs: getProp(obj, ['startTs'], ''),
    doneTs: getProp(obj, ['doneTs'], ''),
    name: getProp(obj, ['name'], ''),
});

logger('PomoModule.ts');
class PomoModule {
    constructor(bot, user) {
        this.name = 'pomo';
        this.timeout = null;
        // @ts-ignore
        return (async () => {
            this.bot = bot;
            this.user = user;
            this.data = await this.reinit();
            this.tick(null, null);
            this.commands = [
                {
                    triggers: [newCommandTrigger('!pomo')],
                    restrict_to: MOD_OR_ABOVE,
                    fn: this.cmdPomoStart.bind(this),
                },
                {
                    triggers: [newCommandTrigger('!pomo exit', true)],
                    restrict_to: MOD_OR_ABOVE,
                    fn: this.cmdPomoExit.bind(this),
                },
            ];
            return this;
        })();
    }
    async replaceText(text, command, context) {
        text = await doReplacements(text, command, context, null, this.bot, this.user);
        text = text.replace(/\$pomo\.duration/g, humanDuration(this.data.state.durationMs, [' ms', ' s', ' min', ' hours', ' days']));
        text = text.replace(/\$pomo\.name/g, this.data.state.name);
        return text;
    }
    async effect(effect, command, target, context) {
        if (effect.chatMessage) {
            const say = this.bot.sayFn(this.user, target);
            say(await this.replaceText(effect.chatMessage, command, context));
        }
        this.updateClients({ event: 'effect', data: effect });
    }
    tick(command, context) {
        if (!this.data.state.running) {
            return;
        }
        if (this.timeout) {
            clearTimeout(this.timeout);
            this.timeout = null;
        }
        this.timeout = setTimeout(async () => {
            if (!this.data || !this.data.state.startTs || !this.data.state.running) {
                return;
            }
            const dateStarted = new Date(JSON.parse(this.data.state.startTs));
            const dateEnd = new Date(dateStarted.getTime() + this.data.state.durationMs);
            const doneDate = this.data.state.doneTs ? new Date(JSON.parse(this.data.state.doneTs)) : dateStarted;
            const now = new Date();
            let anyNotificationsLeft = false;
            for (const n of this.data.settings.notifications) {
                const nDateEnd = new Date(dateEnd.getTime() + parseHumanDuration(`${n.offsetMs}`, true));
                if (nDateEnd < now) {
                    // is over and should maybe be triggered!
                    if (!doneDate || nDateEnd > doneDate) {
                        await this.effect(n.effect, command, null, context);
                    }
                }
                else {
                    anyNotificationsLeft = true;
                }
            }
            if (dateEnd < now) {
                // is over and should maybe be triggered!
                if (!doneDate || dateEnd > doneDate) {
                    await this.effect(this.data.settings.endEffect, command, null, context);
                }
            }
            else {
                anyNotificationsLeft = true;
            }
            this.data.state.doneTs = JSON.stringify(now);
            await this.save();
            if (anyNotificationsLeft && this.data.state.running) {
                this.tick(command, context);
            }
        }, 1 * SECOND);
    }
    async cmdPomoStart(ctx) {
        this.data.state.running = true;
        this.data.state.startTs = JSON.stringify(new Date());
        this.data.state.doneTs = this.data.state.startTs;
        // todo: parse args and use that
        this.data.state.name = ctx.rawCmd?.args.slice(1).join(' ') || '';
        let duration = ctx.rawCmd?.args[0] || '25m';
        duration = duration.match(/^\d+$/) ? `${duration}m` : duration;
        this.data.state.durationMs = parseHumanDuration(duration);
        await this.save();
        this.tick(ctx.rawCmd, ctx.context);
        this.updateClients(await this.wsdata('init'));
        await this.effect(this.data.settings.startEffect, ctx.rawCmd, ctx.target, ctx.context);
    }
    async cmdPomoExit(ctx) {
        this.data.state.running = false;
        await this.save();
        this.tick(ctx.rawCmd, ctx.context);
        this.updateClients(await this.wsdata('init'));
        await this.effect(this.data.settings.stopEffect, ctx.rawCmd, ctx.target, ctx.context);
    }
    async userChanged(user) {
        this.user = user;
    }
    async save() {
        await this.bot.getUserModuleStorage(this.user).save(this.name, this.data);
    }
    saveCommands() {
        // pass
    }
    async reinit() {
        const data = await this.bot.getUserModuleStorage(this.user).load(this.name, {});
        return {
            settings: default_settings(data.settings),
            state: default_state(data.state),
        };
    }
    getRoutes() {
        return {};
    }
    async wsdata(event) {
        return {
            event,
            data: {
                settings: this.data.settings,
                state: this.data.state,
                widgetUrl: await this.bot.getWidgets().getWidgetUrl('pomo', this.user.id),
            }
        };
    }
    updateClient(data, ws) {
        this.bot.getWebSocketServer().notifyOne([this.user.id], this.name, data, ws);
    }
    updateClients(data) {
        this.bot.getWebSocketServer().notifyAll([this.user.id], this.name, data);
    }
    getWsEvents() {
        return {
            'conn': async (ws) => {
                this.updateClient(await this.wsdata('init'), ws);
            },
            'save': async (_ws, data) => {
                this.data.settings = data.settings;
                await this.save();
                this.data = await this.reinit();
                this.updateClients(await this.wsdata('init'));
            },
        };
    }
    getCommands() {
        return this.commands;
    }
    async onChatMsg(_chatMessageContext) {
        // pass
    }
}

var buildEnv = {
    // @ts-ignore
    buildDate: "2022-08-13T13:58:06.982Z",
    // @ts-ignore
    buildVersion: "1.22.0",
};

const widgets = [
    {
        type: 'sr',
        title: 'Song Request',
        hint: 'Browser source, or open in browser and capture window',
        pub: false,
    },
    {
        type: 'media',
        title: 'Media',
        hint: 'Browser source, or open in browser and capture window',
        pub: false,
    },
    {
        type: 'speech-to-text',
        title: 'Speech-to-Text',
        hint: 'Google Chrome + window capture',
        pub: false,
    },
    {
        type: 'speech-to-text_receive',
        title: 'Speech-to-Text (receive)',
        hint: 'Browser source, or open in browser and capture window',
        pub: false,
    },
    {
        type: 'avatar',
        title: 'Avatar (control)',
        hint: '???',
        pub: false,
    },
    {
        type: 'avatar_receive',
        title: 'Avatar (receive)',
        hint: 'Browser source, or open in browser and capture window',
        pub: false,
    },
    {
        type: 'drawcast_receive',
        title: 'Drawcast (Overlay)',
        hint: 'Browser source, or open in browser and capture window',
        pub: false,
    },
    {
        type: 'drawcast_draw',
        title: 'Drawcast (Draw)',
        hint: 'Open this to draw (or give to viewers to let them draw)',
        pub: true,
    },
    {
        type: 'drawcast_control',
        title: 'Drawcast (Control)',
        hint: 'Open this to control certain actions of draw (for example permit drawings)',
        pub: false,
    },
    {
        type: 'pomo',
        title: 'Pomo',
        hint: 'Browser source, or open in browser and capture window',
        pub: false,
    },
];
class Widgets {
    constructor(base, db, tokenRepo) {
        this._widgetUrl = (type, token) => {
            return `${this.base}/widget/${type}/${token}/`;
        };
        this.base = base;
        this.db = db;
        this.tokenRepo = tokenRepo;
    }
    async createWidgetUrl(type, userId) {
        let t = await this.tokenRepo.getByUserIdAndType(userId, `widget_${type}`);
        if (t) {
            await this.tokenRepo.delete(t.token);
        }
        t = await this.tokenRepo.createToken(userId, `widget_${type}`);
        return this._widgetUrl(type, t.token);
    }
    async widgetUrlByTypeAndUserId(type, userId) {
        const t = await this.tokenRepo.getByUserIdAndType(userId, `widget_${type}`);
        if (t) {
            return this._widgetUrl(type, t.token);
        }
        return await this.createWidgetUrl(type, userId);
    }
    async pubUrl(target) {
        const row = await this.db.get('robyottoko.pub', { target });
        let id;
        if (!row) {
            do {
                id = nonce(6);
            } while (await this.db.get('robyottoko.pub', { id }));
            await this.db.insert('robyottoko.pub', { id, target });
        }
        else {
            id = row.id;
        }
        return `${this.base}/pub/${id}`;
    }
    async getWidgetUrl(widgetType, userId) {
        return await this.widgetUrlByTypeAndUserId(widgetType, userId);
    }
    async getPublicWidgetUrl(widgetType, userId) {
        const url = await this.widgetUrlByTypeAndUserId(widgetType, userId);
        return await this.pubUrl(url);
    }
    async getWidgetInfos(userId) {
        const widgetInfos = [];
        for (const w of widgets) {
            const url = await this.widgetUrlByTypeAndUserId(w.type, userId);
            widgetInfos.push({
                type: w.type,
                pub: w.pub,
                title: w.title,
                hint: w.hint,
                url: w.pub ? (await this.pubUrl(url)) : url,
            });
        }
        return widgetInfos;
    }
    getWidgetDefinitionByType(type) {
        return widgets.find(w => w.type === type) || null;
    }
}

const TABLE = 'robyottoko.chat_log';
class ChatLogRepo {
    constructor(db) {
        this.db = db;
    }
    async insert(context, msg) {
        await this.db.insert(TABLE, {
            created_at: new Date(),
            broadcaster_user_id: context['room-id'],
            user_name: context.username,
            display_name: context['display-name'],
            message: msg,
        });
    }
    async count(where) {
        const whereObject = this.db._buildWhere(where);
        const row = await this.db._get(`select COUNT(*) as c from ${TABLE} ${whereObject.sql}`, whereObject.values);
        return parseInt(`${row.c}`, 10);
    }
    async isFirstChatAllTime(context) {
        return await this.count({
            broadcaster_user_id: context['room-id'],
            user_name: context.username,
        }) === 1;
    }
    async isFirstChatSince(context, date) {
        return await this.count({
            broadcaster_user_id: context['room-id'],
            user_name: context.username,
            created_at: { '$gte': date },
        }) === 1;
    }
}

setLogLevel(config.log.level);
const log = logger('bot.ts');
const modules = [
    GeneralModule,
    SongrequestModule,
    VoteModule,
    SpeechToTextModule,
    DrawcastModule,
    AvatarModule,
    PomoModule,
];
const createBot = async () => {
    const db = new Db(config.db.connectStr, config.db.patchesDir);
    await db.connect();
    await db.patch();
    const userRepo = new Users(db);
    const tokenRepo = new Tokens(db);
    const twitchChannelRepo = new TwitchChannels(db);
    const cache = new Cache(db);
    const auth = new Auth(userRepo, tokenRepo);
    const mail = new Mail(config.mail);
    const widgets = new Widgets(config.http.url, db, tokenRepo);
    const eventHub = mitt();
    const moduleManager = new ModuleManager();
    const webSocketServer = new WebSocketServer();
    const webServer = new WebServer();
    const chatLog = new ChatLogRepo(db);
    class BotImpl {
        constructor() {
            this.userVariableInstances = {};
            this.userModuleStorageInstances = {};
            this.userTwitchClientManagerInstances = {};
            // pass
        }
        getBuildVersion() { return buildEnv.buildVersion; }
        getBuildDate() { return buildEnv.buildDate; }
        getModuleManager() { return moduleManager; }
        getDb() { return db; }
        getConfig() { return config; }
        getUsers() { return userRepo; }
        getTokens() { return tokenRepo; }
        getTwitchChannels() { return twitchChannelRepo; }
        getCache() { return cache; }
        getMail() { return mail; }
        getAuth() { return auth; }
        getWebServer() { return webServer; }
        getWebSocketServer() { return webSocketServer; }
        getWidgets() { return widgets; }
        getEventHub() { return eventHub; }
        getChatLog() { return chatLog; }
        // user specific
        // -----------------------------------------------------------------
        sayFn(user, target) {
            const chatClient = this.getUserTwitchClientManager(user).getChatClient();
            return chatClient
                ? fn.sayFn(chatClient, target)
                : ((msg) => { log.info('say(), client not set, msg', msg); });
        }
        getUserVariables(user) {
            if (!this.userVariableInstances[user.id]) {
                this.userVariableInstances[user.id] = new Variables(this.getDb(), user.id);
            }
            return this.userVariableInstances[user.id];
        }
        getUserModuleStorage(user) {
            if (!this.userModuleStorageInstances[user.id]) {
                this.userModuleStorageInstances[user.id] = new ModuleStorage(this.getDb(), user.id);
            }
            return this.userModuleStorageInstances[user.id];
        }
        getUserTwitchClientManager(user) {
            if (!this.userTwitchClientManagerInstances[user.id]) {
                this.userTwitchClientManagerInstances[user.id] = new TwitchClientManager(this, user);
            }
            return this.userTwitchClientManagerInstances[user.id];
        }
    }
    return new BotImpl();
};
// this function may only be called once per user!
// changes to user will be handled by user_changed event
const initForUser = async (bot, user) => {
    const clientManager = bot.getUserTwitchClientManager(user);
    await clientManager.init('init');
    for (const moduleClass of modules) {
        bot.getModuleManager().add(user.id, await new moduleClass(bot, user));
    }
    let updateUserFrontendStatusTimeout = null;
    const updateUserFrontendStatus = async () => {
        if (updateUserFrontendStatusTimeout) {
            clearTimeout(updateUserFrontendStatusTimeout);
            updateUserFrontendStatusTimeout = null;
        }
        const client = clientManager.getHelixClient();
        if (!client) {
            return setTimeout(updateUserFrontendStatus, 5 * SECOND);
        }
        // status for the user that should show in frontend
        // (eg. problems with their settings)
        // this only is relevant if the user is at the moment connected
        // to a websocket
        if (!bot.getWebSocketServer().isUserConnected(user.id)) {
            return setTimeout(updateUserFrontendStatus, 5 * SECOND);
        }
        const problems = [];
        const twitchChannels = await bot.getTwitchChannels().allByUserId(user.id);
        for (const twitchChannel of twitchChannels) {
            const result = await refreshExpiredTwitchChannelAccessToken(twitchChannel, bot, user);
            if (result.error) {
                log.error('Unable to validate or refresh OAuth token.');
                log.error(`user: ${user.name}, channel: ${twitchChannel.channel_name}, error: ${result.error}`);
                problems.push({
                    message: 'access_token_invalid',
                    details: {
                        channel_name: twitchChannel.channel_name,
                    },
                });
            }
            else if (result.refreshed) {
                const changedUser = await bot.getUsers().getById(user.id);
                if (changedUser) {
                    bot.getEventHub().emit('access_token_refreshed', changedUser);
                }
                else {
                    log.error(`oauth token refresh: user doesn't exist after saving it: ${user.id}`);
                }
            }
        }
        const data = { event: 'status', data: { problems } };
        bot.getWebSocketServer().notifyAll([user.id], 'core', data);
        return setTimeout(updateUserFrontendStatus, 1 * MINUTE);
    };
    updateUserFrontendStatusTimeout = await updateUserFrontendStatus();
    let updateUserStreamStatusTimeout = null;
    const updateUserStreamStatus = async () => {
        if (updateUserStreamStatusTimeout) {
            clearTimeout(updateUserStreamStatusTimeout);
            updateUserStreamStatusTimeout = null;
        }
        const client = clientManager.getHelixClient();
        if (!client) {
            return setTimeout(updateUserFrontendStatus, 5 * SECOND);
        }
        const twitchChannels = await bot.getTwitchChannels().allByUserId(user.id);
        for (const twitchChannel of twitchChannels) {
            if (!twitchChannel.channel_id) {
                const channelId = await client.getUserIdByNameCached(twitchChannel.channel_name, bot.getCache());
                if (!channelId) {
                    continue;
                }
                twitchChannel.channel_id = channelId;
            }
            const stream = await client.getStreamByUserId(twitchChannel.channel_id);
            twitchChannel.is_streaming = !!stream;
            bot.getTwitchChannels().save(twitchChannel);
        }
        return setTimeout(updateUserStreamStatus, 5 * MINUTE);
    };
    updateUserStreamStatusTimeout = await updateUserStreamStatus();
    bot.getEventHub().on('wss_user_connected', async (socket /* Socket */) => {
        if (socket.user_id === user.id && socket.module === 'core') {
            updateUserFrontendStatusTimeout = await updateUserFrontendStatus();
            updateUserStreamStatusTimeout = await updateUserStreamStatus();
        }
    });
    bot.getEventHub().on('access_token_refreshed', async (changedUser /* User */) => {
        if (changedUser.id === user.id) {
            await clientManager.accessTokenRefreshed(changedUser);
            updateUserFrontendStatusTimeout = await updateUserFrontendStatus();
            updateUserStreamStatusTimeout = await updateUserStreamStatus();
            for (const mod of bot.getModuleManager().all(user.id)) {
                await mod.userChanged(changedUser);
            }
        }
    });
    bot.getEventHub().on('user_changed', async (changedUser /* User */) => {
        if (changedUser.id === user.id) {
            await clientManager.userChanged(changedUser);
            updateUserFrontendStatusTimeout = await updateUserFrontendStatus();
            updateUserStreamStatusTimeout = await updateUserStreamStatus();
            for (const mod of bot.getModuleManager().all(user.id)) {
                await mod.userChanged(changedUser);
            }
        }
    });
};
const run = async () => {
    const bot = await createBot();
    // one for each user
    for (const user of await bot.getUsers().all()) {
        await initForUser(bot, user);
    }
    bot.getEventHub().on('user_registration_complete', async (user /* User */) => {
        await initForUser(bot, user);
    });
    // as the last step, start websocketserver and webserver
    // it needs to be the last step, because modules etc.
    // need to be set up in advance so that everything is registered
    // at the point of connection from outside
    bot.getWebSocketServer().listen(bot);
    await bot.getWebServer().listen(bot);
    const gracefulShutdown = (signal) => {
        log.info(`${signal} received...`);
        log.info('shutting down webserver...');
        bot.getWebServer().close();
        log.info('shutting down websocketserver...');
        bot.getWebSocketServer().close();
        log.info('shutting down...');
        process.exit();
    };
    // used by nodemon
    process.once('SIGUSR2', function () {
        gracefulShutdown('SIGUSR2');
    });
    process.once('SIGINT', function (_code) {
        gracefulShutdown('SIGINT');
    });
    process.once('SIGTERM', function (_code) {
        gracefulShutdown('SIGTERM');
    });
};

run();
