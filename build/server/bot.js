import fs, { readFileSync, promises } from 'fs';
import crypto from 'crypto';
import path, { dirname } from 'path';
import fetch from 'node-fetch';
import WebSocket from 'ws';
import { fileURLToPath } from 'url';
import cookieParser from 'cookie-parser';
import express from 'express';
import multer from 'multer';
import tmi from 'tmi.js';
import bsqlite from 'better-sqlite3';
import SibApiV3Sdk from 'sib-api-v3-sdk';

const init = () => {
    const configFile = process.env.APP_CONFIG || '';
    if (configFile === '') {
        process.exit(2);
    }
    return JSON.parse(String(readFileSync(configFile)));
};
const config = init();

function withHeaders(headers, opts = {}) {
    const options = opts || {};
    options.headers = (options.headers || {});
    for (let k in headers) {
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
    for (let k in data) {
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
const mustParseHumanDuration = (duration) => {
    if (duration === '') {
        throw new Error("unable to parse duration");
    }
    const d = `${duration}`.trim();
    if (!d) {
        throw new Error("unable to parse duration");
    }
    if (d.match(/^\d+$/)) {
        return parseInt(d, 10);
    }
    const m = d.match(/^(?:(\d+)d)?\s?(?:(\d+)h)?\s?(?:(\d+)m)?\s?(?:(\d+)s)?\s?(?:(\d+)ms)?$/);
    if (!m) {
        throw new Error("unable to parse duration");
    }
    const D = m[1] ? parseInt(m[1], 10) : 0;
    const H = m[2] ? parseInt(m[2], 10) : 0;
    const M = m[3] ? parseInt(m[3], 10) : 0;
    const S = m[4] ? parseInt(m[4], 10) : 0;
    const MS = m[5] ? parseInt(m[5], 10) : 0;
    return ((S * SECOND)
        + (M * MINUTE)
        + (H * HOUR)
        + (D * DAY)
        + (MS));
};
const parseHumanDuration = (duration) => {
    try {
        return mustParseHumanDuration(duration);
    }
    catch (e) {
        return 0;
    }
};
function arrayMove(arr, oldIndex, newIndex) {
    if (newIndex >= arr.length) {
        var k = newIndex - arr.length + 1;
        while (k--) {
            arr.push(undefined);
        }
    }
    arr.splice(newIndex, 0, arr.splice(oldIndex, 1)[0]);
    return arr; // return, but array is also modified in place
}
const split = (str, delimiter = ',', maxparts = -1) => {
    const split = str.split(delimiter);
    if (maxparts === -1) {
        return split;
    }
    if (split.length <= maxparts) {
        return split;
    }
    return [
        ...split.slice(0, maxparts - 1),
        split.slice(maxparts - 1).join(delimiter),
    ];
};
const shuffle = (array) => {
    let counter = array.length;
    // While there are elements in the array
    while (counter > 0) {
        // Pick a random index
        let index = Math.floor(Math.random() * counter);
        // Decrease counter by 1
        counter--;
        // And swap the last element with it
        let temp = array[counter];
        array[counter] = array[index];
        array[index] = temp;
    }
    return array;
};

// error | info | log | debug
const logLevel = config?.log?.level || 'info';
let logEnabled = []; // always log errors
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
const logger = (filename, ...pre) => {
    const b = path.basename(filename);
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
const log$7 = logger('fn.ts');
function mimeToExt(mime) {
    if (/image\//.test(mime)) {
        return mime.replace('image/', '');
    }
    return '';
}
function decodeBase64Image(base64Str) {
    const matches = base64Str.match(/^data:([A-Za-z-+\/]+);base64,(.+)$/);
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
function nonce(length) {
    let text = "";
    const possible = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789";
    for (let i = 0; i < length; i++) {
        text += possible.charAt(Math.floor(Math.random() * possible.length));
    }
    return text;
}
const fnRandom = (values) => () => getRandom(values);
const sleep = (ms) => {
    return new Promise((resolve, reject) => {
        setTimeout(resolve, ms);
    });
};
const isBroadcaster = (ctx) => ctx['room-id'] === ctx['user-id'];
const isMod = (ctx) => !!ctx.mod;
const isSubscriber = (ctx) => !!ctx.subscriber;
const sayFn = (client, target) => (msg) => {
    const targets = target ? [target] : client.channels;
    targets.forEach(t => {
        log$7.info(`saying in ${t}: ${msg}`);
        client.say(t, msg).catch((e) => { });
    });
};
const mayExecute = (context, cmd) => {
    if (!cmd.restrict_to || cmd.restrict_to.length === 0) {
        return true;
    }
    if (cmd.restrict_to.includes('mod') && isMod(context)) {
        return true;
    }
    if (cmd.restrict_to.includes('sub') && isSubscriber(context)) {
        return true;
    }
    if (cmd.restrict_to.includes('broadcaster') && isBroadcaster(context)) {
        return true;
    }
    return false;
};
const parseKnownCommandFromMessage = (msg, cmd) => {
    if (msg.startsWith(cmd + ' ') || msg === cmd) {
        const name = msg.substr(0, cmd.length).trim();
        const args = msg.substr(cmd.length).trim().split(' ').filter(s => !!s);
        return { name, args };
    }
    return null;
};
const parseCommandFromMessage = (msg) => {
    const command = msg.trim().split(' ');
    return { name: command[0], args: command.slice(1) };
};
const tryExecuteCommand = async (contextModule, rawCmd, cmdDefs, client, target, context, msg, variables) => {
    const promises = [];
    for (const cmdDef of cmdDefs) {
        if (!mayExecute(context, cmdDef)) {
            continue;
        }
        log$7.info(`${target}| * Executing ${rawCmd.name} command`);
        if (cmdDef.variableChanges) {
            for (const variableChange of cmdDef.variableChanges) {
                const op = variableChange.change;
                const name = await doReplacements(variableChange.name, rawCmd, context, variables, cmdDef);
                const value = await doReplacements(variableChange.value, rawCmd, context, variables, cmdDef);
                // check if there is a local variable for the change
                let idx = cmdDef.variables.findIndex(v => (v.name === name));
                if (idx !== -1) {
                    if (op === 'set') {
                        cmdDef.variables[idx].value = value;
                    }
                    else if (op === 'increase_by') {
                        cmdDef.variables[idx].value = (parseInt(cmdDef.variables[idx].value, 10)
                            + parseInt(value, 10));
                    }
                    else if (op === 'decrease_by') {
                        cmdDef.variables[idx].value = (parseInt(cmdDef.variables[idx].value, 10)
                            - parseInt(value, 10));
                    }
                    console.log(cmdDef.variables[idx].value);
                    //
                    continue;
                }
                const globalVars = contextModule.variables.all();
                idx = globalVars.findIndex(v => (v.name === name));
                if (idx !== -1) {
                    if (op === 'set') {
                        contextModule.variables.set(name, value);
                    }
                    else if (op === 'increase_by') {
                        contextModule.variables.set(name, (parseInt(globalVars[idx].value, 10)
                            + parseInt(value, 10)));
                    }
                    else if (op === 'decrease_by') {
                        contextModule.variables.set(name, (parseInt(globalVars[idx].value, 10)
                            - parseInt(value, 10)));
                    }
                    //
                    continue;
                }
            }
            contextModule.saveCommands();
        }
        const p = new Promise(async (resolve) => {
            const r = await cmdDef.fn(rawCmd, client, target, context, msg);
            if (r) {
                log$7.info(`${target}| * Returned: ${r}`);
            }
            log$7.info(`${target}| * Executed ${rawCmd.name} command`);
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
    const data = await Promise.all(promises);
    return str.replace(regex, () => data.shift());
}
const doReplacements = async (text, command, context, variables, originalCmd) => {
    const replaces = [
        {
            regex: /\$args\(\)/g,
            replacer: async (m0, m1) => {
                return command.args.join(' ');
            },
        },
        {
            regex: /\$args\((\d+)\)/g,
            replacer: async (m0, m1) => {
                const index = parseInt(m1, 10);
                if (index < command.args.length) {
                    return command.args[index];
                }
                return '';
            },
        },
        {
            regex: /\$var\(([^)]+)\)/g,
            replacer: async (m0, m1) => {
                const v = originalCmd.variables.find(v => v.name === m1);
                const val = v ? v.value : variables.get(m1);
                return val === null ? '' : val;
            },
        },
        {
            regex: /\$user\.name/g,
            replacer: async () => {
                return context['display-name'];
            },
        },
        {
            regex: /\$([a-z][a-z0-9]*)(?!\()/g,
            replacer: async (m0, m1) => {
                switch (m1) {
                    case 'args': return command.args.join(' ');
                }
                return m0;
            }
        },
        {
            regex: /\$customapi\(([^$\)]*)\)\[\'([A-Za-z0-9_ -]+)\'\]/g,
            replacer: async (m0, m1, m2) => {
                const txt = await getText(await doReplacements(m1, command, context, variables, originalCmd));
                return JSON.parse(txt)[m2];
            },
        },
        {
            regex: /\$customapi\(([^$\)]*)\)/g,
            replacer: async (m0, m1) => {
                return await getText(await doReplacements(m1, command, context, variables, originalCmd));
            },
        },
        {
            regex: /\$urlencode\(([^$\)]*)\)/g,
            replacer: async (m0, m1) => {
                return encodeURIComponent(await doReplacements(m1, command, context, variables, originalCmd));
            },
        },
        {
            regex: /\$calc\((\d+)([*/+-])(\d+)\)/g,
            replacer: async (m0, arg1, op, arg2) => {
                const arg1Int = parseInt(arg1, 10);
                const arg2Int = parseInt(arg2, 10);
                switch (op) {
                    case '+':
                        return arg1Int + arg2Int;
                    case '-':
                        return arg1Int - arg2Int;
                    case '/':
                        return arg1Int / arg2Int;
                    case '*':
                        return arg1Int * arg2Int;
                }
                return '';
            },
        },
    ];
    let replaced = text;
    let orig;
    do {
        orig = replaced;
        for (let replace of replaces) {
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
const humanDuration = (durationMs) => {
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
    const units = ['ms', 's', 'm', 'h', 'd'];
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
const passwordSalt = () => {
    return nonce(10);
};
const passwordHash = (plainPass, salt) => {
    const hash = crypto.createHmac('sha512', config.secret);
    hash.update(`${salt}${plainPass}`);
    return hash.digest('hex');
};
var fn = {
    logger,
    mimeToExt,
    decodeBase64Image,
    sayFn,
    mayExecute,
    parseCommandFromMessage,
    parseKnownCommandFromMessage,
    passwordSalt,
    passwordHash,
    tryExecuteCommand,
    getRandomInt,
    getRandom,
    shuffle,
    sleep,
    fnRandom,
    pad,
    parseISO8601Duration,
    parseHumanDuration,
    mustParseHumanDuration,
    humanDuration,
    isBroadcaster,
    isMod,
    isSubscriber,
    doReplacements,
    nonce,
    split,
    joinIntoChunks,
    arrayMove,
    MS,
    SECOND,
    MINUTE,
    HOUR,
    DAY,
    YEAR,
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
        return (req, res, next) => {
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

const log$6 = logger("WebSocketServer.ts");
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
                log$6.info('not found token: ', token);
                socket.close();
                return;
            }
            socket.user_id = tokenInfo.user_id;
            const pathname = new URL(this.connectstring()).pathname;
            if (request.url?.indexOf(pathname) !== 0) {
                log$6.info('bad request url: ', request.url);
                socket.close();
                return;
            }
            socket.isAlive = true;
            socket.on('pong', function () {
                socket.isAlive = true;
            });
            const relpath = request.url.substr(pathname.length);
            // module routing
            for (const module of this.moduleManager.all(socket.user_id)) {
                if ('/' + module.name !== relpath) {
                    continue;
                }
                socket.module = module.name;
                const evts = module.getWsEvents();
                if (evts) {
                    socket.on('message', (data) => {
                        log$6.info(`ws|${socket.user_id}| `, data);
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
                socket.ping(() => { });
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
            log$6.info(`notifying ${socket.user_id} (${data.event})`);
            socket.send(JSON.stringify(data));
        }
    }
    notifyAll(user_ids, moduleName, data) {
        if (!this._websocketserver) {
            log$6.error(`tried to notifyAll, but _websocketserver is null`);
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

const regexp = /<<(.*?)>>|\{\{(.*?)\}\}/;
class Sprightly {
    constructor() {
        this.fileContent = [];
        this.options = null;
        this.level = 0;
        this.directory = '';
    }
    async parse(pFile) {
        const file = pFile.split('\n');
        this.fileContent = file; // register the current file content. Used in specifiying errors location
        for (let i = 0; i < file.length; i++) {
            this.level = i; // register the current level in file. Used in specifiying errors location
            for (let match = file[i].match(regexp), result; match;) {
                if (match[0][0] === '<') {
                    this.directory = `${match[1].trim()}.${this.options.settings['view engine']}`; // register the current file. Used in specifiying errors location
                    result = await this.read(path.join(this.options.settings.views, this.directory));
                }
                else {
                    result = this.options[match[2].trim()];
                }
                file[i] = file[i].replace(match[0], result ? result : '');
                match = file[i].match(regexp);
            }
        }
        return file.join('');
    }
    async read(path) {
        const file = (await promises.readFile(path)).toString();
        return await this.parse(file);
    }
}
const sprightly = new Sprightly();
var sprightly$1 = async (path, options, callback) => {
    try {
        sprightly.options = options;
        callback(undefined, await sprightly.read(path));
    }
    catch (e) {
        console.log(e);
        const message = `Cannot find file or directory "${sprightly.directory}" inside the views directory
        ${sprightly.level - 1 >= 0 ? `${String(sprightly.level).padStart(4, '0')}| ${sprightly.fileContent[sprightly.level - 1]}` : ''}
    >>  ${String(sprightly.level + 1).padStart(4, '0')}| ${sprightly.fileContent[sprightly.level]}
        ${sprightly.level + 1 < sprightly.fileContent.length ? `${String(sprightly.level + 2).padStart(4, '0')}| ${sprightly.fileContent[sprightly.level + 1]}` : ''}`;
        callback(message);
    }
};
// MIT License
// Copyright (c) 2020 Obada Khalili
// Permission is hereby granted, free of charge, to any person obtaining a copy
// of this software and associated documentation files (the "Software"), to deal
// in the Software without restriction, including without limitation the rights
// to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
// copies of the Software, and to permit persons to whom the Software is
// furnished to do so, subject to the following conditions:
// The above copyright notice and this permission notice shall be included in all
// copies or substantial portions of the Software.
// THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
// IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
// FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
// AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
// LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
// OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
// SOFTWARE.

const log$5 = logger('TwitchHelixClient.ts');
const API_BASE = 'https://api.twitch.tv/helix';
class TwitchHelixClient {
    constructor(clientId, clientSecret) {
        this.clientId = clientId;
        this.clientSecret = clientSecret;
    }
    async withAuthHeaders(opts = {}) {
        const accessToken = await this.getAccessToken();
        return withHeaders({
            'Client-ID': this.clientId,
            'Authorization': `Bearer ${accessToken}`,
        }, opts);
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
    // https://dev.twitch.tv/docs/api/reference#get-users
    async getUserIdByName(userName) {
        const url = `${API_BASE}/users${asQueryArgs({ login: userName })}`;
        const json = await getJson(url, await this.withAuthHeaders());
        try {
            return json.data[0].id;
        }
        catch (e) {
            log$5.error(json);
            return '';
        }
    }
    // https://dev.twitch.tv/docs/api/reference#get-streams
    async getStreams(userId) {
        const url = `${API_BASE}/streams${asQueryArgs({ user_id: userId })}`;
        const json = await getJson(url, await this.withAuthHeaders());
        return json;
    }
    async getSubscriptions() {
        const url = `${API_BASE}/eventsub/subscriptions`;
        return await getJson(url, await this.withAuthHeaders());
    }
    async deleteSubscription(id) {
        const url = `${API_BASE}/eventsub/subscriptions${asQueryArgs({ id: id })}`;
        return await requestText('delete', url, await this.withAuthHeaders());
    }
    async createSubscription(subscription) {
        const url = `${API_BASE}/eventsub/subscriptions`;
        return await postJson(url, await this.withAuthHeaders(asJson(subscription)));
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

const __filename$2 = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename$2);
const log$4 = fn.logger(__filename$2);
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
                id = fn.nonce(6);
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
        app.engine('spy', sprightly$1);
        app.set('views', path.join(__dirname, 'templates'));
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
        const uploadDir = './data/uploads';
        const storage = multer.diskStorage({
            destination: uploadDir,
            filename: function (req, file, cb) {
                cb(null, `${fn.nonce(6)}-${file.originalname}`);
            }
        });
        const upload = multer({ storage }).single('file');
        const verifyTwitchSignature = (req, res, next) => {
            const body = Buffer.from(req.rawBody, 'utf8');
            const msg = `${req.headers['twitch-eventsub-message-id']}${req.headers['twitch-eventsub-message-timestamp']}${body}`;
            const hmac = crypto.createHmac('sha256', this.configTwitch.eventSub.transport.secret);
            hmac.update(msg);
            const expected = `sha256=${hmac.digest('hex')}`;
            if (req.headers['twitch-eventsub-message-signature'] !== expected) {
                log$4.debug(req);
                log$4.error('bad message signature', {
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
        app.use('/uploads', express.static(uploadDir));
        app.use('/', express.static('./build/public'));
        app.use('/static', express.static('./public/static'));
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
                widgets: [
                    {
                        title: 'Song Request',
                        hint: 'Browser source, or open in browser and capture window',
                        url: this.widgetUrl('sr', req.userWidgetToken),
                    },
                    {
                        title: 'Media',
                        hint: 'Browser source, or open in browser and capture window',
                        url: this.widgetUrl('media', req.userWidgetToken),
                    },
                    {
                        title: 'Speech-to-Text',
                        hint: 'Google Chrome + window capture',
                        url: this.widgetUrl('speech-to-text', req.userWidgetToken),
                    },
                    {
                        title: 'Drawcast (Overlay)',
                        hint: 'Browser source, or open in browser and capture window',
                        url: this.widgetUrl('drawcast_receive', req.userWidgetToken),
                    },
                    {
                        title: 'Drawcast (Draw)',
                        hint: 'Open this to draw (or give to viewers to let them draw)',
                        url: this.pubUrl(this.widgetUrl('drawcast_draw', req.userPubToken)),
                    },
                ]
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
                this.eventHub.trigger('user_registration_complete', user);
                return;
            }
            res.status(400).send({ reason: 'invalid_token' });
            return;
        });
        app.get('/api/page/variables', requireLoginApi, async (req, res) => {
            const variables = new Variables(this.db, req.user.id);
            res.send({ variables: variables.all() });
        });
        app.post('/save-variables', requireLoginApi, express.json(), async (req, res) => {
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
            this.eventHub.trigger('user_changed', this.userRepo.getById(user.id));
            res.send();
        });
        // twitch calls this url after auth
        // from here we render a js that reads the token and shows it to the user
        app.get('/twitch/redirect_uri', async (req, res) => {
            res.render('twitch/redirect_uri.spy', {});
        });
        app.post('/twitch/user-id-by-name', requireLoginApi, express.json(), async (req, res) => {
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
                const client = new TwitchHelixClient(clientId, clientSecret);
                res.send({ id: await client.getUserIdByName(req.body.name) });
            }
            catch (e) {
                res.status(500).send("Something went wrong!");
            }
        });
        app.post('/twitch/event-sub/', express.json({ verify: (req, res, buf) => { req.rawBody = buf; } }), verifyTwitchSignature, async (req, res) => {
            log$4.debug(req.body);
            log$4.debug(req.headers);
            if (req.headers['twitch-eventsub-message-type'] === 'webhook_callback_verification') {
                log$4.info(`got verification request, challenge: ${req.body.challenge}`);
                res.write(req.body.challenge);
                res.send();
                return;
            }
            if (req.headers['twitch-eventsub-message-type'] === 'notification') {
                log$4.info(`got notification request: ${req.body.subscription.type}`);
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
            res.cookie('x-token', token, { maxAge: 1 * fn.YEAR, httpOnly: true });
            res.send();
        });
        app.post('/api/upload', requireLoginApi, (req, res) => {
            upload(req, res, (err) => {
                if (err) {
                    log$4.error(err);
                    res.status(400).send("Something went wrong!");
                }
                res.send(req.file);
            });
        });
        app.get('/widget/:widget_type/:widget_token/', async (req, res, next) => {
            const user = this.auth.userFromWidgetToken(req.params.widget_token)
                || this.auth.userFromPubToken(req.params.widget_token);
            if (!user) {
                res.status(404).send();
                return;
            }
            const key = req.params.widget_type;
            for (const m of this.moduleManager.all(user.id)) {
                const map = m.widgets();
                if (map && map[key]) {
                    await map[key](req, res, next);
                    return;
                }
            }
            res.status(404).send();
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
        this.handle = app.listen(port, hostname, () => log$4.info(`server running on http://${hostname}:${port}`));
    }
    close() {
        if (this.handle) {
            this.handle.close();
        }
    }
}

const log$3 = logger('Db.ts');
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
                    log$3.info(`➡ skipping already applied db patch: ${f}`);
                }
                continue;
            }
            const contents = fs.readFileSync(`${this.conf.patchesDir}/${f}`, 'utf-8');
            const all = contents.split(';').map(s => s.trim()).filter(s => !!s);
            try {
                this.dbh.transaction((all) => {
                    for (const q of all) {
                        if (verbose) {
                            log$3.info(`Running: ${q}`);
                        }
                        this.run(q);
                    }
                    this.insert('db_patches', { id: f });
                })(all);
                log$3.info(`✓ applied db patch: ${f}`);
            }
            catch (e) {
                log$3.error(`✖ unable to apply patch: ${f} ${e}`);
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

const TABLE$4 = 'twitch_channel';
class TwitchChannels {
    constructor(db) {
        this.db = db;
    }
    save(channel) {
        return this.db.upsert(TABLE$4, channel, {
            user_id: channel.user_id,
            channel_name: channel.channel_name,
        });
    }
    allByUserId(user_id) {
        return this.db.getMany(TABLE$4, { user_id });
    }
    saveUserChannels(user_id, channels) {
        for (const channel of channels) {
            this.save(channel);
        }
        this.db.delete(TABLE$4, {
            user_id: user_id,
            channel_name: { '$nin': channels.map(c => c.channel_name) }
        });
    }
}

class EventHub {
    constructor() {
        this.cbs = {};
    }
    on(what, cb) {
        this.cbs[what] = this.cbs[what] || [];
        this.cbs[what].push(cb);
    }
    trigger(what, data) {
        if (!this.cbs[what]) {
            return;
        }
        for (const cb of this.cbs[what]) {
            cb(data);
        }
    }
}

const __filename$1 = fileURLToPath(import.meta.url);

class TwitchClientManager {
  constructor(
    /** @type EventHub */ eventHub,
    cfg,
    /** @type Db */ db,
    user,
    /** @type TwitchChannels */ twitchChannelRepo,
    moduleManager,
    variables,
  ) {
    this.eventHub = eventHub;
    this.cfg = cfg;
    this.db = db;
    this.user = user;
    this.twitchChannelRepo = twitchChannelRepo;
    this.moduleManager = moduleManager;
    this.variables = variables;

    this.init('init');

    eventHub.on('user_changed', (tmpUser) => {
      if (tmpUser.id === user.id) {
        this.user = tmpUser;
        this.init('user_change');
      }
    });
  }

  async init(reason) {
    let connectReason = reason;
    const cfg = this.cfg;
    const db = this.db;
    const user = this.user;
    const twitchChannelRepo = this.twitchChannelRepo;
    const moduleManager = this.moduleManager;

    const log = fn.logger(__filename$1, `${user.name}|`);

    if (this.chatClient) {
      try {
        await this.chatClient.disconnect();
      } catch (e) { }
    }
    if (this.pubSubClient) {
      try {
        this.pubSubClient.disconnect();
      } catch (e) { }
    }

    const twitchChannels = twitchChannelRepo.allByUserId(user.id);
    if (twitchChannels.length === 0) {
      log.info(`* No twitch channels configured`);
      return
    }

    this.identity = (
      user.tmi_identity_username
      && user.tmi_identity_password
      && user.tmi_identity_client_id
    ) ? {
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

    // connect to chat via tmi (to all channels configured)
    this.chatClient = new tmi.client({
      identity: {
        username: this.identity.username,
        password: this.identity.password,
        client_id: this.identity.client_id,
      },
      channels: twitchChannels.map(ch => ch.channel_name),
      connection: {
        reconnect: true,
      }
    });

    this.chatClient.on('message', async (target, context, msg, self) => {
      if (self) { return; } // Ignore messages from the bot

      // log.debug(context)
      const roles = [];
      if (fn.isMod(context)) {
        roles.push('M');
      }
      if (fn.isSubscriber(context)) {
        roles.push('S');
      }
      if (fn.isBroadcaster(context)) {
        roles.push('B');
      }
      log.info(`${context.username}[${roles.join('')}]@${target}: ${msg}`);
      const rawCmd = fn.parseCommandFromMessage(msg);

      db.insert('chat_log', {
        created_at: `${new Date().toJSON()}`,
        broadcaster_user_id: context['room-id'],
        user_name: context.username,
        display_name: context['display-name'],
        message: msg,
      });

      for (const m of moduleManager.all(user.id)) {
        const commands = m.getCommands() || {};
        const cmdDefs = commands[rawCmd.name] || [];
        await fn.tryExecuteCommand(m, rawCmd, cmdDefs, this.chatClient, target, context, msg, this.variables);
        await m.onChatMsg(this.chatClient, target, context, msg);
      }
    });

    // Called every time the bot connects to Twitch chat
    this.chatClient.on('connected', (addr, port) => {
      log.info(`* Connected to ${addr}:${port}`);
      for (let channel of twitchChannels) {
        // note: this can lead to multiple messages if multiple users
        //       have the same channels set up
        const say = fn.sayFn(this.chatClient, channel.channel_name);
        if (connectReason === 'init') {
          say('⚠️ Bot rebooted - please restart timers...');
        } else if (connectReason === 'user_change') {
          say('✅ User settings updated...');
        } else {
          say('✅ Reconnected...');
        }
      }

      // set connectReason to empty, everything from now is just a reconnect
      // due to disconnect from twitch
      connectReason = '';
    });

    // connect to PubSub websocket
    // https://dev.twitch.tv/docs/pubsub#topics
    // this.pubSubClient = TwitchPubSubClient()
    // this.pubSubClient.on('open', async () => {
    //   // listen for evts
    //   for (let channel of twitchChannels) {
    //     if (channel.access_token && channel.channel_id) {
    //       this.pubSubClient.listen(
    //         `channel-points-channel-v1.${channel.channel_id}`,
    //         channel.access_token
    //       )
    //     }
    //   }
    //   this.pubSubClient.on('message', (message) => {
    //     if (message.type !== 'MESSAGE') {
    //       return
    //     }
    //     const messageData = JSON.parse(message.data.message)

    //     // channel points redeemed with non standard reward
    //     // standard rewards are not supported :/
    //     if (messageData.type === 'reward-redeemed') {
    //       const redemption = messageData.data.redemption
    //       // redemption.reward
    //       // { id, channel_id, title, prompt, cost, ... }
    //       // redemption.userchatClient
    //       // { id, login, display_name}
    //       for (const m of moduleManager.all(user.id)) {
    //         if (m.handleRewardRedemption) {
    //           m.handleRewardRedemption(redemption)
    //         }
    //       }
    //     }
    //   })
    // })

    this.chatClient.connect();
    // this.pubSubClient.connect()

    // register EventSub
    // @see https://dev.twitch.tv/docs/eventsub
    this.helixClient = new TwitchHelixClient(
      this.identity.client_id,
      this.identity.client_secret
    );

    // to delete all subscriptions
    // ;(async () => {
    //   const subzz = await this.helixClient.getSubscriptions()
    //   for (const s of subzz.data) {
    //     console.log(s.id)
    //     await this.helixClient.deleteSubscription(s.id)
    //   }
    // })()
  }

  getChatClient() {
    return this.chatClient
  }

  getHelixClient() {
    return this.helixClient
  }

  getIdentity() {
    return this.identity
  }
}

const log$2 = logger('ModuleStorage.ts');
const TABLE$3 = 'module';
class ModuleStorage {
    constructor(db, userId) {
        this.db = db;
        this.userId = userId;
    }
    load(key, def) {
        try {
            const where = { user_id: this.userId, key };
            const row = this.db.get(TABLE$3, where);
            const data = row ? JSON.parse('' + row.data) : null;
            return data ? Object.assign({}, def, data) : def;
        }
        catch (e) {
            log$2.error(e);
            return def;
        }
    }
    save(key, rawData) {
        const where = { user_id: this.userId, key };
        const data = JSON.stringify(rawData);
        const dbData = Object.assign({}, where, { data });
        this.db.upsert(TABLE$3, dbData, where);
    }
}

const TABLE$2 = 'user';
class Users {
    constructor(db) {
        this.db = db;
    }
    get(by) {
        return this.db.get(TABLE$2, by) || null;
    }
    all() {
        return this.db.getMany(TABLE$2);
    }
    getById(id) {
        return this.get({ id });
    }
    save(user) {
        return this.db.upsert(TABLE$2, user, { id: user.id });
    }
    getGroups(id) {
        const rows = this.db._getMany(`
select g.name from user_group g inner join user_x_user_group x
where x.user_id = ?`, [id]);
        return rows.map(r => r.name);
    }
    createUser(user) {
        return this.db.insert(TABLE$2, user);
    }
}

const TABLE$1 = 'token';
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
        return this.db.get(TABLE$1, { user_id, type });
    }
    insert(tokenInfo) {
        return this.db.insert(TABLE$1, tokenInfo);
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
        return this.db.get(TABLE$1, { token }) || null;
    }
    delete(token) {
        return this.db.delete(TABLE$1, { token });
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
      console.log('API called successfully. Returned data: ' + JSON.stringify(data));
    }, function (error) {
      console.error(error);
    });
  }
}

const log$1 = fn.logger('countdown.ts');
const countdown = (variables, wss, userId, originalCmd) => async (command, client, target, context, msg) => {
    const sayFn = fn.sayFn(client, target);
    const doReplacements = async (text) => {
        return await fn.doReplacements(text, command, context, variables, originalCmd);
    };
    const say = async (text) => {
        return sayFn(await doReplacements(text));
    };
    const parseDuration = async (str) => {
        return fn.mustParseHumanDuration(await doReplacements(str));
    };
    const settings = originalCmd.data;
    const actions = [];
    const t = (settings.type || 'auto');
    if (t === 'auto') {
        const steps = parseInt(await doReplacements(settings.steps), 10);
        let interval;
        try {
            interval = (await parseDuration(settings.interval)) || (1 * fn.SECOND);
        }
        catch (e) {
            log$1.error(e.message, settings.interval);
            return;
        }
        const msgStep = settings.step || "{step}";
        const msgIntro = settings.intro || null;
        const msgOutro = settings.outro || null;
        console.log(steps, settings);
        if (msgIntro) {
            actions.push(async () => await say(msgIntro.replace(/\{steps\}/g, `${steps}`)));
            actions.push(async () => await fn.sleep(interval));
        }
        for (let step = steps; step > 0; step--) {
            actions.push(async () => say(msgStep
                .replace(/\{steps\}/g, `${steps}`)
                .replace(/\{step\}/g, `${step}`)));
            actions.push(async () => await fn.sleep(interval));
        }
        if (msgOutro) {
            actions.push(async () => await say(msgOutro.replace(/\{steps\}/g, `${steps}`)));
        }
    }
    else if (t === 'manual') {
        for (const a of settings.actions) {
            if (a.type === 'text') {
                actions.push(async () => say(a.value));
            }
            else if (a.type === 'media') {
                actions.push(async () => {
                    wss.notifyAll([userId], 'general', {
                        event: 'playmedia',
                        data: a.value,
                    });
                });
            }
            else if (a.type === 'delay') {
                let duration;
                try {
                    duration = (await parseDuration(a.value)) || 0;
                }
                catch (e) {
                    log$1.error(e.message, a.value);
                    return;
                }
                actions.push(async () => await fn.sleep(duration));
            }
        }
    }
    for (let i = 0; i < actions.length; i++) {
        await actions[i]();
    }
};

const searchWord = async (keyword, page = 1) => {
    const url = 'https://jisho.org/api/v1/search/words' + asQueryArgs({
        keyword: keyword,
        page: page,
    });
    const json = (await getJson(url));
    return json.data;
};
var JishoOrg = {
    searchWord,
};

const jishoOrgLookup = (
// no params
) => async (command, client, target, context, msg) => {
    const say = fn.sayFn(client, target);
    const phrase = command.args.join(' ');
    const data = await JishoOrg.searchWord(phrase);
    if (data.length === 0) {
        say(`Sorry, I didn't find anything for "${phrase}"`);
        return;
    }
    const e = data[0];
    const j = e.japanese[0];
    const d = e.senses[0].english_definitions;
    say(`Phrase "${phrase}": ${j.word} (${j.reading}) ${d.join(', ')}`);
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

const madochanCreateWord = (model, weirdness) => async (command, client, target, context, msg) => {
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

const text = (variables, originalCmd) => async (command, client, target, context, msg) => {
    const text = originalCmd.data.text;
    const say = fn.sayFn(client, target);
    say(await fn.doReplacements(text, command, context, variables, originalCmd));
};

const randomText = (variables, originalCmd) => async (command, client, target, context, msg) => {
    const texts = originalCmd.data.text;
    const say = fn.sayFn(client, target);
    say(await fn.doReplacements(fn.getRandom(texts), command, context, variables, originalCmd));
};

const playMedia = (wss, userId, originalCmd) => (command, client, target, context, msg) => {
    const data = originalCmd.data;
    wss.notifyAll([userId], 'general', {
        event: 'playmedia',
        data: data,
    });
};

const chatters = (db, helixClient) => async (command, client, target, context, msg) => {
    const say = fn.sayFn(client, target);
    const streams = await helixClient.getStreams(context['room-id']);
    if (!streams || streams.data.length === 0) {
        say(`It seems this channel is not live at the moment...`);
        return;
    }
    const stream = streams.data[0];
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

fn.logger('GeneralModule.js');

class GeneralModule {
  constructor(
    /** @type Db */ db,
    user,
    /** @type Variables */ variables,
    chatClient,
    /** @type TwitchHelixClient */ helixClient,
    storage,
    cache,
    /** @type WebServer */ ws,
    /** @type WebSocketServer */ wss
  ) {
    this.db = db;
    this.user = user;
    this.variables = variables;
    this.chatClient = chatClient;
    this.helixClient = helixClient;
    this.storage = storage;
    this.cache = cache;
    this.ws = ws;
    this.wss = wss;
    this.name = 'general';
    this.reinit();
  }

  fix(commands) {
    return (commands || []).map(cmd => {
      if (cmd.command) {
        cmd.triggers = [{ type: 'command', data: { command: cmd.command } }];
        delete cmd.command;
      }
      cmd.variables = cmd.variables || [];
      cmd.variableChanges = cmd.variableChanges || [];
      if (cmd.action === 'media') {
        cmd.data.minDurationMs = cmd.data.minDurationMs || 0;
        cmd.data.sound.volume = cmd.data.sound.volume || 100;
      }
      cmd.triggers = cmd.triggers.map(trigger => {
        trigger.data.minLines = parseInt(trigger.data.minLines, 10) || 0;
        return trigger
      });
      return cmd
    })
  }

  reinit() {
    this.data = this.storage.load(this.name, {
      commands: [],
      settings: {
        volume: 100,
      },
    });
    this.data.commands = this.fix(this.data.commands);

    this.commands = {};
    this.timers = [];
    this.interval = null;

    this.data.commands.forEach((cmd) => {
      if (cmd.triggers.length === 0) {
        return
      }
      let cmdObj = null;
      switch (cmd.action) {
        case 'madochan_createword':
          cmdObj = Object.assign({}, cmd, {
            fn: madochanCreateWord(
              `${cmd.data.model}` || Madochan.defaultModel,
              parseInt(cmd.data.weirdness, 10) || Madochan.defaultWeirdness,
            )
          });
          break;
        case 'jisho_org_lookup':
          cmdObj = Object.assign({}, cmd, { fn: jishoOrgLookup() });
          break;
        case 'text':
          cmdObj = Object.assign({}, cmd, {
            fn: Array.isArray(cmd.data.text)
              ? randomText(this.variables, cmd)
              : text(this.variables, cmd)
          });
          break;
        case 'media':
          cmdObj = Object.assign({}, cmd, { fn: playMedia(this.wss, this.user.id, cmd) });
          break;
        case 'countdown':
          cmdObj = Object.assign({}, cmd, { fn: countdown(this.variables, this.wss, this.user.id, cmd) });
          break;
        case 'chatters':
          cmdObj = Object.assign({}, cmd, { fn: chatters(this.db, this.helixClient) });
          break;
      }
      for (const trigger of cmd.triggers) {
        if (trigger.type === 'command') {
          if (trigger.data.command) {
            this.commands[trigger.data.command] = this.commands[trigger.data.command] || [];
            this.commands[trigger.data.command].push(cmdObj);
          }
        } else if (trigger.type === 'timer') {
          // fix for legacy data
          if (trigger.data.minSeconds) {
            trigger.data.minInterval = trigger.data.minSeconds * 1000;
          }

          const interval = fn.parseHumanDuration(trigger.data.minInterval);
          if (trigger.data.minLines || interval) {
            this.timers.push({
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

    if (this.interval) {
      clearInterval(this.interval);
    }

    this.interval = setInterval(() => {
      const now = new Date().getTime();
      this.timers.forEach(t => {
        if (t.lines >= t.minLines && now > t.next) {
          t.command.fn(t.command, this.chatClient, null, null, null);
          t.lines = 0;
          t.next = now + t.minInterval;
        }
      });
    }, 1 * fn.SECOND);
  }

  widgets() {
    return {
      'media': async (req, res, next) => {
        res.render('widget.spy', {
          title: 'Media Widget',
          page: 'media',
          wsUrl: `${this.wss.connectstring()}/${this.name}`,
          widgetToken: req.params.widget_token,
        });
      },
    }
  }

  getRoutes() {
    return {
    }
  }

  wsdata(eventName) {
    return {
      event: eventName,
      data: {
        commands: this.data.commands,
        settings: this.data.settings,
        globalVariables: this.variables.all(),
      },
    };
  }

  updateClient(eventName, ws) {
    this.wss.notifyOne([this.user.id], this.name, this.wsdata(eventName), ws);
  }

  updateClients(eventName) {
    this.wss.notifyAll([this.user.id], this.name, this.wsdata(eventName));
  }

  saveCommands() {
    this.storage.save(this.name, this.data);
    this.reinit();
    this.updateClients('init');
  }

  getWsEvents() {
    return {
      'conn': (ws) => {
        this.updateClient('init', ws);
      },
      'save': (ws, { commands, settings }) => {
        this.data.commands = this.fix(commands);
        this.data.settings = settings;
        this.storage.save(this.name, this.data);
        this.reinit();
        this.updateClients('init');
      },
    }
  }
  getCommands() {
    return {}
  }

  async onChatMsg(
    client,
    /** @type string */ target,
    context,
    /** @type string */ msg
  ) {
    let keys = Object.keys(this.commands);
    // make sure longest commands are found first
    // so that in case commands `!draw` and `!draw bad` are set up
    // and `!draw bad` is written in chat, that command only will be
    // executed and not also `!draw`
    keys = keys.sort((a, b) => b.length - a.length);
    for (const key of keys) {
      const rawCmd = fn.parseKnownCommandFromMessage(msg, key);
      if (!rawCmd) {
        continue
      }
      const cmdDefs = this.commands[key] || [];
      await fn.tryExecuteCommand(this, rawCmd, cmdDefs, client, target, context, msg, this.variables);
      break
    }
    this.timers.forEach(t => {
      t.lines++;
    });
  }
}

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
const getYoutubeIdBySearch = async (searchterm) => {
    const searches = [
        `"${searchterm}"`,
        searchterm,
    ];
    for (const q of searches) {
        const json = await get('https://www.googleapis.com/youtube/v3/search', {
            part: 'snippet',
            q: q,
            type: 'video',
            videoEmbeddable: 'true',
        });
        try {
            const res = json.items[0]['id']['videoId'] || null;
            if (res) {
                return res;
            }
        }
        catch (e) {
        }
    }
    return null;
};
const getUrlById = (id) => `https://youtu.be/${id}`;
var Youtube = {
    fetchDataByYoutubeId,
    extractYoutubeId,
    getYoutubeIdBySearch,
    getUrlById,
};

const ADD_TYPE = {
  NOT_ADDED: 0,
  ADDED: 1,
  REQUEUED: 2,
  EXISTED: 3,
};

class SongrequestModule {
  constructor(
    /** @type Db */ db,
    user,
    /** @type Variables */ variables,
    chatClient,
    /** @type TwitchHelixClient */ helixClient,
    storage,
    cache,
    /** @type WebServer */ ws,
    /** @type WebSocketServer */ wss
  ) {
    this.db = db;
    this.user = user;
    this.variables = variables;
    this.cache = cache;
    this.storage = storage;
    this.ws = ws;
    this.wss = wss;
    this.name = 'sr';
    this.data = this.storage.load(this.name, {
      filter: {
        tag: '',
      },
      settings: {
        volume: 100,
        hideVideoImage: {
          file: '',
          filename: '',
        },
        customCss: '',
        showProgressBar: false,
      },
      playlist: [],
      stacks: {},
    });

    // make sure items have correct structure
    // needed by rest of the code
    // TODO: maybe use same code as in save function
    this.data.playlist = this.data.playlist.map(item => {
      item.tags = item.tags || [];
      item.hidevideo = typeof item.hidevideo === 'undefined' ? false : item.hidevideo;
      return item
    });
    this.data.settings = this.data.settings || {
      volume: 100,
      hideVideoImage: {
        file: '',
        filename: '',
      },
      customCss: '',
      showProgressBar: false,
    };
    if (!this.data.settings.customCss) {
      this.data.settings.customCss = '';
    }
    if (!this.data.settings.showProgressBar) {
      this.data.settings.showProgressBar = false;
    }
  }

  onChatMsg(client, target, context, msg) {
  }

  saveCommands() {
    // pass
  }

  getCommands() {
    return {
      '!sr': [{
        fn: this.songrequestCmd.bind(this),
      }],
      '!resr': [{
        fn: this.songrequestCmd.bind(this),
      }],
    }
  }

  widgets() {
    return {
      'sr': async (req, res, next) => {
        res.render('widget.spy', {
          title: 'Song Request Widget',
          page: 'sr',
          wsUrl: `${this.wss.connectstring()}/${this.name}`,
          widgetToken: req.params.widget_token,
        });
      },
    }
  }

  getRoutes() {
    return {
      post: {
        '/sr/import': async (req, res, next) => {
          try {
            this.data.settings = req.body.settings;
            this.data.playlist = req.body.playlist;
            this.save();
            this.updateClients('init');
            res.send({ error: false });
          } catch (e) {
            res.status(400).send({ error: true });
          }
        },
      },
      get: {
        '/sr/export': async (req, res, next) => {
          res.send({
            settings: this.data.settings,
            playlist: this.data.playlist,
          });
        },
      },
    }
  }

  save() {
    this.storage.save(this.name, {
      filter: this.data.filter,
      playlist: this.data.playlist.map(item => {
        item.title = item.title || '';
        item.time = item.time || new Date().getTime();
        item.last_play = item.last_play || 0;
        item.user = item.user || '';
        item.plays = item.plays || 0;
        item.goods = item.goods || 0;
        item.bads = item.bads || 0;
        item.tags = item.tags || [];
        return item
      }),
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
      }
    };
  }

  updateClient(/** @type string */ eventName, /** @type WebSocket */ ws) {
    this.wss.notifyOne([this.user.id], this.name, this.wsdata(eventName), ws);
  }

  updateClients(/** @type string */ eventName) {
    this.wss.notifyAll([this.user.id], this.name, this.wsdata(eventName));
  }

  getWsEvents() {
    return {
      'conn': (ws) => {
        this.updateClient('init', ws);
      },
      'play': (ws, { id }) => {
        const idx = this.data.playlist.findIndex(item => item.id === id);
        if (idx < 0) {
          return
        }
        this.data.playlist = [].concat(
          this.data.playlist.slice(idx),
          this.data.playlist.slice(0, idx)
        );
        this.incStat('plays');
        this.data.playlist[idx].last_play = new Date().getTime();

        this.save();
        this.updateClients('playIdx');
      },
      'ended': (ws) => {
        this.data.playlist.push(this.data.playlist.shift());
        this.save();
        this.updateClients('onEnded');
      },
      'ctrl': (ws, { ctrl, args }) => {
        switch (ctrl) {
          case 'volume': this.volume(...args); break;
          case 'pause': this.pause(); break;
          case 'unpause': this.unpause(); break;
          case 'loop': this.loop(); break;
          case 'noloop': this.noloop(); break;
          case 'good': this.like(); break;
          case 'bad': this.dislike(); break;
          case 'prev': this.prev(); break;
          case 'skip': this.next(); break;
          case 'resetStats': this.resetStats(); break;
          case 'clear': this.clear(); break;
          case 'rm': this.remove(); break;
          case 'shuffle': this.shuffle(); break;
          case 'playIdx': this.playIdx(...args); break;
          case 'rmIdx': this.rmIdx(...args); break;
          case 'goodIdx': this.goodIdx(...args); break;
          case 'badIdx': this.badIdx(...args); break;
          case 'sr': this.request(...args); break;
          case 'resr': this.resr(...args); break;
          case 'move': this.move(...args); break;
          case 'rmtag': this.rmTag(...args); break;
          case 'addtag': this.addTag(...args); break;
          case 'updatetag': this.updateTag(...args); break;
          case 'filter': this.filter(...args); break;
          case 'videoVisibility': this.videoVisibility(...args); break;
          case 'settings': this.settings(...args); break;
        }
      },
    }
  }

  async add(/** @type string */ str, user) {
    const youtubeUrl = str.trim();
    let youtubeId = Youtube.extractYoutubeId(youtubeUrl);
    let youtubeData = null;
    if (youtubeId) {
      youtubeData = await this.loadYoutubeData(youtubeId);
    }
    if (!youtubeData) {
      youtubeId = await Youtube.getYoutubeIdBySearch(youtubeUrl);
      if (youtubeId) {
        youtubeData = await this.loadYoutubeData(youtubeId);
      }
    }
    if (!youtubeId || !youtubeData) {
      return { addType: ADD_TYPE.NOT_ADDED, idx: -1 }
    }

    const tmpItem = this.createItem(youtubeId, youtubeData, user);
    const { addType, idx } = await this.addToPlaylist(tmpItem);
    if (addType === ADD_TYPE.ADDED) {
      this.data.stacks[user] = this.data.stacks[user] || [];
      this.data.stacks[user].push(youtubeId);
    }
    return { addType, idx }
  }

  determinePrevIndex() {
    let index = -1;
    for (let i in this.data.playlist) {
      const item = this.data.playlist[i];
      if (this.data.filter.tag === '' || item.tags.includes(this.data.filter.tag)) {
        index = i;
      }
    }
    return index
  }

  determineNextIndex() {
    for (let i in this.data.playlist) {
      if (i == 0) { // i can be string ;_;
        continue
      }
      const item = this.data.playlist[i];
      if (this.data.filter.tag === '' || item.tags.includes(this.data.filter.tag)) {
        return i
      }
    }
    return -1
  }

  determineFirstIndex() {
    return this.data.playlist.findIndex(item => this.data.filter.tag === '' || item.tags.includes(this.data.filter.tag))
  }

  incStat(stat, idx = -1) {
    if (idx === -1) {
      idx = this.determineFirstIndex();
    }
    if (idx === -1) {
      return
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
      return
    }
    if (this.data.playlist.length > idx) {
      this.data.playlist[idx].hidevideo = visible ? false : true;
    }
    this.save();
    this.updateClients('video');
  }

  async durationUntilIndex(idx) {
    if (idx <= 0) {
      return 0
    }

    let durationTotalMs = 0;
    for (const item of this.data.playlist.slice(0, idx)) {
      const d = await this.loadYoutubeData(item.yt);
      durationTotalMs += fn.parseISO8601Duration(d.contentDetails.duration);
    }
    return durationTotalMs
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
        human: fn.humanDuration(durationTotal),
      },
    }
  }

  resetStats() {
    this.data.playlist = this.data.playlist.map(item => {
      item.plays = 0;
      item.goods = 0;
      item.bads = 0;
      return item
    });
    this.save();
    this.updateClients('resetStats');
  }

  playIdx(idx) {
    if (this.data.playlist.length === 0) {
      return
    }
    while (idx-- > 0)
      this.data.playlist.push(this.data.playlist.shift());

    this.save();
    this.updateClients('skip');
  }

  rmIdx(idx) {
    if (this.data.playlist.length === 0) {
      return
    }
    this.data.playlist.splice(idx, 1);
    this.save();
    if (idx === 0) {
      this.updateClients('remove');
    } else {
      this.updateClients('init');
    }
  }

  goodIdx(idx) {
    this.incStat('goods', idx);
    this.save();
    this.updateClients('like');
  }

  badIdx(idx) {
    this.incStat('bads', idx);
    this.save();
    this.updateClients('dislike');
  }

  async request(str) {
    await this.add(str, this.user.name);
  }

  findSongIdxByYoutubeId(youtubeId) {
    return this.data.playlist.findIndex(item => item.yt === youtubeId)
  }

  findSongIdxBySearchInOrder(str) {
    const split = str.split(/\s+/);
    const regexArgs = split.map(arg => arg.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'));
    const regex = new RegExp(regexArgs.join('.*'), 'i');
    return this.data.playlist.findIndex(item => item.title.match(regex))
  }

  findSongIdxBySearch(str) {
    const split = str.split(/\s+/);
    const regexArgs = split.map(arg => arg.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'));
    const regexes = regexArgs.map(arg => new RegExp(arg, 'i'));
    return this.data.playlist.findIndex(item => {
      for (const regex of regexes) {
        if (!item.title.match(regex)) {
          return false
        }
      }
      return true
    })
  }

  like() {
    this.incStat('goods');
    this.save();
    this.updateClients('like');
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
      return
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
        return tag === oldTag ? newTag : tag
      }))];
      return item
    });
    this.save();
    this.updateClients('tags');
  }

  rmTag(tag, idx = -1) {
    if (idx === -1) {
      idx = this.determineFirstIndex();
    }
    if (idx === -1) {
      return
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
    this.updateClients('dislike');
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
      return
    }
    const index = this.data.playlist.findIndex(item => item.plays === 0);
    if (index === -1) {
      // no unplayed songs left
      return
    }
    for (let i = 0; i < index; i++) {
      this.data.playlist.push(this.data.playlist.shift());
    }

    this.save();
    this.updateClients('skip');
  }

  clear() {
    this.data.playlist = [];
    this.save();
    this.updateClients('clear');
  }

  shuffle() {
    if (this.data.playlist.length < 3) {
      return
    }

    const rest = this.data.playlist.slice(1);
    this.data.playlist = [
      this.data.playlist[0],
      ...fn.shuffle(rest.filter(item => item.plays === 0)),
      ...fn.shuffle(rest.filter(item => item.plays > 0)),
    ];

    this.save();
    this.updateClients('shuffle');
  }

  move(oldIndex, newIndex) {
    if (oldIndex >= this.data.playlist.length) {
      return
    }
    if (newIndex >= this.data.playlist.length) {
      return
    }

    this.data.playlist = fn.arrayMove(
      this.data.playlist,
      oldIndex,
      newIndex
    );

    this.save();
    this.updateClients('move');
  }

  remove() {
    if (this.data.playlist.length === 0) {
      return
    }
    this.data.playlist.shift();
    this.save();
    this.updateClients('remove');
  }

  undo(username) {
    if (this.data.playlist.length === 0) {
      return false
    }
    if ((this.data.stacks[username] || []).length === 0) {
      return false
    }
    const youtubeId = this.data.stacks[username].pop();
    const idx = this.data.playlist
      .findIndex(item => item.yt === youtubeId && item.user === username);
    if (idx === -1) {
      return false
    }
    const item = this.data.playlist[idx];
    this.rmIdx(idx);
    return item
  }

  async songrequestCmd(command, client, target, context, msg) {
    const modOrUp = () => fn.isMod(context) || fn.isBroadcaster(context);

    const say = fn.sayFn(client, target);
    const answerAddRequest = async (addType, idx) => {
      const item = idx >= 0 ? this.data.playlist[idx] : null;
      let info;
      if (idx < 0) {
        info = ``;
      } else if (idx === 0) {
        info = `[Position ${idx + 1}, playing now]`;
      } else {
        const last_play = this.data.playlist[0].last_play || 0;
        const diffMs = last_play ? (new Date().getTime() - last_play) : 0;
        const diff = Math.round(diffMs / 1000) * 1000;
        const durationMs = await this.durationUntilIndex(idx) - diff;
        const timePrediction = durationMs <= 0 ? '' : `, will play in ~${fn.humanDuration(durationMs)}`;
        info = `[Position ${idx + 1}${timePrediction}]`;
      }

      if (addType === ADD_TYPE.ADDED) {
        return `🎵 Added "${item.title}" (${Youtube.getUrlById(item.yt)}) to the playlist! ${info}`
      } else if (addType === ADD_TYPE.REQUEUED) {
        return `🎵 "${item.title}" (${Youtube.getUrlById(item.yt)}) was already in the playlist and only moved up. ${info}`
      } else if (addType === ADD_TYPE.EXISTED) {
        return `🎵 "${item.title}" (${Youtube.getUrlById(item.yt)}) was already in the playlist. ${info}`
      } else {
        return `Could not process that song request`
      }
    };

    if (command.name === '!resr') {
      if (command.args.length === 0) {
        say(`Usage: !resr SEARCH`);
        return
      }
      const searchterm = command.args.join(' ');
      const { addType, idx } = await this.resr(searchterm);
      if (idx >= 0) {
        say(await answerAddRequest(addType, idx));
      } else {
        say(`Song not found in playlist`);
      }
      return
    }

    if (command.args.length === 0) {
      say(`Usage: !sr YOUTUBE-URL`);
      return
    }
    if (command.args.length === 1) {
      switch (command.args[0]) {
        case 'current':
          if (this.data.playlist.length === 0) {
            say(`Playlist is empty`);
            return
          }
          const cur = this.data.playlist[0];
          // todo: error handling, title output etc..
          say(`Currently playing: ${cur.title} (${Youtube.getUrlById(cur.yt)}, ${cur.plays}x plays, requested by ${cur.user})`);
          return
        case 'good':
          this.like();
          return
        case 'bad':
          this.dislike();
          return
        case 'prev':
          if (modOrUp()) {
            this.prev();
            return
          }
          break
        case 'hidevideo':
          if (modOrUp()) {
            this.videoVisibility(false);
            say(`Video is now hidden.`);
            return
          }
          break
        case 'showvideo':
          if (modOrUp()) {
            this.videoVisibility(true);
            say(`Video is now shown.`);
            return
          }
          break
        case 'next':
        case 'skip':
          if (modOrUp()) {
            this.next();
            return
          }
          break
        case 'jumptonew':
          if (modOrUp()) {
            this.jumptonew();
            return
          }
          break
        case 'pause':
          if (modOrUp()) {
            this.pause();
            return
          }
          break;
        case 'nopause':
        case 'unpause':
          if (modOrUp()) {
            this.unpause();
            return
          }
          break;
        case 'loop':
          if (modOrUp()) {
            this.loop();
            say('Now looping the current song');
            return
          }
          break;
        case 'noloop':
        case 'unloop':
          if (modOrUp()) {
            this.noloop();
            say('Stopped looping the current song');
            return
          }
          break;
        case 'stat':
        case 'stats':
          const stats = await this.stats(context['display-name']);
          let number = stats.count.byUser;
          const verb = stats.count.byUser === 1 ? 'was' : 'were';
          if (stats.count.byUser === 1) {
            number = 'one';
          } else if (stats.count.byUser === 0) {
            number = 'none';
          }
          const countStr = `There are ${stats.count.total} songs in the playlist, `
            + `${number} of which ${verb} requested by ${context['display-name']}.`;
          const durationStr = `The total duration of the playlist is ${stats.duration.human}.`;
          say([countStr, durationStr].join(' '));
          return
        case 'resetStats':
          if (modOrUp()) {
            this.resetStats();
            return
          }
          break
        case 'clear':
          if (modOrUp()) {
            this.clear();
            return
          }
          break
        case 'rm':
          if (modOrUp()) {
            this.remove();
            return
          }
          break
        case 'shuffle':
          if (modOrUp()) {
            this.shuffle();
            return
          }
          break
        case 'undo':
          const undid = this.undo(context['display-name']);
          if (!undid) {
            say(`Could not undo anything`);
          } else {
            say(`Removed "${undid.title}" from the playlist!`);
          }
          return
      }
    }
    if (command.args[0] === 'tag' || command.args[0] === 'addtag') {
      if (modOrUp()) {
        const tag = command.args.slice(1).join(' ');
        this.addTag(tag);
        say(`Added tag "${tag}"`);
      }
      return
    }
    if (command.args[0] === 'rmtag') {
      if (modOrUp()) {
        const tag = command.args.slice(1).join(' ');
        this.rmTag(tag);
        say(`Removed tag "${tag}"`);
      }
      return
    }
    if (command.args[0] === 'filter') {
      if (modOrUp()) {
        const tag = command.args.slice(1).join(' ');
        this.filter({ tag });
        if (tag !== '') {
          say(`Playing only songs tagged with "${tag}"`);
        } else {
          say(`Playing all songs`);
        }
      }
      return
    }

    const str = command.args.join(' ');
    const { addType, idx } = await this.add(str, context['display-name']);
    say(await answerAddRequest(addType, idx));
  }

  async loadYoutubeData(youtubeId) {
    let key = `youtubeData_${youtubeId}_20210717_2`;
    let d = this.cache.get(key);
    if (!d) {
      d = await Youtube.fetchDataByYoutubeId(youtubeId);
      this.cache.set(key, d);
    }
    return d
  }

  findInsertIndex() {
    let found = -1;
    for (let i = 0; i < this.data.playlist.length; i++) {
      if (this.data.playlist[i].plays === 0) {
        found = i;
      } else if (found >= 0) {
        break
      }
    }
    return (found === -1 ? 0 : found) + 1
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
    }
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
      }
    }

    if (insertIndex > idx) {
      insertIndex = insertIndex - 1;
    }

    if (insertIndex === idx) {
      return {
        addType: ADD_TYPE.EXISTED,
        idx: insertIndex,
      }
    }

    this.data.playlist = fn.arrayMove(this.data.playlist, idx, insertIndex);
    this.save();
    this.updateClients('add');
    return {
      addType: ADD_TYPE.REQUEUED,
      idx: insertIndex,
    }
  }

  async resr(str) {
    let idx = this.findSongIdxBySearchInOrder(str);
    if (idx < 0) {
      idx = this.findSongIdxBySearch(str);
    }

    if (idx < 0) {
      return {
        addType: ADD_TYPE.NOT_ADDED,
        insertIndex: -1,
      }
    }

    let insertIndex = this.findInsertIndex();

    if (insertIndex > idx) {
      insertIndex = insertIndex - 1;
    }

    if (insertIndex === idx) {
      return {
        addType: ADD_TYPE.EXISTED,
        idx: insertIndex,
      }
    }

    this.data.playlist = fn.arrayMove(this.data.playlist, idx, insertIndex);
    this.save();
    this.updateClients('add');
    return {
      addType: ADD_TYPE.REQUEUED,
      idx: insertIndex,
    }
  }
}

class DrawcastModule$1 {
  constructor(
    /** @type Db */ db,
    user,
    /** @type Variables */ variables,
    chatClient,
    /** @type TwitchHelixClient */ helixClient,
    storage,
    cache,
    /** @type WebServer */ ws,
    /** @type WebSocketServer */ wss,
  ) {
    this.user = user;
    this.variables = variables;
    this.wss = wss;
    this.storage = storage;
    this.name = 'vote';

    this.ws = ws;
    this.reinit();
  }

  reinit() {
    const data = this.storage.load(this.name, {
      votes: {},
    });
    this.data = data;
  }

  save() {
    this.storage.save(this.name, {
      votes: this.data.votes,
    });
  }

  widgets() {
    return {}
  }

  getRoutes() {
    return {}
  }

  saveCommands() {
    // pass
  }

  wsdata(eventName) {
    return {
      event: eventName,
      data: Object.assign({}, this.data),
    };
  }

  updateClient(eventName, ws) {
    this.wss.notifyOne([this.user.id], this.name, this.wsdata(eventName), ws);
  }

  updateClients(eventName) {
    this.wss.notifyAll([this.user.id], this.name, this.wsdata(eventName));
  }

  getWsEvents() {
    return {}
  }

  vote(type, thing, client, target, context) {
    const say = fn.sayFn(client, target);
    this.data.votes[type] = this.data.votes[type] || {};
    this.data.votes[type][context.username] = thing;
    say(`Thanks ${context.username}, registered your "${type}" vote: ${thing}`);
    this.save();
  }

  async playCmd(command, client, target, context, msg) {
    const say = fn.sayFn(client, target);
    if (command.args.length === 0) {
      say(`Usage: !play THING`);
      return
    }

    const thing = command.args.join(' ');
    const type = 'play';
    this.vote(type, thing, client, target, context);
  }

  async voteCmd(command, client, target, context, msg) {
    const say = fn.sayFn(client, target);

    // maybe open up for everyone, but for now use dedicated
    // commands like !play THING
    if (!fn.isMod(context) && !fn.isBroadcaster()) {
      say('Not allowed to execute !vote command');
    }

    if (command.args.length < 2) {
      say(`Usage: !vote TYPE THING`);
      return
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
        return b.users.length - a.users.length
      });

      const medals = ['🥇', '🥈', '🥉'];
      let i = 0;
      for (const item of list.slice(0, 3)) {
        say(`${medals[i]} ${item.value}: ${item.users.length} vote${item.users.length > 1 ? 's' : ''} (${item.users.join(', ')})`);
        i++;
      }
      return
    }

    if (command.args[0] === 'clear') {
      if (!fn.isBroadcaster(context)) {
        say('Not allowed to execute !vote clear');
      }
      const type = command.args[1];
      if (this.data.votes[type]) {
        delete this.data.votes[type];
      }
      this.save();
      say(`Cleared votes for "${type}". ✨`);
      return
    }

    const type = command.args[0];
    const thing = command.args.slice(1).join(' ');
    this.vote(type, thing, client, target, context);
  }

  getCommands() {
    return {
      '!vote': [{
        fn: this.voteCmd.bind(this),
      }],

      // make configurable
      '!play': [{
        fn: this.playCmd.bind(this),
      }],
    }
  }

  onChatMsg(client, target, context, msg) {
  }
}

class SpeechToTextModule {
  constructor(db, user, variables, chatClient, helixClient, storage, cache, ws, wss) {
    this.db = db;
    this.user = user;
    this.variables = variables;
    this.client = chatClient;
    this.storage = storage;
    this.cache = cache;
    this.ws = ws;
    this.wss = wss;
    this.name = 'speech-to-text';
    this.defaultSettings = {
      status: {
        enabled: false,
      },
      styles: {
        // page background color
        bgColor: '#ff00ff',
        // vertical align of text
        vAlign: 'bottom', // top|bottom

        // recognized text
        recognition: {
          fontFamily: 'sans-serif',
          fontSize: '30',
          fontWeight: '400',
          strokeWidth: '8',
          strokeColor: '#292929',
          color: '#ffff00',
        },

        // translated text
        translation: {
          fontFamily: 'sans-serif',
          fontSize: '30',
          fontWeight: '400',
          strokeWidth: '8',
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
    };
    this.reinit();
  }

  reinit() {
    this.data = this.storage.load(this.name, {
      settings: this.defaultSettings
    });
  }

  saveCommands() {
    // pass
  }

  widgets() {
    return {
      'speech-to-text': async (req, res, next) => {
        res.render('widget.spy', {
          title: 'Speech to Text Widget',
          page: 'speech-to-text',
          wsUrl: `${this.wss.connectstring()}/${this.name}`,
          widgetToken: req.params.widget_token,
        });
      },
    }
  }

  getRoutes() {
    return {}
  }

  wsdata(eventName) {
    return {
      event: eventName,
      data: Object.assign({}, this.data, { defaultSettings: this.defaultSettings }),
    };
  }

  updateClient(eventName, ws) {
    this.wss.notifyOne([this.user.id], this.name, this.wsdata(eventName), ws);
  }

  updateClients(eventName) {
    this.wss.notifyAll([this.user.id], this.name, this.wsdata(eventName));
  }

  getWsEvents() {
    return {
      'translate': async (ws, { text, src, dst }) => {
        const scriptId = config.modules.speechToText.google.scriptId;
        const query = `https://script.google.com/macros/s/${scriptId}/exec` + asQueryArgs({
          text: text,
          source: src,
          target: dst,
        });
        const respText = await getText(query);
        this.wss.notifyOne([this.user.id], this.name, {
          event: 'translated', data: {
            in: text,
            out: respText,
          }
        }, ws);
      },
      'conn': (ws) => {
        this.updateClient('init', ws);
      },
      'save': (ws, { settings }) => {
        this.data.settings = settings;
        this.storage.save(this.name, this.data);
        this.reinit();
        this.updateClients('init');
      },
    }
  }
  getCommands() {
    return {}
  }

  onChatMsg(client, target, context, msg) {
  }
}

class DrawcastModule {
    constructor(db, user, variables, chatClient, helixClient, storage, cache, ws, wss) {
        this.name = 'drawcast';
        this.defaultSettings = {
            submitButtonText: 'Submit',
            submitConfirm: '',
            canvasWidth: 720,
            canvasHeight: 405,
            customDescription: '',
            palette: [
                // row 1
                '#000000', '#808080', '#ff0000', '#ff8000', '#ffff00', '#00ff00',
                '#00ffff', '#0000ff', '#ff00ff', '#ff8080', '#80ff80',
                // row 2
                '#ffffff', '#c0c0c0', '#800000', '#804000', '#808000', '#008000',
                '#008080', '#000080', '#800080', '#8080ff', '#ffff80',
            ],
            displayDuration: 5000,
            displayLatestForever: false,
            displayLatestAutomatically: false,
            notificationSound: null,
            favorites: [],
        };
        this.user = user;
        this.wss = wss;
        this.storage = storage;
        this.ws = ws;
        this.tokens = new Tokens(db);
        this.data = this.reinit();
        this.images = this.loadAllImages().slice(0, 20);
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
        const data = this.storage.load(this.name, {
            settings: this.defaultSettings
        });
        if (!data.settings.palette) {
            data.settings.palette = this.defaultSettings.palette;
        }
        if (!data.settings.displayDuration) {
            data.settings.displayDuration = this.defaultSettings.displayDuration;
        }
        if (!data.settings.notificationSound) {
            data.settings.notificationSound = this.defaultSettings.notificationSound;
        }
        if (!data.settings.displayLatestForever) {
            data.settings.displayLatestForever = this.defaultSettings.displayLatestForever;
        }
        if (!data.settings.displayLatestAutomatically) {
            data.settings.displayLatestAutomatically = this.defaultSettings.displayLatestAutomatically;
        }
        if (!data.settings.favorites) {
            data.settings.favorites = [];
        }
        return {
            settings: data.settings
        };
    }
    widgets() {
        return {
            'drawcast_receive': async (req, res, next) => {
                res.render('widget.spy', {
                    title: 'Drawcast Widget',
                    page: 'drawcast_receive',
                    wsUrl: `${this.wss.connectstring()}/${this.name}`,
                    widgetToken: req.params.widget_token,
                });
            },
            'drawcast_draw': async (req, res, next) => {
                res.render('widget.spy', {
                    title: 'Drawcast Widget',
                    page: 'drawcast_draw',
                    wsUrl: `${this.wss.connectstring()}/${this.name}`,
                    widgetToken: req.params.widget_token,
                });
            },
        };
    }
    getRoutes() {
        return {
            get: {
                '/api/drawcast/all-images/': async (req, res, next) => {
                    const images = this.loadAllImages();
                    res.send(images);
                },
            },
        };
    }
    drawUrl() {
        const pubToken = this.tokens.getPubTokenForUserId(this.user.id).token;
        return this.ws.pubUrl(this.ws.widgetUrl('drawcast_draw', pubToken));
    }
    wsdata(eventName) {
        return {
            event: eventName,
            data: Object.assign({}, this.data, {
                defaultSettings: this.defaultSettings,
                drawUrl: this.drawUrl(),
                images: this.images
            }),
        };
    }
    updateClient(eventName, ws) {
        this.wss.notifyOne([this.user.id], this.name, this.wsdata(eventName), ws);
    }
    updateClients(eventName) {
        this.wss.notifyAll([this.user.id], this.name, this.wsdata(eventName));
    }
    getWsEvents() {
        return {
            'conn': (ws) => {
                this.updateClient('init', ws);
            },
            'post': (ws, data) => {
                const rel = `/uploads/drawcast/${this.user.id}`;
                const img = fn.decodeBase64Image(data.data.img);
                const name = `${(new Date()).toJSON()}-${fn.nonce(6)}.${fn.mimeToExt(img.type)}`;
                const path = `./data${rel}`;
                const imgpath = `${path}/${name}`;
                const imgurl = `${rel}/${name}`;
                fs.mkdirSync(path, { recursive: true });
                fs.writeFileSync(imgpath, img.data);
                this.images.unshift(imgurl);
                this.images = this.images.slice(0, 20);
                this.wss.notifyAll([this.user.id], this.name, {
                    event: data.event,
                    data: { img: imgurl },
                });
            },
            'save': (ws, { settings }) => {
                this.data.settings = settings;
                this.storage.save(this.name, this.data);
                this.data = this.reinit();
                this.updateClients('init');
            },
        };
    }
    getCommands() {
        return {};
    }
    onChatMsg(client, target, context, msg) {
    }
}

const __filename = fileURLToPath(import.meta.url);

const modules = [
  GeneralModule,
  SongrequestModule,
  DrawcastModule$1,
  SpeechToTextModule,
  DrawcastModule,
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

const eventHub = new EventHub();
const moduleManager = new ModuleManager();
const webSocketServer = new WebSocketServer(moduleManager, config.ws, auth);
const webServer = new WebServer(
  eventHub,
  db,
  userRepo,
  tokenRepo,
  mail,
  twitchChannelRepo,
  moduleManager,
  config.http,
  config.twitch,
  webSocketServer,
  auth
);

const run = async () => {
  const initForUser = (user) => {
    const variables = new Variables(db, user.id);
    const clientManager = new TwitchClientManager(
      eventHub,
      config.twitch,
      db,
      user,
      twitchChannelRepo,
      moduleManager,
      variables
    );
    const chatClient = clientManager.getChatClient();
    const helixClient = clientManager.getHelixClient();
    const moduleStorage = new ModuleStorage(db, user.id);
    for (const moduleClass of modules) {
      moduleManager.add(user.id, new moduleClass(
        db,
        user,
        variables,
        chatClient,
        helixClient,
        moduleStorage,
        cache,
        webServer,
        webSocketServer
      ));
    }
  };

  webSocketServer.listen();
  await webServer.listen();

  // one for each user
  for (const user of userRepo.all()) {
    initForUser(user);
  }

  eventHub.on('user_registration_complete', (user) => {
    initForUser(user);
  });
};

run();

const log = logger(__filename);
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
