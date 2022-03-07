import fs, { readFileSync, promises } from 'fs';
import crypto from 'crypto';
import fetch from 'node-fetch';
import WebSocket from 'ws';
import path, { dirname } from 'path';
import { fileURLToPath } from 'url';
import cookieParser from 'cookie-parser';
import express from 'express';
import multer from 'multer';
import tmi from 'tmi.js';
import bsqlite from 'better-sqlite3';
import SibApiV3Sdk from 'sib-api-v3-sdk';
import childProcess from 'child_process';

const init = () => {
    const configFile = process.env.APP_CONFIG || '';
    if (configFile === '') {
        process.exit(2);
    }
    const config = JSON.parse(String(readFileSync(configFile)));
    config.twitch.auto_tags = JSON.parse(String(readFileSync(new URL('./config_data/tags_auto.json', import.meta.url))));
    config.twitch.manual_tags = JSON.parse(String(readFileSync(new URL('./config_data/tags_manual.json', import.meta.url))));
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
async function request(method, url, opts = {}) {
    const options = opts || {};
    options.method = method;
    return await fetch(url, options);
}
async function requestJson(method, url, opts = {}) {
    const resp = await request(method, url, opts);
    return await resp.json();
}
async function requestText(method, url, opts = {}) {
    const resp = await request(method, url, opts);
    return await resp.text();
}
async function getText(url, opts = {}) {
    return await requestText('get', url, opts);
}
async function postJson(url, opts = {}) {
    return await requestJson('post', url, opts);
}
async function getJson(url, opts = {}) {
    return await requestJson('get', url, opts);
}

const MS = 1;
const SECOND = 1000 * MS;
const MINUTE = 60 * SECOND;
const HOUR = 60 * MINUTE;
const DAY = 24 * HOUR;
const MONTH = 30 * DAY;
const YEAR = 365 * DAY;
// error | info | log | debug
let logEnabled = []; // always log errors
const setLogLevel = (logLevel) => {
    switch (logLevel) {
        case 'error':
            logEnabled = ['error'];
            break;
        case 'info':
            logEnabled = ['error', 'info'];
            break;
        case 'log':
            logEnabled = ['error', 'info', 'log'];
            break;
        case 'debug':
            logEnabled = ['error', 'info', 'log', 'debug'];
            break;
    }
};
setLogLevel('info');
const logger = (prefix, ...pre) => {
    const b = prefix;
    const fn = (t) => (...args) => {
        if (logEnabled.includes(t)) {
            console[t](dateformat('hh:mm:ss', new Date()), `[${b}]`, ...pre, ...args);
        }
    };
    return {
        log: fn('log'),
        info: fn('info'),
        debug: fn('debug'),
        error: fn('error'),
    };
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

const log$i = logger('fn.ts');
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
    return new Promise((resolve, reject) => {
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
        log$i.info(`saying in ${t}: ${msg}`);
        client.say(t, msg).catch((e) => {
            log$i.info(e);
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
        const name = await doReplacements(variableChange.name, rawCmd, context, variables, cmdDef, contextModule.bot, contextModule.user);
        const value = await doReplacements(variableChange.value, rawCmd, context, variables, cmdDef, contextModule.bot, contextModule.user);
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
        const globalVars = variables.all();
        const idx = globalVars.findIndex(v => (v.name === name));
        if (idx !== -1) {
            if (op === 'set') {
                variables.set(name, value);
            }
            else if (op === 'increase_by') {
                variables.set(name, _increase(globalVars[idx].value, value));
            }
            else if (op === 'decrease_by') {
                variables.set(name, _decrease(globalVars[idx].value, value));
            }
            //
            continue;
        }
    }
    contextModule.saveCommands();
};
const tryExecuteCommand = async (contextModule, rawCmd, cmdDefs, client, target, context, msg) => {
    const promises = [];
    for (const cmdDef of cmdDefs) {
        if (!mayExecute(context, cmdDef)) {
            continue;
        }
        log$i.info(`${target}| * Executing ${rawCmd?.name || '<unknown>'} command`);
        const p = new Promise(async (resolve) => {
            await applyVariableChanges(cmdDef, contextModule, rawCmd, context);
            const r = await cmdDef.fn(rawCmd, client, target, context, msg);
            if (r) {
                log$i.info(`${target}| * Returned: ${r}`);
            }
            log$i.info(`${target}| * Executed ${rawCmd?.name || '<unknown>'} command`);
            resolve(true);
        });
        promises.push(p);
    }
    await Promise.all(promises);
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
const doReplacements = async (text, command, context, variables, originalCmd, bot, user) => {
    const replaces = [
        {
            regex: /\$args(?:\((\d*)(:?)(\d*)\))?/g,
            replacer: async (m0, m1, m2, m3) => {
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
            replacer: async (m0, m1, m2) => {
                const min = typeof m1 === 'undefined' ? 1 : parseInt(m1, 10);
                const max = typeof m2 === 'undefined' ? 100 : parseInt(m2, 10);
                return `${getRandomInt(min, max)}`;
            },
        },
        {
            regex: /\$var\(([^)]+)\)/g,
            replacer: async (m0, m1) => {
                if (!originalCmd || !originalCmd.variables) {
                    return '';
                }
                const v = originalCmd.variables.find(v => v.name === m1);
                const val = v ? v.value : variables.get(m1);
                return val === null ? '' : String(val);
            },
        },
        {
            regex: /\$user(?:\(([^)]+)\)|())\.(name|profile_image_url|recent_clip_url|last_stream_category)/g,
            replacer: async (m0, m1, m2, m3) => {
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
                    const clip = await helixClient.getClipByUserId(twitchUser.id, start.toISOString(), end.toISOString());
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
            replacer: async (m0, m1, m2) => {
                const txt = await getText(await doReplacements(m1, command, context, variables, originalCmd, bot, user));
                try {
                    return String(JSON.parse(txt)[m2]);
                }
                catch (e) {
                    log$i.error(e);
                    return '';
                }
            },
        },
        {
            regex: /\$customapi\(([^$)]*)\)/g,
            replacer: async (m0, m1) => {
                return await getText(await doReplacements(m1, command, context, variables, originalCmd, bot, user));
            },
        },
        {
            regex: /\$urlencode\(([^$)]*)\)/g,
            replacer: async (m0, m1) => {
                return encodeURIComponent(await doReplacements(m1, command, context, variables, originalCmd, bot, user));
            },
        },
        {
            regex: /\$calc\((\d+)([*/+-])(\d+)\)/g,
            replacer: async (m0, arg1, op, arg2) => {
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
    const searchLower = search.toLowerCase();
    const indexes = [];
    array.forEach((item, index) => {
        if (keyFn(item).toLowerCase() === searchLower) {
            indexes.push(index);
        }
    });
    return findShortestIdx(array, indexes, keyFn);
};
const findIdxBySearchExactStartsWith = (array, search, keyFn = String) => {
    const searchLower = search.toLowerCase();
    const indexes = [];
    array.forEach((item, index) => {
        if (keyFn(item).toLowerCase().startsWith(searchLower)) {
            indexes.push(index);
        }
    });
    return findShortestIdx(array, indexes, keyFn);
};
const findIdxBySearchExactWord = (array, search, keyFn = String) => {
    const searchLower = search.toLowerCase();
    const indexes = [];
    array.forEach((item, index) => {
        const keyLower = keyFn(item).toLowerCase();
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
    const searchLower = search.toLowerCase();
    const indexes = [];
    array.forEach((item, index) => {
        if (keyFn(item).toLowerCase().indexOf(searchLower) !== -1) {
            indexes.push(index);
        }
    });
    return findShortestIdx(array, indexes, keyFn);
};
const findIdxBySearchInOrder = (array, search, keyFn = String) => {
    const split = search.split(/\s+/);
    const regexArgs = split.map(arg => arg.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'));
    const regex = new RegExp(regexArgs.join('.*'), 'i');
    const indexes = [];
    array.forEach((item, index) => {
        if (keyFn(item).match(regex)) {
            indexes.push(index);
        }
    });
    return findShortestIdx(array, indexes, keyFn);
};
const findIdxBySearch = (array, search, keyFn = String) => {
    const split = search.split(/\s+/);
    const regexArgs = split.map(arg => arg.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'));
    const regexes = regexArgs.map(arg => new RegExp(arg, 'i'));
    return array.findIndex(item => {
        const str = keyFn(item);
        for (const regex of regexes) {
            if (!str.match(regex)) {
                return false;
            }
        }
        return true;
    });
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
    tryExecuteCommand,
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

class Auth {
    constructor(userRepo, tokenRepo) {
        this.userRepo = userRepo;
        this.tokenRepo = tokenRepo;
    }
    getTokenInfo(token) {
        return this.tokenRepo.getByToken(token);
    }
    getUserById(id) {
        return this.userRepo.get({ id, status: 'verified' });
    }
    getUserByNameAndPass(name, plainPass) {
        const user = this.userRepo.get({ name, status: 'verified' });
        if (!user || user.pass !== passwordHash(plainPass, user.salt)) {
            return null;
        }
        return user;
    }
    getUserAuthToken(user_id) {
        return this.tokenRepo.generateAuthTokenForUserId(user_id).token;
    }
    destroyToken(token) {
        return this.tokenRepo.delete(token);
    }
    addAuthInfoMiddleware() {
        return (req, _res, next) => {
            const token = req.cookies['x-token'] || null;
            const tokenInfo = this.getTokenInfo(token);
            if (tokenInfo && ['auth'].includes(tokenInfo.type)) {
                const user = this.userRepo.getById(tokenInfo.user_id);
                if (user) {
                    req.token = tokenInfo.token;
                    req.user = {
                        id: user.id,
                        name: user.name,
                        email: user.email,
                        status: user.status,
                        groups: this.userRepo.getGroups(user.id)
                    };
                    req.userWidgetToken = this.tokenRepo.getWidgetTokenForUserId(tokenInfo.user_id).token;
                    req.userPubToken = this.tokenRepo.getPubTokenForUserId(tokenInfo.user_id).token;
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
    userFromWidgetToken(token) {
        const tokenInfo = this.getTokenInfo(token);
        if (tokenInfo && ['widget'].includes(tokenInfo.type)) {
            return this.getUserById(tokenInfo.user_id);
        }
        return null;
    }
    userFromPubToken(token) {
        const tokenInfo = this.getTokenInfo(token);
        if (tokenInfo && ['pub'].includes(tokenInfo.type)) {
            return this.getUserById(tokenInfo.user_id);
        }
        return null;
    }
    wsTokenFromProtocol(protocol) {
        let proto = Array.isArray(protocol) && protocol.length === 2
            ? protocol[1]
            : protocol;
        if (Array.isArray(protocol) && protocol.length === 1) {
            proto = protocol[0];
        }
        if (Array.isArray(proto)) {
            return null;
        }
        const tokenInfo = this.getTokenInfo(proto);
        if (tokenInfo && ['auth', 'widget', 'pub'].includes(tokenInfo.type)) {
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
}

const log$h = logger("WebSocketServer.ts");
class WebSocketServer {
    constructor(moduleManager, config, auth) {
        this.moduleManager = moduleManager;
        this.config = config;
        this.auth = auth;
        this._websocketserver = null;
        this._interval = null;
    }
    connectstring() {
        return this.config.connectstring;
    }
    listen() {
        this._websocketserver = new WebSocket.Server(this.config);
        this._websocketserver.on('connection', (socket, request) => {
            const token = socket.protocol;
            const tokenInfo = this.auth.wsTokenFromProtocol(token);
            if (!tokenInfo) {
                log$h.info('not found token: ', token);
                socket.close();
                return;
            }
            socket.user_id = tokenInfo.user_id;
            const pathname = new URL(this.connectstring()).pathname;
            if (request.url?.indexOf(pathname) !== 0) {
                log$h.info('bad request url: ', request.url);
                socket.close();
                return;
            }
            socket.isAlive = true;
            socket.on('pong', function () {
                socket.isAlive = true;
            });
            const relpath = request.url.substr(pathname.length);
            if (relpath === '/core') {
                socket.module = 'core';
                // log.info('/conn connected')
                // not a module
                // ... doesnt matter
                return;
            }
            // module routing
            for (const module of this.moduleManager.all(socket.user_id)) {
                if ('/' + module.name !== relpath) {
                    continue;
                }
                socket.module = module.name;
                const evts = module.getWsEvents();
                if (evts) {
                    socket.on('message', (data) => {
                        log$h.info(`ws|${socket.user_id}| `, data);
                        const unknownData = data;
                        const d = JSON.parse(unknownData);
                        if (!d.event) {
                            return;
                        }
                        if (evts[d.event]) {
                            evts[d.event](socket, d);
                        }
                    });
                    if (evts['conn']) {
                        evts['conn'](socket);
                    }
                }
            }
        });
        this._interval = setInterval(() => {
            if (this._websocketserver === null) {
                return;
            }
            this._websocketserver.clients.forEach((socket) => {
                if (socket.isAlive === false) {
                    return socket.terminate();
                }
                socket.isAlive = false;
                socket.ping(() => {
                    // pass
                });
            });
        }, 30 * SECOND);
        this._websocketserver.on('close', () => {
            if (this._interval === null) {
                return;
            }
            clearInterval(this._interval);
        });
    }
    notifyOne(user_ids, moduleName, data, socket) {
        if (socket.isAlive
            && socket.user_id
            && user_ids.includes(socket.user_id)
            && socket.module === moduleName) {
            log$h.info(`notifying ${socket.user_id} ${moduleName} (${data.event})`);
            socket.send(JSON.stringify(data));
        }
    }
    sockets(user_ids, moduleName = null) {
        if (!this._websocketserver) {
            log$h.error(`sockets(): _websocketserver is null`);
            return [];
        }
        const sockets = [];
        this._websocketserver.clients.forEach((socket) => {
            if (!socket.isAlive) {
                // dont add non alive sockets
                return;
            }
            if (!socket.user_id || !user_ids.includes(socket.user_id)) {
                // dont add sockets not belonging to user
                return;
            }
            if (moduleName !== null && socket.module !== moduleName) {
                // dont add sockets not belonging to module
                return;
            }
            sockets.push(socket);
        });
        return sockets;
    }
    notifyAll(user_ids, moduleName, data) {
        if (!this._websocketserver) {
            log$h.error(`tried to notifyAll, but _websocketserver is null`);
            return;
        }
        this._websocketserver.clients.forEach((socket) => {
            this.notifyOne(user_ids, moduleName, data, socket);
        });
    }
    close() {
        if (this._websocketserver) {
            this._websocketserver.close();
        }
    }
}

class Templates {
    constructor(baseDir) {
        this.templates = {};
        this.baseDir = baseDir;
    }
    async add(templatePath) {
        const templatePathAbsolute = path.join(this.baseDir, templatePath);
        this.templates[templatePath] = (await promises.readFile(templatePathAbsolute)).toString();
    }
    render(templatePath, data) {
        const template = this.templates[templatePath];
        return template.replace(/\{\{(.*?)\}\}/g, (m0, m1) => {
            return data[m1.trim()] || '';
        });
    }
}

const log$g = logger('TwitchHelixClient.ts');
const API_BASE = 'https://api.twitch.tv/helix';
function getBestEntryFromCategorySearchItems(searchString, resp) {
    const idx = findIdxFuzzy(resp.data, searchString, (item) => item.name);
    return idx === -1 ? null : resp.data[idx];
}
class TwitchHelixClient {
    constructor(clientId, clientSecret, twitchChannels) {
        this.clientId = clientId;
        this.clientSecret = clientSecret;
        this.twitchChannels = twitchChannels;
    }
    _authHeaders(accessToken) {
        return {
            'Client-ID': this.clientId,
            'Authorization': `Bearer ${accessToken}`,
        };
    }
    async withAuthHeaders(opts = {}, scopes = []) {
        const accessToken = await this.getAccessToken(scopes);
        return withHeaders(this._authHeaders(accessToken), opts);
    }
    _oauthAccessTokenByBroadcasterId(broadcasterId) {
        for (const twitchChannel of this.twitchChannels) {
            if (twitchChannel.channel_id === broadcasterId) {
                return twitchChannel.access_token;
            }
        }
        return null;
    }
    // https://dev.twitch.tv/docs/authentication/getting-tokens-oauth/
    async getAccessToken(scopes = []) {
        const url = `https://id.twitch.tv/oauth2/token` + asQueryArgs({
            client_id: this.clientId,
            client_secret: this.clientSecret,
            grant_type: 'client_credentials',
            scope: scopes.join(' '),
        });
        const json = (await postJson(url));
        return json.access_token;
    }
    _url(path) {
        return `${API_BASE}${path}`;
    }
    // https://dev.twitch.tv/docs/api/reference#get-users
    async _getUserBy(query) {
        const url = this._url(`/users${asQueryArgs(query)}`);
        const json = await getJson(url, await this.withAuthHeaders());
        try {
            return json.data[0];
        }
        catch (e) {
            log$g.error(json);
            return null;
        }
    }
    async getUserById(userId) {
        return await this._getUserBy({ id: userId });
    }
    async getUserByName(userName) {
        return await this._getUserBy({ login: userName });
    }
    async getUserIdByName(userName) {
        const user = await this.getUserByName(userName);
        return user ? user.id : '';
    }
    // https://dev.twitch.tv/docs/api/reference#get-clips
    async getClipByUserId(userId, startedAtRfc3339, endedAtRfc3339) {
        const url = this._url(`/clips${asQueryArgs({
            broadcaster_id: userId,
            started_at: startedAtRfc3339,
            ended_at: endedAtRfc3339,
        })}`);
        const json = await getJson(url, await this.withAuthHeaders());
        try {
            return json.data[0];
        }
        catch (e) {
            log$g.error(json);
            return null;
        }
    }
    // https://dev.twitch.tv/docs/api/reference#get-streams
    async getStreamByUserId(userId) {
        const url = this._url(`/streams${asQueryArgs({ user_id: userId })}`);
        const json = await getJson(url, await this.withAuthHeaders());
        try {
            return json.data[0];
        }
        catch (e) {
            log$g.error(json);
            return null;
        }
    }
    async getSubscriptions() {
        const url = this._url('/eventsub/subscriptions');
        return await getJson(url, await this.withAuthHeaders());
    }
    async deleteSubscription(id) {
        const url = this._url(`/eventsub/subscriptions${asQueryArgs({ id: id })}`);
        return await requestText('delete', url, await this.withAuthHeaders());
    }
    async createSubscription(subscription) {
        const url = this._url('/eventsub/subscriptions');
        return await postJson(url, await this.withAuthHeaders(asJson(subscription)));
    }
    // https://dev.twitch.tv/docs/api/reference#search-categories
    async searchCategory(searchString) {
        const url = this._url(`/search/categories${asQueryArgs({ query: searchString })}`);
        const json = await getJson(url, await this.withAuthHeaders());
        try {
            return getBestEntryFromCategorySearchItems(searchString, json);
        }
        catch (e) {
            log$g.error(json);
            return null;
        }
    }
    // https://dev.twitch.tv/docs/api/reference#get-channel-information
    async getChannelInformation(broadcasterId) {
        const url = this._url(`/channels${asQueryArgs({ broadcaster_id: broadcasterId })}`);
        const json = await getJson(url, await this.withAuthHeaders());
        try {
            return json.data[0];
        }
        catch (e) {
            log$g.error(json);
            return null;
        }
    }
    // https://dev.twitch.tv/docs/api/reference#modify-channel-information
    async modifyChannelInformation(broadcasterId, data) {
        const accessToken = this._oauthAccessTokenByBroadcasterId(broadcasterId);
        if (!accessToken) {
            return null;
        }
        const url = this._url(`/channels${asQueryArgs({ broadcaster_id: broadcasterId })}`);
        return await request('patch', url, withHeaders(this._authHeaders(accessToken), asJson(data)));
    }
    async getAllTags() {
        const allTags = [];
        let cursor = null;
        const first = 100;
        do {
            const url = cursor
                ? this._url(`/tags/streams${asQueryArgs({ after: cursor, first })}`)
                : this._url(`/tags/streams${asQueryArgs({ first })}`);
            const json = await getJson(url, await this.withAuthHeaders());
            const entries = json.data;
            allTags.push(...entries);
            cursor = json.pagination.cursor; // is undefined when there are no more pages
        } while (cursor);
        return allTags;
    }
    // https://dev.twitch.tv/docs/api/reference#get-stream-tags
    async getStreamTags(broadcasterId) {
        const url = this._url(`/streams/tags${asQueryArgs({ broadcaster_id: broadcasterId })}`);
        const json = await getJson(url, await this.withAuthHeaders());
        return json;
    }
    // https://dev.twitch.tv/docs/api/reference#get-custom-reward
    async getChannelPointsCustomRewards(broadcasterId) {
        const accessToken = this._oauthAccessTokenByBroadcasterId(broadcasterId);
        if (!accessToken) {
            return null;
        }
        const url = this._url(`/channel_points/custom_rewards${asQueryArgs({ broadcaster_id: broadcasterId })}`);
        const json = await getJson(url, withHeaders(this._authHeaders(accessToken)));
        if (json.error) {
            return null;
        }
        return json;
    }
    async getAllChannelPointsCustomRewards() {
        const rewards = {};
        for (const twitchChannel of this.twitchChannels) {
            const res = await this.getChannelPointsCustomRewards(twitchChannel.channel_id);
            if (res) {
                rewards[twitchChannel.channel_name] = res.data.map(entry => entry.title);
            }
        }
        return rewards;
    }
    // https://dev.twitch.tv/docs/api/reference#replace-stream-tags
    async replaceStreamTags(broadcasterId, tagIds) {
        const accessToken = this._oauthAccessTokenByBroadcasterId(broadcasterId);
        if (!accessToken) {
            return null;
        }
        const url = this._url(`/streams/tags${asQueryArgs({ broadcaster_id: broadcasterId })}`);
        return await request('put', url, withHeaders(this._authHeaders(accessToken), asJson({ tag_ids: tagIds })));
    }
    async validateOAuthToken(broadcasterId, accessToken) {
        const url = this._url(`/channels${asQueryArgs({ broadcaster_id: broadcasterId })}`);
        const json = await getJson(url, withHeaders(this._authHeaders(accessToken)));
        try {
            return { valid: json.data[0] ? true : false, data: json };
        }
        catch (e) {
            return { valid: false, data: json };
        }
    }
}

const TABLE$5 = 'variables';
class Variables {
    constructor(db, userId) {
        this.db = db;
        this.userId = userId;
    }
    set(name, value) {
        this.db.upsert(TABLE$5, {
            name,
            user_id: this.userId,
            value: JSON.stringify(value),
        }, {
            name,
            user_id: this.userId,
        });
    }
    get(name) {
        const row = this.db.get(TABLE$5, { name, user_id: this.userId });
        return row ? JSON.parse(row.value) : null;
    }
    all() {
        const rows = this.db.getMany(TABLE$5, { user_id: this.userId });
        return rows.map(row => ({
            name: row.name,
            value: JSON.parse(row.value),
        }));
    }
    replace(variables) {
        const names = variables.map(v => v.name);
        this.db.delete(TABLE$5, { user_id: this.userId, name: { '$nin': names } });
        variables.forEach(({ name, value }) => {
            this.set(name, value);
        });
    }
}

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const log$f = logger('WebServer.ts');
const widgetTemplate = (widget) => {
    if (process.env.WIDGET_DUMMY) {
        return process.env.WIDGET_DUMMY;
    }
    return '../public/static/widgets/' + widget + '/index.html';
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
        type: 'pomo',
        title: 'Pomo',
        hint: 'Browser source, or open in browser and capture window',
        pub: false,
    },
];
class WebServer {
    constructor(eventHub, db, userRepo, tokenRepo, mail, twitchChannelRepo, moduleManager, configHttp, configTwitch, wss, auth) {
        this.eventHub = eventHub;
        this.db = db;
        this.userRepo = userRepo;
        this.tokenRepo = tokenRepo;
        this.mail = mail;
        this.twitchChannelRepo = twitchChannelRepo;
        this.moduleManager = moduleManager;
        this.port = configHttp.port;
        this.hostname = configHttp.hostname;
        this.url = configHttp.url;
        this.configTwitch = configTwitch;
        this.wss = wss;
        this.auth = auth;
        this.handle = null;
    }
    pubUrl(target) {
        const row = this.db.get('pub', { target });
        let id;
        if (!row) {
            do {
                id = nonce(6);
            } while (this.db.get('pub', { id }));
            this.db.insert('pub', { id, target });
        }
        else {
            id = row.id;
        }
        return `${this.url}/pub/${id}`;
    }
    widgetUrl(type, token) {
        return `${this.url}/widget/${type}/${token}/`;
    }
    async listen() {
        const port = this.port;
        const hostname = this.hostname;
        const app = express();
        const templates = new Templates(__dirname);
        for (const widget of widgets) {
            await templates.add(widgetTemplate(widget.type));
        }
        await templates.add('templates/twitch_redirect_uri.html');
        app.get('/pub/:id', (req, res, next) => {
            const row = this.db.get('pub', {
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
        const verifyTwitchSignature = (req, res, next) => {
            const body = Buffer.from(req.rawBody, 'utf8');
            const msg = `${req.headers['twitch-eventsub-message-id']}${req.headers['twitch-eventsub-message-timestamp']}${body}`;
            const hmac = crypto.createHmac('sha256', this.configTwitch.eventSub.transport.secret);
            hmac.update(msg);
            const expected = `sha256=${hmac.digest('hex')}`;
            if (req.headers['twitch-eventsub-message-signature'] !== expected) {
                log$f.debug(req);
                log$f.error('bad message signature', {
                    got: req.headers['twitch-eventsub-message-signature'],
                    expected,
                });
                res.status(403).send({ reason: 'bad message signature' });
                return;
            }
            return next();
        };
        const requireLoginApi = (req, res, next) => {
            if (!req.token) {
                res.status(401).send({});
                return;
            }
            return next();
        };
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
        app.use(this.auth.addAuthInfoMiddleware());
        app.use('/', express.static('./build/public'));
        app.use('/static', express.static('./public/static'));
        const uploadDir = './data/uploads';
        const storage = multer.diskStorage({
            destination: uploadDir,
            filename: function (req, file, cb) {
                cb(null, `${nonce(6)}-${file.originalname}`);
            }
        });
        const upload = multer({ storage }).single('file');
        app.use('/uploads', express.static(uploadDir));
        app.post('/api/upload', requireLoginApi, (req, res) => {
            upload(req, res, (err) => {
                if (err) {
                    log$f.error(err);
                    res.status(400).send("Something went wrong!");
                    return;
                }
                if (!req.file) {
                    log$f.error(err);
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
        app.get('/api/conf', async (req, res) => {
            res.send({
                wsBase: this.wss.connectstring(),
            });
        });
        app.get('/api/user/me', requireLoginApi, async (req, res) => {
            res.send({
                user: req.user,
                widgetToken: req.userWidgetToken,
                pubToken: req.userPubToken,
                token: req.cookies['x-token'],
            });
        });
        app.post('/api/logout', requireLoginApi, async (req, res) => {
            if (req.token) {
                this.auth.destroyToken(req.token);
                res.clearCookie("x-token");
            }
            res.send({ success: true });
        });
        app.get('/api/page/index', requireLoginApi, async (req, res) => {
            res.send({
                widgets: widgets.map(w => {
                    const url = this.widgetUrl(w.type, req.userPubToken);
                    return {
                        title: w.title,
                        hint: w.hint,
                        url: w.pub ? this.pubUrl(url) : url,
                    };
                })
            });
        });
        app.post('/api/user/_reset_password', express.json(), async (req, res) => {
            const plainPass = req.body.pass || null;
            const token = req.body.token || null;
            if (!plainPass || !token) {
                res.status(400).send({ reason: 'bad request' });
                return;
            }
            const tokenObj = this.tokenRepo.getByToken(token);
            if (!tokenObj) {
                res.status(400).send({ reason: 'bad request' });
                return;
            }
            const originalUser = this.userRepo.getById(tokenObj.user_id);
            if (!originalUser) {
                res.status(404).send({ reason: 'user_does_not_exist' });
                return;
            }
            const pass = fn.passwordHash(plainPass, originalUser.salt);
            const user = { id: originalUser.id, pass };
            this.userRepo.save(user);
            this.tokenRepo.delete(tokenObj.token);
            res.send({ success: true });
        });
        app.post('/api/user/_request_password_reset', express.json(), async (req, res) => {
            const email = req.body.email || null;
            if (!email) {
                res.status(400).send({ reason: 'bad request' });
                return;
            }
            const user = this.userRepo.get({ email, status: 'verified' });
            if (!user) {
                res.status(404).send({ reason: 'user not found' });
                return;
            }
            const token = this.tokenRepo.createToken(user.id, 'password_reset');
            this.mail.sendPasswordResetMail({
                user: user,
                token: token,
            });
            res.send({ success: true });
        });
        app.post('/api/user/_resend_verification_mail', express.json(), async (req, res) => {
            const email = req.body.email || null;
            if (!email) {
                res.status(400).send({ reason: 'bad request' });
                return;
            }
            const user = this.db.get('user', { email });
            if (!user) {
                res.status(404).send({ reason: 'email not found' });
                return;
            }
            if (user.status !== 'verification_pending') {
                res.status(400).send({ reason: 'already verified' });
                return;
            }
            const token = this.tokenRepo.createToken(user.id, 'registration');
            this.mail.sendRegistrationMail({
                user: user,
                token: token,
            });
            res.send({ success: true });
        });
        app.post('/api/user/_register', express.json(), async (req, res) => {
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
            let tmpUser;
            tmpUser = this.db.get('user', { email: user.email });
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
            tmpUser = this.db.get('user', { name: user.name });
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
            const userId = this.userRepo.createUser(user);
            if (!userId) {
                res.status(400).send({ reason: 'unable to create user' });
                return;
            }
            const token = this.tokenRepo.createToken(userId, 'registration');
            this.mail.sendRegistrationMail({
                user: user,
                token: token,
            });
            res.send({ success: true });
        });
        app.post('/api/_handle-token', express.json(), async (req, res) => {
            const token = req.body.token || null;
            if (!token) {
                res.status(400).send({ reason: 'invalid_token' });
                return;
            }
            const tokenObj = this.tokenRepo.getByToken(token);
            if (!tokenObj) {
                res.status(400).send({ reason: 'invalid_token' });
                return;
            }
            if (tokenObj.type === 'registration') {
                this.userRepo.save({ status: 'verified', id: tokenObj.user_id });
                this.tokenRepo.delete(tokenObj.token);
                res.send({ type: 'registration-verified' });
                // new user was registered. module manager should be notified about this
                // so that bot doesnt need to be restarted :O
                const user = this.userRepo.getById(tokenObj.user_id);
                if (user) {
                    this.eventHub.emit('user_registration_complete', user);
                }
                else {
                    log$f.error(`registration: user doesn't exist after saving it: ${tokenObj.user_id}`);
                }
                return;
            }
            res.status(400).send({ reason: 'invalid_token' });
            return;
        });
        app.get('/api/page/variables', requireLoginApi, async (req, res) => {
            const variables = new Variables(this.db, req.user.id);
            res.send({ variables: variables.all() });
        });
        app.post('/api/save-variables', requireLoginApi, express.json(), async (req, res) => {
            const variables = new Variables(this.db, req.user.id);
            variables.replace(req.body.variables || []);
            res.send();
        });
        app.get('/api/page/settings', requireLoginApi, async (req, res) => {
            const user = this.userRepo.getById(req.user.id);
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
                    groups: this.userRepo.getGroups(user.id)
                },
                twitchChannels: this.twitchChannelRepo.allByUserId(req.user.id),
            });
        });
        app.post('/api/save-settings', requireLoginApi, express.json(), async (req, res) => {
            if (!req.user.groups.includes('admin')) {
                if (req.user.id !== req.body.user.id) {
                    // editing other user than self
                    res.status(401).send({ reason: 'not_allowed_to_edit_other_users' });
                    return;
                }
            }
            const originalUser = this.userRepo.getById(req.body.user.id);
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
            this.userRepo.save(user);
            this.twitchChannelRepo.saveUserChannels(user.id, twitch_channels);
            const changedUser = this.userRepo.getById(user.id);
            if (changedUser) {
                this.eventHub.emit('user_changed', changedUser);
            }
            else {
                log$f.error(`save-settings: user doesn't exist after saving it: ${user.id}`);
            }
            res.send();
        });
        // twitch calls this url after auth
        // from here we render a js that reads the token and shows it to the user
        app.get('/twitch/redirect_uri', async (req, res) => {
            res.send(templates.render('templates/twitch_redirect_uri.html', {}));
        });
        app.post('/api/twitch/user-id-by-name', requireLoginApi, express.json(), async (req, res) => {
            let clientId;
            let clientSecret;
            if (!req.user.groups.includes('admin')) {
                const u = this.userRepo.getById(req.user.id);
                clientId = u.tmi_identity_client_id || this.configTwitch.tmi.identity.client_id;
                clientSecret = u.tmi_identity_client_secret || this.configTwitch.tmi.identity.client_secret;
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
                const client = new TwitchHelixClient(clientId, clientSecret, []);
                res.send({ id: await client.getUserIdByName(req.body.name) });
            }
            catch (e) {
                res.status(500).send("Something went wrong!");
            }
        });
        app.post('/twitch/event-sub/', express.json({ verify: (req, _res, buf) => { req.rawBody = buf; } }), verifyTwitchSignature, async (req, res) => {
            log$f.debug(req.body);
            log$f.debug(req.headers);
            if (req.headers['twitch-eventsub-message-type'] === 'webhook_callback_verification') {
                log$f.info(`got verification request, challenge: ${req.body.challenge}`);
                res.write(req.body.challenge);
                res.send();
                return;
            }
            if (req.headers['twitch-eventsub-message-type'] === 'notification') {
                log$f.info(`got notification request: ${req.body.subscription.type}`);
                if (req.body.subscription.type === 'stream.online') {
                    // insert new stream
                    this.db.insert('streams', {
                        broadcaster_user_id: req.body.event.broadcaster_user_id,
                        started_at: req.body.event.started_at,
                    });
                }
                else if (req.body.subscription.type === 'stream.offline') {
                    // get last started stream for broadcaster
                    // if it exists and it didnt end yet set ended_at date
                    const stream = this.db.get('streams', {
                        broadcaster_user_id: req.body.event.broadcaster_user_id,
                    }, [{ started_at: -1 }]);
                    if (!stream.ended_at) {
                        this.db.update('streams', {
                            ended_at: `${new Date().toJSON()}`,
                        }, { id: stream.id });
                    }
                }
                res.send();
                return;
            }
            res.status(400).send({ reason: 'unhandled sub type' });
        });
        app.post('/api/auth', express.json(), async (req, res) => {
            const user = this.auth.getUserByNameAndPass(req.body.user, req.body.pass);
            if (!user) {
                res.status(401).send({ reason: 'bad credentials' });
                return;
            }
            const token = this.auth.getUserAuthToken(user.id);
            res.cookie('x-token', token, { maxAge: 1 * YEAR, httpOnly: true });
            res.send();
        });
        app.get('/widget/:widget_type/:widget_token/', async (req, res, _next) => {
            const token = req.params.widget_token;
            const user = this.auth.userFromWidgetToken(token)
                || this.auth.userFromPubToken(token);
            if (!user) {
                res.status(404).send();
                return;
            }
            const type = req.params.widget_type;
            log$f.debug(`/widget/:widget_type/:widget_token/`, type, token);
            if (widgets.findIndex(w => w.type === type) !== -1) {
                res.send(templates.render(widgetTemplate(type), {
                    wsUrl: this.wss.connectstring(),
                    widgetToken: token,
                }));
                return;
            }
            res.status(404).send();
        });
        app.all('/login', async (_req, res, _next) => {
            const indexFile = `${__dirname}/../../build/public/index.html`;
            res.sendFile(path.resolve(indexFile));
        });
        app.all('/password-reset', async (_req, res, _next) => {
            const indexFile = `${__dirname}/../../build/public/index.html`;
            res.sendFile(path.resolve(indexFile));
        });
        app.all('*', requireLogin, express.json({ limit: '50mb' }), async (req, res, next) => {
            const method = req.method.toLowerCase();
            const key = req.url;
            for (const m of this.moduleManager.all(req.user.id)) {
                const map = m.getRoutes();
                if (map && map[method] && map[method][key]) {
                    await map[method][key](req, res, next);
                    return;
                }
            }
            const indexFile = `${__dirname}/../../build/public/index.html`;
            res.sendFile(path.resolve(indexFile));
        });
        this.handle = app.listen(port, hostname, () => log$f.info(`server running on http://${hostname}:${port}`));
    }
    close() {
        if (this.handle) {
            this.handle.close();
        }
    }
}

function mitt(n){return {all:n=n||new Map,on:function(t,e){var i=n.get(t);i?i.push(e):n.set(t,[e]);},off:function(t,e){var i=n.get(t);i&&(e?i.splice(i.indexOf(e)>>>0,1):n.set(t,[]));},emit:function(t,e){var i=n.get(t);i&&i.slice().map(function(n){n(e);}),(i=n.get("*"))&&i.slice().map(function(n){n(t,e);});}}}

const CODE_GOING_AWAY = 1001;
const CODE_CUSTOM_DISCONNECT = 4000;
const heartbeatInterval = 60 * SECOND; //ms between PING's
const reconnectInterval = 3 * SECOND; //ms to wait before reconnect
const log$e = logger('TwitchPubSubClient.ts');
const PUBSUB_WS_ADDR = 'wss://pubsub-edge.twitch.tv';
class TwitchPubSubClient {
    constructor() {
        this.handle = null;
        // timeout for automatic reconnect
        this.reconnectTimeout = null;
        // buffer for 'send'
        this.sendBuffer = [];
        this.heartbeatHandle = null;
        this.nonceMessages = {};
        this.evts = mitt();
    }
    _send(message) {
        const msgStr = JSON.stringify(message);
        // log.debug('SEND', msgStr)
        if (this.handle) {
            try {
                this.handle.send(msgStr);
            }
            catch (e) {
                this.sendBuffer.push(msgStr);
            }
        }
        else {
            this.sendBuffer.push(msgStr);
        }
    }
    _heartbeat() {
        this._send({ type: 'PING' });
    }
    listen(topic, authToken) {
        const n = nonce(15);
        const message = {
            type: 'LISTEN',
            nonce: n,
            data: {
                topics: [topic],
                auth_token: authToken,
            }
        };
        this.nonceMessages[n] = message;
        this._send(message);
    }
    connect() {
        this.handle = new WebSocket(PUBSUB_WS_ADDR);
        this.handle.onopen = (_e) => {
            if (!this.handle) {
                return;
            }
            if (this.handle.readyState !== WebSocket.OPEN) {
                log$e.error('ERR', `readyState is not OPEN (${WebSocket.OPEN})`);
                return;
            }
            if (this.reconnectTimeout) {
                clearTimeout(this.reconnectTimeout);
            }
            // should have a queue worker
            while (this.sendBuffer.length > 0) {
                this.handle.send(this.sendBuffer.shift());
            }
            log$e.info('INFO', 'Socket Opened');
            this._heartbeat();
            if (this.heartbeatHandle) {
                clearInterval(this.heartbeatHandle);
            }
            this.heartbeatHandle = setInterval(() => {
                this._heartbeat();
            }, heartbeatInterval);
            this.evts.emit('open', {});
        };
        this.handle.onmessage = (e) => {
            const message = JSON.parse(`${e.data}`);
            if (message.nonce) {
                message.sentData = this.nonceMessages[message.nonce];
                delete this.nonceMessages[message.nonce];
            }
            // log.debug('RECV', JSON.stringify(message))
            if (message.type === 'RECONNECT') {
                log$e.info('INFO', 'Reconnecting...');
                this.connect();
            }
            this.evts.emit('message', message);
        };
        this.handle.onerror = (e) => {
            log$e.error('ERR', e);
            this.handle = null;
            this.reconnectTimeout = setTimeout(() => { this.connect(); }, reconnectInterval);
        };
        this.handle.onclose = (e) => {
            this.handle = null;
            if (e.code === CODE_CUSTOM_DISCONNECT || e.code === CODE_GOING_AWAY) ;
            else {
                log$e.info('INFO', 'Onclose...');
                this.reconnectTimeout = setTimeout(() => { this.connect(); }, reconnectInterval);
            }
            if (this.heartbeatHandle) {
                clearInterval(this.heartbeatHandle);
            }
        };
    }
    disconnect() {
        if (this.handle) {
            this.handle.close(CODE_CUSTOM_DISCONNECT);
        }
    }
    on(what, cb) {
        this.evts.on(what, cb);
    }
}

const newText = () => '';
const newMedia = () => ({
    sound: {
        filename: '',
        file: '',
        urlpath: '',
        volume: 100,
    },
    image: {
        filename: '',
        file: '',
        urlpath: '',
    },
    image_url: '',
    clip_url: '',
    minDurationMs: '1s',
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
const newRewardRedemptionTrigger = (command = '') => {
    const trigger = newTrigger('reward_redemption');
    trigger.data.command = command;
    return trigger;
};
const newCommandTrigger = (command = '', commandExact = false) => {
    const trigger = newTrigger('command');
    trigger.data.command = command;
    trigger.data.commandExact = commandExact;
    return trigger;
};
const commandHasAnyTrigger = (command, triggers) => {
    for (const cmdTrigger of command.triggers) {
        for (const trigger of triggers) {
            if (cmdTrigger.type !== trigger.type) {
                continue;
            }
            if (cmdTrigger.type === 'command') {
                if (cmdTrigger.data.command === trigger.data.command) {
                    // no need to check for commandExact here (i think^^)
                    return true;
                }
            }
            else if (cmdTrigger.type === 'reward_redemption') {
                if (cmdTrigger.data.command === trigger.data.command) {
                    return true;
                }
            }
            else if (cmdTrigger.type === 'timer') {
                if (cmdTrigger.data.minInterval === trigger.data.minInterval
                    && cmdTrigger.data.minLines === trigger.data.minLines) {
                    return true;
                }
            }
            else if (cmdTrigger.type === 'first_chat') {
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
            triggers: [newCommandTrigger()],
            action: 'add_stream_tags',
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
            triggers: [newCommandTrigger()],
            action: 'chatters',
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
            triggers: [newCommandTrigger()],
            action: 'countdown',
            restrict_to: [],
            variables: [],
            variableChanges: [],
            data: {
                steps: 3,
                interval: '1s',
                intro: 'Starting countdown...',
                outro: 'Done!'
            },
        }),
        RequiresAccessToken: () => false,
    },
    dict_lookup: {
        Name: () => "dictionary lookup",
        Description: () => "Outputs the translation for the searched word.",
        NewCommand: () => ({
            triggers: [newCommandTrigger()],
            action: 'dict_lookup',
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
            triggers: [newCommandTrigger()],
            action: 'madochan_createword',
            restrict_to: [],
            variables: [],
            variableChanges: [],
            data: {
                // TODO: use from same resource as server
                model: '100epochs800lenhashingbidirectional.h5',
                weirdness: 1,
            },
        }),
        RequiresAccessToken: () => false,
    },
    media: {
        Name: () => "media command",
        Description: () => "Display an image and/or play a sound.",
        NewCommand: () => ({
            triggers: [newCommandTrigger()],
            action: 'media',
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
            triggers: [newCommandTrigger()],
            action: 'media_volume',
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
            triggers: [newCommandTrigger()],
            action: 'text',
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
            triggers: [newCommandTrigger()],
            action: 'remove_stream_tags',
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
            triggers: [newCommandTrigger()],
            action: 'set_channel_game_id',
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
            triggers: [newCommandTrigger()],
            action: 'set_channel_title',
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
            action: 'sr_current',
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
            action: 'sr_undo',
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
            action: 'sr_good',
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
            action: 'sr_bad',
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
            action: 'sr_stats',
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
            action: 'sr_prev',
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
            action: 'sr_next',
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
            action: 'sr_jumptonew',
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
            action: 'sr_clear',
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
            action: 'sr_rm',
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
            action: 'sr_shuffle',
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
            action: 'sr_reset_stats',
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
            action: 'sr_loop',
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
            action: 'sr_noloop',
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
            action: 'sr_pause',
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
            action: 'sr_unpause',
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
            action: 'sr_hidevideo',
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
            action: 'sr_showvideo',
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
            action: 'sr_request',
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
            action: 'sr_re_request',
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
            action: 'sr_addtag',
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
            action: 'sr_rmtag',
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
            action: 'sr_volume',
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
            action: 'sr_filter',
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
            action: 'sr_preset',
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
            action: 'sr_queue',
            triggers: [newCommandTrigger('!sr queue')],
            restrict_to: [],
            variables: [],
            variableChanges: [],
            data: {},
        }),
        RequiresAccessToken: () => false,
    },
};

// @ts-ignore
const log$d = logger('TwitchClientManager.ts');
class TwitchClientManager {
    constructor(bot, user, cfg, twitchChannelRepo) {
        this.chatClient = null;
        this.helixClient = null;
        this.identity = null;
        this.pubSubClient = null;
        // this should probably be handled in the pub sub client code?
        // channel_id => [] list of auth tokens that are bad
        this.badAuthTokens = {};
        this.bot = bot;
        this.user = user;
        this.cfg = cfg;
        this.log = logger('TwitchClientManager.ts', `${user.name}|`);
        this.twitchChannelRepo = twitchChannelRepo;
    }
    async userChanged(user) {
        this.user = user;
        await this.init('user_change');
    }
    _resetBadAuthTokens() {
        this.badAuthTokens = {};
    }
    _addBadAuthToken(channelIds, authToken) {
        for (const channelId of channelIds) {
            if (!this.badAuthTokens[channelId]) {
                this.badAuthTokens[channelId] = [];
            }
            if (!this.badAuthTokens[channelId].includes(authToken)) {
                this.badAuthTokens[channelId].push(authToken);
            }
        }
    }
    _isBadAuthToken(channelId, authToken) {
        return !!(this.badAuthTokens[channelId]
            && this.badAuthTokens[channelId].includes(authToken));
    }
    determineRelevantPubSubChannels(twitchChannels) {
        return twitchChannels.filter(channel => {
            return !!(channel.access_token && channel.channel_id)
                && !this._isBadAuthToken(channel.channel_id, channel.access_token);
        });
    }
    async init(reason) {
        let connectReason = reason;
        const cfg = this.cfg;
        const user = this.user;
        const twitchChannelRepo = this.twitchChannelRepo;
        this.log = logger('TwitchClientManager.ts', `${user.name}|`);
        await this._disconnectChatClient();
        this._disconnectPubSubClient();
        const twitchChannels = twitchChannelRepo.allByUserId(user.id);
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
            // log.debug(context)
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
            this.log.debug(`${context.username}[${roles.join('')}]@${target}: ${msg}`);
            this.bot.getDb().insert('chat_log', {
                created_at: `${new Date().toJSON()}`,
                broadcaster_user_id: context['room-id'],
                user_name: context.username,
                display_name: context['display-name'],
                message: msg,
            });
            const countChatMessages = (where) => {
                const db = this.bot.getDb();
                const [whereSql, whereValues] = db._buildWhere(where);
                const row = db._get(`select COUNT(*) as c from chat_log ${whereSql}`, whereValues);
                return row.c;
            };
            let _isFirstChatAlltime = null;
            let _isFirstChatStream = null;
            const isFirstChatAlltime = async () => {
                if (_isFirstChatAlltime === null) {
                    _isFirstChatAlltime = countChatMessages({
                        broadcaster_user_id: context['room-id'],
                        user_name: context.username,
                    }) === 1;
                }
                return _isFirstChatAlltime;
            };
            const isFirstChatStream = async () => {
                if (_isFirstChatStream === null) {
                    const stream = await helixClient.getStreamByUserId(context['room-id']);
                    if (!stream) {
                        const fakeStartDate = `${new Date(new Date().getTime() - (5 * MINUTE)).toJSON()}`;
                        log$d.info(`No stream is running atm for channel ${context['room-id']}. Using fake start date ${fakeStartDate}.`);
                        _isFirstChatStream = countChatMessages({
                            broadcaster_user_id: context['room-id'],
                            created_at: { '$gte': fakeStartDate },
                            user_name: context.username,
                        }) === 1;
                    }
                    else {
                        _isFirstChatStream = countChatMessages({
                            broadcaster_user_id: context['room-id'],
                            created_at: { '$gte': stream.started_at },
                            user_name: context.username,
                        }) === 1;
                    }
                }
                return _isFirstChatStream;
            };
            const chatMessageContext = { client: chatClient, target, context, msg };
            for (const m of this.bot.getModuleManager().all(user.id)) {
                const commands = m.getCommands() || [];
                let triggers = [];
                const relevantTriggers = [];
                for (const command of commands) {
                    for (const trigger of command.triggers) {
                        if (trigger.type === 'command') {
                            triggers.push(trigger);
                        }
                        else if (trigger.type === 'first_chat') {
                            if (trigger.data.since === 'alltime' && await isFirstChatAlltime()) {
                                relevantTriggers.push(trigger);
                            }
                            else if (trigger.data.since === 'stream' && await isFirstChatStream()) {
                                relevantTriggers.push(trigger);
                            }
                        }
                    }
                }
                // make sure longest commands are found first
                // so that in case commands `!draw` and `!draw bad` are set up
                // and `!draw bad` is written in chat, that command only will be
                // executed and not also `!draw`
                triggers = triggers.sort((a, b) => b.data.command.length - a.data.command.length);
                let rawCmd = null;
                for (const trigger of triggers) {
                    rawCmd = fn.parseCommandFromTriggerAndMessage(chatMessageContext.msg, trigger);
                    if (!rawCmd) {
                        continue;
                    }
                    relevantTriggers.push(trigger);
                    break;
                }
                if (relevantTriggers.length > 0) {
                    const cmdDefs = getUniqueCommandsByTriggers(commands, relevantTriggers);
                    await fn.tryExecuteCommand(m, rawCmd, cmdDefs, chatClient, target, context, msg);
                }
                await m.onChatMsg(chatMessageContext);
            }
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
                const say = fn.sayFn(chatClient, channel.channel_name);
                if (connectReason === 'init') {
                    say('⚠️ Bot rebooted - please restart timers...');
                }
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
        const helixClient = new TwitchHelixClient(identity.client_id, identity.client_secret, twitchChannels);
        this.helixClient = helixClient;
        // connect to PubSub websocket only when required
        // https://dev.twitch.tv/docs/pubsub#topics
        this.log.info(`Initializing PubSub`);
        const pubsubChannels = this.determineRelevantPubSubChannels(twitchChannels);
        if (pubsubChannels.length === 0) {
            this.log.info(`* No twitch channels configured with access_token and channel_id set`);
        }
        else {
            this.pubSubClient = new TwitchPubSubClient();
            this.pubSubClient.on('open', async () => {
                if (!this.pubSubClient) {
                    return;
                }
                // listen for evts
                const pubsubChannels = this.determineRelevantPubSubChannels(twitchChannels);
                if (pubsubChannels.length === 0) {
                    this.log.info(`* No twitch channels configured with a valid access_token`);
                    this._disconnectPubSubClient();
                    return;
                }
                for (const channel of pubsubChannels) {
                    this.log.info(`${channel.channel_name} listen for channel point redemptions`);
                    this.pubSubClient.listen(`channel-points-channel-v1.${channel.channel_id}`, channel.access_token);
                }
                // TODO: change any type
                this.pubSubClient.on('message', async (message) => {
                    if (message.type === 'RESPONSE' && message.error === 'ERR_BADAUTH' && message.sentData) {
                        const channelIds = message.sentData.data.topics.map((t) => t.split('.')[1]);
                        const authToken = message.sentData.data.auth_token;
                        this._addBadAuthToken(channelIds, authToken);
                        // now check if there are still any valid twitch channels, if not
                        // then disconnect, because we dont need the pubsub to be active
                        const pubsubChannels = this.determineRelevantPubSubChannels(twitchChannels);
                        if (pubsubChannels.length === 0) {
                            this.log.info(`* No twitch channels configured with a valid access_token`);
                            this._disconnectPubSubClient();
                            return;
                        }
                    }
                    if (message.type !== 'MESSAGE') {
                        return;
                    }
                    const messageData = JSON.parse(message.data.message);
                    // channel points redeemed with non standard reward
                    // standard rewards are not supported :/
                    if (messageData.type !== 'reward-redeemed') {
                        return;
                    }
                    const redemptionMessage = messageData;
                    this.log.debug(redemptionMessage.data.redemption);
                    const redemption = redemptionMessage.data.redemption;
                    const twitchChannel = this.bot.getDb().get('twitch_channel', { channel_id: redemption.channel_id });
                    if (!twitchChannel) {
                        return;
                    }
                    const target = twitchChannel.channel_name;
                    const context = {
                        "room-id": redemption.channel_id,
                        "user-id": redemption.user.id,
                        "display-name": redemption.user.display_name,
                        username: redemption.user.login,
                        mod: false,
                        subscriber: redemption.reward.is_sub_only, // this does not really tell us if the user is sub or not, just if the redemption was sub only
                    };
                    const msg = redemption.reward.title;
                    const rewardRedemptionContext = { client: chatClient, target, context, redemption };
                    for (const m of this.bot.getModuleManager().all(user.id)) {
                        // reward redemption should all have exact key/name of the reward,
                        // no sorting required
                        const commands = m.getCommands();
                        // make a tmp trigger to match commands against
                        const trigger = newRewardRedemptionTrigger(redemption.reward.title);
                        const rawCmd = {
                            name: redemption.reward.title,
                            args: redemption.user_input ? [redemption.user_input] : [],
                        };
                        const cmdDefs = getUniqueCommandsByTriggers(commands, [trigger]);
                        await fn.tryExecuteCommand(m, rawCmd, cmdDefs, chatClient, target, context, msg);
                        await m.onRewardRedemption(rewardRedemptionContext);
                    }
                });
            });
        }
        if (this.chatClient) {
            this.chatClient.connect();
        }
        if (this.pubSubClient) {
            this.pubSubClient.connect();
        }
        // to delete all subscriptions
        // ;(async () => {
        //   if (!this.helixClient) {
        //     return
        //   }
        //   const subzz = await this.helixClient.getSubscriptions()
        //   for (const s of subzz.data) {
        //     await this.helixClient.deleteSubscription(s.id)
        //   }
        // })()
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
    _disconnectPubSubClient() {
        try {
            if (this.pubSubClient !== null) {
                this.pubSubClient.disconnect();
                this.pubSubClient = null;
            }
        }
        catch (e) {
            this.log.info(e);
        }
        this._resetBadAuthTokens();
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

const log$c = logger('ModuleStorage.ts');
const TABLE$4 = 'module';
class ModuleStorage {
    constructor(db, userId) {
        this.db = db;
        this.userId = userId;
    }
    load(key, def) {
        try {
            const where = { user_id: this.userId, key };
            const row = this.db.get(TABLE$4, where);
            const data = row ? JSON.parse('' + row.data) : null;
            return data ? Object.assign({}, def, data) : def;
        }
        catch (e) {
            log$c.error(e);
            return def;
        }
    }
    save(key, rawData) {
        const where = { user_id: this.userId, key };
        const data = JSON.stringify(rawData);
        const dbData = Object.assign({}, where, { data });
        this.db.upsert(TABLE$4, dbData, where);
    }
}

const TABLE$3 = 'user';
class Users {
    constructor(db) {
        this.db = db;
    }
    get(by) {
        return this.db.get(TABLE$3, by) || null;
    }
    all() {
        return this.db.getMany(TABLE$3);
    }
    getById(id) {
        return this.get({ id });
    }
    save(user) {
        return this.db.upsert(TABLE$3, user, { id: user.id });
    }
    getGroups(id) {
        const rows = this.db._getMany(`
select g.name from user_group g inner join user_x_user_group x
where x.user_id = ?`, [id]);
        return rows.map(r => r.name);
    }
    createUser(user) {
        return this.db.insert(TABLE$3, user);
    }
}

const TABLE$2 = 'token';
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
    getByUserIdAndType(user_id, type) {
        return this.db.get(TABLE$2, { user_id, type });
    }
    insert(tokenInfo) {
        return this.db.insert(TABLE$2, tokenInfo);
    }
    createToken(user_id, type) {
        const token = generateToken(32);
        const tokenObj = { user_id, type, token };
        this.insert(tokenObj);
        return tokenObj;
    }
    getOrCreateToken(user_id, type) {
        return this.getByUserIdAndType(user_id, type) || this.createToken(user_id, type);
    }
    getByToken(token) {
        return this.db.get(TABLE$2, { token }) || null;
    }
    delete(token) {
        return this.db.delete(TABLE$2, { token });
    }
    getWidgetTokenForUserId(user_id) {
        return this.getOrCreateToken(user_id, 'widget');
    }
    getPubTokenForUserId(user_id) {
        return this.getOrCreateToken(user_id, 'pub');
    }
    generateAuthTokenForUserId(user_id) {
        return this.createToken(user_id, 'auth');
    }
}

const TABLE$1 = 'twitch_channel';
class TwitchChannels {
    constructor(db) {
        this.db = db;
    }
    save(channel) {
        return this.db.upsert(TABLE$1, channel, {
            user_id: channel.user_id,
            channel_name: channel.channel_name,
        });
    }
    allByUserId(user_id) {
        return this.db.getMany(TABLE$1, { user_id });
    }
    saveUserChannels(user_id, channels) {
        for (const channel of channels) {
            this.save(channel);
        }
        this.db.delete(TABLE$1, {
            user_id: user_id,
            channel_name: { '$nin': channels.map(c => c.channel_name) }
        });
    }
}

const TABLE = 'cache';
class Cache {
    constructor(db) {
        this.db = db;
    }
    set(key, value) {
        this.db.upsert(TABLE, { key, value: JSON.stringify(value) }, { key });
    }
    get(key) {
        const row = this.db.get(TABLE, { key });
        return row ? JSON.parse(row.value) : null;
    }
}

const log$b = logger('Db.ts');
class Db {
    constructor(dbConf) {
        this.conf = dbConf;
        this.dbh = bsqlite(this.conf.file);
    }
    close() {
        this.dbh.close();
    }
    patch(verbose = true) {
        if (!this.get('sqlite_master', { type: 'table', name: 'db_patches' })) {
            this.run('CREATE TABLE db_patches ( id TEXT PRIMARY KEY);', []);
        }
        const files = fs.readdirSync(this.conf.patchesDir);
        const patches = (this.getMany('db_patches')).map(row => row.id);
        for (const f of files) {
            if (patches.includes(f)) {
                if (verbose) {
                    log$b.info(`➡ skipping already applied db patch: ${f}`);
                }
                continue;
            }
            const contents = fs.readFileSync(`${this.conf.patchesDir}/${f}`, 'utf-8');
            const all = contents.split(';').map(s => s.trim()).filter(s => !!s);
            try {
                this.dbh.transaction((all) => {
                    for (const q of all) {
                        if (verbose) {
                            log$b.info(`Running: ${q}`);
                        }
                        this.run(q);
                    }
                    this.insert('db_patches', { id: f });
                })(all);
                log$b.info(`✓ applied db patch: ${f}`);
            }
            catch (e) {
                log$b.error(`✖ unable to apply patch: ${f} ${e}`);
                return;
            }
        }
    }
    _buildWhere(where) {
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
                        wheres.push(k + ' NOT IN (' + where[k][prop].map((_) => '?') + ')');
                        values.push(...where[k][prop]);
                    }
                    continue;
                }
                prop = '$in';
                if (where[k][prop]) {
                    if (where[k][prop].length > 0) {
                        wheres.push(k + ' IN (' + where[k][prop].map((_) => '?') + ')');
                        values.push(...where[k][prop]);
                    }
                    continue;
                }
                prop = '$gte';
                if (where[k][prop]) {
                    wheres.push(k + ' >= ?');
                    values.push(where[k][prop]);
                    continue;
                }
                prop = '$lte';
                if (where[k][prop]) {
                    wheres.push(k + ' <= ?');
                    values.push(where[k][prop]);
                    continue;
                }
                prop = '$gt';
                if (where[k][prop]) {
                    wheres.push(k + ' > ?');
                    values.push(where[k][prop]);
                    continue;
                }
                prop = '$lt';
                if (where[k][prop]) {
                    wheres.push(k + ' < ?');
                    values.push(where[k][prop]);
                    continue;
                }
                prop = '$ne';
                if (where[k][prop]) {
                    wheres.push(k + ' != ?');
                    values.push(where[k][prop]);
                    continue;
                }
                // TODO: implement rest of mongo like query args ($eq, $lte, $in...)
                throw new Error('not implemented: ' + JSON.stringify(where[k]));
            }
            wheres.push(k + ' = ?');
            values.push(where[k]);
        }
        return [
            wheres.length > 0 ? ' WHERE ' + wheres.join(' AND ') : '',
            values,
        ];
    }
    _buildOrderBy(orderBy) {
        const sorts = [];
        for (const s of orderBy) {
            const k = Object.keys(s)[0];
            sorts.push(k + ' ' + (s[k] > 0 ? 'ASC' : 'DESC'));
        }
        return sorts.length > 0 ? ' ORDER BY ' + sorts.join(', ') : '';
    }
    _get(query, params = []) {
        return this.dbh.prepare(query).get(...params);
    }
    run(query, params = []) {
        return this.dbh.prepare(query).run(...params);
    }
    _getMany(query, params = []) {
        return this.dbh.prepare(query).all(...params);
    }
    get(table, where = {}, orderBy = []) {
        const [whereSql, values] = this._buildWhere(where);
        const orderBySql = this._buildOrderBy(orderBy);
        const sql = 'SELECT * FROM ' + table + whereSql + orderBySql;
        return this._get(sql, values);
    }
    getMany(table, where = {}, orderBy = []) {
        const [whereSql, values] = this._buildWhere(where);
        const orderBySql = this._buildOrderBy(orderBy);
        const sql = 'SELECT * FROM ' + table + whereSql + orderBySql;
        return this._getMany(sql, values);
    }
    delete(table, where = {}) {
        const [whereSql, values] = this._buildWhere(where);
        const sql = 'DELETE FROM ' + table + whereSql;
        return this.run(sql, values);
    }
    exists(table, where) {
        return !!this.get(table, where);
    }
    upsert(table, data, check, idcol = null) {
        if (!this.exists(table, check)) {
            return this.insert(table, data);
        }
        this.update(table, data, check);
        if (idcol === null) {
            return 0; // dont care about id
        }
        return this.get(table, check)[idcol]; // get id manually
    }
    insert(table, data) {
        const keys = Object.keys(data);
        const values = keys.map(k => data[k]);
        const sql = 'INSERT INTO ' + table + ' (' + keys.join(',') + ') VALUES (' + keys.map(k => '?').join(',') + ')';
        return this.run(sql, values).lastInsertRowid;
    }
    update(table, data, where = {}) {
        const keys = Object.keys(data);
        if (keys.length === 0) {
            return;
        }
        const values = keys.map(k => data[k]);
        const setSql = ' SET ' + keys.join(' = ?,') + ' = ?';
        const [whereSql, whereValues] = this._buildWhere(where);
        const sql = 'UPDATE ' + table + setSql + whereSql;
        this.run(sql, [...values, ...whereValues]);
    }
}

// @ts-ignore
const log$a = logger('Mail.ts');
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
            log$a.info('API called successfully. Returned data: ' + JSON.stringify(data));
        }, function (error) {
            log$a.error(error);
        });
    }
}

const log$9 = logger('countdown.ts');
const countdown = (originalCmd, bot, user) => async (command, client, target, context, _msg) => {
    if (!client) {
        return;
    }
    const variables = bot.getUserVariables(user);
    const sayFn = fn.sayFn(client, target);
    const doReplacements = async (text) => {
        return await fn.doReplacements(text, command, context, variables, originalCmd, bot, user);
    };
    const say = async (text) => {
        return sayFn(await doReplacements(text));
    };
    const parseDuration = async (str) => {
        return fn.mustParseHumanDuration(await doReplacements(str));
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
            actionDefs.push({ type: 'text', value: msgIntro.replace(/\{steps\}/g, `${steps}`) });
            actionDefs.push({ type: 'delay', value: settings.interval || '1s' });
        }
        for (let step = steps; step > 0; step--) {
            actionDefs.push({
                type: 'text',
                value: msgStep.replace(/\{steps\}/g, `${steps}`).replace(/\{step\}/g, `${step}`),
            });
            actionDefs.push({ type: 'delay', value: settings.interval || '1s' });
        }
        if (msgOutro) {
            actionDefs.push({ type: 'text', value: msgOutro.replace(/\{steps\}/g, `${steps}`) });
        }
    }
    else if (t === 'manual') {
        actionDefs = settings.actions;
    }
    const actions = [];
    for (const a of actionDefs) {
        if (a.type === 'text') {
            actions.push(async () => say(`${a.value}`));
        }
        else if (a.type === 'media') {
            actions.push(async () => {
                bot.getWebSocketServer().notifyAll([user.id], 'general', {
                    event: 'playmedia',
                    data: a.value,
                });
            });
        }
        else if (a.type === 'delay') {
            let duration;
            try {
                duration = (await parseDuration(`${a.value}`)) || 0;
            }
            catch (e) {
                log$9.error(e.message, a.value);
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
    const json = (await postJson(url, asJson(createWordRequestData)));
    return json;
};
var Madochan = {
    createWord,
    defaultModel: '100epochs800lenhashingbidirectional.h5',
    defaultWeirdness: 1,
};

const madochanCreateWord = (originalCmd) => async (command, client, target, _context, _msg) => {
    if (!client || !command) {
        return;
    }
    const model = `${originalCmd.data.model}` || Madochan.defaultModel;
    const weirdness = parseInt(originalCmd.data.weirdness, 10) || Madochan.defaultWeirdness;
    const say = fn.sayFn(client, target);
    const definition = command.args.join(' ');
    say(`Generating word for "${definition}"...`);
    const data = await Madochan.createWord({
        model: model,
        weirdness: weirdness,
        definition: definition,
    });
    if (data.word === '') {
        say(`Sorry, I could not generate a word :("`);
    }
    else {
        say(`"${definition}": ${data.word}`);
    }
};

const randomText = (originalCmd, bot, user) => async (command, client, target, context, _msg) => {
    if (!client) {
        return;
    }
    const variables = bot.getUserVariables(user);
    const texts = originalCmd.data.text;
    const say = fn.sayFn(client, target);
    say(await fn.doReplacements(fn.getRandom(texts), command, context, variables, originalCmd, bot, user));
};

const playMedia = (originalCmd, bot, user) => async (command, _client, _target, context, _msg) => {
    const data = originalCmd.data;
    const variables = bot.getUserVariables(user);
    data.image_url = await fn.doReplacements(data.image_url, command, context, variables, originalCmd, bot, user);
    data.clip_url = await fn.doReplacements(data.clip_url, command, context, variables, originalCmd, bot, user);
    if (data.clip_url) {
        const filename = `${hash(data.clip_url)}-clip.mp4`;
        const outfile = `./data/uploads/${filename}`;
        if (!fs.existsSync(outfile)) {
            console.log(`downloading the clip to ${outfile}`);
            const child = childProcess.execFile(config.youtubeDlBinary, [
                data.clip_url,
                '-o',
                outfile,
            ]);
            await new Promise((resolve) => {
                child.on('close', resolve);
            });
        }
        else {
            console.log(`clip exists at ${outfile}`);
        }
        data.clip_url = `/uploads/${filename}`;
    }
    bot.getWebSocketServer().notifyAll([user.id], 'general', {
        event: 'playmedia',
        data: data,
    });
};

const log$8 = logger('chatters.ts');
const chatters = (bot, user) => async (_command, client, target, context, _msg) => {
    const helixClient = bot.getUserTwitchClientManager(user).getHelixClient();
    if (!client || !context || !helixClient) {
        log$8.info('client', client);
        log$8.info('context', context);
        log$8.info('helixClient', helixClient);
        log$8.info('unable to execute chatters command, client, context, or helixClient missing');
        return;
    }
    const say = fn.sayFn(client, target);
    const stream = await helixClient.getStreamByUserId(context['room-id']);
    if (!stream) {
        say(`It seems this channel is not live at the moment...`);
        return;
    }
    const db = bot.getDb();
    const [whereSql, whereValues] = db._buildWhere({
        broadcaster_user_id: context['room-id'],
        created_at: { '$gte': stream.started_at },
    });
    const userNames = db._getMany(`select display_name from chat_log ${whereSql} group by user_name`, whereValues).map(r => r.display_name);
    if (userNames.length === 0) {
        say(`It seems nobody chatted? :(`);
        return;
    }
    say(`Thank you for chatting!`);
    fn.joinIntoChunks(userNames, ', ', 500).forEach(msg => {
        say(msg);
    });
};

const log$7 = logger('setChannelTitle.ts');
const setChannelTitle = (originalCmd, bot, user) => async (command, client, target, context, _msg) => {
    const helixClient = bot.getUserTwitchClientManager(user).getHelixClient();
    if (!client || !command || !context || !helixClient) {
        log$7.info('client', client);
        log$7.info('command', command);
        log$7.info('context', context);
        log$7.info('helixClient', helixClient);
        log$7.info('unable to execute setChannelTitle, client, command, context, or helixClient missing');
        return;
    }
    const variables = bot.getUserVariables(user);
    const say = fn.sayFn(client, target);
    const title = originalCmd.data.title === '' ? '$args()' : originalCmd.data.title;
    const tmpTitle = await fn.doReplacements(title, command, context, variables, originalCmd, bot, user);
    if (tmpTitle === '') {
        const info = await helixClient.getChannelInformation(context['room-id']);
        if (info) {
            say(`Current title is "${info.title}".`);
        }
        else {
            say(`❌ Unable to determine current title.`);
        }
        return;
    }
    const resp = await helixClient.modifyChannelInformation(context['room-id'], { title: tmpTitle });
    if (resp?.status === 204) {
        say(`✨ Changed title to "${tmpTitle}".`);
    }
    else {
        say('❌ Unable to change title.');
    }
};

const log$6 = logger('setChannelGameId.ts');
const setChannelGameId = (originalCmd, bot, user) => async (command, client, target, context, _msg) => {
    const helixClient = bot.getUserTwitchClientManager(user).getHelixClient();
    if (!client || !command || !context || !helixClient) {
        log$6.info('client', client);
        log$6.info('command', command);
        log$6.info('context', context);
        log$6.info('helixClient', helixClient);
        log$6.info('unable to execute setChannelGameId, client, command, context, or helixClient missing');
        return;
    }
    const variables = bot.getUserVariables(user);
    const say = fn.sayFn(client, target);
    const gameId = originalCmd.data.game_id === '' ? '$args()' : originalCmd.data.game_id;
    const tmpGameId = await fn.doReplacements(gameId, command, context, variables, originalCmd, bot, user);
    if (tmpGameId === '') {
        const info = await helixClient.getChannelInformation(context['room-id']);
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
    const resp = await helixClient.modifyChannelInformation(context['room-id'], { game_id: category.id });
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
    const json = (await getJson(url));
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
    let searchWords = [];
    let fromArrSearch = [];
    let fromArr = [];
    let toArr = [];
    const matchedSentence = normalize(matchedWords.join(' '));
    if (arr1NoPunct.includes(matchedSentence)) {
        fromArrSearch = arr1NoPunct;
        fromArr = arr1;
        toArr = arr2;
        searchWords = [matchedSentence];
    }
    else if (arr2NoPunct.includes(matchedSentence)) {
        fromArrSearch = arr2NoPunct;
        fromArr = arr2;
        toArr = arr1;
        searchWords = [matchedSentence];
    }
    else {
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
    }
    const results = [];
    for (const i in fromArr) {
        if (!fromArrSearch[i]) {
            continue;
        }
        if (!searchWords.includes(fromArrSearch[i])) {
            continue;
        }
        const idx = results.findIndex(item => item.from === fromArr[i]);
        if (idx < 0) {
            results.push({ from: fromArr[i], to: [toArr[i]] });
        }
        else {
            results[idx].to.push(toArr[i]);
        }
    }
    return results;
};
const searchWord = async (keyword, lang) => {
    const baseUrl = LANG_TO_URL_MAP[lang];
    if (!baseUrl) {
        return [];
    }
    const url = baseUrl + asQueryArgs({ s: keyword });
    const text = await getText(url);
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
const dictLookup = (originalCmd, bot, user) => async (command, client, target, context, _msg) => {
    if (!client || !command) {
        return [];
    }
    const variables = bot.getUserVariables(user);
    const say = fn.sayFn(client, target);
    const tmpLang = await fn.doReplacements(originalCmd.data.lang, command, context, variables, originalCmd, bot, user);
    const dictFn = LANG_TO_FN[tmpLang] || null;
    if (!dictFn) {
        say(`Sorry, language not supported: "${tmpLang}"`);
        return;
    }
    // if no phrase is setup, use all args given to command
    const phrase = originalCmd.data.phrase === '' ? '$args()' : originalCmd.data.phrase;
    const tmpPhrase = await fn.doReplacements(phrase, command, context, variables, originalCmd, bot, user);
    const items = await dictFn(tmpPhrase);
    if (items.length === 0) {
        say(`Sorry, I didn't find anything for "${tmpPhrase}" in language "${tmpLang}"`);
        return;
    }
    for (const item of items) {
        say(`Phrase "${item.from}": ${item.to.join(", ")}`);
    }
};

const log$5 = logger('setStreamTags.ts');
const addStreamTags = (originalCmd, bot, user) => async (command, client, target, context, _msg) => {
    const helixClient = bot.getUserTwitchClientManager(user).getHelixClient();
    if (!client || !command || !context || !helixClient) {
        log$5.info('client', client);
        log$5.info('command', command);
        log$5.info('context', context);
        log$5.info('helixClient', helixClient);
        log$5.info('unable to execute addStreamTags, client, command, context, or helixClient missing');
        return;
    }
    const variables = bot.getUserVariables(user);
    const say = fn.sayFn(client, target);
    const tag = originalCmd.data.tag === '' ? '$args()' : originalCmd.data.tag;
    const tmpTag = await fn.doReplacements(tag, command, context, variables, originalCmd, bot, user);
    const tagsResponse = await helixClient.getStreamTags(context['room-id']);
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
    const resp = await helixClient.replaceStreamTags(context['room-id'], newSettableTagIds);
    if (!resp || resp.status < 200 || resp.status >= 300) {
        log$5.error(resp);
        say(`❌ Unable to add tag: ${tagEntry.name}`);
        return;
    }
    say(`✨ Added tag: ${tagEntry.name}`);
};

const log$4 = logger('setStreamTags.ts');
const removeStreamTags = (originalCmd, bot, user) => async (command, client, target, context, _msg) => {
    const helixClient = bot.getUserTwitchClientManager(user).getHelixClient();
    if (!client || !command || !context || !helixClient) {
        log$4.info('client', client);
        log$4.info('command', command);
        log$4.info('context', context);
        log$4.info('helixClient', helixClient);
        log$4.info('unable to execute removeStreamTags, client, command, context, or helixClient missing');
        return;
    }
    const variables = bot.getUserVariables(user);
    const say = fn.sayFn(client, target);
    const tag = originalCmd.data.tag === '' ? '$args()' : originalCmd.data.tag;
    const tmpTag = await fn.doReplacements(tag, command, context, variables, originalCmd, bot, user);
    const tagsResponse = await helixClient.getStreamTags(context['room-id']);
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
    const resp = await helixClient.replaceStreamTags(context['room-id'], newSettableTagIds);
    if (!resp || resp.status < 200 || resp.status >= 300) {
        say(`❌ Unable to remove tag: ${manualTags[idx].localization_names['en-us']}`);
        return;
    }
    say(`✨ Removed tag: ${manualTags[idx].localization_names['en-us']}`);
};

class GeneralModule {
    constructor(bot, user) {
        this.name = 'general';
        this.interval = null;
        this.channelPointsCustomRewards = {};
        this.bot = bot;
        this.user = user;
        const initData = this.reinit();
        this.data = initData.data;
        this.commands = initData.commands;
        this.timers = initData.timers;
        this.inittimers();
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
                    const client = this.bot.getUserTwitchClientManager(this.user).getChatClient();
                    const target = null;
                    const context = null;
                    const msg = null;
                    await fn.applyVariableChanges(cmdDef, this, rawCmd, context);
                    await cmdDef.fn(rawCmd, client, target, context, msg);
                    t.lines = 0;
                    t.next = now + t.minInterval;
                }
            });
        }, 1 * SECOND);
    }
    fix(commands) {
        return (commands || []).map((cmd) => {
            if (cmd.command) {
                cmd.triggers = [newCommandTrigger(cmd.command, cmd.commandExact || false)];
                delete cmd.command;
            }
            cmd.variables = cmd.variables || [];
            cmd.variableChanges = cmd.variableChanges || [];
            if (cmd.action === 'text') {
                if (!Array.isArray(cmd.data.text)) {
                    cmd.data.text = [cmd.data.text];
                }
            }
            if (cmd.action === 'media') {
                cmd.data.minDurationMs = cmd.data.minDurationMs || 0;
                cmd.data.sound.volume = cmd.data.sound.volume || 100;
                if (!cmd.data.sound.urlpath && cmd.data.sound.file) {
                    cmd.data.sound.urlpath = `/uploads/${encodeURIComponent(cmd.data.sound.file)}`;
                }
                if (!cmd.data.image.urlpath && cmd.data.image.file) {
                    cmd.data.image.urlpath = `/uploads/${encodeURIComponent(cmd.data.image.file)}`;
                }
            }
            if (cmd.action === 'countdown') {
                cmd.data.actions = cmd.data.actions.map((action) => {
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
                cmd.action = 'dict_lookup';
                cmd.data = { lang: 'ja', phrase: '' };
            }
            cmd.triggers = cmd.triggers.map((trigger) => {
                trigger.data.minLines = parseInt(trigger.data.minLines, 10) || 0;
                if (trigger.data.minSeconds) {
                    trigger.data.minInterval = trigger.data.minSeconds * 1000;
                }
                return trigger;
            });
            return cmd;
        });
    }
    reinit() {
        const data = this.bot.getUserModuleStorage(this.user).load(this.name, {
            commands: [],
            settings: {
                volume: 100,
            },
            adminSettings: {
                showImages: true,
            },
        });
        data.commands = this.fix(data.commands);
        if (!data.adminSettings) {
            data.adminSettings = {};
        }
        if (typeof data.adminSettings.showImages === 'undefined') {
            data.adminSettings.showImages = true;
        }
        const commands = [];
        const timers = [];
        data.commands.forEach((cmd) => {
            if (cmd.triggers.length === 0) {
                return;
            }
            let cmdObj = null;
            switch (cmd.action) {
                case 'media_volume':
                    cmdObj = Object.assign({}, cmd, { fn: this.mediaVolumeCmd.bind(this) });
                    break;
                case 'madochan_createword':
                    cmdObj = Object.assign({}, cmd, { fn: madochanCreateWord(cmd) });
                    break;
                case 'dict_lookup':
                    cmdObj = Object.assign({}, cmd, { fn: dictLookup(cmd, this.bot, this.user) });
                    break;
                case 'text':
                    cmdObj = Object.assign({}, cmd, { fn: randomText(cmd, this.bot, this.user) });
                    break;
                case 'media':
                    cmdObj = Object.assign({}, cmd, { fn: playMedia(cmd, this.bot, this.user) });
                    break;
                case 'countdown':
                    cmdObj = Object.assign({}, cmd, { fn: countdown(cmd, this.bot, this.user) });
                    break;
                case 'chatters':
                    cmdObj = Object.assign({}, cmd, { fn: chatters(this.bot, this.user) });
                    break;
                case 'set_channel_title':
                    cmdObj = Object.assign({}, cmd, { fn: setChannelTitle(cmd, this.bot, this.user) });
                    break;
                case 'set_channel_game_id':
                    cmdObj = Object.assign({}, cmd, { fn: setChannelGameId(cmd, this.bot, this.user) });
                    break;
                case 'add_stream_tags':
                    cmdObj = Object.assign({}, cmd, { fn: addStreamTags(cmd, this.bot, this.user) });
                    break;
                case 'remove_stream_tags':
                    cmdObj = Object.assign({}, cmd, { fn: removeStreamTags(cmd, this.bot, this.user) });
                    break;
            }
            if (!cmdObj) {
                return;
            }
            for (const trigger of cmd.triggers) {
                if (trigger.type === 'first_chat') {
                    commands.push(cmdObj);
                }
                else if (trigger.type === 'command') {
                    // TODO: check why this if is required, maybe for protection against '' command?
                    if (trigger.data.command) {
                        commands.push(cmdObj);
                    }
                }
                else if (trigger.type === 'reward_redemption') {
                    // TODO: check why this if is required, maybe for protection against '' command?
                    if (trigger.data.command) {
                        commands.push(cmdObj);
                    }
                }
                else if (trigger.type === 'timer') {
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
        return { data, commands, timers };
    }
    getRoutes() {
        return {};
    }
    async _channelPointsCustomRewards() {
        const helixClient = this.bot.getUserTwitchClientManager(this.user).getHelixClient();
        if (helixClient) {
            return await helixClient.getAllChannelPointsCustomRewards();
        }
        return {};
    }
    wsdata(eventName) {
        return {
            event: eventName,
            data: {
                commands: this.data.commands,
                settings: this.data.settings,
                adminSettings: this.data.adminSettings,
                globalVariables: this.bot.getUserVariables(this.user).all(),
                channelPointsCustomRewards: this.channelPointsCustomRewards,
            },
        };
    }
    updateClient(eventName, ws) {
        this.bot.getWebSocketServer().notifyOne([this.user.id], this.name, this.wsdata(eventName), ws);
    }
    updateClients(eventName) {
        this.bot.getWebSocketServer().notifyAll([this.user.id], this.name, this.wsdata(eventName));
    }
    saveSettings() {
        this.bot.getUserModuleStorage(this.user).save(this.name, this.data);
        // no need for calling reinit, that would also recreate timers and stuff
        // but updating settings shouldnt mess with those
        this.updateClients('init');
    }
    saveCommands() {
        this.bot.getUserModuleStorage(this.user).save(this.name, this.data);
        const initData = this.reinit();
        this.data = initData.data;
        this.commands = initData.commands;
        this.timers = initData.timers;
        this.updateClients('init');
    }
    getWsEvents() {
        return {
            'conn': async (ws) => {
                this.channelPointsCustomRewards = await this._channelPointsCustomRewards();
                this.updateClient('init', ws);
            },
            'save': (ws, data) => {
                this.data.commands = this.fix(data.commands);
                this.data.settings = data.settings;
                this.data.adminSettings = data.adminSettings;
                this.saveCommands();
            },
        };
    }
    volume(vol) {
        if (vol < 0) {
            vol = 0;
        }
        if (vol > 100) {
            vol = 100;
        }
        this.data.settings.volume = parseInt(`${vol}`, 10);
        this.saveSettings();
    }
    async mediaVolumeCmd(command, client, target, _context, _msg) {
        if (!client || !command) {
            return;
        }
        const say = fn.sayFn(client, target);
        if (command.args.length === 0) {
            say(`Current volume: ${this.data.settings.volume}`);
        }
        else {
            this.volume(parseInt(command.args[0], 10));
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
    async onRewardRedemption(_RewardRedemptionContext) {
        // pass
    }
}

const log$3 = logger('Youtube.ts');
const get = async (url, args) => {
    args.key = config.modules.sr.google.api_key;
    return await getJson(url + asQueryArgs(args));
};
const fetchDataByYoutubeId = async (youtubeId) => {
    const json = await get('https://www.googleapis.com/youtube/v3/videos', {
        part: 'snippet,status,contentDetails',
        id: youtubeId,
        fields: 'items(id,snippet,status,contentDetails)',
    });
    return json.items[0] || null;
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
            log$3.info(e);
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
    name: obj?.name || '',
    css: obj?.css || '',
    showProgressBar: typeof obj?.showProgressBar === 'undefined' ? false : obj.showProgressBar,
    showThumbnails: typeof obj?.showThumbnails === 'undefined' || obj.showThumbnails === true ? 'left' : obj.showThumbnails,
    maxItemsShown: typeof obj?.maxItemsShown === 'undefined' ? -1 : obj.maxItemsShown,
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
    volume: typeof obj?.volume === 'undefined' ? 100 : obj.volume,
    initAutoplay: typeof obj?.initAutoplay === 'undefined' ? true : obj.initAutoplay,
    hideVideoImage: {
        file: obj?.hideVideoImage?.file || '',
        filename: obj?.hideVideoImage?.filename || '',
        urlpath: obj?.hideVideoImage?.urlpath ? obj.hideVideoImage.urlpath : (obj?.hideVideoImage?.file ? `/uploads/${encodeURIComponent(obj.hideVideoImage.file)}` : '')
    },
    maxSongLength: {
        viewer: typeof obj?.maxSongLength === 'undefined' ? 0 : obj?.maxSongLength.viewer,
        mod: typeof obj?.maxSongLength === 'undefined' ? 0 : obj?.maxSongLength.mod,
        sub: typeof obj?.maxSongLength === 'undefined' ? 0 : obj?.maxSongLength.sub,
    },
    maxSongsQueued: {
        viewer: typeof obj?.maxSongsQueued === 'undefined' ? 0 : parseInt(obj?.maxSongsQueued.viewer, 10),
        mod: typeof obj?.maxSongsQueued === 'undefined' ? 0 : parseInt(obj?.maxSongsQueued.mod, 10),
        sub: typeof obj?.maxSongsQueued === 'undefined' ? 0 : parseInt(obj?.maxSongsQueued.sub, 10),
    },
    customCss: obj?.customCss || '',
    customCssPresets: typeof obj?.customCssPresets === 'undefined' ? [] : obj.customCssPresets.map(default_custom_css_preset),
    showProgressBar: typeof obj?.showProgressBar === 'undefined' ? false : obj.showProgressBar,
    showThumbnails: typeof obj?.showThumbnails === 'undefined' || obj.showThumbnails === true ? 'left' : obj.showThumbnails,
    maxItemsShown: typeof obj?.maxItemsShown === 'undefined' ? -1 : obj.maxItemsShown,
});

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
        this.bot = bot;
        this.user = user;
        const initData = this.reinit();
        this.data = {
            filter: initData.data.filter,
            playlist: initData.data.playlist,
            commands: initData.data.commands,
            settings: initData.data.settings,
            stacks: initData.data.stacks,
        };
        this.commands = initData.commands;
    }
    async userChanged(user) {
        this.user = user;
    }
    reinit() {
        const data = this.bot.getUserModuleStorage(this.user).load(this.name, {
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
        return {
            data: {
                playlist: data.playlist,
                settings: data.settings,
                commands: data.commands,
                filter: data.filter,
                stacks: data.stacks,
            },
            commands: this.initCommands(data.commands),
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
    save() {
        this.bot.getUserModuleStorage(this.user).save(this.name, {
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
    wsdata(eventName) {
        return {
            event: eventName,
            data: {
                // ommitting youtube cache data and stacks
                filter: this.data.filter,
                playlist: this.data.playlist,
                settings: this.data.settings,
                commands: this.data.commands,
                globalVariables: this.bot.getUserVariables(this.user).all(),
                channelPointsCustomRewards: this.channelPointsCustomRewards,
            }
        };
    }
    updateClient(eventName, ws) {
        this.bot.getWebSocketServer().notifyOne([this.user.id], this.name, this.wsdata(eventName), ws);
    }
    updateClients(eventName) {
        this.bot.getWebSocketServer().notifyAll([this.user.id], this.name, this.wsdata(eventName));
    }
    async _channelPointsCustomRewards() {
        const helixClient = this.bot.getUserTwitchClientManager(this.user).getHelixClient();
        if (helixClient) {
            return await helixClient.getAllChannelPointsCustomRewards();
        }
        return {};
    }
    getWsEvents() {
        return {
            'conn': async (ws) => {
                this.channelPointsCustomRewards = await this._channelPointsCustomRewards();
                this.updateClient('init', ws);
            },
            'play': (_ws, { id }) => {
                const idx = this.data.playlist.findIndex(item => item.id === id);
                if (idx < 0) {
                    return;
                }
                this.data.playlist = [].concat(this.data.playlist.slice(idx), this.data.playlist.slice(0, idx));
                this.incStat('plays');
                this.data.playlist[idx].last_play = new Date().getTime();
                this.save();
                this.updateClients('playIdx');
            },
            'ended': (_ws) => {
                const item = this.data.playlist.shift();
                if (item) {
                    this.data.playlist.push(item);
                }
                this.save();
                this.updateClients('onEnded');
            },
            'save': (_ws, data) => {
                this.data.commands = data.commands;
                this.data.settings = data.settings;
                this.save();
                const initData = this.reinit();
                this.data = initData.data;
                this.commands = initData.commands;
                this.updateClients('save');
            },
            'ctrl': (_ws, { ctrl, args }) => {
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
                        this.prev();
                        break;
                    case 'skip':
                        this.next();
                        break;
                    case 'resetStats':
                        this.resetStats();
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
                        this.videoVisibility(...args);
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
            if (isTooLong(tmpYoutubeData)) {
                return { addType: ADD_TYPE.NOT_ADDED, idx: -1, reason: NOT_ADDED_REASON.TOO_LONG };
            }
            youtubeId = tmpYoutubeId;
            youtubeData = tmpYoutubeData;
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
    videoVisibility(visible, idx = -1) {
        if (idx === -1) {
            idx = this.determineFirstIndex();
        }
        if (idx === -1) {
            return;
        }
        if (this.data.playlist.length > idx) {
            this.data.playlist[idx].hidevideo = visible ? false : true;
        }
        this.save();
        this.updateClients('video');
    }
    async durationUntilIndex(idx) {
        if (idx <= 0) {
            return 0;
        }
        let durationTotalMs = 0;
        for (const item of this.data.playlist.slice(0, idx)) {
            const d = await this.loadYoutubeData(item.yt);
            durationTotalMs += fn.parseISO8601Duration(d.contentDetails.duration);
        }
        return durationTotalMs;
    }
    async stats(userName) {
        const countTotal = this.data.playlist.length;
        let durationTotal = 0;
        if (countTotal > 0) {
            for (const item of this.data.playlist) {
                const d = await this.loadYoutubeData(item.yt);
                durationTotal += fn.parseISO8601Duration(d.contentDetails.duration);
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
    resetStats() {
        this.data.playlist = this.data.playlist.map(item => {
            item.plays = 0;
            item.goods = 0;
            item.bads = 0;
            return item;
        });
        this.save();
        this.updateClients('stats');
    }
    playIdx(idx) {
        if (this.data.playlist.length === 0) {
            return;
        }
        while (idx-- > 0) {
            const item = this.data.playlist.shift();
            if (item) {
                this.data.playlist.push(item);
            }
        }
        this.save();
        this.updateClients('skip');
    }
    rmIdx(idx) {
        if (this.data.playlist.length === 0) {
            return;
        }
        this.data.playlist.splice(idx, 1);
        this.save();
        if (idx === 0) {
            this.updateClients('remove');
        }
        else {
            this.updateClients('init');
        }
    }
    resetStatIdx(stat, idx) {
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
        this.save();
        this.updateClients('stats');
    }
    goodIdx(idx) {
        this.incStat('goods', idx);
        this.save();
        this.updateClients('stats');
    }
    badIdx(idx) {
        this.incStat('bads', idx);
        this.save();
        this.updateClients('stats');
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
    like() {
        this.incStat('goods');
        this.save();
        this.updateClients('stats');
    }
    filter(filter) {
        this.data.filter = filter;
        this.save();
        this.updateClients('filter');
    }
    addTag(tag, idx = -1) {
        if (idx === -1) {
            idx = this.determineFirstIndex();
        }
        if (idx === -1) {
            return;
        }
        if (this.data.playlist.length > idx) {
            if (!this.data.playlist[idx].tags.includes(tag)) {
                this.data.playlist[idx].tags.push(tag);
                this.save();
                this.updateClients('tags');
            }
        }
    }
    updateTag(oldTag, newTag) {
        this.data.playlist = this.data.playlist.map(item => {
            item.tags = [...new Set(item.tags.map(tag => {
                    return tag === oldTag ? newTag : tag;
                }))];
            return item;
        });
        this.save();
        this.updateClients('tags');
    }
    rmTag(tag, idx = -1) {
        if (idx === -1) {
            idx = this.determineFirstIndex();
        }
        if (idx === -1) {
            return;
        }
        if (this.data.playlist.length > idx) {
            if (this.data.playlist[idx].tags.includes(tag)) {
                this.data.playlist[idx].tags = this.data.playlist[idx].tags.filter(t => t !== tag);
                this.save();
                this.updateClients('tags');
            }
        }
    }
    volume(vol) {
        if (vol < 0) {
            vol = 0;
        }
        if (vol > 100) {
            vol = 100;
        }
        this.data.settings.volume = parseInt(`${vol}`, 10);
        this.save();
        this.updateClients('settings');
    }
    pause() {
        this.updateClients('pause');
    }
    unpause() {
        this.updateClients('unpause');
    }
    loop() {
        this.updateClients('loop');
    }
    noloop() {
        this.updateClients('noloop');
    }
    dislike() {
        this.incStat('bads');
        this.save();
        this.updateClients('stats');
    }
    settings(settings) {
        this.data.settings = settings;
        this.save();
        this.updateClients('settings');
    }
    prev() {
        const index = this.determinePrevIndex();
        if (index >= 0) {
            this.playIdx(index);
        }
    }
    next() {
        const index = this.determineNextIndex();
        if (index >= 0) {
            this.playIdx(index);
        }
    }
    jumptonew() {
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
        this.save();
        this.updateClients('skip');
    }
    clear() {
        this.data.playlist = [];
        this.save();
        this.updateClients('init');
    }
    setAllToPlayed() {
        this.data.playlist = this.data.playlist.map(item => {
            item.plays = item.plays || 1;
            return item;
        });
        this.save();
        this.updateClients('init');
    }
    shuffle() {
        if (this.data.playlist.length < 3) {
            return;
        }
        const rest = this.data.playlist.slice(1);
        this.data.playlist = [
            this.data.playlist[0],
            ...shuffle(rest.filter(item => item.plays === 0)),
            ...shuffle(rest.filter(item => item.plays > 0)),
        ];
        this.save();
        this.updateClients('shuffle');
    }
    move(oldIndex, newIndex) {
        if (oldIndex >= this.data.playlist.length) {
            return;
        }
        if (newIndex >= this.data.playlist.length) {
            return;
        }
        this.data.playlist = arrayMove(this.data.playlist, oldIndex, newIndex);
        this.save();
        this.updateClients('move');
    }
    remove() {
        if (this.data.playlist.length === 0) {
            return;
        }
        this.data.playlist.shift();
        this.save();
        this.updateClients('remove');
    }
    undo(username) {
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
        this.rmIdx(idx);
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
        return async (command, client, target, context, _msg) => {
            if (!client || !command || !context) {
                return;
            }
            const say = fn.sayFn(client, target);
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
        return async (command, client, target, context, _msg) => {
            if (!client || !command || !context) {
                return;
            }
            const say = fn.sayFn(client, target);
            const undid = this.undo(context['display-name']);
            if (!undid) {
                say(`Could not undo anything`);
            }
            else {
                say(`Removed "${undid.title}" from the playlist!`);
            }
        };
    }
    cmdResr(_originalCommand) {
        return async (command, client, target, context, _msg) => {
            if (!client || !command || !context) {
                return;
            }
            const say = fn.sayFn(client, target);
            if (command.args.length === 0) {
                say(`Usage: !resr SEARCH`);
                return;
            }
            const searchterm = command.args.join(' ');
            const addResponseData = await this.resr(searchterm);
            say(await this.answerAddRequest(addResponseData));
        };
    }
    cmdSrGood(_originalCommand) {
        return async (_command, _client, _target, _context, _msg) => {
            this.like();
        };
    }
    cmdSrBad(_originalCommand) {
        return async (_command, _client, _target, _context, _msg) => {
            this.dislike();
        };
    }
    cmdSrStats(_originalCommand) {
        return async (command, client, target, context, _msg) => {
            if (!client || !command || !context) {
                return;
            }
            const say = fn.sayFn(client, target);
            const stats = await this.stats(context['display-name']);
            let number = `${stats.count.byUser}`;
            const verb = stats.count.byUser === 1 ? 'was' : 'were';
            if (stats.count.byUser === 1) {
                number = 'one';
            }
            else if (stats.count.byUser === 0) {
                number = 'none';
            }
            const countStr = `There are ${stats.count.total} songs in the playlist, `
                + `${number} of which ${verb} requested by ${context['display-name']}.`;
            const durationStr = `The total duration of the playlist is ${stats.duration.human}.`;
            say([countStr, durationStr].join(' '));
        };
    }
    cmdSrPrev(_originalCommand) {
        return async (_command, _client, _target, _context, _msg) => {
            this.prev();
        };
    }
    cmdSrNext(_originalCommand) {
        return async (_command, _client, _target, _context, _msg) => {
            this.next();
        };
    }
    cmdSrJumpToNew(_originalCommand) {
        return async (_command, _client, _target, _context, _msg) => {
            this.jumptonew();
        };
    }
    cmdSrClear(_originalCommand) {
        return async (_command, _client, _target, _context, _msg) => {
            this.clear();
        };
    }
    cmdSrRm(_originalCommand) {
        return async (_command, _client, _target, _context, _msg) => {
            this.remove();
        };
    }
    cmdSrShuffle(_originalCommand) {
        return async (_command, _client, _target, _context, _msg) => {
            this.shuffle();
        };
    }
    cmdSrResetStats(_originalCommand) {
        return async (_command, _client, _target, _context, _msg) => {
            this.resetStats();
        };
    }
    cmdSrLoop(_originalCommand) {
        return async (_command, client, target, _context, _msg) => {
            if (!client) {
                return;
            }
            const say = fn.sayFn(client, target);
            this.loop();
            say('Now looping the current song');
        };
    }
    cmdSrNoloop(_originalCommand) {
        return async (_command, client, target, _context, _msg) => {
            if (!client) {
                return;
            }
            const say = fn.sayFn(client, target);
            this.noloop();
            say('Stopped looping the current song');
        };
    }
    cmdSrAddTag(originalCmd) {
        return async (command, client, target, context, _msg) => {
            if (!client || !command) {
                return;
            }
            const variables = this.bot.getUserVariables(this.user);
            let tag = originalCmd.data?.tag || '$args';
            tag = await fn.doReplacements(tag, command, context, variables, originalCmd, this.bot, this.user);
            if (tag === "") {
                return;
            }
            const say = fn.sayFn(client, target);
            this.addTag(tag);
            say(`Added tag "${tag}"`);
        };
    }
    cmdSrRmTag(_originalCommand) {
        return async (command, client, target, _context, _msg) => {
            if (!client || !command) {
                return;
            }
            if (!command.args.length) {
                return;
            }
            const say = fn.sayFn(client, target);
            const tag = command.args.join(' ');
            this.rmTag(tag);
            say(`Removed tag "${tag}"`);
        };
    }
    cmdSrPause(_originalCommand) {
        return async (_command, _client, _target, _context, _msg) => {
            this.pause();
        };
    }
    cmdSrUnpause(_originalCommand) {
        return async (_command, _client, _target, _context, _msg) => {
            this.unpause();
        };
    }
    cmdSrVolume(_originalCommand) {
        return async (command, client, target, _context, _msg) => {
            if (!client || !command) {
                return;
            }
            const say = fn.sayFn(client, target);
            if (command.args.length === 0) {
                say(`Current volume: ${this.data.settings.volume}`);
            }
            else {
                this.volume(parseInt(command.args[0], 10));
                say(`New volume: ${this.data.settings.volume}`);
            }
        };
    }
    cmdSrHidevideo(_originalCommand) {
        return async (_command, client, target, _context, _msg) => {
            if (!client) {
                return;
            }
            const say = fn.sayFn(client, target);
            this.videoVisibility(false);
            say(`Video is now hidden.`);
        };
    }
    cmdSrShowvideo(_originalCommand) {
        return async (_command, client, target, _context, _msg) => {
            if (!client) {
                return;
            }
            const say = fn.sayFn(client, target);
            this.videoVisibility(true);
            say(`Video is now shown.`);
        };
    }
    cmdSrFilter(_originalCommand) {
        return async (command, client, target, context, _msg) => {
            if (!client || !command || !context) {
                return;
            }
            const say = fn.sayFn(client, target);
            const tag = command.args.join(' ');
            this.filter({ tag });
            if (tag !== '') {
                say(`Playing only songs tagged with "${tag}"`);
            }
            else {
                say(`Playing all songs`);
            }
        };
    }
    cmdSrQueue(_originalCommand) {
        return async (_command, client, target, _context, _msg) => {
            if (!client) {
                return;
            }
            const say = fn.sayFn(client, target);
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
        return async (command, client, target, context, _msg) => {
            if (!client || !command || !context) {
                return;
            }
            const say = fn.sayFn(client, target);
            const presetName = command.args.join(' ');
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
                this.updateClients('settings');
            }
        };
    }
    cmdSr(_originalCommand) {
        return async (command, client, target, context, _msg) => {
            if (!client || !command || !context) {
                return;
            }
            const say = fn.sayFn(client, target);
            if (command.args.length === 0) {
                say(`Usage: !sr YOUTUBE-URL`);
                return;
            }
            const str = command.args.join(' ');
            let maxLenMs;
            let maxQueued;
            if (isBroadcaster(context)) {
                maxLenMs = 0;
                maxQueued = 0;
            }
            else if (isMod(context)) {
                maxLenMs = parseHumanDuration(this.data.settings.maxSongLength.mod);
                maxQueued = this.data.settings.maxSongsQueued.mod;
            }
            else if (isSubscriber(context)) {
                maxLenMs = parseHumanDuration(this.data.settings.maxSongLength.sub);
                maxQueued = this.data.settings.maxSongsQueued.sub;
            }
            else {
                maxLenMs = parseHumanDuration(this.data.settings.maxSongLength.viewer);
                maxQueued = this.data.settings.maxSongsQueued.viewer;
            }
            const addResponseData = await this.add(str, context['display-name'], maxLenMs, maxQueued);
            say(await this.answerAddRequest(addResponseData));
        };
    }
    async loadYoutubeData(youtubeId) {
        const key = `youtubeData_${youtubeId}_20210717_2`;
        let d = this.bot.getCache().get(key);
        if (!d) {
            d = await Youtube.fetchDataByYoutubeId(youtubeId);
            this.bot.getCache().set(key, d);
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
            this.save();
            this.updateClients('add');
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
        this.save();
        this.updateClients('add');
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
        this.save();
        this.updateClients('add');
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
    async onRewardRedemption(_RewardRedemptionContext) {
        // pass
    }
}

class VoteModule {
    constructor(bot, user) {
        this.name = 'vote';
        this.bot = bot;
        this.user = user;
        this.storage = bot.getUserModuleStorage(user);
        this.data = this.reinit();
    }
    async userChanged(_user) {
        // pass
    }
    reinit() {
        const data = this.storage.load(this.name, {
            votes: {},
        });
        return data;
    }
    save() {
        this.storage.save(this.name, {
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
    vote(type, thing, client, target, context) {
        const say = fn.sayFn(client, target);
        this.data.votes[type] = this.data.votes[type] || {};
        this.data.votes[type][context['display-name']] = thing;
        say(`Thanks ${context['display-name']}, registered your "${type}" vote: ${thing}`);
        this.save();
    }
    async playCmd(command, client, target, context, _msg) {
        if (!client || !command || !context || !target) {
            return;
        }
        const say = fn.sayFn(client, target);
        if (command.args.length === 0) {
            say(`Usage: !play THING`);
            return;
        }
        const thing = command.args.join(' ');
        const type = 'play';
        this.vote(type, thing, client, target, context);
    }
    async voteCmd(command, client, target, context, _msg) {
        if (!client || !command || !context || !target) {
            return;
        }
        const say = fn.sayFn(client, target);
        // maybe open up for everyone, but for now use dedicated
        // commands like !play THING
        if (!isMod(context) && !isBroadcaster(context)) {
            say('Not allowed to execute !vote command');
        }
        if (command.args.length < 2) {
            say(`Usage: !vote TYPE THING`);
            return;
        }
        if (command.args[0] === 'show') {
            const type = command.args[1];
            if (!this.data.votes[type]) {
                say(`No votes for "${type}".`);
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
        if (command.args[0] === 'clear') {
            if (!isBroadcaster(context)) {
                say('Not allowed to execute !vote clear');
            }
            const type = command.args[1];
            if (this.data.votes[type]) {
                delete this.data.votes[type];
            }
            this.save();
            say(`Cleared votes for "${type}". ✨`);
            return;
        }
        const type = command.args[0];
        const thing = command.args.slice(1).join(' ');
        this.vote(type, thing, client, target, context);
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
    async onRewardRedemption(_RewardRedemptionContext) {
        // pass
    }
}

const default_settings$3 = () => ({
    status: {
        enabled: false,
    },
    styles: {
        // page background color
        bgColor: '#ff00ff',
        // vertical align of text
        vAlign: 'bottom',
        // recognized text
        recognition: {
            fontFamily: 'sans-serif',
            fontSize: '30pt',
            fontWeight: '400',
            strokeWidth: '8pt',
            strokeColor: '#292929',
            color: '#ffff00',
        },
        // translated text
        translation: {
            fontFamily: 'sans-serif',
            fontSize: '30pt',
            fontWeight: '400',
            strokeWidth: '8pt',
            strokeColor: '#292929',
            color: '#cbcbcb',
        }
    },
    recognition: {
        display: true,
        lang: 'ja',
        synthesize: false,
        synthesizeLang: '',
    },
    translation: {
        enabled: true,
        langSrc: 'ja',
        langDst: 'en',
        synthesize: false,
        synthesizeLang: '',
    },
});

class SpeechToTextModule {
    constructor(bot, user) {
        this.name = 'speech-to-text';
        this.bot = bot;
        this.user = user;
        this.defaultSettings = default_settings$3();
        this.data = this.reinit();
    }
    async userChanged(user) {
        this.user = user;
    }
    reinit() {
        const data = this.bot.getUserModuleStorage(this.user).load(this.name, {
            settings: this.defaultSettings
        });
        return data;
    }
    saveCommands() {
        // pass
    }
    getRoutes() {
        return {};
    }
    wsdata(eventName) {
        return {
            event: eventName,
            data: this.data,
        };
    }
    updateClient(eventName, ws) {
        this.bot.getWebSocketServer().notifyOne([this.user.id], this.name, this.wsdata(eventName), ws);
    }
    updateClients(eventName) {
        this.bot.getWebSocketServer().notifyAll([this.user.id], this.name, this.wsdata(eventName));
    }
    getWsEvents() {
        return {
            'onVoiceResult': async (ws, { text }) => {
                let translated = '';
                if (this.data.settings.translation.enabled) {
                    const scriptId = config.modules.speechToText.google.scriptId;
                    const query = `https://script.google.com/macros/s/${scriptId}/exec` + asQueryArgs({
                        text: text,
                        source: this.data.settings.translation.langSrc,
                        target: this.data.settings.translation.langDst,
                    });
                    translated = await getText(query);
                }
                this.bot.getWebSocketServer().notifyAll([this.user.id], this.name, {
                    event: 'text',
                    data: {
                        recognized: text,
                        translated: translated,
                    },
                });
            },
            'conn': (ws) => {
                this.updateClient('init', ws);
            },
            'save': (ws, { settings }) => {
                this.data.settings = settings;
                this.bot.getUserModuleStorage(this.user).save(this.name, this.data);
                this.reinit();
                this.updateClients('init');
            },
        };
    }
    getCommands() {
        return [];
    }
    async onChatMsg(_chatMessageContext) {
        // pass
    }
    async onRewardRedemption(_rewardRedemptionContext) {
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
    submitButtonText: (!obj || typeof obj.submitButtonText === 'undefined') ? 'Submit' : obj.submitButtonText,
    // leave empty to not require confirm
    submitConfirm: (!obj || typeof obj.submitConfirm === 'undefined') ? '' : obj.submitConfirm,
    recentImagesTitle: (!obj || typeof obj.recentImagesTitle === 'undefined') ? '' : obj.recentImagesTitle,
    canvasWidth: (!obj || typeof obj.canvasWidth === 'undefined') ? 720 : obj.canvasWidth,
    canvasHeight: (!obj || typeof obj.canvasHeight === 'undefined') ? 405 : obj.canvasHeight,
    customDescription: (!obj || typeof obj.customDescription === 'undefined') ? '' : obj.customDescription,
    customProfileImage: (!obj || typeof obj.customProfileImage === 'undefined') ? null : default_profile_image(obj.customProfileImage),
    palette: (!obj || typeof obj.palette === 'undefined') ? [
        // row 1
        '#000000', '#808080', '#ff0000', '#ff8000', '#ffff00', '#00ff00',
        '#00ffff', '#0000ff', '#ff00ff', '#ff8080', '#80ff80',
        // row 2
        '#ffffff', '#c0c0c0', '#800000', '#804000', '#808000', '#008000',
        '#008080', '#000080', '#800080', '#8080ff', '#ffff80',
    ] : obj.palette,
    displayDuration: (!obj || typeof obj.displayDuration === 'undefined') ? 5000 : obj.displayDuration,
    displayLatestForever: (!obj || typeof obj.displayLatestForever === 'undefined') ? false : obj.displayLatestForever,
    displayLatestAutomatically: (!obj || typeof obj.displayLatestAutomatically === 'undefined') ? false : obj.displayLatestAutomatically,
    autofillLatest: (!obj || typeof obj.autofillLatest === 'undefined') ? false : obj.autofillLatest,
    notificationSound: (!obj || typeof obj.notificationSound === 'undefined') ? null : default_notification_sound(obj.notificationSound),
    favoriteLists: (!obj || typeof obj.favoriteLists === 'undefined')
        ? [{
                list: ((obj && obj.favorites) ? obj.favorites : []),
                title: ((obj && obj.favoriteImagesTitle) ? obj.favoriteImagesTitle : ''),
            }]
        : obj.favoriteLists,
});

class DrawcastModule {
    constructor(bot, user) {
        this.name = 'drawcast';
        this.bot = bot;
        this.user = user;
        this.data = this.reinit();
        this.images = this.loadAllImages().slice(0, 20);
    }
    async userChanged(user) {
        this.user = user;
    }
    loadAllImages() {
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
                .map((v) => `${rel}/${v.name}`);
        }
        catch (e) {
            return [];
        }
    }
    saveCommands() {
        // pass
    }
    reinit() {
        const data = this.bot.getUserModuleStorage(this.user).load(this.name, {});
        return {
            settings: default_settings$2(data.settings),
        };
    }
    getRoutes() {
        return {
            get: {
                '/api/drawcast/all-images/': async (_req, res, _next) => {
                    const images = this.loadAllImages();
                    res.send(images);
                },
            },
        };
    }
    drawUrl() {
        const pubToken = this.bot.getTokens().getPubTokenForUserId(this.user.id).token;
        return this.bot.getWebServer().pubUrl(this.bot.getWebServer().widgetUrl('drawcast_draw', pubToken));
    }
    wsdata(eventName) {
        return {
            event: eventName,
            data: Object.assign({}, this.data, {
                drawUrl: this.drawUrl(),
                images: this.images
            }),
        };
    }
    updateClient(eventName, ws) {
        this.bot.getWebSocketServer().notifyOne([this.user.id], this.name, this.wsdata(eventName), ws);
    }
    updateClients(eventName) {
        this.bot.getWebSocketServer().notifyAll([this.user.id], this.name, this.wsdata(eventName));
    }
    getWsEvents() {
        return {
            'conn': (ws) => {
                this.updateClient('init', ws);
            },
            'post': (ws, data) => {
                const rel = `/uploads/drawcast/${this.user.id}`;
                const img = fn.decodeBase64Image(data.data.img);
                const name = `${(new Date()).toJSON()}-${nonce(6)}.${fn.mimeToExt(img.type)}`;
                const path = `./data${rel}`;
                const imgpath = `${path}/${name}`;
                const imgurl = `${rel}/${name}`;
                fs.mkdirSync(path, { recursive: true });
                fs.writeFileSync(imgpath, img.data);
                this.images.unshift(imgurl);
                this.images = this.images.slice(0, 20);
                this.bot.getWebSocketServer().notifyAll([this.user.id], this.name, {
                    event: data.event,
                    data: { nonce: data.data.nonce, img: imgurl },
                });
            },
            'save': (ws, { settings }) => {
                this.data.settings = settings;
                this.bot.getUserModuleStorage(this.user).save(this.name, this.data);
                this.data = this.reinit();
                this.updateClients('init');
            },
        };
    }
    getCommands() {
        return [];
    }
    async onChatMsg(_chatMessageContext) {
        // pass
    }
    async onRewardRedemption(_RewardRedemptionContext) {
        // pass
    }
}

const default_avatar_definition = (def = null) => {
    const get = (obj, prop, val) => (obj ? (typeof obj[prop] === 'undefined' ? val : obj[prop]) : val);
    return {
        name: get(def, 'name', ''),
        width: get(def, 'width', 64),
        height: get(def, 'height', 64),
        stateDefinitions: get(def, 'stateDefinitions', []),
        slotDefinitions: get(def, 'slotDefinitions', []),
        state: get(def, 'state', { slots: {}, lockedState: '' })
    };
};
const default_settings$1 = () => ({
    styles: {
        // page background color
        bgColor: '#80ff00',
    },
    avatarDefinitions: []
});

const log$2 = logger('AvatarModule.ts');
class AvatarModule {
    constructor(bot, user) {
        this.name = 'avatar';
        this.defaultSettings = default_settings$1();
        this.defaultState = { tuberIdx: -1 };
        this.bot = bot;
        this.user = user;
        this.data = this.reinit();
    }
    async userChanged(user) {
        this.user = user;
    }
    save() {
        this.bot.getUserModuleStorage(this.user).save(this.name, this.data);
    }
    saveCommands() {
        // pass
    }
    reinit() {
        const data = this.bot.getUserModuleStorage(this.user).load(this.name, {
            settings: this.defaultSettings,
            state: this.defaultState,
        });
        if (!data.state) {
            data.state = this.defaultState;
        }
        if (!data.settings.styles) {
            data.settings.styles = this.defaultSettings.styles;
        }
        if (!data.settings.styles.bgColor) {
            data.settings.styles.bgColor = this.defaultSettings.styles.bgColor;
        }
        data.settings.avatarDefinitions = data.settings.avatarDefinitions.map((def) => {
            return default_avatar_definition(def);
        });
        return {
            settings: data.settings,
            state: data.state,
        };
    }
    getRoutes() {
        return {};
    }
    wsdata(event) {
        return { event, data: this.data };
    }
    updateClient(data, ws) {
        this.bot.getWebSocketServer().notifyOne([this.user.id], this.name, data, ws);
    }
    updateClients(data) {
        this.bot.getWebSocketServer().notifyAll([this.user.id], this.name, data);
    }
    getWsEvents() {
        return {
            'conn': (ws) => {
                this.updateClient(this.wsdata('init'), ws);
            },
            'save': (_ws, data) => {
                this.data.settings = data.settings;
                this.save();
                this.data = this.reinit();
                this.updateClients(this.wsdata('init'));
            },
            'ctrl': (_ws, data) => {
                if (data.data.ctrl === "setSlot") {
                    const tuberIdx = data.data.args[0];
                    const slotName = data.data.args[1];
                    const itemIdx = data.data.args[2];
                    try {
                        this.data.settings.avatarDefinitions[tuberIdx].state.slots[slotName] = itemIdx;
                        this.save();
                    }
                    catch (e) {
                        log$2.error('ws ctrl: unable to setSlot', tuberIdx, slotName, itemIdx);
                    }
                }
                else if (data.data.ctrl === "lockState") {
                    const tuberIdx = data.data.args[0];
                    const lockedState = data.data.args[1];
                    try {
                        this.data.settings.avatarDefinitions[tuberIdx].state.lockedState = lockedState;
                        this.save();
                    }
                    catch (e) {
                        log$2.error('ws ctrl: unable to lockState', tuberIdx, lockedState);
                    }
                }
                else if (data.data.ctrl === "setTuber") {
                    const tuberIdx = data.data.args[0];
                    this.data.state.tuberIdx = tuberIdx;
                    this.save();
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
    async onRewardRedemption(_RewardRedemptionContext) {
        // pass
    }
}

const default_effect = (obj = null) => ({
    chatMessage: (!obj || typeof obj.chatMessage === 'undefined') ? '' : obj.chatMessage,
    sound: (!obj || typeof obj.sound === 'undefined') ? { file: '', filename: '', urlpath: '', volume: 100 } : obj.sound,
});
const default_notification = (obj = null) => ({
    effect: (!obj || typeof obj.effect === 'undefined') ? default_effect() : default_effect(obj.effect),
    offsetMs: (!obj || typeof obj.offsetMs === 'undefined') ? '' : obj.offsetMs,
});
const default_settings = (obj = null) => ({
    fontFamily: (!obj || typeof obj.fontFamily === 'undefined') ? '' : obj.fontFamily,
    fontSize: (!obj || typeof obj.fontSize === 'undefined') ? '72px' : obj.fontSize,
    color: (!obj || typeof obj.color === 'undefined') ? '' : obj.color,
    timerFormat: (!obj || typeof obj.timerFormat === 'undefined') ? '{mm}:{ss}' : obj.timerFormat,
    showTimerWhenFinished: (!obj || typeof obj.showTimerWhenFinished === 'undefined') ? true : obj.showTimerWhenFinished,
    finishedText: (!obj || typeof obj.finishedText === 'undefined') ? '' : obj.finishedText,
    startEffect: (!obj || typeof obj.startEffect === 'undefined') ? default_effect() : default_effect(obj.startEffect),
    endEffect: (!obj || typeof obj.endEffect === 'undefined') ? default_effect() : default_effect(obj.endEffect),
    stopEffect: (!obj || typeof obj.stopEffect === 'undefined') ? default_effect() : default_effect(obj.stopEffect),
    notifications: (!obj || typeof obj.notifications === 'undefined') ? [] : obj.notifications.map(default_notification),
});
const default_state = (obj = null) => ({
    running: (!obj || typeof obj.running === 'undefined') ? false : obj.running,
    durationMs: (!obj || typeof obj.durationMs === 'undefined') ? (25 * 60 * 1000) : obj.durationMs,
    startTs: (!obj || typeof obj.startTs === 'undefined') ? '' : obj.startTs,
    doneTs: (!obj || typeof obj.doneTs === 'undefined') ? '' : obj.doneTs,
    name: (!obj || typeof obj.name === 'undefined') ? '' : obj.name,
});

const log$1 = logger('PomoModule.ts');
class PomoModule {
    constructor(bot, user) {
        this.name = 'pomo';
        this.timeout = null;
        this.bot = bot;
        this.user = user;
        this.data = this.reinit();
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
                fn: this.cmdPomoEnd.bind(this),
            },
        ];
    }
    async replaceText(text, command, context) {
        const variables = this.bot.getUserVariables(this.user);
        text = await doReplacements(text, command, context, variables, null, this.bot, this.user);
        text = text.replace(/\$pomo\.duration/g, humanDuration(this.data.state.durationMs, [' ms', ' s', ' min', ' hours', ' days']));
        text = text.replace(/\$pomo\.name/g, this.data.state.name);
        return text;
    }
    tick(command, context) {
        if (this.timeout) {
            clearTimeout(this.timeout);
            this.timeout = null;
        }
        this.timeout = setTimeout(async () => {
            if (!this.data || !this.data.state.startTs) {
                return null;
            }
            const client = this.bot.getUserTwitchClientManager(this.user).getChatClient();
            const say = client ? fn.sayFn(client, null) : ((msg) => { log$1.info('say(), client not set, msg', msg); });
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
                        if (n.effect.chatMessage) {
                            say(await this.replaceText(n.effect.chatMessage, command, context));
                        }
                        this.updateClients({ event: 'effect', data: n.effect });
                    }
                }
                else {
                    anyNotificationsLeft = true;
                }
            }
            if (dateEnd < now) {
                // is over and should maybe be triggered!
                if (!doneDate || dateEnd > doneDate) {
                    if (this.data.settings.endEffect.chatMessage) {
                        say(await this.replaceText(this.data.settings.endEffect.chatMessage, command, context));
                    }
                    this.updateClients({ event: 'effect', data: this.data.settings.endEffect });
                }
            }
            else {
                anyNotificationsLeft = true;
            }
            this.data.state.doneTs = JSON.stringify(now);
            this.save();
            if (anyNotificationsLeft && this.data.state.running) {
                this.tick(command, context);
            }
        }, 1000);
    }
    async cmdPomoStart(command, client, target, context, _msg) {
        const say = client ? fn.sayFn(client, target) : ((msg) => { log$1.info('say(), client not set, msg', msg); });
        this.data.state.running = true;
        this.data.state.startTs = JSON.stringify(new Date());
        this.data.state.doneTs = this.data.state.startTs;
        // todo: parse args and use that
        this.data.state.name = command?.args.slice(1).join(' ') || '';
        let duration = command?.args[0] || '25m';
        duration = duration.match(/^\d+$/) ? `${duration}m` : duration;
        this.data.state.durationMs = parseHumanDuration(duration);
        this.save();
        this.tick(command, context);
        this.updateClients(this.wsdata('init'));
        if (this.data.settings.startEffect.chatMessage) {
            say(await this.replaceText(this.data.settings.startEffect.chatMessage, command, context));
        }
        this.updateClients({ event: 'effect', data: this.data.settings.startEffect });
    }
    async cmdPomoEnd(command, client, target, context, _msg) {
        const say = client ? fn.sayFn(client, target) : ((msg) => { log$1.info('say(), client not set, msg', msg); });
        this.data.state.running = false;
        this.save();
        this.tick(command, context);
        this.updateClients(this.wsdata('init'));
        if (this.data.settings.stopEffect.chatMessage) {
            say(await this.replaceText(this.data.settings.stopEffect.chatMessage, command, context));
        }
        this.updateClients({ event: 'effect', data: this.data.settings.stopEffect });
    }
    async userChanged(user) {
        this.user = user;
    }
    save() {
        this.bot.getUserModuleStorage(this.user).save(this.name, this.data);
    }
    saveCommands() {
        // pass
    }
    reinit() {
        const data = this.bot.getUserModuleStorage(this.user).load(this.name, {});
        return {
            settings: default_settings(data.settings),
            state: default_state(data.state),
        };
    }
    getRoutes() {
        return {};
    }
    wsdata(event) {
        return { event, data: this.data };
    }
    updateClient(data, ws) {
        this.bot.getWebSocketServer().notifyOne([this.user.id], this.name, data, ws);
    }
    updateClients(data) {
        this.bot.getWebSocketServer().notifyAll([this.user.id], this.name, data);
    }
    getWsEvents() {
        return {
            'conn': (ws) => {
                this.updateClient(this.wsdata('init'), ws);
            },
            'save': (_ws, data) => {
                this.data.settings = data.settings;
                this.save();
                this.data = this.reinit();
                this.updateClients(this.wsdata('init'));
            },
        };
    }
    getCommands() {
        return this.commands;
    }
    async onChatMsg(_chatMessageContext) {
        // pass
    }
    async onRewardRedemption(_RewardRedemptionContext) {
        // pass
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
const db = new Db(config.db);
// make sure we are always on latest db version
db.patch(false);
const userRepo = new Users(db);
const tokenRepo = new Tokens(db);
const twitchChannelRepo = new TwitchChannels(db);
const cache = new Cache(db);
const auth = new Auth(userRepo, tokenRepo);
const mail = new Mail(config.mail);
const eventHub = mitt();
const moduleManager = new ModuleManager();
const webSocketServer = new WebSocketServer(moduleManager, config.ws, auth);
const webServer = new WebServer(eventHub, db, userRepo, tokenRepo, mail, twitchChannelRepo, moduleManager, config.http, config.twitch, webSocketServer, auth);
class BotImpl {
    constructor() {
        this.userVariableInstances = {};
        this.userModuleStorageInstances = {};
        this.userTwitchClientManagerInstances = {};
        // pass
    }
    getModuleManager() { return moduleManager; }
    getDb() { return db; }
    getTokens() { return tokenRepo; }
    getCache() { return cache; }
    getWebServer() { return webServer; }
    getWebSocketServer() { return webSocketServer; }
    // user specific
    // -----------------------------------------------------------------
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
            this.userTwitchClientManagerInstances[user.id] = new TwitchClientManager(this, user, config.twitch, twitchChannelRepo);
        }
        return this.userTwitchClientManagerInstances[user.id];
    }
}
const bot = new BotImpl();
const run = async () => {
    // this function may only be called once per user!
    // changes to user will be handled by user_changed event
    const initForUser = async (user) => {
        const clientManager = bot.getUserTwitchClientManager(user);
        await clientManager.init('init');
        for (const moduleClass of modules) {
            moduleManager.add(user.id, new moduleClass(bot, user));
        }
        eventHub.on('user_changed', async (changedUser /* User */) => {
            if (changedUser.id === user.id) {
                await clientManager.userChanged(changedUser);
                for (const mod of moduleManager.all(user.id)) {
                    await mod.userChanged(changedUser);
                }
            }
        });
        const sendStatus = async () => {
            const client = clientManager.getHelixClient();
            if (!client) {
                setTimeout(sendStatus, 5000);
                return;
            }
            // if the user is not connected through a websocket atm, dont
            // try to validate oauth tokens
            if (webSocketServer.sockets([user.id]).length === 0) {
                setTimeout(sendStatus, 5000);
                return;
            }
            const problems = [];
            const twitchChannels = twitchChannelRepo.allByUserId(user.id);
            for (const twitchChannel of twitchChannels) {
                if (!twitchChannel.access_token) {
                    continue;
                }
                const resp = await client.validateOAuthToken(twitchChannel.channel_id, twitchChannel.access_token);
                if (!resp.valid) {
                    log.error(`Unable to validate OAuth token. user: ${user.name}: channel ${twitchChannel.channel_name}`);
                    log.error(resp.data);
                    problems.push(`Access token for channel ${twitchChannel.channel_name} is invalid.`);
                }
            }
            const data = { event: 'status', data: { problems } };
            webSocketServer.notifyAll([user.id], 'core', data);
            setTimeout(sendStatus, 5000);
        };
        sendStatus();
    };
    webSocketServer.listen();
    await webServer.listen();
    // one for each user
    for (const user of userRepo.all()) {
        await initForUser(user);
    }
    eventHub.on('user_registration_complete', async (user /* User */) => {
        await initForUser(user);
    });
};
run();
const gracefulShutdown = (signal) => {
    log.info(`${signal} received...`);
    log.info('shutting down webserver...');
    webServer.close();
    log.info('shutting down websocketserver...');
    webSocketServer.close();
    log.info('shutting down...');
    process.exit();
};
// used by nodemon
process.once('SIGUSR2', function () {
    gracefulShutdown('SIGUSR2');
});
process.once('SIGINT', function (code) {
    gracefulShutdown('SIGINT');
});
process.once('SIGTERM', function (code) {
    gracefulShutdown('SIGTERM');
});
