import fs, { readFileSync } from 'fs';
import WebSocket from 'ws';
import fetch$1 from 'node-fetch';
import path, { dirname } from 'path';
import { fileURLToPath } from 'url';
import cookieParser from 'cookie-parser';
import express from 'express';
import crypto from 'crypto';
import multer from 'multer';
import cors from 'cors';
import * as pg from 'pg';
import tmi from 'tmi.js';
import jwt from 'jsonwebtoken';
import childProcess from 'child_process';

const absPath = (path) => new URL(path, import.meta.url);
const readJson = (path) => JSON.parse(String(readFileSync(path)));
const init = () => {
    const configFile = process.env.APP_CONFIG || 'config.json';
    if (configFile === '') {
        process.exit(2);
    }
    const config = readJson(configFile);
    config.twitch.auto_tags = readJson(absPath('./config_data/tags_auto.json'));
    config.twitch.manual_tags = readJson(absPath('./config_data/tags_manual.json'));
    return config;
};
const config = init();

class Repo {
    constructor(db) {
        this.db = db;
    }
}

const TABLE$a = 'robyottoko.token';
var TokenType;
(function (TokenType) {
    TokenType["API_KEY"] = "api_key";
    TokenType["AUTH"] = "auth";
    TokenType["PUB"] = "pub";
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
class Tokens extends Repo {
    async getByUserIdAndType(user_id, type) {
        return await this.db.get(TABLE$a, { user_id, type });
    }
    async insert(tokenInfo) {
        return await this.db.insert(TABLE$a, tokenInfo);
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
        return (await this.db.get(TABLE$a, { token, type })) || null;
    }
    async delete(token) {
        return await this.db.delete(TABLE$a, { token });
    }
    async generateAuthTokenForUserId(user_id) {
        return await this.createToken(user_id, TokenType.AUTH);
    }
}

class Auth {
    constructor(repos, canny) {
        this.repos = repos;
        this.canny = canny;
        // pass
    }
    async getTokenInfoByTokenAndType(token, type) {
        return await this.repos.token.getByTokenAndType(token, type);
    }
    async _getUserById(id) {
        return await this.repos.user.getById(id);
    }
    async getUserAuthToken(user_id) {
        return (await this.repos.token.generateAuthTokenForUserId(user_id)).token;
    }
    async destroyToken(token) {
        return await this.repos.token.delete(token);
    }
    async _determineApiUserData(token) {
        if (token === null) {
            return null;
        }
        const tokenInfo = await this.getTokenInfoByTokenAndType(token, TokenType.AUTH);
        if (!tokenInfo) {
            return null;
        }
        const user = await this.repos.user.getById(tokenInfo.user_id);
        if (!user) {
            return null;
        }
        return {
            token: tokenInfo.token,
            user: {
                id: user.id,
                name: user.name,
                email: user.email,
                groups: await this.repos.user.getGroups(user.id),
            },
            cannyToken: this.canny.createToken(user),
        };
    }
    addAuthInfoMiddleware() {
        return async (req, _res, next) => {
            const token = req.cookies['x-token'] || null;
            const userData = await this._determineApiUserData(token);
            req.token = userData?.token || null;
            req.user = userData?.user || null;
            next();
        };
    }
    async userFromWidgetToken(token, type) {
        const tokenInfo = await this.getTokenInfoByTokenAndType(token, `widget_${type}`);
        if (tokenInfo) {
            return await this._getUserById(tokenInfo.user_id);
        }
        return null;
    }
    async userFromPubToken(token) {
        const tokenInfo = await this.getTokenInfoByTokenAndType(token, TokenType.PUB);
        if (tokenInfo) {
            return await this._getUserById(tokenInfo.user_id);
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
    async updateForUser(userId, changedUser) {
        const promises = [];
        for (const mod of this.all(userId)) {
            promises.push(mod.userChanged(changedUser));
        }
        await Promise.all(promises);
    }
}

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
const MONTHS_EN = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
const MONTHS_DE = ['Januar', 'Februar', 'März', 'April', 'Mai', 'Juni', 'Juli', 'August', 'September', 'Oktober', 'November', 'Dezember'];
const dateformat = (format, date) => {
    return format.replace(/(YYYY|MM|DD|hh|mm|ss|Month(?:\.(?:de|en))?)/g, (m0, m1) => {
        switch (m1) {
            case 'YYYY': return pad(date.getFullYear(), '0000');
            case 'MM': return pad(date.getMonth() + 1, '00');
            case 'DD': return pad(date.getDate(), '00');
            case 'hh': return pad(date.getHours(), '00');
            case 'mm': return pad(date.getMinutes(), '00');
            case 'ss': return pad(date.getSeconds(), '00');
            case 'Month.de': return MONTHS_DE[date.getMonth()];
            case 'Month.en':
            case 'Month': return MONTHS_EN[date.getMonth()];
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
    let text = '';
    const possible = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
    for (let i = 0; i < length; i++) {
        text += possible.charAt(Math.floor(Math.random() * possible.length));
    }
    return text;
}
const mustParseHumanDuration = (duration, allowNegative = false) => {
    if (duration === '') {
        throw new Error('unable to parse duration');
    }
    const d = `${duration}`.trim();
    if (!d) {
        throw new Error('unable to parse duration');
    }
    const checkNegative = (val) => {
        if (val < 0 && !allowNegative) {
            throw new Error('negative value not allowed');
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
            throw new Error('unable to parse duration');
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
        throw new Error('unable to parse duration');
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
const arrayIncludesIgnoreCase = (arr, val) => {
    if (arr.length === 0) {
        return false;
    }
    const valLowercase = val.toLowerCase();
    for (const item of arr) {
        if (item.toLowerCase() === valLowercase) {
            return true;
        }
    }
    return false;
};
const clamp = (min, val, max) => {
    return Math.max(min, Math.min(max, val));
};
const withoutLeading = (string, prefix) => {
    if (prefix === '') {
        return string;
    }
    let tmp = string;
    while (tmp.startsWith(prefix)) {
        tmp = tmp.substring(prefix.length);
    }
    return tmp;
};
const getRandomInt = (min, max) => {
    min = Math.ceil(min);
    max = Math.floor(max);
    return Math.floor(Math.random() * (max - min + 1)) + min;
};
const getRandom = (array) => {
    return array[getRandomInt(0, array.length - 1)];
};
const daysUntil = (s, templateN, template1, template0, templateErr) => {
    const date00 = (date) => new Date(`${pad(date.getFullYear(), '0000')}-${pad(date.getMonth() + 1, '00')}-${pad(date.getDate(), '00')}`);
    try {
        const date = new Date(s);
        if (isNaN(date.getTime())) {
            return templateErr;
        }
        const now = new Date();
        const diffMs = date00(date).getTime() - date00(now).getTime();
        const days = Math.ceil(diffMs / 1000 / 60 / 60 / 24);
        let template = '{days}';
        if (days === 0) {
            template = template0;
        }
        else if (days === 1) {
            template = template1;
        }
        else {
            template = templateN;
        }
        return template.replace('{days}', `${days}`);
    }
    catch (e) {
        return templateErr;
    }
};

var CommandTriggerType;
(function (CommandTriggerType) {
    CommandTriggerType["COMMAND"] = "command";
    CommandTriggerType["REWARD_REDEMPTION"] = "reward_redemption";
    CommandTriggerType["FOLLOW"] = "follow";
    CommandTriggerType["SUB"] = "sub";
    CommandTriggerType["GIFTSUB"] = "giftsub";
    CommandTriggerType["BITS"] = "bits";
    CommandTriggerType["RAID"] = "raid";
    CommandTriggerType["TIMER"] = "timer";
    CommandTriggerType["FIRST_CHAT"] = "first_chat";
})(CommandTriggerType || (CommandTriggerType = {}));
var CommandEffectType;
(function (CommandEffectType) {
    CommandEffectType["VARIABLE_CHANGE"] = "variable_change";
    CommandEffectType["CHAT"] = "chat";
    CommandEffectType["DICT_LOOKUP"] = "dict_lookup";
    CommandEffectType["EMOTES"] = "emotes";
    CommandEffectType["MEDIA"] = "media";
    CommandEffectType["MADOCHAN"] = "madochan";
    CommandEffectType["SET_CHANNEL_TITLE"] = "set_channel_title";
    CommandEffectType["SET_CHANNEL_GAME_ID"] = "set_channel_game_id";
    CommandEffectType["ADD_STREAM_TAGS"] = "add_stream_tags";
    CommandEffectType["REMOVE_STREAM_TAGS"] = "remove_stream_tags";
    CommandEffectType["CHATTERS"] = "chatters";
    CommandEffectType["COUNTDOWN"] = "countdown";
    CommandEffectType["MEDIA_VOLUME"] = "media_volume";
    CommandEffectType["ROULETTE"] = "roulette";
})(CommandEffectType || (CommandEffectType = {}));
var CommandAction;
(function (CommandAction) {
    // general
    CommandAction["GENERAL"] = "general";
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
    CommandAction["SR_MOVE_TAG_UP"] = "sr_move_tag_up";
})(CommandAction || (CommandAction = {}));
var CountdownActionType;
(function (CountdownActionType) {
    CountdownActionType["TEXT"] = "text";
    CountdownActionType["MEDIA"] = "media";
    CountdownActionType["DELAY"] = "delay";
})(CountdownActionType || (CountdownActionType = {}));
var MODULE_NAME;
(function (MODULE_NAME) {
    MODULE_NAME["CORE"] = "core";
    MODULE_NAME["AVATAR"] = "avatar";
    MODULE_NAME["DRAWCAST"] = "drawcast";
    MODULE_NAME["GENERAL"] = "general";
    MODULE_NAME["POMO"] = "pomo";
    MODULE_NAME["SR"] = "sr";
    MODULE_NAME["SPEECH_TO_TEXT"] = "speech-to-text";
    MODULE_NAME["VOTE"] = "vote";
})(MODULE_NAME || (MODULE_NAME = {}));
var WIDGET_TYPE;
(function (WIDGET_TYPE) {
    WIDGET_TYPE["SR"] = "sr";
    WIDGET_TYPE["MEDIA"] = "media";
    WIDGET_TYPE["EMOTE_WALL"] = "emote_wall";
    WIDGET_TYPE["SPEECH_TO_TEXT_CONTROL"] = "speech-to-text";
    WIDGET_TYPE["SPEECH_TO_TEXT_RECEIVE"] = "speech-to-text_receive";
    WIDGET_TYPE["AVATAR_CONTROL"] = "avatar";
    WIDGET_TYPE["AVATAR_RECEIVE"] = "avatar_receive";
    WIDGET_TYPE["DRAWCAST_RECEIVE"] = "drawcast_receive";
    WIDGET_TYPE["DRAWCAST_DRAW"] = "drawcast_draw";
    WIDGET_TYPE["DRAWCAST_CONTROL"] = "drawcast_control";
    WIDGET_TYPE["POMO"] = "pomo";
    WIDGET_TYPE["ROULETTE"] = "roulette";
})(WIDGET_TYPE || (WIDGET_TYPE = {}));

const widgets = [
    {
        type: WIDGET_TYPE.SR,
        module: MODULE_NAME.SR,
        title: 'Song Request',
        hint: 'Browser source, or open in browser and capture window',
        pub: false,
    },
    {
        type: WIDGET_TYPE.MEDIA,
        module: MODULE_NAME.GENERAL,
        title: 'Media',
        hint: 'Browser source, or open in browser and capture window',
        pub: false,
    },
    {
        type: WIDGET_TYPE.EMOTE_WALL,
        module: MODULE_NAME.GENERAL,
        title: 'Emote Wall',
        hint: 'Browser source, or open in browser and capture window',
        pub: false,
    },
    {
        type: WIDGET_TYPE.SPEECH_TO_TEXT_CONTROL,
        module: MODULE_NAME.SPEECH_TO_TEXT,
        title: 'Speech-to-Text',
        hint: 'Google Chrome + window capture',
        pub: false,
    },
    {
        type: WIDGET_TYPE.SPEECH_TO_TEXT_RECEIVE,
        module: MODULE_NAME.SPEECH_TO_TEXT,
        title: 'Speech-to-Text (receive)',
        hint: 'Browser source, or open in browser and capture window',
        pub: false,
    },
    {
        type: WIDGET_TYPE.AVATAR_CONTROL,
        module: MODULE_NAME.AVATAR,
        title: 'Avatar (control)',
        hint: '???',
        pub: false,
    },
    {
        type: WIDGET_TYPE.AVATAR_RECEIVE,
        module: MODULE_NAME.AVATAR,
        title: 'Avatar (receive)',
        hint: 'Browser source, or open in browser and capture window',
        pub: false,
    },
    {
        type: WIDGET_TYPE.DRAWCAST_RECEIVE,
        module: MODULE_NAME.DRAWCAST,
        title: 'Drawcast (Overlay)',
        hint: 'Browser source, or open in browser and capture window',
        pub: false,
    },
    {
        type: WIDGET_TYPE.DRAWCAST_DRAW,
        module: MODULE_NAME.DRAWCAST,
        title: 'Drawcast (Draw)',
        hint: 'Open this to draw (or give to viewers to let them draw)',
        pub: true,
    },
    {
        type: WIDGET_TYPE.DRAWCAST_CONTROL,
        module: MODULE_NAME.DRAWCAST,
        title: 'Drawcast (Control)',
        hint: 'Open this to control certain actions of draw (for example permit drawings)',
        pub: false,
    },
    {
        type: WIDGET_TYPE.POMO,
        module: MODULE_NAME.POMO,
        title: 'Pomo',
        hint: 'Browser source, or open in browser and capture window',
        pub: false,
    },
    {
        type: WIDGET_TYPE.ROULETTE,
        module: MODULE_NAME.GENERAL,
        title: 'Roulette',
        hint: 'Browser source, or open in browser and capture window',
        pub: false,
    },
];
const moduleByWidgetType = (widgetType) => {
    const found = widgets.find((w) => w.type === widgetType);
    return found ? found.module : null;
};
class Widgets {
    constructor(repos) {
        this.repos = repos;
        this._widgetUrl = (type, token) => {
            return `/widget/${type}/${token}/`;
        };
        // pass
    }
    async createWidgetUrl(type, userId) {
        let t = await this.repos.token.getByUserIdAndType(userId, `widget_${type}`);
        if (t) {
            await this.repos.token.delete(t.token);
        }
        t = await this.repos.token.createToken(userId, `widget_${type}`);
        return this._widgetUrl(type, t.token);
    }
    async widgetUrlByTypeAndUserId(type, userId) {
        const t = await this.repos.token.getByUserIdAndType(userId, `widget_${type}`);
        if (t) {
            return this._widgetUrl(type, t.token);
        }
        return await this.createWidgetUrl(type, userId);
    }
    async pubUrl(target) {
        const row = await this.repos.pub.getByTarget(target);
        let id;
        if (!row) {
            do {
                id = nonce(6);
            } while (await this.repos.pub.getById(id));
            await this.repos.pub.insert({ id, target });
        }
        else {
            id = row.id;
        }
        return `/pub/${id}`;
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
                module: w.module,
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

// https://stackoverflow.com/a/59854446/392905
const delay = (ms) => new Promise((resolve) => setTimeout(() => resolve(), ms));
const retryFetch = async (url, opts, retries = 3, retryDelay = 1000, timeout = 0) => {
    return new Promise((resolve, reject) => {
        if (timeout) {
            setTimeout(() => reject('error: timeout'), timeout);
        }
        const wrapper = (n) => {
            fetch$1(url, opts)
                .then((res) => resolve(res))
                .catch(async (err) => {
                if (n > 0) {
                    await delay(retryDelay);
                    wrapper(--n);
                }
                else {
                    reject(err);
                }
            });
        };
        wrapper(retries);
    });
};
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
    return await retryFetch(url, options);
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

const log$F = logger('fn.ts');
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
const safeFileName = (string) => {
    return string.replace(/[^a-zA-Z0-9.-]/g, '_');
};
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
    const targets = target ? [target] : (client.getOptions().channels || []);
    targets.forEach(t => {
        // TODO: fix this somewhere else?
        // client can only say things in lowercase channels
        t = t.toLowerCase();
        log$F.info(`saying in ${t}: ${msg}`);
        client.say(t, msg).catch((e) => {
            log$F.info(e);
        });
    });
};
const parseCommandFromTriggerAndMessage = (msg, trigger) => {
    if (trigger.type !== 'command') {
        return null;
    }
    return parseCommandFromCmdAndMessage(msg, trigger.data.command);
};
const normalizeChatMessage = (text) => {
    // strip control chars
    text = text.replace(/\p{C}/gu, '');
    // other common tasks are to normalize newlines and other whitespace
    // normalize newline
    text = text.replace(/\n\r/g, '\n');
    text = text.replace(/\p{Zl}/gu, '\n');
    text = text.replace(/\p{Zp}/gu, '\n');
    // normalize space
    text = text.replace(/\p{Zs}/gu, ' ');
    return text.trim();
};
const parseCommandFromCmdAndMessage = (msg, command) => {
    if (msg === command.value) {
        return { name: command.value, args: [] };
    }
    if (command.match === 'startsWith' && msg.startsWith(command.value + ' ')) {
        const name = msg.substring(0, command.value.length).trim();
        const args = msg.substring(command.value.length).trim().split(' ').filter(s => !!s);
        return { name, args };
    }
    if (command.match === 'anywhere'
        && (msg.startsWith(command.value + ' ')
            || msg.endsWith(' ' + command.value)
            || msg.includes(' ' + command.value + ' '))) {
        return { name: command.value, args: [] };
    }
    return null;
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
const getTwitchUser = async (usernameOrDisplayname, helixClient, bot) => {
    const twitchUser = await helixClient.getUserByName(usernameOrDisplayname);
    if (twitchUser) {
        return twitchUser;
    }
    // no twitchUser found, maybe the username is not the username but the display name
    // look up the username in the local chat log
    // TODO: keep a record of userNames -> userDisplayNames in db instead
    //       of relying on the chat log
    const username = await bot.getRepos().chatLog.getUsernameByUserDisplayName(usernameOrDisplayname);
    if (username === null || username === usernameOrDisplayname) {
        return null;
    }
    return await helixClient.getUserByName(username);
};
const doReplacements = async (text, rawCmd, context, originalCmd, bot, user) => {
    const doReplace = async (value) => await doReplacements(value, rawCmd, context, originalCmd, bot, user);
    const replaces = [
        {
            regex: /\$args(?:\((\d*)(:?)(\d*)\))?/g,
            replacer: async (_m0, m1, m2, m3) => {
                if (!rawCmd) {
                    return '';
                }
                let from = 0;
                let to = rawCmd.args.length;
                if (m1 !== '' && m1 !== undefined) {
                    from = parseInt(m1, 10);
                    to = from;
                }
                if (m2 !== '' && m1 !== undefined) {
                    to = rawCmd.args.length - 1;
                }
                if (m3 !== '' && m1 !== undefined) {
                    to = parseInt(m3, 10);
                }
                if (from === to) {
                    const index = from;
                    if (index < rawCmd.args.length) {
                        return rawCmd.args[index];
                    }
                    return '';
                }
                return rawCmd.args.slice(from, to + 1).join(' ');
            },
        },
        {
            regex: /\$daysuntil\("([^"]+)"\)/g,
            replacer: async (_m0, m1) => {
                return daysUntil(m1, '{days}', '{days}', '{days}', '???');
            },
        },
        {
            regex: /\$daysuntil\("([^"]+)",\s*?"([^"]*)"\s*,\s*?"([^"]*)"\s*,\s*?"([^"]*)"\s*\)/g,
            replacer: async (_m0, m1, m2, m3, m4) => {
                return daysUntil(m1, m2, m3, m4, '???');
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
                const val = v ? v.value : (await bot.getRepos().variables.get(user.id, m1));
                return val === null ? '' : String(val);
            },
        },
        {
            regex: /\$bot\.(message|version|date|website|github|features)/g,
            replacer: async (_m0, m1) => {
                if (!bot) {
                    return '';
                }
                if (m1 === 'message') {
                    return 'Robyottoko is a versatile twitch '
                        + 'bot, containing features like media commands, timers, translation, '
                        + 'widget for user-submitted drawings, captions (speech-to-text), '
                        + 'png-tuber and song requests. Get it connected to your twitch '
                        + 'channel for free at https://hyottoko.club 🤖';
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
                    return 'this versatile twitch bot has features like media commands, timers, translation, widget for user-submitted drawings, captions (speech-to-text), png-tuber and song requests';
                }
                return '';
            },
        },
        {
            regex: /\$bits\.amount/g,
            replacer: async (_m0) => {
                return `${context?.extra?.bits?.amount || '<unknown>'}`;
            },
        },
        {
            regex: /\$raiders\.amount/g,
            replacer: async (_m0) => {
                return `${context?.extra?.raiders?.amount || '<unknown>'}`;
            },
        },
        {
            regex: /\$giftsubs\.amount/g,
            replacer: async (_m0) => {
                return `${context?.extra?.giftsubs?.amount || '<unknown>'}`;
            },
        },
        {
            regex: /\$time\.([a-z]+(\/[a-z]+)?)/ig,
            replacer: async (_m0, m1) => {
                return await bot?.getTimeApi().getTimeAtTimezone(m1) || '';
            },
        },
        {
            regex: /\$user(?:\(([^)]+)\)|())\.(name|username|twitch_url|profile_image_url|recent_clip_url|last_stream_category)/g,
            replacer: async (_m0, m1, m2, m3) => {
                if (!context) {
                    return '';
                }
                const username = m1 || m2 || context.username || '';
                if (username === context.username && m3 === 'name') {
                    return String(context['display-name']);
                }
                if (username === context.username && m3 === 'username') {
                    return String(context.username);
                }
                if (username === context.username && m3 === 'twitch_url') {
                    return String(`twitch.tv/${context.username}`);
                }
                if (!bot || !user) {
                    log$F.info('no bot, no user, no watch');
                    return '';
                }
                const helixClient = bot.getUserTwitchClientManager(user).getHelixClient();
                if (!helixClient) {
                    return '';
                }
                const twitchUser = await getTwitchUser(username, helixClient, bot);
                if (!twitchUser) {
                    log$F.info('no twitch user found', username);
                    return '';
                }
                if (m3 === 'name') {
                    return String(twitchUser.display_name);
                }
                if (m3 === 'username') {
                    return String(twitchUser.login);
                }
                if (m3 === 'twitch_url') {
                    return String(`twitch.tv/${twitchUser.login}`);
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
                    const url = await doReplace(m1);
                    // both of getText and JSON.parse can fail, so everything in a single try catch
                    const resp = await xhr.get(url);
                    const txt = await resp.text();
                    return String(JSON.parse(txt)[m2]);
                }
                catch (e) {
                    log$F.error(e);
                    return '';
                }
            },
        },
        {
            regex: /\$customapi\(([^$)]*)\)/g,
            replacer: async (_m0, m1) => {
                try {
                    const url = await doReplace(m1);
                    const resp = await xhr.get(url);
                    return await resp.text();
                }
                catch (e) {
                    log$F.error(e);
                    return '';
                }
            },
        },
        {
            regex: /\$urlencode\(([^$)]*)\)/g,
            replacer: async (_m0, m1) => {
                const value = await doReplace(m1);
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
    return str.normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/\u0142/g, 'l');
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
const getChannelPointsCustomRewards = async (bot, user) => {
    const helixClient = bot.getUserTwitchClientManager(user).getHelixClient();
    if (!helixClient) {
        log$F.info('getChannelPointsCustomRewards: no helix client');
        return {};
    }
    return await helixClient.getAllChannelPointsCustomRewards(bot, user);
};
const getUserTypeInfo = async (bot, user, userId) => {
    const info = { mod: false, subscriber: false, vip: false };
    const helixClient = bot.getUserTwitchClientManager(user).getHelixClient();
    if (!helixClient) {
        return info;
    }
    const accessToken = await bot.getRepos().oauthToken.getMatchingAccessToken(user);
    if (!accessToken) {
        return info;
    }
    info.mod = await helixClient.isUserModerator(accessToken, user.twitch_id, userId);
    info.subscriber = await helixClient.isUserSubscriber(accessToken, user.twitch_id, userId);
    info.vip = await helixClient.isUserVip(accessToken, user.twitch_id, userId);
    return info;
};
const uniqId = () => {
    return Date.now().toString(36) + Math.random().toString(36).substring(2);
};
var fn = {
    uniqId,
    getUserTypeInfo,
    logger,
    mimeToExt,
    decodeBase64Image,
    safeFileName,
    sayFn,
    normalizeChatMessage,
    parseCommandFromTriggerAndMessage,
    parseCommandFromCmdAndMessage,
    sleep,
    fnRandom,
    parseISO8601Duration,
    doReplacements,
    joinIntoChunks,
    findIdxFuzzy,
    findIdxBySearchExactPart,
    findIdxBySearchInOrder,
    findIdxBySearch,
    getChannelPointsCustomRewards,
};

const log$E = logger('WebSocketServer.ts');
const determineUserIdAndModuleName = async (basePath, requestUrl, socket, bot) => {
    const relativePath = requestUrl.substring(basePath.length) || '';
    const relpath = withoutLeading(relativePath, '/');
    if (requestUrl.indexOf(basePath) !== 0) {
        return { userId: null, moduleName: null };
    }
    const widgetPrefix = 'widget_';
    const widgetModule = moduleByWidgetType(relpath.startsWith(widgetPrefix) ? relpath.substring(widgetPrefix.length) : '');
    const tokenType = widgetModule ? relpath : null;
    const tmpModuleName = widgetModule || relpath;
    const moduleName = Object.values(MODULE_NAME).includes(tmpModuleName) ? tmpModuleName : null;
    const token = socket.protocol;
    const tokenInfo = await bot.getAuth().wsTokenFromProtocol(token, tokenType);
    const userId = tokenInfo ? tokenInfo.user_id : null;
    return { userId, moduleName };
};
class WebSocketServer {
    constructor() {
        this._websocketserver = null;
    }
    listen(bot) {
        this._websocketserver = new WebSocket.Server(bot.getConfig().ws);
        this._websocketserver.on('connection', async (socket, request) => {
            // note: here the socket is already set in _websocketserver.clients !
            // but it has no user_id or module set yet!
            const basePath = new URL(bot.getConfig().ws.connectstring).pathname;
            const requestUrl = request.url || '';
            // userId is the id of the OWNER of the widget
            // it is NOT the id of the user actually visiting that page right now
            const { userId, moduleName } = await determineUserIdAndModuleName(basePath, requestUrl, socket, bot);
            socket.user_id = userId;
            socket.module = moduleName;
            socket.id = uniqId();
            log$E.info({
                moduleName,
                socket: { protocol: socket.protocol },
            }, 'added socket');
            log$E.info({
                count: this.sockets().filter(s => s.module === socket.module).length,
            }, 'socket_count');
            socket.on('close', () => {
                log$E.info({
                    moduleName,
                    socket: { protocol: socket.protocol },
                }, 'removed socket');
                log$E.info({
                    count: this.sockets().filter(s => s.module === socket.module).length,
                }, 'socket count');
            });
            if (!socket.user_id) {
                log$E.info({
                    requestUrl,
                    socket: { protocol: socket.protocol },
                }, 'not found token');
                socket.close();
                return;
            }
            if (!socket.module) {
                log$E.info({ requestUrl }, 'bad request url');
                socket.close();
                return;
            }
            // user connected
            bot.getEventHub().emit('wss_user_connected', socket);
            const m = bot.getModuleManager().get(socket.user_id, socket.module);
            // log.info('found a module?', moduleName, !!m)
            if (m) {
                const evts = m.getWsEvents();
                if (evts && evts['conn']) {
                    // log.info('connected!', moduleName, !!m)
                    evts['conn'](socket);
                }
            }
            socket.on('message', (message) => {
                const dataStr = String(message);
                if (dataStr === 'PING') {
                    socket.send('PONG');
                    return;
                }
                try {
                    const unknownData = message;
                    const d = JSON.parse(unknownData);
                    if (m && d.event) {
                        const evts = m.getWsEvents();
                        if (evts && evts[d.event]) {
                            evts[d.event](socket, d);
                        }
                    }
                }
                catch (e) {
                    log$E.error({ e }, 'socket on message');
                }
            });
            socket.send('SERVER_INIT');
        });
    }
    isUserConnected(user_id) {
        return !!this.sockets().find(s => s.user_id === user_id);
    }
    _notify(socket, data) {
        log$E.info({ user_id: socket.user_id, module: socket.module, event: data.event }, 'notifying');
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
            log$E.error({
                socket: {
                    user_id: socket.user_id,
                    module: socket.module,
                },
                user_ids,
                moduleName,
                isConnectedSocket,
            }, 'tried to notify invalid socket');
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

const log$D = logger('TwitchHelixClient.ts');
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
    log$D.warn('retrying with refreshed token');
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
                log$D.warn({ txt }, 'unable to get access_token by code');
                return null;
            }
            return (await resp.json());
        }
        catch (e) {
            log$D.error({ url, e });
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
                log$D.warn({ txt }, 'tried to refresh access_token with an invalid refresh token');
                return null;
            }
            if (!resp.ok) {
                const txt = await resp.text();
                log$D.warn({ txt }, 'unable to refresh access_token');
                return null;
            }
            return (await resp.json());
        }
        catch (e) {
            log$D.error({ url, e });
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
                log$D.warn({ txt }, 'unable to get access_token');
                return '';
            }
            json = (await resp.json());
            return json.access_token;
        }
        catch (e) {
            log$D.error({ url, json, e });
            return '';
        }
    }
    // https://dev.twitch.tv/docs/irc/emotes
    async getChannelEmotes(broadcasterId) {
        // eg. /chat/emotes?broadcaster_id=141981764
        const url = apiUrl('/chat/emotes') + asQueryArgs({ broadcaster_id: broadcasterId });
        let json;
        try {
            const resp = await xhr.get(url, await this.withAuthHeaders());
            json = (await resp.json());
            return json;
        }
        catch (e) {
            log$D.error({ url, json, e });
            return null;
        }
    }
    // https://dev.twitch.tv/docs/irc/emotes
    async getGlobalEmotes() {
        const url = apiUrl('/chat/emotes/global');
        let json;
        try {
            const resp = await xhr.get(url, await this.withAuthHeaders());
            json = (await resp.json());
            return json;
        }
        catch (e) {
            log$D.error({ url, json, e });
            return null;
        }
    }
    async getUser(accessToken) {
        const url = apiUrl('/users');
        let json;
        try {
            const resp = await xhr.get(url, withHeaders(this._authHeaders(accessToken), {}));
            json = (await resp.json());
            return json.data[0];
        }
        catch (e) {
            log$D.error({ url, json, e });
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
            log$D.error({ url, json, e });
            return null;
        }
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
            return getRandom(filtered);
        }
        catch (e) {
            log$D.error({ url, json, e });
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
            log$D.error({ url, json, e });
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
            log$D.error({ url, e });
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
            log$D.error({ url, e });
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
            log$D.error({ url, e });
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
            log$D.error({ url, json });
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
            log$D.error({ url, json });
            return null;
        }
    }
    // https://dev.twitch.tv/docs/api/reference#modify-channel-information
    async modifyChannelInformation(accessToken, data, bot, user) {
        const url = apiUrl('/channels') + asQueryArgs({ broadcaster_id: user.twitch_id });
        const req = async (token) => {
            return await xhr.patch(url, withHeaders(this._authHeaders(token), asJson(data)));
        };
        try {
            return await executeRequestWithRetry(accessToken, req, bot, user);
        }
        catch (e) {
            log$D.error({ url, e });
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
            log$D.error({ url, e });
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
            log$D.error({ url, e });
            return null;
        }
    }
    async getAllChannelPointsCustomRewards(bot, user) {
        const rewards = {};
        if (!user.twitch_id || !user.twitch_login) {
            log$D.info('getAllChannelPointsCustomRewards: no twitch id and login');
            return rewards;
        }
        const accessToken = await bot.getRepos().oauthToken.getMatchingAccessToken(user);
        if (!accessToken) {
            log$D.info('getAllChannelPointsCustomRewards: no access token');
            return rewards;
        }
        const res = await this.getChannelPointsCustomRewards(accessToken, user.twitch_id, bot, user);
        if (res) {
            rewards[user.twitch_login] = res.data.map(entry => entry.title);
        }
        return rewards;
    }
    // https://dev.twitch.tv/docs/api/reference#replace-stream-tags
    async replaceStreamTags(accessToken, tagIds, bot, user) {
        const url = apiUrl('/streams/tags') + asQueryArgs({ broadcaster_id: user.twitch_id });
        const req = async (token) => {
            return await xhr.put(url, withHeaders(this._authHeaders(token), asJson({ tag_ids: tagIds })));
        };
        try {
            return await executeRequestWithRetry(accessToken, req, bot, user);
        }
        catch (e) {
            log$D.error({ url, e });
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
    // https://dev.twitch.tv/docs/api/reference#get-broadcaster-subscriptions
    async isUserSubscriber(accessToken, broadcasterId, userId) {
        const url = apiUrl('/subscriptions') + asQueryArgs({ broadcaster_id: broadcasterId, user_id: userId });
        try {
            const resp = await xhr.get(url, withHeaders(this._authHeaders(accessToken), {}));
            const json = await resp.json();
            return json.data.length > 0;
        }
        catch (e) {
            log$D.error({ url, e, broadcasterId, userId });
            return false;
        }
    }
    // https://dev.twitch.tv/docs/api/reference#get-vips
    async isUserVip(accessToken, broadcasterId, userId) {
        const url = apiUrl('/channels/vips') + asQueryArgs({ broadcaster_id: broadcasterId, user_id: userId });
        try {
            const resp = await xhr.get(url, withHeaders(this._authHeaders(accessToken), {}));
            const json = await resp.json();
            return json.data.length > 0;
        }
        catch (e) {
            log$D.error({ url, e, broadcasterId, userId });
            return false;
        }
    }
    // https://dev.twitch.tv/docs/api/reference#get-moderators
    async isUserModerator(accessToken, broadcasterId, userId) {
        const url = apiUrl('/moderation/moderators') + asQueryArgs({ broadcaster_id: broadcasterId, user_id: userId });
        try {
            const resp = await xhr.get(url, withHeaders(this._authHeaders(accessToken), {}));
            const json = await resp.json();
            return json.data.length > 0;
        }
        catch (e) {
            log$D.error({ url, e, broadcasterId, userId });
            return false;
        }
    }
}

const log$C = logger('oauth.ts');
/**
 * Tries to refresh the access token and returns the new token
 * if successful, otherwise null.
 */
const tryRefreshAccessToken = async (accessToken, bot, user) => {
    const client = bot.getUserTwitchClientManager(user).getHelixClient();
    if (!client) {
        return null;
    }
    if (!user.twitch_id) {
        return null;
    }
    // try to refresh the token, if possible
    const row = await bot.getRepos().oauthToken.getByAccessToken(accessToken);
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
    await bot.getRepos().oauthToken.insert({
        user_id: user.id,
        channel_id: user.twitch_id,
        access_token: refreshResp.access_token,
        refresh_token: refreshResp.refresh_token,
        scope: refreshResp.scope.join(','),
        token_type: refreshResp.token_type,
        expires_at: new Date(new Date().getTime() + refreshResp.expires_in * 1000),
    });
    log$C.info('tryRefreshAccessToken - refreshed an access token');
    return refreshResp.access_token;
};
// TODO: check if anything has to be put in a try catch block
const refreshExpiredTwitchChannelAccessToken = async (bot, user) => {
    const client = bot.getUserTwitchClientManager(user).getHelixClient();
    if (!client) {
        return { error: false, refreshed: false };
    }
    const accessToken = await bot.getRepos().oauthToken.getMatchingAccessToken(user);
    if (!accessToken) {
        return { error: false, refreshed: false };
    }
    let channelId = user.twitch_id;
    if (!channelId) {
        channelId = await client.getUserIdByNameCached(user.twitch_login, bot.getCache());
        if (!channelId) {
            return { error: false, refreshed: false };
        }
    }
    const resp = await client.validateOAuthToken(channelId, accessToken);
    if (resp.valid) {
        // token is valid, check next :)
        return { error: false, refreshed: false };
    }
    // try to refresh the token, if possible
    const row = await bot.getRepos().oauthToken.getByAccessToken(accessToken);
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
    await bot.getRepos().oauthToken.insert({
        user_id: user.id,
        channel_id: channelId,
        access_token: refreshResp.access_token,
        refresh_token: refreshResp.refresh_token,
        scope: refreshResp.scope.join(','),
        token_type: refreshResp.token_type,
        expires_at: new Date(new Date().getTime() + refreshResp.expires_in * 1000),
    });
    log$C.info('refreshExpiredTwitchChannelAccessToken - refreshed an access token');
    return { error: false, refreshed: true };
};
// TODO: check if anything has to be put in a try catch block
const handleOAuthCodeCallback = async (code, redirectUri, bot, loggedInUser) => {
    const helixClient = new TwitchHelixClient(bot.getConfig().twitch.tmi.identity.client_id, bot.getConfig().twitch.tmi.identity.client_secret);
    const resp = await helixClient.getAccessTokenByCode(code, redirectUri);
    if (!resp) {
        return null;
    }
    // get the user that corresponds to the token
    const userResp = await helixClient.getUser(resp.access_token);
    if (!userResp) {
        return null;
    }
    // update currently logged in user if they dont have a twitch id set yet
    if (loggedInUser && !loggedInUser.twitch_id) {
        loggedInUser.twitch_id = userResp.id;
        loggedInUser.twitch_login = userResp.login;
        await bot.getRepos().user.save({
            id: loggedInUser.id,
            twitch_id: loggedInUser.twitch_id,
            twitch_login: loggedInUser.twitch_login,
        });
    }
    let user = await bot.getRepos().user.getByTwitchId(userResp.id);
    if (!user) {
        user = await bot.getRepos().user.getByName(userResp.login);
        if (user) {
            user.twitch_id = userResp.id;
            user.twitch_login = userResp.login;
            await bot.getRepos().user.save(user);
        }
    }
    let created = false;
    let updated = true;
    if (!user) {
        // create user
        const userId = await bot.getRepos().user.createUser({
            twitch_id: userResp.id,
            twitch_login: userResp.login,
            name: userResp.login,
            email: userResp.email,
            tmi_identity_username: '',
            tmi_identity_password: '',
            tmi_identity_client_id: '',
            tmi_identity_client_secret: '',
            bot_enabled: true,
            bot_status_messages: false,
            is_streaming: false,
        });
        user = await bot.getRepos().user.getById(userId);
        created = true;
        updated = false;
        if (!user) {
            return null;
        }
    }
    // store the token
    await bot.getRepos().oauthToken.insert({
        user_id: user.id,
        channel_id: userResp.id,
        access_token: resp.access_token,
        refresh_token: resp.refresh_token,
        scope: resp.scope.join(','),
        token_type: resp.token_type,
        expires_at: new Date(new Date().getTime() + resp.expires_in * 1000),
    });
    return { updated, created, user };
};

var CommandRestrictEnum;
(function (CommandRestrictEnum) {
    CommandRestrictEnum["MOD"] = "mod";
    CommandRestrictEnum["VIP"] = "vip";
    CommandRestrictEnum["SUB"] = "sub";
    CommandRestrictEnum["BROADCASTER"] = "broadcaster";
    CommandRestrictEnum["REGULAR"] = "regular";
})(CommandRestrictEnum || (CommandRestrictEnum = {}));
const MOD_OR_ABOVE = [
    CommandRestrictEnum.MOD,
    CommandRestrictEnum.BROADCASTER,
];
[
    { value: CommandRestrictEnum.BROADCASTER, label: 'Broadcaster' },
    { value: CommandRestrictEnum.MOD, label: 'Moderators' },
    { value: CommandRestrictEnum.VIP, label: 'Vips' },
    { value: CommandRestrictEnum.SUB, label: 'Subscribers' },
    { value: CommandRestrictEnum.REGULAR, label: 'Regular Users' },
];
const isBroadcaster = (ctx) => ctx['room-id'] === ctx['user-id'];
const isMod = (ctx) => !!ctx.mod;
const isSubscriber = (ctx) => !!ctx.subscriber && !isBroadcaster(ctx);
const isRegular = (ctx) => !isBroadcaster(ctx) && !isMod(ctx) && !isSubscriber(ctx);
const isVip = (ctx) => !!ctx.badges?.vip;
const userTypeOk = (ctx, cmd) => {
    if (!cmd.restrict.active) {
        return true;
    }
    if (cmd.restrict.to.includes(CommandRestrictEnum.MOD) && isMod(ctx)) {
        return true;
    }
    if (cmd.restrict.to.includes(CommandRestrictEnum.SUB) && isSubscriber(ctx)) {
        return true;
    }
    if (cmd.restrict.to.includes(CommandRestrictEnum.VIP) && isVip(ctx)) {
        return true;
    }
    if (cmd.restrict.to.includes(CommandRestrictEnum.BROADCASTER) && isBroadcaster(ctx)) {
        return true;
    }
    if (cmd.restrict.to.includes(CommandRestrictEnum.REGULAR) && isRegular(ctx)) {
        return true;
    }
    return false;
};
const userInAllowList = (ctx, cmd) => {
    // compare lowercase, otherwise may be confusing why nC_para_ doesnt disallow nc_para_
    return arrayIncludesIgnoreCase(cmd.allow_users || [], ctx.username || '');
};
const userInDisallowList = (ctx, cmd) => {
    // compare lowercase, otherwise may be confusing why nC_para_ doesnt disallow nc_para_
    return arrayIncludesIgnoreCase(cmd.disallow_users || [], ctx.username || '');
};
const mayExecute = (ctx, cmd) => {
    if (typeof cmd.enabled !== 'undefined' && cmd.enabled === false) {
        return false;
    }
    if (userInAllowList(ctx, cmd)) {
        return true;
    }
    return userTypeOk(ctx, cmd) && !userInDisallowList(ctx, cmd);
};

const newTrigger = (type) => ({
    type,
    data: {
        // for trigger type "command" (todo: should only exist if type is command, not always)
        command: {
            value: '',
            match: 'startsWith',
        },
        // for trigger type "timer" (todo: should only exist if type is timer, not always)
        minInterval: 0, // duration in ms or something parsable (eg 1s, 10m, ....)
        minLines: 0,
        // for trigger type "first_chat"
        since: 'stream',
    },
});
const newSubscribeTrigger = () => newTrigger(CommandTriggerType.SUB);
const newGiftSubscribeTrigger = () => newTrigger(CommandTriggerType.GIFTSUB);
const newFollowTrigger = () => newTrigger(CommandTriggerType.FOLLOW);
const newBitsTrigger = () => newTrigger(CommandTriggerType.BITS);
const newRaidTrigger = () => newTrigger(CommandTriggerType.RAID);
const newRewardRedemptionTrigger = (command = '') => {
    const trigger = newTrigger(CommandTriggerType.REWARD_REDEMPTION);
    trigger.data.command = { value: command, match: 'exact' };
    return trigger;
};
const newJsonDate = () => new Date().toJSON();
const newCommandId = () => nonce(10);
const newCommandTrigger = (command = '', commandExact = false) => {
    const trigger = newTrigger(CommandTriggerType.COMMAND);
    trigger.data.command = {
        value: command,
        match: commandExact ? 'exact' : 'startsWith',
    };
    return trigger;
};
const triggersEqual = (a, b) => {
    if (a.type !== b.type) {
        return false;
    }
    if (a.type === CommandTriggerType.COMMAND) {
        if (a.data.command.value === b.data.command.value
            && a.data.command.match === a.data.command.match) {
            // no need to check for commandExact here (i think^^)
            return true;
        }
    }
    else if (a.type === CommandTriggerType.REWARD_REDEMPTION) {
        if (a.data.command.value === b.data.command.value
            && a.data.command.match === a.data.command.match) {
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
const createCommand = (cmd) => {
    if (typeof cmd.action === 'undefined') {
        throw new Error('action required');
    }
    return {
        id: typeof cmd.id !== 'undefined' ? cmd.id : newCommandId(),
        createdAt: typeof cmd.createdAt !== 'undefined' ? cmd.createdAt : newJsonDate(),
        action: cmd.action,
        triggers: typeof cmd.triggers !== 'undefined' ? cmd.triggers : [],
        effects: typeof cmd.effects !== 'undefined' ? cmd.effects : [],
        variables: typeof cmd.variables !== 'undefined' ? cmd.variables : [],
        data: typeof cmd.data !== 'undefined' ? cmd.data : {},
        cooldown: typeof cmd.cooldown !== 'undefined' ? cmd.cooldown : { global: '0', globalMessage: '', perUser: '0', perUserMessage: '' },
        restrict: {
            active: typeof cmd.restrict !== 'undefined' ? cmd.restrict.active : false,
            to: typeof cmd.restrict !== 'undefined' ? cmd.restrict.to : [],
        },
        disallow_users: typeof cmd.disallow_users !== 'undefined' ? cmd.disallow_users : [],
        allow_users: typeof cmd.allow_users !== 'undefined' ? cmd.allow_users : [],
        enabled: typeof cmd.enabled !== 'undefined' ? cmd.enabled : true,
    };
};
const commands = {
    [CommandAction.GENERAL]: {
        Name: () => 'command',
        Description: () => '',
        NewCommand: () => createCommand({
            triggers: [newCommandTrigger()],
            action: CommandAction.GENERAL,
        }),
    },
    [CommandAction.SR_CURRENT]: {
        Name: () => 'sr_current',
        Description: () => 'Show what song is currently playing',
        NewCommand: () => createCommand({
            action: CommandAction.SR_CURRENT,
            triggers: [newCommandTrigger('!sr current', true)],
        }),
    },
    [CommandAction.SR_UNDO]: {
        Name: () => 'sr_undo',
        Description: () => 'Remove the song that was last added by oneself.',
        NewCommand: () => createCommand({
            action: CommandAction.SR_UNDO,
            triggers: [newCommandTrigger('!sr undo', true)],
        }),
    },
    [CommandAction.SR_GOOD]: {
        Name: () => 'sr_good',
        Description: () => 'Vote the current song up',
        NewCommand: () => createCommand({
            action: CommandAction.SR_GOOD,
            triggers: [newCommandTrigger('!sr good', true)],
        }),
    },
    [CommandAction.SR_BAD]: {
        Name: () => 'sr_bad',
        Description: () => 'Vote the current song down',
        NewCommand: () => createCommand({
            action: CommandAction.SR_BAD,
            triggers: [newCommandTrigger('!sr bad', true)],
        }),
    },
    [CommandAction.SR_STATS]: {
        Name: () => 'sr_stats',
        Description: () => 'Show stats about the playlist',
        NewCommand: () => createCommand({
            action: CommandAction.SR_STATS,
            triggers: [newCommandTrigger('!sr stats', true), newCommandTrigger('!sr stat', true)],
        }),
    },
    [CommandAction.SR_PREV]: {
        Name: () => 'sr_prev',
        Description: () => 'Skip to the previous song',
        NewCommand: () => createCommand({
            action: CommandAction.SR_PREV,
            triggers: [newCommandTrigger('!sr prev', true)],
            restrict: { active: true, to: MOD_OR_ABOVE },
        }),
    },
    [CommandAction.SR_NEXT]: {
        Name: () => 'sr_next',
        Description: () => 'Skip to the next song',
        NewCommand: () => createCommand({
            action: CommandAction.SR_NEXT,
            triggers: [newCommandTrigger('!sr next', true), newCommandTrigger('!sr skip', true)],
            restrict: { active: true, to: MOD_OR_ABOVE },
        }),
    },
    [CommandAction.SR_JUMPTONEW]: {
        Name: () => 'sr_jumptonew',
        Description: () => 'Jump to the next unplayed song',
        NewCommand: () => createCommand({
            action: CommandAction.SR_JUMPTONEW,
            triggers: [newCommandTrigger('!sr jumptonew', true)],
            restrict: { active: true, to: MOD_OR_ABOVE },
        }),
    },
    [CommandAction.SR_CLEAR]: {
        Name: () => 'sr_clear',
        Description: () => 'Clear the playlist',
        NewCommand: () => createCommand({
            action: CommandAction.SR_CLEAR,
            triggers: [newCommandTrigger('!sr clear', true)],
            restrict: { active: true, to: MOD_OR_ABOVE },
        }),
    },
    [CommandAction.SR_RM]: {
        Name: () => 'sr_rm',
        Description: () => 'Remove the current song from the playlist',
        NewCommand: () => createCommand({
            action: CommandAction.SR_RM,
            triggers: [newCommandTrigger('!sr rm', true)],
            restrict: { active: true, to: MOD_OR_ABOVE },
        }),
    },
    [CommandAction.SR_SHUFFLE]: {
        Name: () => 'sr_shuffle',
        Description: () => `Shuffle the playlist (current song unaffected).
    <br />
    Non-played and played songs will be shuffled separately and non-played
    songs will be put after currently playing song.`,
        NewCommand: () => createCommand({
            action: CommandAction.SR_SHUFFLE,
            triggers: [newCommandTrigger('!sr shuffle', true)],
            restrict: { active: true, to: MOD_OR_ABOVE },
        }),
    },
    [CommandAction.SR_RESET_STATS]: {
        Name: () => 'sr_reset_stats',
        Description: () => 'Reset all statistics of all songs',
        NewCommand: () => createCommand({
            action: CommandAction.SR_RESET_STATS,
            triggers: [newCommandTrigger('!sr resetStats', true)],
            restrict: { active: true, to: MOD_OR_ABOVE },
        }),
    },
    [CommandAction.SR_LOOP]: {
        Name: () => 'sr_loop',
        Description: () => 'Loop the current song',
        NewCommand: () => createCommand({
            action: CommandAction.SR_LOOP,
            triggers: [newCommandTrigger('!sr loop', true)],
            restrict: { active: true, to: MOD_OR_ABOVE },
        }),
    },
    [CommandAction.SR_NOLOOP]: {
        Name: () => 'sr_noloop',
        Description: () => 'Stop looping the current song',
        NewCommand: () => createCommand({
            action: CommandAction.SR_NOLOOP,
            triggers: [newCommandTrigger('!sr noloop', true), newCommandTrigger('!sr unloop', true)],
            restrict: { active: true, to: MOD_OR_ABOVE },
        }),
    },
    [CommandAction.SR_PAUSE]: {
        Name: () => 'sr_pause',
        Description: () => 'Pause currently playing song',
        NewCommand: () => createCommand({
            action: CommandAction.SR_PAUSE,
            triggers: [newCommandTrigger('!sr pause', true)],
            restrict: { active: true, to: MOD_OR_ABOVE },
        }),
    },
    [CommandAction.SR_UNPAUSE]: {
        Name: () => 'sr_unpause',
        Description: () => 'Unpause currently paused song',
        NewCommand: () => createCommand({
            action: CommandAction.SR_UNPAUSE,
            triggers: [newCommandTrigger('!sr nopause', true), newCommandTrigger('!sr unpause', true)],
            restrict: { active: true, to: MOD_OR_ABOVE },
        }),
    },
    [CommandAction.SR_HIDEVIDEO]: {
        Name: () => 'sr_hidevideo',
        Description: () => 'Hide video for current song',
        NewCommand: () => createCommand({
            action: CommandAction.SR_HIDEVIDEO,
            triggers: [newCommandTrigger('!sr hidevideo', true)],
            restrict: { active: true, to: MOD_OR_ABOVE },
        }),
    },
    [CommandAction.SR_SHOWVIDEO]: {
        Name: () => 'sr_showvideo',
        Description: () => 'Show video for current song',
        NewCommand: () => createCommand({
            action: CommandAction.SR_SHOWVIDEO,
            triggers: [newCommandTrigger('!sr showvideo', true)],
            restrict: { active: true, to: MOD_OR_ABOVE },
        }),
    },
    [CommandAction.SR_REQUEST]: {
        Name: () => 'sr_request',
        Description: () => `
    Search for <code>&lt;SEARCH&gt;</code> (argument to this command)
    at youtube (by id or by title)
    and queue the first result in the playlist (after the first found
    batch of unplayed songs).`,
        NewCommand: () => createCommand({
            action: CommandAction.SR_REQUEST,
            triggers: [newCommandTrigger('!sr')],
        }),
    },
    [CommandAction.SR_RE_REQUEST]: {
        Name: () => 'sr_re_request',
        Description: () => `
    Search for <code>&lt;SEARCH&gt;</code> (argument to this command)
    in the current playlist and queue the first result in the playlist
    (after the first found batch of unplayed songs).`,
        NewCommand: () => createCommand({
            action: CommandAction.SR_RE_REQUEST,
            triggers: [newCommandTrigger('!resr')],
        }),
    },
    [CommandAction.SR_ADDTAG]: {
        Name: () => 'sr_addtag',
        Description: () => 'Add tag <code>&lt;TAG&gt;</code> (argument to this command) to the current song',
        NewCommand: () => createCommand({
            action: CommandAction.SR_ADDTAG,
            triggers: [newCommandTrigger('!sr tag'), newCommandTrigger('!sr addtag')],
            restrict: { active: true, to: MOD_OR_ABOVE },
            data: { tag: '' },
        }),
    },
    [CommandAction.SR_RMTAG]: {
        Name: () => 'sr_rmtag',
        Description: () => 'Remove tag <code>&lt;TAG&gt;</code> (argument to this command) from the current song',
        NewCommand: () => createCommand({
            action: CommandAction.SR_RMTAG,
            triggers: [newCommandTrigger('!sr rmtag')],
            restrict: { active: true, to: MOD_OR_ABOVE },
        }),
    },
    [CommandAction.SR_VOLUME]: {
        Name: () => 'sr_volume',
        Description: () => `Sets the song request volume to <code>&lt;VOLUME&gt;</code> (argument to this command, min 0, max 100).
    <br />
    If no argument is given, just outputs the current volume`,
        NewCommand: () => createCommand({
            action: CommandAction.SR_VOLUME,
            triggers: [newCommandTrigger('!sr volume')],
            restrict: { active: true, to: MOD_OR_ABOVE },
        }),
    },
    [CommandAction.SR_FILTER]: {
        Name: () => 'sr_filter',
        Description: () => `Play only songs with the given tag <code>&lt;TAG&gt;</code> (argument to this command). If no tag
  is given, play all songs.`,
        NewCommand: () => createCommand({
            action: CommandAction.SR_FILTER,
            triggers: [newCommandTrigger('!sr filter')],
            restrict: { active: true, to: MOD_OR_ABOVE },
        }),
    },
    [CommandAction.SR_PRESET]: {
        Name: () => 'sr_preset',
        Description: () => `Switches to the preset <code>&lt;PRESET&gt;</code> (argument to this command) if it exists.
  If no arguments are given, outputs all available presets.`,
        NewCommand: () => createCommand({
            action: CommandAction.SR_PRESET,
            triggers: [newCommandTrigger('!sr preset')],
            restrict: { active: true, to: MOD_OR_ABOVE },
        }),
    },
    [CommandAction.SR_QUEUE]: {
        Name: () => 'sr_queue',
        Description: () => 'Shows the next 3 songs that will play.',
        NewCommand: () => createCommand({
            action: CommandAction.SR_QUEUE,
            triggers: [newCommandTrigger('!sr queue')],
        }),
    },
    [CommandAction.SR_MOVE_TAG_UP]: {
        Name: () => 'sr_move_tag_up',
        Description: () => 'Moves songs with the tag to the beginning of the playlist.',
        NewCommand: () => createCommand({
            action: CommandAction.SR_MOVE_TAG_UP,
            triggers: [newCommandTrigger('!sr movetagup')],
            restrict: { active: true, to: MOD_OR_ABOVE },
        }),
    },
};

const log$B = logger('CommandExecutor.ts');
class CommandExecutor {
    async executeMatchingCommands(bot, user, rawCmd, context, triggers, date, contextModule) {
        const promises = [];
        const ctx = { rawCmd, context, date };
        for (const m of bot.getModuleManager().all(user.id)) {
            if (contextModule && contextModule.name !== m.name) {
                continue;
            }
            const cmdDefs = getUniqueCommandsByTriggers(m.getCommands(), triggers);
            promises.push(this.tryExecuteCommands(m, cmdDefs, ctx, bot, user));
        }
        await Promise.all(promises);
    }
    isInTimeout(timeoutMs, last, ctx, user) {
        if (!last) {
            return false;
        }
        const lastExecution = new Date(last?.executed_at);
        const diffMs = ctx.date.getTime() - lastExecution.getTime();
        const timeoutMsLeft = timeoutMs - diffMs;
        if (timeoutMsLeft <= 0) {
            return false;
        }
        // timeout still active
        log$B.info({
            user: user.name,
            target: user.twitch_login,
            command: ctx.rawCmd?.name || '<unknown>',
        }, `Skipping command due to timeout. ${humanDuration(timeoutMsLeft)} left`);
        return true;
    }
    async isInGlobalTimeout(cmdDef, repo, ctx, user) {
        const durationMs = cmdDef.cooldown.global ? parseHumanDuration(cmdDef.cooldown.global) : 0;
        if (!durationMs) {
            return false;
        }
        const last = await repo.getLastExecuted({
            command_id: cmdDef.id,
        });
        return this.isInTimeout(durationMs, last, ctx, user);
    }
    async isInPerUserTimeout(cmdDef, repo, ctx, user) {
        if (!ctx.context || !ctx.context.username) {
            return false;
        }
        const durationMs = cmdDef.cooldown.perUser ? parseHumanDuration(cmdDef.cooldown.perUser) : 0;
        if (!durationMs) {
            return false;
        }
        const last = await repo.getLastExecuted({
            command_id: cmdDef.id,
            trigger_user_name: ctx.context.username,
        });
        return this.isInTimeout(durationMs, last, ctx, user);
    }
    async trySay(message, ctx, cmdDef, bot, user) {
        if (!message) {
            return;
        }
        const m = await doReplacements(message, ctx.rawCmd, ctx.context, cmdDef, bot, user);
        const say = bot.sayFn(user);
        say(m);
    }
    async tryExecuteCommands(contextModule, cmdDefs, ctx, bot, user) {
        const promises = [];
        const repo = bot.getRepos().commandExecutionRepo;
        for (const cmdDef of cmdDefs) {
            if (!ctx.context || !mayExecute(ctx.context, cmdDef)) {
                continue;
            }
            if (await this.isInGlobalTimeout(cmdDef, repo, ctx, user)) {
                await this.trySay(cmdDef.cooldown.globalMessage, ctx, cmdDef, bot, user);
                continue;
            }
            if (await this.isInPerUserTimeout(cmdDef, repo, ctx, user)) {
                await this.trySay(cmdDef.cooldown.perUserMessage, ctx, cmdDef, bot, user);
                continue;
            }
            log$B.info({
                user: user.name,
                target: user.twitch_login,
                command: ctx.rawCmd?.name || '<unknown>',
                module: contextModule.name,
            }, 'Executing command');
            // eslint-disable-next-line no-async-promise-executor
            const p = new Promise(async (resolve) => {
                await bot.getEffectsApplier().applyEffects(cmdDef, contextModule, ctx.rawCmd, ctx.context);
                const r = await cmdDef.fn(ctx);
                if (r) {
                    log$B.info({
                        user: user.name,
                        target: user.twitch_login,
                        return: r,
                    }, 'Returned from command');
                }
                log$B.info({
                    user: user.name,
                    target: user.twitch_login,
                    command: ctx.rawCmd?.name || '<unknown>',
                }, 'Executed command');
                resolve();
            });
            promises.push(p);
            await repo.insert({
                command_id: cmdDef.id,
                executed_at: ctx.date,
                trigger_user_name: ctx.context.username || null,
            });
        }
        await Promise.all(promises);
    }
}

class EventSubEventHandler {
}

const log$A = logger('SubscribeEventHandler.ts');
class SubscribeEventHandler extends EventSubEventHandler {
    async handle(bot, user, data) {
        log$A.info('handle');
        const rawCmd = {
            name: 'channel.subscribe',
            args: [],
        };
        const { mod, subscriber, vip } = await getUserTypeInfo(bot, user, data.event.user_id);
        const context = {
            'room-id': data.event.broadcaster_user_id,
            'user-id': data.event.user_id,
            'display-name': data.event.user_name,
            username: data.event.user_login,
            mod,
            subscriber,
            badges: { vip: vip ? '1' : undefined }, // not sure what to put in there
        };
        const trigger = newSubscribeTrigger();
        const exec = new CommandExecutor();
        await exec.executeMatchingCommands(bot, user, rawCmd, context, [trigger], new Date());
    }
}

const log$z = logger('FollowEventHandler.ts');
class FollowEventHandler extends EventSubEventHandler {
    async handle(bot, user, data) {
        log$z.info('handle');
        const rawCmd = {
            name: 'channel.follow',
            args: [],
        };
        const { mod, subscriber, vip } = await getUserTypeInfo(bot, user, data.event.user_id);
        const context = {
            'room-id': data.event.broadcaster_user_id,
            'user-id': data.event.user_id,
            'display-name': data.event.user_name,
            username: data.event.user_login,
            mod,
            subscriber,
            badges: { vip: vip ? '1' : undefined }, // not sure what to put in there
        };
        const trigger = newFollowTrigger();
        const exec = new CommandExecutor();
        await exec.executeMatchingCommands(bot, user, rawCmd, context, [trigger], new Date());
    }
}

const log$y = logger('CheerEventHandler.ts');
class CheerEventHandler extends EventSubEventHandler {
    async handle(bot, user, data) {
        log$y.info('handle');
        const rawCmd = {
            name: 'channel.cheer',
            args: [],
        };
        const { mod, subscriber, vip } = await getUserTypeInfo(bot, user, data.event.user_id);
        const context = {
            'room-id': data.event.broadcaster_user_id,
            'user-id': data.event.user_id,
            'display-name': data.event.user_name,
            username: data.event.user_login,
            mod,
            subscriber,
            badges: { vip: vip ? '1' : undefined }, // not sure what to put in there
            extra: {
                bits: {
                    amount: data.event.bits,
                },
            },
        };
        const trigger = newBitsTrigger();
        const exec = new CommandExecutor();
        await exec.executeMatchingCommands(bot, user, rawCmd, context, [trigger], new Date());
    }
}

const log$x = logger('ChannelPointRedeemEventHandler.ts');
class ChannelPointRedeemEventHandler extends EventSubEventHandler {
    async handle(bot, user, data) {
        log$x.info('handle');
        const rawCmd = {
            name: data.event.reward.title,
            args: data.event.user_input ? [data.event.user_input] : [],
        };
        const { mod, subscriber, vip } = await getUserTypeInfo(bot, user, data.event.user_id);
        const context = {
            'room-id': data.event.broadcaster_user_id,
            'user-id': data.event.user_id,
            'display-name': data.event.user_name,
            username: data.event.user_login,
            mod,
            subscriber,
            badges: { vip: vip ? '1' : undefined }, // not sure what to put in there
        };
        const trigger = newRewardRedemptionTrigger(data.event.reward.title);
        const exec = new CommandExecutor();
        await exec.executeMatchingCommands(bot, user, rawCmd, context, [trigger], new Date());
    }
}

// https://dev.twitch.tv/docs/eventsub/eventsub-subscription-types
var SubscriptionType;
(function (SubscriptionType) {
    SubscriptionType["ChannelFollow"] = "channel.follow";
    SubscriptionType["ChannelCheer"] = "channel.cheer";
    SubscriptionType["ChannelRaid"] = "channel.raid";
    SubscriptionType["ChannelSubscribe"] = "channel.subscribe";
    SubscriptionType["ChannelSubscriptionGift"] = "channel.subscription.gift";
    SubscriptionType["ChannelPointsCustomRewardRedemptionAdd"] = "channel.channel_points_custom_reward_redemption.add";
    SubscriptionType["StreamOnline"] = "stream.online";
    SubscriptionType["StreamOffline"] = "stream.offline";
})(SubscriptionType || (SubscriptionType = {}));
const ALL_SUBSCRIPTIONS_TYPES = Object.values(SubscriptionType);

const log$w = logger('StreamOnlineEventHandler.ts');
class StreamOnlineEventHandler extends EventSubEventHandler {
    async handle(bot, _user, data) {
        log$w.info('handle');
        await bot.getRepos().streams.insert({
            broadcaster_user_id: data.event.broadcaster_user_id,
            started_at: new Date(data.event.started_at),
        });
    }
}

const log$v = logger('StreamOfflineEventHandler.ts');
class StreamOfflineEventHandler extends EventSubEventHandler {
    async handle(bot, _user, data) {
        log$v.info('handle');
        // get last started stream for broadcaster
        // if it exists and it didnt end yet set ended_at date
        const stream = await bot.getRepos().streams.getLatestByChannelId(data.event.broadcaster_user_id);
        if (stream) {
            if (!stream.ended_at) {
                await bot.getRepos().streams.setEndDate(`${stream.id}`, new Date());
            }
        }
    }
}

const log$u = logger('RaidEventHandler.ts');
class RaidEventHandler extends EventSubEventHandler {
    async handle(bot, user, data) {
        log$u.info('handle');
        const rawCmd = {
            name: 'channel.raid',
            args: [],
        };
        const { mod, subscriber, vip } = await getUserTypeInfo(bot, user, data.event.from_broadcaster_user_id);
        const context = {
            'room-id': data.event.to_broadcaster_user_id,
            'user-id': data.event.from_broadcaster_user_id,
            'display-name': data.event.from_broadcaster_user_name,
            username: data.event.from_broadcaster_user_login,
            mod,
            subscriber,
            badges: { vip: vip ? '1' : undefined }, // not sure what to put in there
            extra: {
                raiders: {
                    amount: data.event.viewers,
                },
            },
        };
        const trigger = newRaidTrigger();
        const exec = new CommandExecutor();
        await exec.executeMatchingCommands(bot, user, rawCmd, context, [trigger], new Date());
    }
}

const log$t = logger('SubscriptionGiftEventHandler.ts');
class SubscriptionGiftEventHandler extends EventSubEventHandler {
    async handle(bot, user, data) {
        log$t.info('handle');
        const rawCmd = {
            name: 'channel.subscription.gift',
            args: [],
        };
        const { mod, subscriber, vip } = await getUserTypeInfo(bot, user, data.event.user_id);
        const context = {
            'room-id': data.event.broadcaster_user_id,
            'user-id': data.event.user_id,
            'display-name': data.event.user_name,
            username: data.event.user_login,
            mod,
            subscriber,
            badges: { vip: vip ? '1' : undefined }, // not sure what to put in there
            extra: {
                giftsubs: {
                    amount: data.event.total,
                },
            },
        };
        const trigger = newGiftSubscribeTrigger();
        const exec = new CommandExecutor();
        await exec.executeMatchingCommands(bot, user, rawCmd, context, [trigger], new Date());
    }
}

const log$s = logger('twitch/index.ts');
const createRouter$4 = (bot) => {
    const handlers = {
        [SubscriptionType.ChannelSubscribe]: new SubscribeEventHandler(),
        [SubscriptionType.ChannelSubscriptionGift]: new SubscriptionGiftEventHandler(),
        [SubscriptionType.ChannelFollow]: new FollowEventHandler(),
        [SubscriptionType.ChannelCheer]: new CheerEventHandler(),
        [SubscriptionType.ChannelRaid]: new RaidEventHandler(),
        [SubscriptionType.ChannelPointsCustomRewardRedemptionAdd]: new ChannelPointRedeemEventHandler(),
        [SubscriptionType.StreamOnline]: new StreamOnlineEventHandler(),
        [SubscriptionType.StreamOffline]: new StreamOfflineEventHandler(),
    };
    const verifyTwitchSignature = (req, res, next) => {
        const body = Buffer.from(req.rawBody, 'utf8');
        const msg = `${req.headers['twitch-eventsub-message-id']}${req.headers['twitch-eventsub-message-timestamp']}${body}`;
        const hmac = crypto.createHmac('sha256', bot.getConfig().twitch.eventSub.transport.secret);
        hmac.update(msg);
        const expected = `sha256=${hmac.digest('hex')}`;
        if (req.headers['twitch-eventsub-message-signature'] === expected) {
            return next();
        }
        log$s.debug({ req });
        log$s.error({
            got: req.headers['twitch-eventsub-message-signature'],
            expected,
        }, 'bad message signature');
        res.status(403).send({ reason: 'bad message signature' });
    };
    const getCodeCallbackResult = async (req) => {
        const redirectUris = [
            `${bot.getConfig().http.url}/twitch/redirect_uri`,
            `${req.protocol}://${req.headers.host}/twitch/redirect_uri`,
        ];
        const user = req.user?.id ? await bot.getRepos().user.getById(req.user.id) : null;
        for (const redirectUri of redirectUris) {
            const tmpResult = await handleOAuthCodeCallback(`${req.query.code}`, redirectUri, bot, user);
            if (tmpResult) {
                return tmpResult;
            }
        }
        return null;
    };
    const router = express.Router();
    // twitch calls this url after auth
    // from here we render a js that reads the token and shows it to the user
    router.get('/redirect_uri', async (req, res) => {
        // in success case:
        // http://localhost:3000/
        // ?code=gulfwdmys5lsm6qyz4xiz9q32l10
        // &scope=channel%3Amanage%3Apolls+channel%3Aread%3Apolls
        // &state=c3ab8aa609ea11e793ae92361f002671
        if (req.query.code) {
            const result = await getCodeCallbackResult(req);
            if (!result) {
                res.status(500).send('Something went wrong!');
                return;
            }
            if (result.updated) {
                bot.getEventHub().emit('user_changed', result.user);
            }
            else if (result.created) {
                bot.getEventHub().emit('user_registration_complete', result.user);
            }
            const token = await bot.getAuth().getUserAuthToken(result.user.id);
            res.cookie('x-token', token, { maxAge: 1 * YEAR, httpOnly: true });
            res.redirect('/');
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
        if (req.headers['twitch-eventsub-message-type'] === 'webhook_callback_verification') {
            log$s.info({ challenge: req.body.challenge }, 'got verification request');
            res.write(req.body.challenge);
            res.send();
            return;
        }
        if (req.headers['twitch-eventsub-message-type'] === 'notification') {
            log$s.info({ type: req.body.subscription.type }, 'got notification request');
            const row = await bot.getRepos().eventSub.getBySubscriptionId(req.body.subscription.id);
            if (!row) {
                log$s.info('unknown subscription_id');
                res.status(400).send({ reason: 'unknown subscription_id' });
                return;
            }
            const user = await bot.getRepos().user.getById(row.user_id);
            if (!user) {
                log$s.info('unknown user');
                res.status(400).send({ reason: 'unknown user' });
                return;
            }
            const handler = handlers[req.body.subscription.type];
            if (!handler) {
                log$s.info('unknown subscription type');
                res.status(400).send({ reason: 'unknown subscription type' });
                return;
            }
            void handler.handle(bot, user, req.body);
            res.send();
            return;
        }
        res.status(400).send({ reason: 'unhandled sub type' });
    });
    return router;
};

const createRouter$3 = (bot) => {
    const router = express.Router();
    router.use(cors());
    router.get('/chatters', async (req, res) => {
        if (!req.query.apiKey) {
            res.status(403).send({ ok: false, error: 'api key missing' });
            return;
        }
        const apiKey = String(req.query.apiKey);
        const t = await bot.getRepos().token.getByTokenAndType(apiKey, TokenType.API_KEY);
        if (!t) {
            res.status(403).send({ ok: false, error: 'invalid api key' });
            return;
        }
        const user = await bot.getRepos().user.getById(t.user_id);
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
        const userNames = await bot.getRepos().chatLog.getChatters(channelId, dateSince);
        res.status(200).send({ ok: true, data: { chatters: userNames, since: dateSince } });
    });
    router.get('/drawcast/images', async (req, res) => {
        if (!req.query.apiKey) {
            res.status(403).send({ ok: false, error: 'api key missing' });
            return;
        }
        const apiKey = String(req.query.apiKey);
        const t = await bot.getRepos().token.getByTokenAndType(apiKey, TokenType.API_KEY);
        if (!t) {
            res.status(403).send({ ok: false, error: 'invalid api key' });
            return;
        }
        const user = await bot.getRepos().user.getById(t.user_id);
        if (!user) {
            res.status(400).send({ ok: false, error: 'user_not_found' });
            return;
        }
        const drawcastModule = bot.getModuleManager().get(user.id, 'drawcast');
        if (!drawcastModule) {
            res.status(400).send({ ok: false, error: 'module_not_found' });
            return;
        }
        res.status(200).send({ ok: true, data: { images: drawcastModule.getImages() } });
    });
    return router;
};

const RequireLoginApiMiddleware = (req, res, next) => {
    if (!req.token) {
        res.status(401).send({});
        return;
    }
    return next();
};

const createRouter$2 = (bot) => {
    const router = express.Router();
    router.get('/me', RequireLoginApiMiddleware, async (req, res) => {
        const apiUser = {
            user: req.user,
            token: req.cookies['x-token'],
            cannyToken: bot.getCanny().createToken(req.user),
        };
        res.send(apiUser);
    });
    return router;
};

const moduleDefinitions = [
    {
        module: MODULE_NAME.SR,
        title: 'Song Request',
    },
    {
        module: MODULE_NAME.GENERAL,
        title: 'General',
    },
    {
        module: MODULE_NAME.AVATAR,
        title: 'Avatar',
    },
    {
        module: MODULE_NAME.SPEECH_TO_TEXT,
        title: 'Speech-to-Text',
    },
    {
        module: MODULE_NAME.POMO,
        title: 'Pomo',
    },
    {
        module: MODULE_NAME.VOTE,
        title: 'Vote',
    },
    {
        module: MODULE_NAME.DRAWCAST,
        title: 'Drawcast',
    },
];

const log$r = logger('api/index.ts');
const createRouter$1 = (bot) => {
    const uploadDir = './data/uploads';
    const storage = multer.diskStorage({
        destination: uploadDir,
        filename: function (req, file, cb) {
            cb(null, `${nonce(6)}-${file.originalname}`);
        },
    });
    const upload = multer({ storage }).single('file');
    const router = express.Router();
    router.post('/upload', RequireLoginApiMiddleware, (req, res) => {
        upload(req, res, (err) => {
            if (err) {
                log$r.error({ err });
                res.status(400).send('Something went wrong!');
                return;
            }
            if (!req.file) {
                log$r.error({ err });
                res.status(400).send('Something went wrong!');
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
        const conf = bot.getConfig();
        res.send({
            wsBase: conf.ws.connectstring,
            twitchClientId: conf.twitch.tmi.identity.client_id,
        });
    });
    router.post('/logout', RequireLoginApiMiddleware, async (req, res) => {
        if (req.token) {
            await bot.getAuth().destroyToken(req.token);
            res.clearCookie('x-token');
        }
        res.send({ success: true });
    });
    router.post('/widget/create_url', RequireLoginApiMiddleware, express.json(), async (req, res) => {
        const type = req.body.type;
        const pub = req.body.pub;
        const url = await bot.getWidgets().createWidgetUrl(type, req.user.id);
        res.send({
            url: pub ? (await bot.getWidgets().pubUrl(url)) : url,
        });
    });
    router.get('/page/index', RequireLoginApiMiddleware, async (req, res) => {
        const modules = await bot.getRepos().module.getInfosByUser(req.user.id);
        const widgets = await bot.getWidgets().getWidgetInfos(req.user.id);
        res.send({
            modules: modules.map(m => {
                return {
                    key: m.key,
                    title: moduleDefinitions.find(md => md.module === m.key)?.title || m.key,
                    enabled: m.enabled,
                    widgets: widgets.filter(w => w.module === m.key),
                };
            }),
        });
    });
    router.post('/modules/_set_enabled', RequireLoginApiMiddleware, express.json(), async (req, res) => {
        const key = req.body.key;
        const enabled = req.body.enabled;
        await bot.getRepos().module.setEnabled(req.user.id, key, enabled);
        const m = bot.getModuleManager().get(req.user.id, key);
        if (m) {
            await m.setEnabled(enabled);
        }
        res.send({
            success: true,
        });
    });
    router.get('/page/variables', RequireLoginApiMiddleware, async (req, res) => {
        res.send({ variables: await bot.getRepos().variables.all(req.user.id) });
    });
    router.post('/save-variables', RequireLoginApiMiddleware, express.json(), async (req, res) => {
        await bot.getRepos().variables.replace(req.user.id, req.body.variables || []);
        res.send();
    });
    router.get('/data/global', async (_req, res) => {
        res.send({
            registeredUserCount: await bot.getRepos().user.countUsers(),
            streamingUserCount: await bot.getRepos().user.countUniqueUsersStreaming(),
        });
    });
    router.get('/page/settings', RequireLoginApiMiddleware, async (req, res) => {
        const user = await bot.getRepos().user.getById(req.user.id);
        res.send({
            user: {
                id: user.id,
                twitch_id: user.twitch_id,
                twitch_login: user.twitch_login,
                name: user.name,
                email: user.email,
                tmi_identity_username: user.tmi_identity_username,
                tmi_identity_password: user.tmi_identity_password,
                tmi_identity_client_id: user.tmi_identity_client_id,
                tmi_identity_client_secret: user.tmi_identity_client_secret,
                bot_enabled: user.bot_enabled,
                bot_status_messages: user.bot_status_messages,
                groups: await bot.getRepos().user.getGroups(user.id),
            },
        });
    });
    router.get('/pub/:id', async (req, res, _next) => {
        const row = await bot.getRepos().pub.getById(req.params.id);
        if (row && row.target) {
            req.url = row.target;
            // @ts-ignore
            router.handle(req, res);
            return;
        }
        res.status(404).send();
    });
    router.get('/widget/:widget_type/:widget_token/', async (req, res, _next) => {
        const type = req.params.widget_type;
        const token = req.params.widget_token;
        const user = (await bot.getAuth().userFromWidgetToken(token, type))
            || (await bot.getAuth().userFromPubToken(token));
        if (!user) {
            res.status(404).send();
            return;
        }
        log$r.debug({ route: '/widget/:widget_type/:widget_token/', type, token });
        const w = bot.getWidgets().getWidgetDefinitionByType(type);
        if (w) {
            res.send({
                widget: w.type,
                title: w.title,
                wsUrl: bot.getConfig().ws.connectstring,
                widgetToken: token,
            });
            return;
        }
        res.status(404).send();
    });
    router.post('/save-settings', RequireLoginApiMiddleware, express.json(), async (req, res) => {
        if (!req.user.groups.includes('admin')) {
            if (req.user.id !== req.body.user.id) {
                // editing other user than self
                res.status(401).send({ reason: 'not_allowed_to_edit_other_users' });
                return;
            }
        }
        const originalUser = await bot.getRepos().user.getById(req.body.user.id);
        if (!originalUser) {
            res.status(404).send({ reason: 'user_does_not_exist' });
            return;
        }
        const user = {
            id: req.body.user.id,
            bot_enabled: req.body.user.bot_enabled,
            bot_status_messages: req.body.user.bot_status_messages,
        };
        if (req.user.groups.includes('admin')) {
            user.tmi_identity_client_id = req.body.user.tmi_identity_client_id;
            user.tmi_identity_client_secret = req.body.user.tmi_identity_client_secret;
            user.tmi_identity_username = req.body.user.tmi_identity_username;
            user.tmi_identity_password = req.body.user.tmi_identity_password;
        }
        await bot.getRepos().user.save(user);
        const changedUser = await bot.getRepos().user.getById(user.id);
        if (changedUser) {
            bot.getEventHub().emit('user_changed', changedUser);
        }
        else {
            log$r.error({
                user_id: user.id,
            }, 'save-settings: user doesn\'t exist after saving it');
        }
        res.send();
    });
    router.use('/user', createRouter$2(bot));
    router.use('/pub/v1', createRouter$3(bot));
    return router;
};

const createRouter = (bot) => {
    const requireLoginApi = async (req, res, next) => {
        if (!req.token) {
            res.status(401).send({});
            return;
        }
        const user = req.user || null;
        if (!user || !user.id) {
            res.status(403).send({ ok: false, error: 'forbidden' });
            return;
        }
        const adminGroup = await bot.getDb().get('user_group', { name: 'admin' });
        if (!adminGroup) {
            res.status(403).send({ ok: false, error: 'no admin' });
            return;
        }
        const userXAdmin = await bot.getDb().get('user_x_user_group', {
            user_group_id: adminGroup.id,
            user_id: user.id,
        });
        if (!userXAdmin) {
            res.status(403).send({ ok: false, error: 'not an admin' });
            return;
        }
        next();
    };
    const router = express.Router();
    router.use(requireLoginApi);
    router.get('/announcements', async (req, res) => {
        const items = await bot.getDb().getMany('announcements', undefined, [{ created: -1 }]);
        res.send(items);
    });
    router.post('/announcements', express.json(), async (req, res) => {
        const message = req.body.message;
        const title = req.body.title;
        const id = await bot.getDb().insert('announcements', { created: new Date(), title, message }, 'id');
        const announcement = await bot.getDb().get('announcements', { id });
        if (!announcement) {
            res.status(500).send({ ok: false, reason: 'unable_to_get_announcement' });
            return;
        }
        await bot.getDiscord().announce(`**${title}**\n${announcement.message}`);
        res.send({ announcement });
    });
    return router;
};

const RequireLoginMiddleware = (req, res, next) => {
    if (req.token) {
        return next();
    }
    if (req.method === 'GET') {
        res.redirect(302, '/login');
    }
    else {
        res.status(401).send('not allowed');
    }
};

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const log$q = logger('WebServer.ts');
class WebServer {
    constructor() {
        this.handle = null;
    }
    async listen(bot) {
        const app = express();
        const indexFile = path.resolve(__dirname, '..', '..', 'build', 'public', 'index.html');
        app.use(cookieParser());
        app.use(bot.getAuth().addAuthInfoMiddleware());
        app.use('/', express.static('./build/public'));
        app.use('/static', express.static('./public/static'));
        app.use('/uploads', express.static('./data/uploads'));
        app.use('/api', createRouter$1(bot));
        app.use('/admin/api', createRouter(bot));
        app.use('/twitch', createRouter$4(bot));
        app.all('/login', async (_req, res, _next) => {
            res.sendFile(indexFile);
        });
        app.all('/password-reset', async (_req, res, _next) => {
            res.sendFile(indexFile);
        });
        app.all('/widget/*', async (_req, res, _next) => {
            res.sendFile(indexFile);
        });
        app.all('/pub/*', async (_req, res, _next) => {
            res.sendFile(indexFile);
        });
        app.all('*', RequireLoginMiddleware, express.json({ limit: '50mb' }), async (req, res, next) => {
            const method = req.method.toLowerCase();
            const key = req.url.replace(/\?.*$/, '');
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
        this.handle = app.listen(httpConf.port, httpConf.hostname, () => log$q.info(`server running on http://${httpConf.hostname}:${httpConf.port}`));
    }
    close() {
        if (this.handle) {
            this.handle.close();
        }
    }
}

const log$p = logger('ChatEventHandler.ts');
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
    const broadcasterId = context['room-id'] || '';
    if (broadcasterId) {
        const stream = await helixClient.getStreamByUserId(broadcasterId);
        if (stream) {
            return new Date(stream.started_at);
        }
    }
    const date = new Date(new Date().getTime() - (5 * MINUTE));
    log$p.info({
        roomId: context['room-id'],
        date: date,
    }, 'No stream is running atm, using fake start date.');
    return date;
};
const determineIsFirstChatStream = async (bot, user, context) => {
    const helixClient = bot.getUserTwitchClientManager(user).getHelixClient();
    if (!helixClient) {
        return false;
    }
    const minDate = await determineStreamStartDate(context, helixClient);
    return await bot.getRepos().chatLog.isFirstChatSince(context, minDate);
};
class ChatEventHandler {
    async handle(bot, user, context, msgOriginal, msgNormalized) {
        const roles = rolesLettersFromTwitchChatContext(context);
        log$p.debug({
            username: context.username,
            roles,
            msgOriginal,
            msgNormalized,
        });
        void bot.getRepos().chatLog.insert(context, msgOriginal);
        let _isFirstChatAlltime = null;
        const isFirstChatAlltime = async () => {
            if (_isFirstChatAlltime === null) {
                _isFirstChatAlltime = await bot.getRepos().chatLog.isFirstChatAllTime(context);
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
            commandTriggers = commandTriggers.sort((a, b) => b.data.command.value.length - a.data.command.value.length);
            let rawCmd = null;
            for (const trigger of commandTriggers) {
                rawCmd = fn.parseCommandFromTriggerAndMessage(msgNormalized, trigger);
                if (!rawCmd) {
                    continue;
                }
                triggers.push(trigger);
                break;
            }
            return { triggers, rawCmd };
        };
        const client = bot.getUserTwitchClientManager(user).getChatClient();
        const chatMessageContext = { client, context, msgOriginal, msgNormalized };
        const date = new Date();
        for (const m of bot.getModuleManager().all(user.id)) {
            if (!m.isEnabled()) {
                continue;
            }
            const { triggers, rawCmd } = await createTriggers(m);
            if (triggers.length > 0) {
                const exec = new CommandExecutor();
                await exec.executeMatchingCommands(bot, user, rawCmd, context, triggers, date, m);
            }
            await m.onChatMsg(chatMessageContext);
        }
    }
}

// TODO: think of a better name
class Timer {
    constructor() {
        this.splits = [];
    }
    reset() {
        this.splits = [];
        this.split();
    }
    split() {
        this.splits.push(performance.now());
    }
    lastSplitMs() {
        const len = this.splits.length;
        if (len < 2) {
            return NaN;
        }
        return this.splits[len - 1] - this.splits[len - 2];
    }
    totalMs() {
        const len = this.splits.length;
        if (len < 2) {
            return NaN;
        }
        return this.splits[len - 1] - this.splits[0];
    }
}

logger('TwitchClientManager.ts');
const isDevTunnel = (url) => url.match(/^https:\/\/[a-z0-9-]+\.(?:loca\.lt|ngrok\.io)\//);
const isRelevantSubscription = (configuredTransport, subscription, twitchChannelIds) => {
    return configuredTransport.method === subscription.transport.method
        && (configuredTransport.callback === subscription.transport.callback
            || (isDevTunnel(configuredTransport.callback) && isDevTunnel(subscription.transport.callback)))
        && (
        // normal subscription
        (subscription.type !== 'channel.raid' && twitchChannelIds.includes(subscription.condition.broadcaster_user_id))
            // raid subscription
            || (subscription.type === 'channel.raid' && twitchChannelIds.includes(subscription.condition.to_broadcaster_user_id)));
};
const determineIdentity = (user, cfg) => {
    return (user.tmi_identity_username
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
};
const chatEventHandler = new ChatEventHandler();
class TwitchClientManager {
    constructor(bot, user) {
        this.bot = bot;
        this.user = user;
        this.chatClient = null;
        this.helixClient = null;
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
        const timer = new Timer();
        timer.reset();
        let connectReason = reason;
        const cfg = this.bot.getConfig().twitch;
        const user = this.user;
        this.log = logger('TwitchClientManager.ts', `${user.name}|`);
        await this._disconnectChatClient();
        timer.split();
        this.log.debug(`disconnecting chat client took ${timer.lastSplitMs()}ms`);
        const identity = determineIdentity(user, cfg);
        void this.bot.getEmoteParser().loadAssetsForChannel(user.twitch_login, user.twitch_id, new TwitchHelixClient(identity.client_id, identity.client_secret));
        if (user.twitch_id && user.twitch_login && user.bot_enabled) {
            this.log.info('* twitch bot enabled');
            // connect to chat via tmi (to all channels configured)
            this.chatClient = this.bot.getTwitchTmiClientManager().get(identity, [user.twitch_login]);
            const reportStatusToChannel = (user, reason) => {
                if (!user.bot_status_messages) {
                    return;
                }
                const say = this.bot.sayFn(user);
                if (reason === 'init') {
                    say('⚠️ Bot rebooted - please restart timers...');
                }
                else if (reason === 'access_token_refreshed') ;
                else if (reason === 'user_change') {
                    say('✅ User settings updated...');
                }
                else {
                    say('✅ Reconnected...');
                }
            };
            if (this.chatClient) {
                this.chatClient.on('message', async (target, context, msg, self) => {
                    if (self) {
                        return;
                    } // Ignore messages from the bot
                    // sometimes chat contains imprintable characters
                    // they are removed here
                    const msgOriginal = msg;
                    const msgNormalized = normalizeChatMessage(msg);
                    await (chatEventHandler).handle(this.bot, this.user, context, msgOriginal, msgNormalized);
                });
                // Called every time the bot connects to Twitch chat
                this.chatClient.on('connected', async (addr, port) => {
                    this.log.info({ addr, port }, 'Connected');
                    // if status reporting is disabled, dont print messages
                    if (this.bot.getConfig().bot.reportStatus) {
                        reportStatusToChannel(this.user, connectReason);
                    }
                    // set connectReason to empty, everything from now is just a reconnect
                    // due to disconnect from twitch
                    connectReason = '';
                });
                // do NOT await
                // awaiting the connect will add ~1sec per user on server startup
                this.chatClient.connect().catch((e) => {
                    // this can happen when calling close before the connection
                    // could be established
                    this.log.error({ e }, 'error when connecting');
                });
            }
            timer.split();
            this.log.debug(`connecting chat client took ${timer.lastSplitMs()}ms`);
        }
        // register EventSub
        // @see https://dev.twitch.tv/docs/eventsub
        this.helixClient = new TwitchHelixClient(identity.client_id, identity.client_secret);
        if (this.bot.getConfig().twitch.eventSub.enabled) {
            // do NOT await, OTHERWISE
            // connecting will add ~2sec per user on server startup
            void this.registerSubscriptions(this.user);
        }
        timer.split();
        this.log.debug(`registering subscriptions took ${timer.lastSplitMs()}ms`);
    }
    async registerSubscriptions(user) {
        if (!this.helixClient) {
            this.log.error('registerSubscriptions: helixClient not initialized');
            return;
        }
        if (!user.twitch_login || !user.twitch_id) {
            this.log.error('registerSubscriptions: user twitch information not set');
            return;
        }
        const twitchChannelId = user.twitch_id;
        const transport = this.bot.getConfig().twitch.eventSub.transport;
        this.log.debug(`registering subscriptions for ${user.twitch_login} channels`);
        // TODO: maybe get all subscriptions from database to not
        //       do the one 'getSubscriptions' request. depending on how long that
        //       one needs
        const allSubscriptions = await this.helixClient.getSubscriptions();
        // map that holds status for each subscription type
        // (true if callback is already registered, false if not)
        // @ts-ignore (map filled in for loop)
        const existsMap = {};
        for (const subscriptionType of ALL_SUBSCRIPTIONS_TYPES) {
            existsMap[subscriptionType] = {};
            existsMap[subscriptionType][twitchChannelId] = false;
        }
        const deletePromises = [];
        if (isDevTunnel(transport.callback)) {
            for (const subscription of allSubscriptions.data) {
                if (!isRelevantSubscription(transport, subscription, [twitchChannelId])) {
                    continue;
                }
                // on dev, we still want to delete all subscriptions because
                // new ngrok urls will be created
                deletePromises.push(this.deleteSubscription(subscription));
            }
        }
        else {
            // delete all subscriptions (but keep at least one of each type)
            const deletePromises = [];
            for (const subscription of allSubscriptions.data) {
                if (!isRelevantSubscription(transport, subscription, [twitchChannelId])) {
                    continue;
                }
                // not dev
                if (existsMap[subscription.type][twitchChannelId]) {
                    deletePromises.push(this.deleteSubscription(subscription));
                }
                else {
                    existsMap[subscription.type][twitchChannelId] = true;
                    await this.bot.getRepos().eventSub.insert({
                        user_id: this.user.id,
                        subscription_id: subscription.id,
                        subscription_type: subscription.type,
                    });
                }
            }
        }
        await Promise.all(deletePromises);
        this.log.debug(`deleted ${deletePromises.length} subscriptions`);
        const createPromises = [];
        // create all subscriptions
        for (const subscriptionType of ALL_SUBSCRIPTIONS_TYPES) {
            if (!existsMap[subscriptionType][user.twitch_id]) {
                createPromises.push(this.registerSubscription(subscriptionType, user));
            }
        }
        await Promise.all(createPromises);
        this.log.debug(`registered ${createPromises.length} subscriptions`);
    }
    async deleteSubscription(subscription) {
        if (!this.helixClient) {
            return;
        }
        await this.helixClient.deleteSubscription(subscription.id);
        await this.bot.getRepos().eventSub.delete({
            user_id: this.user.id,
            subscription_id: subscription.id,
        });
        this.log.info({ type: subscription.type }, 'subscription deleted');
    }
    async registerSubscription(subscriptionType, user) {
        if (!this.helixClient) {
            return;
        }
        if (!user.twitch_id) {
            return;
        }
        const condition = subscriptionType === SubscriptionType.ChannelFollow
            ? {
                broadcaster_user_id: `${user.twitch_id}`,
                moderator_user_id: `${user.twitch_id}`,
            }
            : (subscriptionType === SubscriptionType.ChannelRaid
                ? { to_broadcaster_user_id: `${user.twitch_id}` }
                : { broadcaster_user_id: `${user.twitch_id}` });
        const subscription = {
            type: subscriptionType,
            version: [SubscriptionType.ChannelFollow].includes(subscriptionType) ? '2' : '1',
            transport: this.bot.getConfig().twitch.eventSub.transport,
            condition,
        };
        const resp = await this.helixClient.createSubscription(subscription);
        if (resp && resp.data && resp.data.length > 0) {
            await this.bot.getRepos().eventSub.insert({
                user_id: this.user.id,
                subscription_id: resp.data[0].id,
                subscription_type: subscriptionType,
            });
            this.log.info({ type: subscriptionType }, 'subscription registered');
        }
        else {
            this.log.debug({ resp, subscription });
        }
    }
    async _disconnectChatClient() {
        if (this.chatClient) {
            this.chatClient.removeAllListeners('message');
            try {
                await this.chatClient.disconnect();
            }
            catch (e) {
                this.log.info({ e });
            }
            finally {
                this.chatClient = null;
            }
        }
    }
    getChatClient() {
        return this.chatClient;
    }
    getHelixClient() {
        return this.helixClient;
    }
}

const TABLE$9 = 'robyottoko.cache';
const log$o = logger('Cache.ts');
class Cache {
    constructor(db) {
        this.db = db;
    }
    async set(key, value, lifetime) {
        if (value === undefined) {
            log$o.error({ key }, 'unable to store undefined value for cache key');
            return;
        }
        const expiresAt = lifetime === Infinity ? null : (new Date(new Date().getTime() + lifetime));
        const valueStr = JSON.stringify(value);
        await this.db.upsert(TABLE$9, { key, value: valueStr, expires_at: expiresAt }, { key });
    }
    async get(key) {
        // get *non-expired* cache entry from db
        const row = await this.db._get('SELECT * from ' + TABLE$9 + ' WHERE key = $1 AND (expires_at IS NULL OR expires_at > $2)', [key, new Date()]);
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
    constructor(_value, _cancelError = E_CANCELED) {
        this._value = _value;
        this._cancelError = _cancelError;
        this._weightedQueues = [];
        this._weightedWaiters = [];
    }
    acquire(weight = 1) {
        if (weight <= 0)
            throw new Error(`invalid weight ${weight}: must be positive`);
        return new Promise((resolve, reject) => {
            if (!this._weightedQueues[weight - 1])
                this._weightedQueues[weight - 1] = [];
            this._weightedQueues[weight - 1].push({ resolve, reject });
            this._dispatch();
        });
    }
    runExclusive(callback, weight = 1) {
        return __awaiter$2(this, void 0, void 0, function* () {
            const [value, release] = yield this.acquire(weight);
            try {
                return yield callback(value);
            }
            finally {
                release();
            }
        });
    }
    waitForUnlock(weight = 1) {
        if (weight <= 0)
            throw new Error(`invalid weight ${weight}: must be positive`);
        return new Promise((resolve) => {
            if (!this._weightedWaiters[weight - 1])
                this._weightedWaiters[weight - 1] = [];
            this._weightedWaiters[weight - 1].push(resolve);
            this._dispatch();
        });
    }
    isLocked() {
        return this._value <= 0;
    }
    getValue() {
        return this._value;
    }
    setValue(value) {
        this._value = value;
        this._dispatch();
    }
    release(weight = 1) {
        if (weight <= 0)
            throw new Error(`invalid weight ${weight}: must be positive`);
        this._value += weight;
        this._dispatch();
    }
    cancel() {
        this._weightedQueues.forEach((queue) => queue.forEach((entry) => entry.reject(this._cancelError)));
        this._weightedQueues = [];
    }
    _dispatch() {
        var _a;
        for (let weight = this._value; weight > 0; weight--) {
            const queueEntry = (_a = this._weightedQueues[weight - 1]) === null || _a === void 0 ? void 0 : _a.shift();
            if (!queueEntry)
                continue;
            const previousValue = this._value;
            const previousWeight = weight;
            this._value -= weight;
            weight = this._value + 1;
            queueEntry.resolve([previousValue, this._newReleaser(previousWeight)]);
        }
        this._drainUnlockWaiters();
    }
    _newReleaser(weight) {
        let called = false;
        return () => {
            if (called)
                return;
            called = true;
            this.release(weight);
        };
    }
    _drainUnlockWaiters() {
        for (let weight = this._value; weight > 0; weight--) {
            if (!this._weightedWaiters[weight - 1])
                continue;
            this._weightedWaiters[weight - 1].forEach((waiter) => waiter());
            this._weightedWaiters[weight - 1] = [];
        }
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
    release() {
        if (this._semaphore.isLocked())
            this._semaphore.release();
    }
    cancel() {
        return this._semaphore.cancel();
    }
}

// @ts-ignore
const { Client } = pg.default;
const log$n = logger('Db.ts');
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
                    log$n.info(`➡ skipping already applied db patch: ${f}`);
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
                log$n.info(`✓ applied db patch: ${f}`);
            }
            catch (e) {
                log$n.error(`✖ unable to apply patch: ${f} ${e}`);
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
                    else {
                        wheres.push('TRUE');
                    }
                    continue;
                }
                prop = '$in';
                if (where[k][prop]) {
                    if (where[k][prop].length > 0) {
                        wheres.push(k + ' IN (' + where[k][prop].map(() => `$${$i++}`) + ')');
                        values.push(...where[k][prop]);
                    }
                    else {
                        wheres.push('FALSE');
                    }
                    continue;
                }
                prop = '$gte';
                if (where[k][prop]) {
                    wheres.push(k + ` >= $${$i++}`);
                    values.push(where[k][prop]);
                    continue;
                }
                prop = '$lte';
                if (where[k][prop]) {
                    wheres.push(k + ` <= $${$i++}`);
                    values.push(where[k][prop]);
                    continue;
                }
                prop = '$lte';
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
            log$n.info({ fn: '_get', query, params });
            console.error(e);
            throw e;
        }
    }
    async run(query, params = []) {
        try {
            return await this.dbh.query(query, params);
        }
        catch (e) {
            log$n.info({ fn: 'run', query, params });
            console.error(e);
            throw e;
        }
    }
    async _getMany(query, params = []) {
        try {
            return (await this.dbh.query(query, params)).rows || [];
        }
        catch (e) {
            log$n.info({ fn: '_getMany', query, params });
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

function mitt(n){return {all:n=n||new Map,on:function(t,e){var i=n.get(t);i?i.push(e):n.set(t,[e]);},off:function(t,e){var i=n.get(t);i&&(e?i.splice(i.indexOf(e)>>>0,1):n.set(t,[]));},emit:function(t,e){var i=n.get(t);i&&i.slice().map(function(n){n(e);}),(i=n.get("*"))&&i.slice().map(function(n){n(t,e);});}}}

const default_settings$5 = (obj = null) => ({
    volume: getProp(obj, ['volume'], 100),
    emotes: {
        displayFn: getProp(obj, ['emotes', 'displayFn'], [
            { fn: EMOTE_DISPLAY_FN.BALLOON, args: [] },
            { fn: EMOTE_DISPLAY_FN.BOUNCY, args: [] },
            { fn: EMOTE_DISPLAY_FN.EXPLODE, args: [] },
            { fn: EMOTE_DISPLAY_FN.FLOATING_SPACE, args: [] },
            { fn: EMOTE_DISPLAY_FN.FOUNTAIN, args: [] },
            { fn: EMOTE_DISPLAY_FN.RAIN, args: [] },
            { fn: EMOTE_DISPLAY_FN.RANDOM_BEZIER, args: [] },
        ]),
    },
});
const default_admin_settings = () => ({
    showImages: true,
    autocommands: [],
});
var EMOTE_DISPLAY_FN;
(function (EMOTE_DISPLAY_FN) {
    EMOTE_DISPLAY_FN["BALLOON"] = "balloon";
    EMOTE_DISPLAY_FN["BOUNCY"] = "bouncy";
    EMOTE_DISPLAY_FN["EXPLODE"] = "explode";
    EMOTE_DISPLAY_FN["FLOATING_SPACE"] = "floatingSpace";
    EMOTE_DISPLAY_FN["FOUNTAIN"] = "fountain";
    EMOTE_DISPLAY_FN["RAIN"] = "rain";
    EMOTE_DISPLAY_FN["RANDOM_BEZIER"] = "randomBezier";
})(EMOTE_DISPLAY_FN || (EMOTE_DISPLAY_FN = {}));
[
    EMOTE_DISPLAY_FN.BALLOON,
    EMOTE_DISPLAY_FN.BOUNCY,
    EMOTE_DISPLAY_FN.EXPLODE,
    EMOTE_DISPLAY_FN.FLOATING_SPACE,
    EMOTE_DISPLAY_FN.FOUNTAIN,
    EMOTE_DISPLAY_FN.RAIN,
    EMOTE_DISPLAY_FN.RANDOM_BEZIER,
];

logger('GeneralModule.ts');
const noop = () => { return; };
class GeneralModule {
    constructor(bot, user) {
        this.bot = bot;
        this.user = user;
        this.name = MODULE_NAME.GENERAL;
        this.newMessages = 0;
        this.interval = null;
        this.channelPointsCustomRewards = {};
        // @ts-ignore
        return (async () => {
            const initData = await this.reinit();
            this.enabled = initData.enabled;
            this.data = initData.data;
            this.commands = initData.commands;
            this.timers = initData.timers;
            if (initData.shouldSave) {
                await this.bot.getRepos().module.save(this.user.id, this.name, this.data);
            }
            this.inittimers();
            return this;
        })();
    }
    getCurrentMediaVolume() {
        return this.data.settings.volume;
    }
    async userChanged(user) {
        this.user = user;
    }
    inittimers() {
        if (this.interval) {
            clearInterval(this.interval);
            this.interval = null;
        }
        // TODO: handle timeouts. commands executed via timer
        // are not added to command_execution database and also the
        // timeouts are not checked
        this.interval = setInterval(() => {
            const newMessages = this.newMessages;
            this.newMessages = 0;
            const date = new Date();
            const now = date.getTime();
            this.timers.forEach(async (t) => {
                if (t.executing) {
                    return;
                }
                t.lines += newMessages;
                if (t.lines >= t.minLines && now > t.next) {
                    t.executing = true;
                    const cmdDef = t.command;
                    const rawCmd = null;
                    const context = null;
                    await this.bot.getEffectsApplier().applyEffects(cmdDef, this, rawCmd, context);
                    await cmdDef.fn({ rawCmd, context, date });
                    t.lines = 0;
                    t.next = now + t.minInterval;
                    t.executing = false;
                }
            });
        }, 1 * SECOND);
    }
    async reinit() {
        const { data, enabled } = await this.bot.getRepos().module.load(this.user.id, this.name, {
            commands: [],
            settings: default_settings$5(),
            adminSettings: default_admin_settings(),
        });
        data.settings = default_settings$5(data.settings);
        let shouldSave = false;
        for (const command of data.commands) {
            if (command.action === 'text') {
                command.action = CommandAction.GENERAL;
                command.data = {};
                shouldSave = true;
            }
        }
        // do not remove for now, new users gain the !bot command by this
        if (!data.adminSettings.autocommands.includes('!bot')) {
            const command = commands.general.NewCommand();
            command.triggers = [newCommandTrigger('!bot')];
            command.effects.push({
                type: CommandEffectType.CHAT,
                data: {
                    text: ['$bot.message'],
                },
            });
            data.commands.push(command);
            data.adminSettings.autocommands.push('!bot');
            shouldSave = true;
        }
        const commands$1 = [];
        const timers = [];
        data.commands.forEach((cmd) => {
            if (cmd.triggers.length === 0) {
                return;
            }
            let cmdObj = null;
            switch (cmd.action) {
                case CommandAction.GENERAL:
                    cmdObj = Object.assign({}, cmd, { fn: noop });
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
                    if (trigger.data.command.value) {
                        commands$1.push(cmdObj);
                    }
                }
                else if (trigger.type === CommandTriggerType.REWARD_REDEMPTION) {
                    // TODO: check why this if is required, maybe for protection against '' command?
                    if (trigger.data.command.value) {
                        commands$1.push(cmdObj);
                    }
                }
                else if (trigger.type === CommandTriggerType.FOLLOW) {
                    commands$1.push(cmdObj);
                }
                else if (trigger.type === CommandTriggerType.GIFTSUB) {
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
                            executing: false,
                        });
                    }
                }
            }
        });
        return { data, commands: commands$1, timers, shouldSave, enabled };
    }
    getRoutes() {
        return {
            get: {
                '/api/general/channel-emotes': async (req, res, _next) => {
                    const client = this.bot.getUserTwitchClientManager(this.user).getHelixClient();
                    const channelId = await client?.getUserIdByNameCached(req.query.channel_name, this.bot.getCache());
                    const emotes = channelId ? await client?.getChannelEmotes(channelId) : null;
                    res.send(emotes);
                },
                '/api/general/global-emotes': async (_req, res, _next) => {
                    const client = this.bot.getUserTwitchClientManager(this.user).getHelixClient();
                    const emotes = await client?.getGlobalEmotes();
                    res.send(emotes);
                },
                '/api/general/extract-emotes': async (req, res, _next) => {
                    let userId = '';
                    const client = this.bot.getUserTwitchClientManager(this.user).getHelixClient();
                    if (req.query.channel && req.query.channel !== this.user.twitch_login) {
                        userId = await client?.getUserIdByNameCached(req.query.channel || this.user.twitch_login, this.bot.getCache()) || '';
                    }
                    else {
                        userId = this.user.twitch_id;
                    }
                    if (userId && client) {
                        await this.bot.getEmoteParser().loadAssetsForChannel(req.query.channel || this.user.twitch_login, userId, client);
                    }
                    const emotes = this.bot.getEmoteParser().extractEmotes(req.query.emotesInput, null, req.query.channel || this.user.twitch_login);
                    res.send(emotes);
                },
            },
        };
    }
    async wsdata(eventName) {
        return {
            event: eventName,
            data: {
                enabled: this.enabled,
                commands: this.data.commands,
                settings: this.data.settings,
                adminSettings: this.data.adminSettings,
                globalVariables: await this.bot.getRepos().variables.all(this.user.id),
                channelPointsCustomRewards: this.channelPointsCustomRewards,
                mediaWidgetUrl: await this.bot.getWidgets().getWidgetUrl(WIDGET_TYPE.MEDIA, this.user.id),
                emoteWallWidgetUrl: await this.bot.getWidgets().getWidgetUrl(WIDGET_TYPE.EMOTE_WALL, this.user.id),
                rouletteWidgetUrl: await this.bot.getWidgets().getWidgetUrl(WIDGET_TYPE.ROULETTE, this.user.id),
            },
        };
    }
    isEnabled() {
        return this.enabled;
    }
    async setEnabled(enabled) {
        this.enabled = enabled;
        if (!this.enabled) {
            if (this.interval) {
                clearInterval(this.interval);
                this.interval = null;
            }
        }
    }
    async updateClient(eventName, ws) {
        this.bot.getWebSocketServer().notifyOne([this.user.id], this.name, await this.wsdata(eventName), ws);
    }
    async updateClients(eventName) {
        this.bot.getWebSocketServer().notifyAll([this.user.id], this.name, await this.wsdata(eventName));
    }
    async save() {
        await this.bot.getRepos().module.save(this.user.id, this.name, this.data);
        const initData = await this.reinit();
        this.enabled = initData.enabled;
        this.data = initData.data;
        this.commands = initData.commands;
        this.timers = initData.timers;
    }
    async saveCommands() {
        await this.save();
    }
    getWsEvents() {
        return {
            conn: async (ws) => {
                this.channelPointsCustomRewards = await getChannelPointsCustomRewards(this.bot, this.user);
                await this.updateClient('init', ws);
            },
            save: async (_ws, data) => {
                this.data.commands = data.commands;
                this.data.settings = data.settings;
                this.data.adminSettings = data.adminSettings;
                await this.save();
            },
            roulette_start: async (_ws, evt) => {
                // console.log('roulette_start', evt)
                const msg = evt.data.rouletteData.startMessage;
                if (msg) {
                    const say = this.bot.sayFn(this.user);
                    say(msg);
                }
            },
            roulette_end: async (_ws, evt) => {
                // console.log('roulette_end', evt)
                const msg = evt.data.rouletteData.endMessage.replace(/\$entry\.text/g, evt.data.winner);
                if (msg) {
                    const say = this.bot.sayFn(this.user);
                    say(msg);
                }
            },
        };
    }
    async volume(vol) {
        this.data.settings.volume = clamp(0, vol, 100);
        await this.save();
    }
    getCommands() {
        return this.commands;
    }
    async onChatMsg(chatMessageContext) {
        this.newMessages++;
        const emotes = this.bot.getEmoteParser().extractEmotes(chatMessageContext.msgOriginal, chatMessageContext.context, this.user.twitch_login);
        if (emotes) {
            const data = {
                displayFn: this.data.settings.emotes.displayFn,
                emotes,
            };
            // extract emotes and send them to the clients
            this.bot.getWebSocketServer().notifyAll([this.user.id], 'general', {
                event: 'emotes',
                data,
            });
        }
    }
}

const presets = [
    {
        name: 'default',
        showProgressBar: false,
        maxItemsShown: 5,
        showThumbnails: 'left',
        timestampFormat: '',
        hidePlayer: false,
        css: '',
    },
    {
        name: 'Preset 1: No video',
        showProgressBar: false,
        maxItemsShown: 5,
        showThumbnails: 'left',
        hidePlayer: true,
        timestampFormat: '',
        css: `@import url('https://fonts.googleapis.com/css2?family=Sunflower:wght@300&display=swap');
body { font-family: 'Sunflower', sans-serif; font-size: 15px; }
.playing { background: #1E1B1A; color: #AC7870; }
.not-playing { background: #1D1D1C; color: #525259; }
.playing .vote { font-size: 15px; color: #8B7359}
.playing .meta { font-size: 14px; color: #8B7359}
.vote { font-size: 15px; color: #4A544D}
.meta { font-size: 14px; color: #4A544D}
.playing .title:before { content: '▶ ' }
.meta-left .meta-user:after,
.meta-left .meta-plays { display: none; }
.meta-right .meta-plays { display: inline-block; }
.meta-user-text-before,
.meta-user-text-after {display: none}`,
    },
    {
        name: 'Preset 2: No video, round thumbnails',
        showProgressBar: false,
        maxItemsShown: 10,
        showThumbnails: 'left',
        timestampFormat: '',
        hidePlayer: true,
        css: `@import url('https://fonts.googleapis.com/css2?family=Sunflower:wght@300&display=swap');
body { font-family: 'Sunflower', sans-serif; font-size: 16px; }
.playing { background: #1E1B1A; color: #AC7870; }
.not-playing { background: #1D1D1C; color: #525259; box-shadow: 0px 5px 5px inset rgba(0,0,0,0.4); }
.item { margin: 0px; padding: 0px; column-gap: 0px; }
.thumbnail { width: calc(90px*0.5625); padding: 6px 6px; height: 100%}
.media-16-9 { padding-bottom: 100%; overflow: hidden; border-radius: 99px; box-shadow: 2px 2px 3px rgba(0,0,0,0.5); }
.thumbnail img { object-fit: cover; }
.title { overflow: hidden; white-space: nowrap; line-height: 20px; margin: 6px; margin-top: 10px; }
.item:nth-child(n+6) { display: none; }
.playing .vote { font-size: 14px; color: #8B7359; }
.playing .meta { color: #8B7359 }
.vote { font-size: 14px; color: #4A544D}
.meta { color: #4A544D}
.playing .title:before { content: '▶️ ' }
.meta-left .meta-user { margin-left: 6px; }
.meta-left .meta-plays { display: none; }
.meta-right .meta-plays { display: inline-block;}
.meta-right { margin-right: 10px; }
.meta-right * { margin-right: 3px; }
.fa { margin-right: 0px; }
.meta-left .meta-user:after,
.meta-user-text-before,
.meta-user-text-after {display: none}`,
    },
    {
        name: 'Preset 3: Video on the left',
        showProgressBar: false,
        maxItemsShown: 10,
        showThumbnails: 'left',
        timestampFormat: '',
        hidePlayer: false,
        css: `@import url('https://fonts.googleapis.com/css2?family=Sunflower:wght@300&display=swap');
body { font-family: 'Sunflower', sans-serif; font-size: 15px; }
.playing { background: #1E1B1A; color: #AC7870; }
.not-playing { background: #1D1D1C; color: #525259; }
.wrapper { display: grid; grid-template-areas: "player playlist"; grid-template-columns: 50% auto; }
.playing .vote { font-size: 15px; color: #8B7359}
.playing .meta { font-size: 14px; color: #8B7359}
.vote { font-size: 15px; color: #4A544D}
.meta { font-size: 14px; color: #4A544D}
.playing .title:before { content: '▶ ' }
.meta-left .meta-user:after,
.meta-left .meta-plays { display: none; }
.meta-right .meta-plays { display: inline-block; }
.meta-user-text-before,
.meta-user-text-after {display: none}
.thumbnail {display: none}
.video-16-9 {overflow: visible; }
.progress { position: absolute; top: 100%; }`,
    },
    {
        name: 'Preset 4: Video',
        showProgressBar: false,
        maxItemsShown: 10,
        showThumbnails: 'left',
        timestampFormat: '',
        hidePlayer: false,
        css: `@import url('https://fonts.googleapis.com/css2?family=Sunflower:wght@300&display=swap');
body { font-family: 'Sunflower', sans-serif; font-size: 15px; }
.playing { background: #1E1B1A; color: #AC7870; }
.not-playing { background: #1D1D1C; color: #525259; }
.item:nth-child(n+6) { display: none; }
.playing .vote { font-size: 15px; color: #8B7359}
.playing .meta { font-size: 14px; color: #8B7359}
.vote { font-size: 15px; color: #4A544D}
.meta { font-size: 14px; color: #4A544D}
.playing .title:before { content: '▶ ' }
.meta-left .meta-user:after,
.meta-left .meta-plays { display: none; }
.meta-right .meta-plays { display: inline-block; }
.meta-user-text-before,
.meta-user-text-after {display: none}
.thumbnail {display: none}`,
    },
    {
        name: 'Preset 5: No video, transparent',
        showProgressBar: false,
        maxItemsShown: 10,
        showThumbnails: 'left',
        timestampFormat: '',
        hidePlayer: true,
        css: `@import url('https://fonts.googleapis.com/css2?family=Sunflower:wght@300&display=swap');
body { font-family: 'Sunflower', sans-serif; font-size: 15px; }
.playing .title { text-overflow: hidden; overflow: hidden; }
.not-playing .title { text-overflow: ellipsis; overflow: hidden; }
.playing { background: #1E1B1A00; color: #f4faf6; text-shadow: 0 1px 3px rgba(0, 0, 0, 0.3), 0 3px 5px rgba(0, 0, 0, 0.2), 0 5px 10px rgba(0, 0, 0, 0.25); border: 0 }
.not-playing { background: #1D1D1C00; color: #f4faf6; text-shadow:0 1px 3px rgba(0, 0, 0, 0.3), 0 3px 5px rgba(0, 0, 0, 0.2), 0 5px 10px rgba(0, 0, 0, 0.25); font-size: 10px; border: 0; padding-left: 30px; padding-right: 30px;}
.playing .title:before { content: '▶ ' }
.meta-left .meta-user:after,
.meta-left .meta-plays { display: none; }
.meta-right .meta-plays { display: inline-block; padding: 5px}
.meta-user-text-before,
.meta-user-text-after {display: none}`,
    },
    {
        name: 'Preset 6: Video, Progress bar under text',
        showProgressBar: true,
        maxItemsShown: 1,
        showThumbnails: 'left',
        timestampFormat: '',
        hidePlayer: false,
        css: `.thumbnail { display: none }
.item { grid-template-areas: "title"; grid-template-columns: auto; }
.video-16-9  {overflow: visible; }
.progress { position: absolute; top: 100%; }
.progress { height: 12vw; background: #334466;  }
.progress-value { background: #dd0077; }
.meta-left, .meta-right { display: none; }
.title {margin-bottom: 0; }
.player { position: relative;}
.list { position:relative; z-index: 5;}
.item {background: transparent !important ; border: none; padding: 0 .5em; }
.title { color: white; font-size: 5vw; line-height: 12vw; white-space: nowrap; text-shadow: 0 2px 2px rgba(0,0,0, 1); overflow:hidden; text-overflow: ellipsis; }`,
    },
    {
        name: 'Preset 7: Title only, Progress bar, Pulsating text',
        hidePlayer: true,
        showProgressBar: true,
        maxItemsShown: 1,
        showThumbnails: 'left',
        timestampFormat: '',
        css: `.playing .title:before { content: '🎶 now playing: '; color: #FFDD00; margin-right: .5em; }
.title { margin: 0; white-space: nowrap; font-size: 20px; }
.not-playing .title { text-overflow: ellipsis; overflow: hidden; }
.meta, .vote { display: none; }
.playing { background: #222; color: #0057B7; }
.not-playing { display: none; }
.item { border: 0; }
.thumbnail { display: none; }
.wrapper { font-family: "DPComic"; font-size: 10px; letter-spacing: .1em; }
.playing { animation: back 2s linear 2s infinite; }
@keyframes back {
  0% { color: #0057B7; }
  50% { color: #FFDD00; }
  51% { color: #FFDD00; }
  100% { color: #0057B7; }
}
.progress { height: 5px; }
.wrapper { display: grid; grid-template-areas: "list" "player"; }
.player { grid-area: player }
.video-16-9 { height: 5px; }
.list { grid-area: list }
.progress { background: #222; }
.progress-value { background: #639bff; }`,
    },
];

var SortBy;
(function (SortBy) {
    SortBy["TITLE"] = "title";
    SortBy["TIMESTAMP"] = "timestamp";
    SortBy["PLAYS"] = "plays";
    SortBy["USER"] = "user";
    SortBy["DURATION"] = "duration";
})(SortBy || (SortBy = {}));
const default_custom_css_preset = (obj = null) => ({
    name: getProp(obj, ['name'], ''),
    css: getProp(obj, ['css'], ''),
    showProgressBar: getProp(obj, ['showProgressBar'], false),
    showThumbnails: typeof obj?.showThumbnails === 'undefined' || obj.showThumbnails === true ? 'left' : obj.showThumbnails,
    maxItemsShown: getProp(obj, ['maxItemsShown'], -1),
    timestampFormat: typeof obj?.timestampFormat === 'undefined' ? '' : obj.timestampFormat,
    hidePlayer: getProp(obj, ['hidePlayer'], false),
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
        commands.sr_move_tag_up.NewCommand(),
    ];
};
const default_settings$4 = (obj = null) => ({
    volume: getProp(obj, ['volume'], 100),
    initAutoplay: getProp(obj, ['initAutoplay'], true),
    hideVideoImage: {
        file: getProp(obj, ['hideVideoImage', 'file'], ''),
        filename: getProp(obj, ['hideVideoImage', 'filename'], ''),
        urlpath: obj?.hideVideoImage?.urlpath ? obj.hideVideoImage.urlpath : (obj?.hideVideoImage?.file ? `/uploads/${encodeURIComponent(obj.hideVideoImage.file)}` : ''),
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
    customCssPresets: getProp(obj, ['customCssPresets'], presets).map(default_custom_css_preset),
    customCssPresetIdx: getProp(obj, ['customCssPresetIdx'], 0),
});
const isItemShown = (item, filter) => {
    if (filter.show.tags.length) {
        for (const tag of item.tags) {
            if (filter.show.tags.includes(tag)) {
                return true;
            }
        }
    }
    if (filter.hide.tags.length) {
        for (const tag of item.tags) {
            if (filter.hide.tags.includes(tag)) {
                return false;
            }
        }
    }
    return filter.show.tags.length > 0 ? false : true;
};

class TooLongError extends Error {
}

class NotFoundError extends Error {
}

/******************************************************************************
Copyright (c) Microsoft Corporation.

Permission to use, copy, modify, and/or distribute this software for any
purpose with or without fee is hereby granted.

THE SOFTWARE IS PROVIDED "AS IS" AND THE AUTHOR DISCLAIMS ALL WARRANTIES WITH
REGARD TO THIS SOFTWARE INCLUDING ALL IMPLIED WARRANTIES OF MERCHANTABILITY
AND FITNESS. IN NO EVENT SHALL THE AUTHOR BE LIABLE FOR ANY SPECIAL, DIRECT,
INDIRECT, OR CONSEQUENTIAL DAMAGES OR ANY DAMAGES WHATSOEVER RESULTING FROM
LOSS OF USE, DATA OR PROFITS, WHETHER IN AN ACTION OF CONTRACT, NEGLIGENCE OR
OTHER TORTIOUS ACTION, ARISING OUT OF OR IN CONNECTION WITH THE USE OR
PERFORMANCE OF THIS SOFTWARE.
***************************************************************************** */
/* global Reflect, Promise, SuppressedError, Symbol */


function __classPrivateFieldGet(receiver, state, kind, f) {
    if (kind === "a" && !f) throw new TypeError("Private accessor was defined without a getter");
    if (typeof state === "function" ? receiver !== state || !f : !state.has(receiver)) throw new TypeError("Cannot read private member from an object whose class did not declare it");
    return kind === "m" ? f : kind === "a" ? f.call(receiver) : f ? f.value : state.get(receiver);
}

function __classPrivateFieldSet(receiver, state, value, kind, f) {
    if (kind === "m") throw new TypeError("Private method is not writable");
    if (kind === "a" && !f) throw new TypeError("Private accessor was defined without a setter");
    if (typeof state === "function" ? receiver !== state || !f : !state.has(receiver)) throw new TypeError("Cannot write private member to an object whose class did not declare it");
    return (kind === "a" ? f.call(receiver, value) : f ? f.value = value : state.set(receiver, value)), value;
}

typeof SuppressedError === "function" ? SuppressedError : function (error, suppressed, message) {
    var e = new Error(message);
    return e.name = "SuppressedError", e.error = error, e.suppressed = suppressed, e;
};

class NoApiKeysError extends Error {
}

class QuotaReachedError extends Error {
}

var _YoutubeApi_googleApiKeyIndex;
const log$m = logger('YoutubeApi.ts');
var YoutubeVideoDuration;
(function (YoutubeVideoDuration) {
    YoutubeVideoDuration["ANY"] = "any";
    YoutubeVideoDuration["LONG"] = "long";
    YoutubeVideoDuration["MEDIUM"] = "medium";
    YoutubeVideoDuration["SHORT"] = "short";
})(YoutubeVideoDuration || (YoutubeVideoDuration = {}));
class YoutubeApi {
    constructor(config) {
        this.config = config;
        _YoutubeApi_googleApiKeyIndex.set(this, 0);
        // pass
    }
    async get(url, args) {
        var _a;
        if (this.config.googleApiKeys.length === 0) {
            log$m.error('no google api keys configured');
            throw new NoApiKeysError();
        }
        // cycle through all google api keys until response is ok
        // or reaching the previous api key index
        const indexBefore = __classPrivateFieldGet(this, _YoutubeApi_googleApiKeyIndex, "f");
        do {
            args.key = this.config.googleApiKeys[__classPrivateFieldGet(this, _YoutubeApi_googleApiKeyIndex, "f")];
            const resp = await xhr.get(url + asQueryArgs(args));
            if (resp.status !== 403) {
                // got a ok response, return it
                return await resp.json();
            }
            log$m.warn('google returned 403 forbidden status, switching api key');
            __classPrivateFieldSet(this, _YoutubeApi_googleApiKeyIndex, (_a = __classPrivateFieldGet(this, _YoutubeApi_googleApiKeyIndex, "f"), _a++, _a), "f");
            if (__classPrivateFieldGet(this, _YoutubeApi_googleApiKeyIndex, "f") > this.config.googleApiKeys.length - 1) {
                __classPrivateFieldSet(this, _YoutubeApi_googleApiKeyIndex, 0, "f");
            }
        } while (__classPrivateFieldGet(this, _YoutubeApi_googleApiKeyIndex, "f") !== indexBefore);
        throw new QuotaReachedError();
    }
    async fetchDataByYoutubeId(youtubeId) {
        let json;
        try {
            json = await this.get('https://www.googleapis.com/youtube/v3/videos', {
                part: 'snippet,status,contentDetails',
                id: youtubeId,
                fields: 'items(id,snippet,status,contentDetails)',
            });
            return json.items[0];
        }
        catch (e) {
            log$m.error({ e, json, youtubeId });
            return null;
        }
    }
    static getUrlById(youtubeId) {
        return `https://youtu.be/${youtubeId}`;
    }
    msToVideoDurations(durationMs) {
        if (durationMs <= 0) {
            return [
                YoutubeVideoDuration.ANY,
                YoutubeVideoDuration.SHORT,
                YoutubeVideoDuration.MEDIUM,
                YoutubeVideoDuration.LONG,
            ];
        }
        if (durationMs < 4 * MINUTE) {
            return [
                YoutubeVideoDuration.ANY,
                YoutubeVideoDuration.SHORT,
            ];
        }
        if (durationMs <= 20 * MINUTE) {
            return [
                YoutubeVideoDuration.ANY,
                YoutubeVideoDuration.SHORT,
                YoutubeVideoDuration.MEDIUM,
            ];
        }
        return [
            YoutubeVideoDuration.ANY,
            YoutubeVideoDuration.SHORT,
            YoutubeVideoDuration.MEDIUM,
            YoutubeVideoDuration.LONG,
        ];
    }
    // @see https://developers.google.com/youtube/v3/docs/search/list
    // videoDuration
    //   any – Do not filter video search results based on their duration. This is the default value.
    //   long – Only include videos longer than 20 minutes.
    //   medium – Only include videos that are between four and 20 minutes long (inclusive).
    //   short – Only include videos that are less than four minutes long.
    async getYoutubeIdsBySearch(searchterm, videoDuration = YoutubeVideoDuration.ANY) {
        const searches = [
            `"${searchterm}"`,
            searchterm,
        ];
        const ids = [];
        for (const q of searches) {
            const json = await this.get('https://www.googleapis.com/youtube/v3/search', {
                part: 'snippet',
                q: q,
                type: 'video',
                videoEmbeddable: 'true',
                videoDuration,
            });
            try {
                for (const item of json.items) {
                    ids.push(item.id.videoId);
                }
            }
            catch (e) {
                log$m.info({ e, json });
            }
        }
        return ids;
    }
}
_YoutubeApi_googleApiKeyIndex = new WeakMap();

var _Youtube_instances, _a, _Youtube_getDataByIdViaYoutubeApi, _Youtube_findViaYoutubeApi, _Youtube_getDataByIdViaIndivious, _Youtube_findByIndivious;
const log$l = logger('Youtube.ts');
class Youtube {
    constructor(youtubeApi, invidious, cache) {
        _Youtube_instances.add(this);
        this.youtubeApi = youtubeApi;
        this.invidious = invidious;
        this.cache = cache;
        // pass
    }
    static extractYoutubeId(str) {
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
    }
    static getUrlById(youtubeId) {
        return YoutubeApi.getUrlById(youtubeId);
    }
    static isTooLong(maxLenMs, songLenMs) {
        if (maxLenMs <= 0) {
            return false;
        }
        return songLenMs > maxLenMs;
    }
    async find(str, maxLenMs) {
        try {
            return await __classPrivateFieldGet(this, _Youtube_instances, "m", _Youtube_findViaYoutubeApi).call(this, str, maxLenMs);
        }
        catch (e) {
            log$l.info(e instanceof NoApiKeysError);
            // in case of quota reached or no api key set, ask invidious
            if (e instanceof QuotaReachedError
                || e instanceof NoApiKeysError) {
                return await __classPrivateFieldGet(this, _Youtube_instances, "m", _Youtube_findByIndivious).call(this, str, maxLenMs);
            }
            throw e;
        }
    }
}
_a = Youtube, _Youtube_instances = new WeakSet(), _Youtube_getDataByIdViaYoutubeApi = async function _Youtube_getDataByIdViaYoutubeApi(youtubeId) {
    const key = `youtubeData_${youtubeId}_20210717_2`;
    let d = await this.cache.get(key);
    if (d === undefined) {
        d = await this.youtubeApi.fetchDataByYoutubeId(youtubeId);
        if (d) {
            await this.cache.set(key, d, Infinity);
        }
    }
    return d;
}, _Youtube_findViaYoutubeApi = async function _Youtube_findViaYoutubeApi(str, maxLenMs) {
    const youtubeUrl = str.trim();
    const youtubeId = _a.extractYoutubeId(youtubeUrl);
    if (youtubeId) {
        const youtubeData = await __classPrivateFieldGet(this, _Youtube_instances, "m", _Youtube_getDataByIdViaYoutubeApi).call(this, youtubeId);
        if (youtubeData) {
            if (_a.isTooLong(maxLenMs, fn.parseISO8601Duration(youtubeData.contentDetails.duration))) {
                throw new TooLongError();
            }
            return {
                id: youtubeData.id,
                title: youtubeData.snippet.title,
                durationMs: fn.parseISO8601Duration(youtubeData.contentDetails.duration),
            };
        }
    }
    let tooLong = false;
    for (const duration of this.youtubeApi.msToVideoDurations(maxLenMs)) {
        const youtubeIds = await this.youtubeApi.getYoutubeIdsBySearch(youtubeUrl, duration);
        for (const youtubeId of youtubeIds) {
            const youtubeData = await __classPrivateFieldGet(this, _Youtube_instances, "m", _Youtube_getDataByIdViaYoutubeApi).call(this, youtubeId);
            if (!youtubeData) {
                continue;
            }
            if (_a.isTooLong(maxLenMs, fn.parseISO8601Duration(youtubeData.contentDetails.duration))) {
                tooLong = true;
                continue;
            }
            return {
                id: youtubeData.id,
                title: youtubeData.snippet.title,
                durationMs: fn.parseISO8601Duration(youtubeData.contentDetails.duration),
            };
        }
    }
    if (tooLong) {
        throw new TooLongError();
    }
    throw new NotFoundError();
}, _Youtube_getDataByIdViaIndivious = async function _Youtube_getDataByIdViaIndivious(youtubeId) {
    const key = `invidiousData_${youtubeId}_20230117_1`;
    let d = await this.cache.get(key);
    if (d === undefined) {
        d = await this.invidious.video(youtubeId);
        if (d) {
            await this.cache.set(key, d, Infinity);
        }
    }
    return d;
}, _Youtube_findByIndivious = async function _Youtube_findByIndivious(str, maxLenMs) {
    const youtubeUrl = str.trim();
    const youtubeId = _a.extractYoutubeId(youtubeUrl);
    if (youtubeId) {
        const data = await __classPrivateFieldGet(this, _Youtube_instances, "m", _Youtube_getDataByIdViaIndivious).call(this, youtubeId);
        if (data) {
            const durationMs = data.lengthSeconds * 1000;
            if (_a.isTooLong(maxLenMs, durationMs)) {
                throw new TooLongError();
            }
            return { id: data.videoId, title: data.title, durationMs };
        }
    }
    let tooLong = false;
    const durations = ['short', 'long'];
    for (const duration of durations) {
        const results = await this.invidious.search({
            q: youtubeUrl,
            type: 'video',
            region: 'DE',
            sort_by: 'relevance',
            duration,
        });
        for (const result of results) {
            if (result.type !== 'video') {
                continue;
            }
            const durationMs = result.lengthSeconds * 1000;
            if (_a.isTooLong(maxLenMs, durationMs)) {
                tooLong = true;
                continue;
            }
            return { id: result.videoId, title: result.title, durationMs };
        }
    }
    if (tooLong) {
        throw new TooLongError();
    }
    throw new NotFoundError();
};

const log$k = logger('SongrequestModule.ts');
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
    QUOTA_REACHED: 4,
    NO_API_KEYS: 5,
    UNKNOWN: 6,
};
var SET_FILTER_SHOW_TAG_RESULT;
(function (SET_FILTER_SHOW_TAG_RESULT) {
    SET_FILTER_SHOW_TAG_RESULT[SET_FILTER_SHOW_TAG_RESULT["IS_HIDDEN"] = -1] = "IS_HIDDEN";
    SET_FILTER_SHOW_TAG_RESULT[SET_FILTER_SHOW_TAG_RESULT["UPDATED"] = 1] = "UPDATED";
    SET_FILTER_SHOW_TAG_RESULT[SET_FILTER_SHOW_TAG_RESULT["NOT_UPDATED"] = 0] = "NOT_UPDATED";
})(SET_FILTER_SHOW_TAG_RESULT || (SET_FILTER_SHOW_TAG_RESULT = {}));
var REMOVE_FILTER_SHOW_TAGS_RESULT;
(function (REMOVE_FILTER_SHOW_TAGS_RESULT) {
    REMOVE_FILTER_SHOW_TAGS_RESULT[REMOVE_FILTER_SHOW_TAGS_RESULT["UPDATED"] = 1] = "UPDATED";
    REMOVE_FILTER_SHOW_TAGS_RESULT[REMOVE_FILTER_SHOW_TAGS_RESULT["NOT_UPDATED"] = 0] = "NOT_UPDATED";
})(REMOVE_FILTER_SHOW_TAGS_RESULT || (REMOVE_FILTER_SHOW_TAGS_RESULT = {}));
var MOVE_TAG_UP_RESULT;
(function (MOVE_TAG_UP_RESULT) {
    MOVE_TAG_UP_RESULT[MOVE_TAG_UP_RESULT["MOVED"] = 1] = "MOVED";
    MOVE_TAG_UP_RESULT[MOVE_TAG_UP_RESULT["NOT_MOVED"] = 0] = "NOT_MOVED";
})(MOVE_TAG_UP_RESULT || (MOVE_TAG_UP_RESULT = {}));
const default_playlist_item = (item = null) => {
    return {
        id: item?.id || 0,
        tags: item?.tags || [],
        yt: item?.yt || '',
        title: item?.title || '',
        timestamp: item?.timestamp || 0,
        durationMs: item?.durationMs || 0,
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
const noLimits = () => ({ maxLenMs: 0, maxQueued: 0 });
const determineLimits = (ctx, settings) => {
    if (isBroadcaster(ctx)) {
        return noLimits();
    }
    // use the longest set up maxLenMs and maxQueued that fits for the user
    // a user can be both moderator and subscriber, in that case the longest setting will be used
    // also, 0 is handled as 'unlimited', so have to check that too..
    const check = [];
    if (isMod(ctx)) {
        check.push('mod');
    }
    if (isSubscriber(ctx)) {
        check.push('sub');
    }
    if (check.length === 0) {
        check.push('viewer');
    }
    let maxLenMs = -1;
    let maxQueued = -1;
    for (const prop of check) {
        const lenMs = parseHumanDuration(settings.maxSongLength[prop]);
        maxLenMs = (lenMs === 0 || maxLenMs === -1) ? lenMs : Math.max(maxLenMs, lenMs);
        const queued = settings.maxSongsQueued[prop];
        maxQueued = (queued === 0 || maxQueued === -1) ? queued : Math.max(maxQueued, queued);
    }
    // make sure that the limits are >= 0
    maxLenMs = Math.max(maxLenMs, 0);
    maxQueued = Math.max(maxQueued, 0);
    return { maxLenMs, maxQueued };
};
const findInsertIndex = (playlist) => {
    if (playlist.length === 0) {
        return 0;
    }
    let found = -1;
    for (let i = 0; i < playlist.length; i++) {
        if (playlist[i].plays === 0) {
            found = i;
        }
        else if (found >= 0) {
            break;
        }
    }
    return (found === -1 ? 0 : found) + 1;
};
const moveTagUp = (playlist, tag) => {
    let moved = false;
    playlist = playlist.sort((a, b) => {
        if (a.tags.includes(tag)) {
            if (b.tags.includes(tag)) {
                return 0;
            }
            moved = true;
            return -1;
        }
        else if (b.tags.includes(tag)) {
            moved = true;
            return 1;
        }
        return 0;
    });
    return moved ? MOVE_TAG_UP_RESULT.MOVED : MOVE_TAG_UP_RESULT.NOT_MOVED;
};
class SongrequestModule {
    constructor(bot, user) {
        this.bot = bot;
        this.user = user;
        this.name = MODULE_NAME.SR;
        this.channelPointsCustomRewards = {};
        this.lastEvents = {
            ended: null,
            play: null,
        };
        // @ts-ignore
        return (async () => {
            const initData = await this.reinit();
            this.enabled = initData.enabled;
            this.data = {
                filter: initData.data.filter,
                playlist: initData.data.playlist,
                commands: initData.data.commands,
                settings: initData.data.settings,
                stacks: initData.data.stacks,
            };
            this.commands = initData.commands;
            return this;
        })();
    }
    isEnabled() {
        return this.enabled;
    }
    async setEnabled(enabled) {
        this.enabled = enabled;
    }
    async userChanged(user) {
        this.user = user;
    }
    async reinit() {
        const { data, enabled } = await this.bot.getRepos().module.load(this.user.id, this.name, {
            filter: {
                show: { tags: [] },
                hide: { tags: [] },
            },
            settings: default_settings$4(),
            playlist: default_playlist(),
            commands: default_commands(),
            stacks: {},
        });
        if (typeof data.settings.customCssPresetIdx === 'undefined') {
            // find the index of a preset that matches the current settings
            // if nothing is found, create a new preset and use that index
            const matchingIndex = data.settings.customCssPresets.findIndex((preset) => {
                preset.css === data.settings.customCss &&
                    preset.showProgressBar === data.settings.showProgressBar &&
                    preset.showThumbnails === data.settings.showThumbnails &&
                    preset.timestampFormat === data.settings.timestampFormat &&
                    preset.maxItemsShown === data.settings.maxItemsShown;
            });
            if (matchingIndex !== -1) {
                data.settings.customCssPresetIdx = matchingIndex;
            }
            else {
                data.settings.customCssPresets.push({
                    name: 'current',
                    css: data.settings.customCss,
                    showProgressBar: data.settings.showProgressBar,
                    showThumbnails: data.settings.showThumbnails,
                    timestampFormat: data.settings.timestampFormat,
                    maxItemsShown: data.settings.maxItemsShown,
                });
                data.settings.customCssPresetIdx = data.settings.customCssPresets.length - 1;
            }
        }
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
            enabled,
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
            sr_move_tag_up: this.cmdSrMoveTagUp.bind(this),
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
                        await this.save();
                        await this.updateClients('init');
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
        await this.bot.getRepos().module.save(this.user.id, this.name, {
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
                enabled: this.enabled,
                // ommitting youtube cache data and stacks
                filter: this.data.filter,
                playlist: this.data.playlist,
                settings: this.data.settings,
                commands: this.data.commands,
                globalVariables: await this.bot.getRepos().variables.all(this.user.id),
                channelPointsCustomRewards: this.channelPointsCustomRewards,
                widgetUrl: await this.bot.getWidgets().getWidgetUrl(WIDGET_TYPE.SR, this.user.id),
            },
        };
    }
    async updateClient(eventName, ws) {
        this.bot.getWebSocketServer().notifyOne([this.user.id], this.name, await this.wsdata(eventName), ws);
    }
    async updateClients(eventName) {
        this.bot.getWebSocketServer().notifyAll([this.user.id], this.name, await this.wsdata(eventName));
    }
    checkLastEvents(evt, evtInfo) {
        const lastEvtInfo = this.lastEvents[evt];
        // when the event comes in for 2 times in a row in a 5 second timeframe
        // either with the same id or from a different websocket then ignore that
        // event
        if (lastEvtInfo
            && (evtInfo.timestamp - lastEvtInfo.timestamp) < 5 * SECOND
            && (lastEvtInfo.id === evtInfo.id || lastEvtInfo.wsId !== evtInfo.wsId)) {
            return false;
        }
        this.lastEvents[evt] = evtInfo;
        return true;
    }
    getWsEvents() {
        return {
            'conn': async (ws) => {
                this.channelPointsCustomRewards = await getChannelPointsCustomRewards(this.bot, this.user);
                await this.updateClient('init', ws);
            },
            'play': async (ws, { id }) => {
                const eventInfo = { id, timestamp: new Date().getTime(), wsId: ws.id || '' };
                if (!this.checkLastEvents('play', eventInfo)) {
                    return;
                }
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
            'ended': async (ws, { id }) => {
                const eventInfo = { id, timestamp: new Date().getTime(), wsId: ws.id || '' };
                if (!this.checkLastEvents('ended', eventInfo)) {
                    return;
                }
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
                this.enabled = initData.enabled;
                this.data = initData.data;
                this.commands = initData.commands;
                await this.updateClients('save');
            },
            'ctrl': async (_ws, { ctrl, args }) => {
                switch (ctrl) {
                    case 'volume':
                        await this.volume(...args);
                        break;
                    case 'pause':
                        await this.pause();
                        break;
                    case 'unpause':
                        await this.unpause();
                        break;
                    case 'loop':
                        await this.loop();
                        break;
                    case 'noloop':
                        await this.noloop();
                        break;
                    case 'good':
                        await this.like();
                        break;
                    case 'bad':
                        await this.dislike();
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
                        await this.resetStatIdx(...args);
                        break;
                    case 'clear':
                        await this.clear();
                        break;
                    case 'rm':
                        await this.remove();
                        break;
                    case 'shuffle':
                        await this.shuffle();
                        break;
                    case 'playIdx':
                        await this.playIdx(...args);
                        break;
                    case 'rmIdx':
                        await this.rmIdx(...args);
                        break;
                    case 'goodIdx':
                        await this.goodIdx(...args);
                        break;
                    case 'badIdx':
                        await this.badIdx(...args);
                        break;
                    case 'sr':
                        await this.request(...args);
                        break;
                    case 'resr':
                        await this.resr(...args);
                        break;
                    case 'move':
                        await this.move(...args);
                        break;
                    case 'rmtag':
                        await this.rmTag(...args);
                        break;
                    case 'addtag':
                        await this.addTag(...args);
                        break;
                    case 'updatetag':
                        await this.updateTag(...args);
                        break;
                    case 'addFilterShowTag':
                        await this.addFilterShowTag(...args);
                        break;
                    case 'addFilterHideTag':
                        await this.addFilterHideTag(...args);
                        break;
                    case 'removeFilterShowTag':
                        await this.removeFilterShowTag(...args);
                        break;
                    case 'removeFilterHideTag':
                        await this.removeFilterHideTag(...args);
                        break;
                    case 'videoVisibility':
                        await this.videoVisibility(...args);
                        break;
                    case 'setAllToPlayed':
                        await this.setAllToPlayed();
                        break;
                    case 'sort':
                        await this.sort(...args);
                        break;
                }
            },
        };
    }
    async add(str, userName, limits) {
        const countQueuedSongsByUser = () => this.data.playlist.filter(item => item.user === userName && item.plays === 0).length;
        if (limits.maxQueued > 0 && countQueuedSongsByUser() >= limits.maxQueued) {
            return { addType: ADD_TYPE.NOT_ADDED, idx: -1, reason: NOT_ADDED_REASON.TOO_MANY_QUEUED };
        }
        let youtubeData;
        try {
            youtubeData = await this.bot.getYoutube().find(str, limits.maxLenMs);
        }
        catch (e) {
            if (e instanceof TooLongError) {
                return { addType: ADD_TYPE.NOT_ADDED, idx: -1, reason: NOT_ADDED_REASON.TOO_LONG };
            }
            if (e instanceof NotFoundError) {
                return { addType: ADD_TYPE.NOT_ADDED, idx: -1, reason: NOT_ADDED_REASON.NOT_FOUND };
            }
            if (e instanceof QuotaReachedError) {
                return { addType: ADD_TYPE.NOT_ADDED, idx: -1, reason: NOT_ADDED_REASON.QUOTA_REACHED };
            }
            if (e instanceof NoApiKeysError) {
                return { addType: ADD_TYPE.NOT_ADDED, idx: -1, reason: NOT_ADDED_REASON.NO_API_KEYS };
            }
            return { addType: ADD_TYPE.NOT_ADDED, idx: -1, reason: NOT_ADDED_REASON.UNKNOWN };
        }
        const tmpItem = this.createItem(youtubeData, userName);
        const { addType, idx, reason } = await this.addToPlaylist(tmpItem);
        if (addType === ADD_TYPE.ADDED) {
            this.data.stacks[userName] = this.data.stacks[userName] || [];
            this.data.stacks[userName].push(youtubeData.id);
        }
        return { addType, idx, reason };
    }
    determinePrevIndex() {
        let index = -1;
        for (let i = 0; i < this.data.playlist.length; i++) {
            const item = this.data.playlist[i];
            if (isItemShown(item, this.data.filter)) {
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
            if (isItemShown(item, this.data.filter)) {
                return i;
            }
        }
        return -1;
    }
    determineFirstIndex() {
        return this.data.playlist.findIndex(item => isItemShown(item, this.data.filter));
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
            durationTotalMs += item.durationMs;
        }
        return durationTotalMs;
    }
    async stats(userName) {
        const countTotal = this.data.playlist.length;
        let durationTotal = 0;
        if (countTotal > 0) {
            for (const item of this.data.playlist) {
                durationTotal += item.durationMs;
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
        await this.add(str, this.user.name, noLimits());
    }
    findSongIdxByYoutubeId(youtubeId) {
        return this.data.playlist.findIndex(item => item.yt === youtubeId);
    }
    async like() {
        this.incStat('goods');
        await this.save();
        await this.updateClients('stats');
    }
    async setFilterShowTag(tag) {
        if (this.data.filter.hide.tags.includes(tag)) {
            return SET_FILTER_SHOW_TAG_RESULT.IS_HIDDEN;
        }
        let saveRequired = false;
        if (this.data.filter.show.tags.length !== 1 || this.data.filter.show.tags[0] !== tag) {
            this.data.filter.show.tags = [tag];
            saveRequired = true;
        }
        if (saveRequired) {
            await this.save();
            await this.updateClients('filter');
            return SET_FILTER_SHOW_TAG_RESULT.UPDATED;
        }
        return SET_FILTER_SHOW_TAG_RESULT.NOT_UPDATED;
    }
    async removeFilterShowTags() {
        let saveRequired = false;
        if (this.data.filter.show.tags.length) {
            this.data.filter.show.tags = [];
            saveRequired = true;
        }
        if (saveRequired) {
            await this.save();
            await this.updateClients('filter');
            return REMOVE_FILTER_SHOW_TAGS_RESULT.UPDATED;
        }
        return REMOVE_FILTER_SHOW_TAGS_RESULT.NOT_UPDATED;
    }
    async addFilterShowTag(tag) {
        let saveRequired = false;
        if (this.data.filter.hide.tags.includes(tag)) {
            this.data.filter.hide.tags = this.data.filter.hide.tags.filter(t => t !== tag);
            saveRequired = true;
        }
        if (!this.data.filter.show.tags.includes(tag)) {
            this.data.filter.show.tags.push(tag);
            saveRequired = true;
        }
        if (saveRequired) {
            await this.save();
            await this.updateClients('filter');
        }
    }
    async addFilterHideTag(tag) {
        let saveRequired = false;
        if (this.data.filter.show.tags.includes(tag)) {
            this.data.filter.show.tags = this.data.filter.show.tags.filter(t => t !== tag);
            saveRequired = true;
        }
        if (!this.data.filter.hide.tags.includes(tag)) {
            this.data.filter.hide.tags.push(tag);
            saveRequired = true;
        }
        if (saveRequired) {
            await this.save();
            await this.updateClients('filter');
        }
    }
    async removeFilterShowTag(tag) {
        let saveRequired = false;
        if (this.data.filter.show.tags.includes(tag)) {
            this.data.filter.show.tags = this.data.filter.show.tags.filter(t => t !== tag);
            saveRequired = true;
        }
        if (saveRequired) {
            await this.save();
            await this.updateClients('filter');
        }
    }
    async removeFilterHideTag(tag) {
        let saveRequired = false;
        if (this.data.filter.hide.tags.includes(tag)) {
            this.data.filter.hide.tags = this.data.filter.hide.tags.filter(t => t !== tag);
            saveRequired = true;
        }
        if (saveRequired) {
            await this.save();
            await this.updateClients('filter');
        }
    }
    async filter(filter) {
        this.data.filter = filter;
        await this.save();
        await this.updateClients('filter');
    }
    async sort(by, direction) {
        this.data.playlist = this.data.playlist.sort((a, b) => {
            if (by === SortBy.TIMESTAMP && a.timestamp !== b.timestamp) {
                return direction * (a.timestamp > b.timestamp ? 1 : -1);
            }
            if (by === SortBy.TITLE && a.title !== b.title) {
                return direction * a.title.localeCompare(b.title);
            }
            if (by === SortBy.PLAYS && a.plays !== b.plays) {
                return direction * (a.plays > b.plays ? 1 : -1);
            }
            if (by === SortBy.USER && a.user !== b.user) {
                return direction * a.user.localeCompare(b.user);
            }
            if (by === SortBy.DURATION && a.durationMs !== b.durationMs) {
                return direction * (a.durationMs > b.durationMs ? 1 : -1);
            }
            return 0;
        });
        await this.save();
        await this.updateClients('init');
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
    async answerAddRequest(addResponseData, limits) {
        const idx = addResponseData.idx;
        const reason = addResponseData.reason;
        const addType = addResponseData.addType;
        if (addType === ADD_TYPE.NOT_ADDED) {
            if (reason === NOT_ADDED_REASON.NOT_FOUND) {
                return 'No song found';
            }
            else if (reason === NOT_ADDED_REASON.NOT_FOUND_IN_PLAYLIST) {
                return 'Song not found in playlist';
            }
            else if (reason === NOT_ADDED_REASON.TOO_LONG) {
                return `Song too long (max. ${humanDuration(limits.maxLenMs)})`;
            }
            else if (reason === NOT_ADDED_REASON.TOO_MANY_QUEUED) {
                return `Too many songs queued (max. ${limits.maxQueued})`;
            }
            else if (reason === NOT_ADDED_REASON.QUOTA_REACHED) {
                return 'Could not process that song request (Quota reached)';
            }
            else if (reason === NOT_ADDED_REASON.NO_API_KEYS) {
                return 'Could not process that song request (No api keys set up)';
            }
            else if (reason === NOT_ADDED_REASON.UNKNOWN) {
                return 'Could not process that song request';
            }
            else {
                return 'Could not process that song request';
            }
        }
        const item = idx >= 0 ? this.data.playlist[idx] : null;
        if (!item) {
            return 'Could not process that song request';
        }
        let info;
        if (idx < 0) {
            info = '';
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
        if (addType === ADD_TYPE.REQUEUED) {
            return `🎵 "${item.title}" (${Youtube.getUrlById(item.yt)}) was already in the playlist and only moved up. ${info}`;
        }
        if (addType === ADD_TYPE.EXISTED) {
            return `🎵 "${item.title}" (${Youtube.getUrlById(item.yt)}) was already in the playlist. ${info}`;
        }
        return 'Could not process that song request';
    }
    cmdSrCurrent(_originalCommand) {
        return async (ctx) => {
            if (!ctx.rawCmd || !ctx.context) {
                return;
            }
            const say = this.bot.sayFn(this.user);
            if (this.data.playlist.length === 0) {
                say('Playlist is empty');
                return;
            }
            const cur = this.data.playlist[0];
            // todo: error handling, title output etc..
            say(`Currently playing: ${cur.title} (${Youtube.getUrlById(cur.yt)}, ${cur.plays}x plays, requested by ${cur.user})`);
        };
    }
    cmdSrUndo(_originalCommand) {
        return async (ctx) => {
            if (!ctx.rawCmd || !ctx.context || !ctx.context['display-name']) {
                return;
            }
            const say = this.bot.sayFn(this.user);
            const undid = await this.undo(ctx.context['display-name']);
            if (!undid) {
                say('Could not undo anything');
            }
            else {
                say(`Removed "${undid.title}" from the playlist!`);
            }
        };
    }
    cmdResr(_originalCommand) {
        return async (ctx) => {
            if (!ctx.rawCmd || !ctx.context) {
                log$k.error('cmdResr: client, command or context empty');
                return;
            }
            const say = this.bot.sayFn(this.user);
            if (ctx.rawCmd.args.length === 0) {
                say('Usage: !resr SEARCH');
                return;
            }
            const searchterm = ctx.rawCmd.args.join(' ');
            const addResponseData = await this.resr(searchterm);
            say(await this.answerAddRequest(addResponseData, noLimits()));
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
            if (!ctx.rawCmd || !ctx.context || !ctx.context['display-name']) {
                return;
            }
            const say = this.bot.sayFn(this.user);
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
        return async (_ctx) => {
            const removedItem = await this.remove();
            if (removedItem) {
                const say = this.bot.sayFn(this.user);
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
        return async (_ctx) => {
            const say = this.bot.sayFn(this.user);
            await this.loop();
            say('Now looping the current song');
        };
    }
    cmdSrNoloop(_originalCommand) {
        return async (_ctx) => {
            const say = this.bot.sayFn(this.user);
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
            if (tag === '') {
                return;
            }
            const say = this.bot.sayFn(this.user);
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
            const say = this.bot.sayFn(this.user);
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
            const say = this.bot.sayFn(this.user);
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
        return async (_ctx) => {
            const say = this.bot.sayFn(this.user);
            await this.videoVisibility(false);
            say('Video is now hidden.');
        };
    }
    cmdSrShowvideo(_originalCommand) {
        return async (_ctx) => {
            const say = this.bot.sayFn(this.user);
            await this.videoVisibility(true);
            say('Video is now shown.');
        };
    }
    cmdSrFilter(_originalCommand) {
        return async (ctx) => {
            if (!ctx.rawCmd || !ctx.context) {
                return;
            }
            const say = this.bot.sayFn(this.user);
            const tag = ctx.rawCmd.args.join(' ');
            if (tag !== '') {
                const res = await this.setFilterShowTag(tag);
                if (res === SET_FILTER_SHOW_TAG_RESULT.IS_HIDDEN) {
                    say(`The tag ${tag} is currently hidden, no changes made.`);
                }
                else if (res === SET_FILTER_SHOW_TAG_RESULT.UPDATED) {
                    say(`Playing only songs tagged with "${tag}".`);
                }
                else if (res === SET_FILTER_SHOW_TAG_RESULT.NOT_UPDATED) {
                    say(`Already playing only songs tagged with "${tag}".`);
                }
            }
            else {
                const res = await this.removeFilterShowTags();
                if (res === REMOVE_FILTER_SHOW_TAGS_RESULT.UPDATED) {
                    say('Playing all songs.');
                }
                else if (res === REMOVE_FILTER_SHOW_TAGS_RESULT.NOT_UPDATED) {
                    say('Already playing all songs.');
                }
            }
        };
    }
    cmdSrMoveTagUp(_originalCommand) {
        return async (ctx) => {
            if (!ctx.rawCmd || !ctx.context) {
                return;
            }
            const say = this.bot.sayFn(this.user);
            const tag = ctx.rawCmd.args.join(' ');
            if (tag === '') {
                say(`No tag given.`);
                return;
            }
            const res = moveTagUp(this.data.playlist, tag);
            if (res === MOVE_TAG_UP_RESULT.MOVED) {
                say(`Moved songs with tag "${tag}" to the beginning of the playlist.`);
                await this.save();
                await this.updateClients('skip');
            }
            else if (res === MOVE_TAG_UP_RESULT.NOT_MOVED) {
                say(`No songs with tag "${tag}" found.`);
            }
        };
    }
    cmdSrQueue(_originalCommand) {
        return async (_ctx) => {
            const say = this.bot.sayFn(this.user);
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
            const say = this.bot.sayFn(this.user);
            const presetName = ctx.rawCmd.args.join(' ');
            if (presetName === '') {
                if (this.data.settings.customCssPresets.length) {
                    say(`Presets: ${this.data.settings.customCssPresets.map(preset => preset.name).join(', ')}`);
                }
                else {
                    say('No presets configured');
                }
            }
            else {
                const index = this.data.settings.customCssPresets.findIndex(preset => preset.name === presetName);
                if (index !== -1) {
                    this.data.settings.customCssPresetIdx = index;
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
            if (!ctx.rawCmd || !ctx.context || !ctx.context['display-name']) {
                return;
            }
            const say = this.bot.sayFn(this.user);
            if (ctx.rawCmd.args.length === 0) {
                say('Usage: !sr YOUTUBE-URL');
                return;
            }
            const str = ctx.rawCmd.args.join(' ');
            const limits = determineLimits(ctx.context, this.data.settings);
            const addResponseData = await this.add(str, ctx.context['display-name'], limits);
            say(await this.answerAddRequest(addResponseData, limits));
        };
    }
    createItem(youtubeData, userName) {
        return {
            id: Math.random(),
            yt: youtubeData.id,
            title: youtubeData.title,
            timestamp: new Date().getTime(),
            durationMs: youtubeData.durationMs,
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
        let insertIndex = findInsertIndex(this.data.playlist);
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
        let insertIndex = findInsertIndex(this.data.playlist);
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

const log$j = logger('VoteModule.ts');
class VoteModule {
    constructor(bot, user) {
        this.bot = bot;
        this.user = user;
        this.name = MODULE_NAME.VOTE;
        // @ts-ignore
        return (async () => {
            this.data = await this.reinit();
            return this;
        })();
    }
    async userChanged(user) {
        this.user = user;
    }
    async reinit() {
        const { data, enabled } = await this.bot.getRepos().module.load(this.user.id, this.name, {
            votes: {},
        });
        return {
            data: data,
            enabled,
        };
    }
    async save() {
        await this.bot.getRepos().module.save(this.user.id, this.name, {
            votes: this.data.data.votes,
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
    isEnabled() {
        return this.data.enabled;
    }
    async setEnabled(enabled) {
        this.data.enabled = enabled;
    }
    async vote(type, thing, context) {
        if (!context['display-name']) {
            log$j.error('context has no display name set');
            return;
        }
        const say = this.bot.sayFn(this.user);
        this.data.data.votes[type] = this.data.data.votes[type] || {};
        this.data.data.votes[type][context['display-name']] = thing;
        say(`Thanks ${context['display-name']}, registered your "${type}" vote: ${thing}`);
        await this.save();
    }
    async playCmd(ctx) {
        if (!ctx.rawCmd || !ctx.context) {
            return;
        }
        const say = this.bot.sayFn(this.user);
        if (ctx.rawCmd.args.length === 0) {
            say('Usage: !play THING');
            return;
        }
        const thing = ctx.rawCmd.args.join(' ');
        const type = 'play';
        await this.vote(type, thing, ctx.context);
    }
    async voteCmd(ctx) {
        if (!ctx.rawCmd || !ctx.context) {
            return;
        }
        const say = this.bot.sayFn(this.user);
        // maybe open up for everyone, but for now use dedicated
        // commands like !play THING
        if (!isMod(ctx.context) && !isBroadcaster(ctx.context)) {
            say('Not allowed to execute !vote command');
        }
        if (ctx.rawCmd.args.length < 2) {
            say('Usage: !vote TYPE THING');
            return;
        }
        if (ctx.rawCmd.args[0] === 'show') {
            const type = ctx.rawCmd.args[1];
            if (!this.data.data.votes[type]) {
                say(`No votes for "${type}".`);
                return;
            }
            const usersByValues = {};
            for (const user of Object.keys(this.data.data.votes[type])) {
                const val = this.data.data.votes[type][user];
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
            if (this.data.data.votes[type]) {
                delete this.data.data.votes[type];
            }
            await this.save();
            say(`Cleared votes for "${type}". ✨`);
            return;
        }
        const type = ctx.rawCmd.args[0];
        const thing = ctx.rawCmd.args.slice(1).join(' ');
        await this.vote(type, thing, ctx.context);
    }
    getCommands() {
        return [
            // TODO: make configurable
            {
                id: 'vote',
                triggers: [newCommandTrigger('!vote')],
                fn: this.voteCmd.bind(this),
                cooldown: {
                    global: '0',
                    globalMessage: '',
                    perUser: '0',
                    perUserMessage: '',
                },
                restrict: {
                    active: false,
                    to: [],
                },
            },
            {
                id: 'play',
                triggers: [newCommandTrigger('!play')],
                fn: this.playCmd.bind(this),
                cooldown: {
                    global: '0',
                    globalMessage: '',
                    perUser: '0',
                    perUserMessage: '',
                },
                restrict: {
                    active: false,
                    to: [],
                },
            },
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
        },
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
        this.bot = bot;
        this.user = user;
        this.name = MODULE_NAME.SPEECH_TO_TEXT;
        // @ts-ignore
        return (async () => {
            this.data = await this.reinit();
            return this;
        })();
    }
    async userChanged(user) {
        this.user = user;
    }
    async reinit() {
        const { data, enabled } = await this.bot.getRepos().module.load(this.user.id, this.name, {});
        return {
            settings: default_settings$3(data.settings),
            enabled,
        };
    }
    isEnabled() {
        return this.data.enabled;
    }
    async setEnabled(enabled) {
        this.data.enabled = enabled;
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
                enabled: this.data.enabled,
                settings: this.data.settings,
                controlWidgetUrl: await this.bot.getWidgets().getWidgetUrl(WIDGET_TYPE.SPEECH_TO_TEXT_CONTROL, this.user.id),
                displayWidgetUrl: await this.bot.getWidgets().getWidgetUrl(WIDGET_TYPE.SPEECH_TO_TEXT_RECEIVE, this.user.id),
            },
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
                await this.bot.getRepos().module.save(this.user.id, this.name, this.data);
                this.data = await this.reinit();
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
    moderationAdmins: getProp(obj, ['moderationAdmins'], []),
});
const default_images = (list = null) => {
    if (Array.isArray(list)) {
        // TODO: sanitize
        return list;
    }
    return [];
};

const log$i = logger('DrawcastModule.ts');
class DrawcastModule {
    constructor(bot, user) {
        this.bot = bot;
        this.user = user;
        this.name = MODULE_NAME.DRAWCAST;
        // @ts-ignore
        return (async () => {
            this.data = await this.reinit();
            return this;
        })();
    }
    async userChanged(user) {
        this.user = user;
    }
    _deleteImage(image) {
        const rel = `/uploads/drawcast/${this.user.id}`;
        if (!image.path.startsWith(rel)) {
            return false;
        }
        const name = image.path.substring(rel.length).replace('/', '').replace('\\', '');
        const path = `./data${rel}`;
        if (fs.existsSync(`${path}/${name}`)) {
            fs.rmSync(`${path}/${name}`);
            return true;
        }
        return false;
    }
    _loadAllImages() {
        try {
            // todo: probably better to store latest x images in db
            const rel = `/uploads/drawcast/${this.user.id}`;
            const path = `./data${rel}`;
            return fs.readdirSync(path)
                .map((name) => ({
                name: name,
                time: fs.statSync(path + '/' + name).mtime.getTime(),
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
        const { data, enabled } = await this.bot.getRepos().module.load(this.user.id, this.name, {});
        if (!data.images) {
            data.images = this._loadAllImages();
        }
        return {
            settings: default_settings$2(data.settings),
            images: default_images(data.images),
            enabled,
        };
    }
    async save() {
        await this.bot.getRepos().module.save(this.user.id, this.name, this.data);
    }
    getRoutes() {
        return {};
    }
    getImages() {
        return this.data.images;
    }
    async drawUrl() {
        return await this.bot.getWidgets().getPublicWidgetUrl(WIDGET_TYPE.DRAWCAST_DRAW, this.user.id);
    }
    async receiveUrl() {
        return await this.bot.getWidgets().getWidgetUrl(WIDGET_TYPE.DRAWCAST_RECEIVE, this.user.id);
    }
    async controlUrl() {
        return await this.bot.getWidgets().getWidgetUrl(WIDGET_TYPE.DRAWCAST_CONTROL, this.user.id);
    }
    async wsdata(eventName) {
        return {
            event: eventName,
            data: {
                enabled: this.data.enabled,
                settings: this.data.settings,
                images: this.data.images, // lots of images! maybe limit to 20 images
                drawUrl: await this.drawUrl(),
                controlWidgetUrl: await this.controlUrl(),
                receiveWidgetUrl: await this.receiveUrl(),
            },
        };
    }
    isEnabled() {
        return this.data.enabled;
    }
    async setEnabled(enabled) {
        this.data.enabled = enabled;
    }
    async checkAuthorized(token, onlyOwner = false) {
        const user = await this.bot.getAuth()._determineApiUserData(token);
        if (!user) {
            return false;
        }
        if (user.user.id === this.user.id) {
            return true;
        }
        if (onlyOwner) {
            return false;
        }
        return arrayIncludesIgnoreCase(this.data.settings.moderationAdmins, user.user.name);
    }
    getWsEvents() {
        return {
            'conn': async (ws) => {
                const settings = JSON.parse(JSON.stringify(this.data.settings));
                if (!settings.moderationAdmins.includes(this.user.name)) {
                    settings.moderationAdmins.push(this.user.name);
                }
                this.bot.getWebSocketServer().notifyOne([this.user.id], this.name, {
                    event: 'init',
                    data: {
                        settings,
                        images: this.data.images.filter(image => image.approved).slice(0, 20),
                        drawUrl: await this.drawUrl(),
                        controlWidgetUrl: await this.controlUrl(),
                        receiveWidgetUrl: await this.receiveUrl(),
                    },
                }, ws);
            },
            'get_all_images': async (ws, { token }) => {
                if (!this.checkAuthorized(token)) {
                    log$i.error({ token }, 'get_all_images: unauthed user');
                    return;
                }
                this.bot.getWebSocketServer().notifyOne([this.user.id], this.name, {
                    event: 'all_images',
                    data: { images: this.getImages() },
                }, ws);
            },
            'approve_image': async (_ws, { path, token }) => {
                if (!this.checkAuthorized(token)) {
                    log$i.error({ path, token }, 'approve_image: unauthed user');
                    return;
                }
                const image = this.data.images.find(item => item.path === path);
                if (!image) {
                    // should not happen
                    log$i.error({ path }, 'approve_image: image not found');
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
            'deny_image': async (_ws, { path, token }) => {
                if (!this.checkAuthorized(token)) {
                    log$i.error({ path, token }, 'deny_image: unauthed user');
                    return;
                }
                const image = this.data.images.find(item => item.path === path);
                if (!image) {
                    // should not happen
                    log$i.error({ path }, 'deny_image: image not found');
                    return;
                }
                this.data.images = this.data.images.filter(item => item.path !== image.path);
                await this.save();
                this.bot.getWebSocketServer().notifyAll([this.user.id], this.name, {
                    event: 'denied_image_received',
                    data: { nonce: '', img: image.path, mayNotify: false },
                });
            },
            'delete_image': async (_ws, { path, token }) => {
                if (!this.checkAuthorized(token)) {
                    log$i.error({ path, token }, 'delete_image: unauthed user');
                    return;
                }
                const image = this.data.images.find(item => item.path === path);
                if (!image) {
                    // should not happen
                    log$i.error({ path }, 'delete_image: image not found');
                    return;
                }
                const deleted = this._deleteImage(image);
                if (!deleted) {
                    // should not happen
                    log$i.error({ path }, 'delete_image: image not deleted');
                    return;
                }
                this.data.settings.favoriteLists = this.data.settings.favoriteLists.map(favoriteList => {
                    favoriteList.list = favoriteList.list.filter(img => img !== image.path);
                    return favoriteList;
                });
                this.data.images = this.data.images.filter(item => item.path !== image.path);
                await this.save();
                this.bot.getWebSocketServer().notifyAll([this.user.id], this.name, {
                    event: 'image_deleted',
                    data: { nonce: '', img: image.path, mayNotify: false },
                });
            },
            'post': async (_ws, data) => {
                const rel = `/uploads/drawcast/${this.user.id}`;
                const img = fn.decodeBase64Image(data.data.img);
                const name = fn.safeFileName(`${(new Date()).toJSON()}-${nonce(6)}.${fn.mimeToExt(img.type)}`);
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
            'save': async (_ws, data) => {
                if (!this.checkAuthorized(data.token, true)) {
                    log$i.error({ token: data.token }, 'save: unauthed user');
                    return;
                }
                this.data.settings = data.settings;
                const settings = JSON.parse(JSON.stringify(this.data.settings));
                if (!settings.moderationAdmins.includes(this.user.name)) {
                    settings.moderationAdmins.push(this.user.name);
                }
                await this.save();
                this.data = await this.reinit();
                this.bot.getWebSocketServer().notifyAll([this.user.id], this.name, {
                    event: 'init',
                    data: {
                        settings,
                        images: this.data.images.filter(image => image.approved).slice(0, 20),
                        drawUrl: await this.drawUrl(),
                        controlWidgetUrl: await this.controlUrl(),
                        receiveWidgetUrl: await this.receiveUrl(),
                    },
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

const log$h = logger('AvatarModule.ts');
class AvatarModule {
    constructor(bot, user) {
        this.bot = bot;
        this.user = user;
        this.name = MODULE_NAME.AVATAR;
        // @ts-ignore
        return (async () => {
            this.data = await this.reinit();
            return this;
        })();
    }
    async userChanged(user) {
        this.user = user;
    }
    async save() {
        await this.bot.getRepos().module.save(this.user.id, this.name, this.data);
    }
    saveCommands() {
        // pass
    }
    async reinit() {
        const { data, enabled } = await this.bot.getRepos().module.load(this.user.id, this.name, {});
        return {
            settings: default_settings$1(data.settings),
            state: default_state$1(data.state),
            enabled,
        };
    }
    isEnabled() {
        return this.data.enabled;
    }
    async setEnabled(enabled) {
        this.data.enabled = enabled;
    }
    getRoutes() {
        return {};
    }
    async wsdata(event) {
        return {
            event,
            data: {
                enabled: this.data.enabled,
                settings: this.data.settings,
                state: this.data.state,
                controlWidgetUrl: await this.bot.getWidgets().getWidgetUrl(WIDGET_TYPE.AVATAR_CONTROL, this.user.id),
                displayWidgetUrl: await this.bot.getWidgets().getWidgetUrl(WIDGET_TYPE.AVATAR_RECEIVE, this.user.id),
            },
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
                if (data.data.ctrl === 'setSlot') {
                    const tuberIdx = data.data.args[0];
                    const slotName = data.data.args[1];
                    const itemIdx = data.data.args[2];
                    try {
                        this.data.settings.avatarDefinitions[tuberIdx].state.slots[slotName] = itemIdx;
                        await this.save();
                    }
                    catch (e) {
                        log$h.error({ tuberIdx, slotName, itemIdx }, 'ws ctrl: unable to setSlot');
                    }
                }
                else if (data.data.ctrl === 'lockState') {
                    const tuberIdx = data.data.args[0];
                    const lockedState = data.data.args[1];
                    try {
                        this.data.settings.avatarDefinitions[tuberIdx].state.lockedState = lockedState;
                        await this.save();
                    }
                    catch (e) {
                        log$h.error({ tuberIdx, lockedState }, 'ws ctrl: unable to lockState');
                    }
                }
                else if (data.data.ctrl === 'setTuber') {
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
        this.bot = bot;
        this.user = user;
        this.name = MODULE_NAME.POMO;
        this.timeout = null;
        // @ts-ignore
        return (async () => {
            this.data = await this.reinit();
            this.tick(null, null);
            this.commands = [
                {
                    id: 'pomo',
                    triggers: [newCommandTrigger('!pomo')],
                    restrict: {
                        active: true,
                        to: MOD_OR_ABOVE,
                    },
                    fn: this.cmdPomoStart.bind(this),
                    cooldown: { global: '0', globalMessage: '', perUser: '0', perUserMessage: '' },
                },
                {
                    id: 'pomo_exit',
                    triggers: [newCommandTrigger('!pomo exit', true)],
                    restrict: {
                        active: true,
                        to: MOD_OR_ABOVE,
                    },
                    fn: this.cmdPomoExit.bind(this),
                    cooldown: { global: '0', globalMessage: '', perUser: '0', perUserMessage: '' },
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
    async effect(effect, command, context) {
        if (effect.chatMessage) {
            const say = this.bot.sayFn(this.user);
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
                        await this.effect(n.effect, command, context);
                    }
                }
                else {
                    anyNotificationsLeft = true;
                }
            }
            if (dateEnd < now) {
                // is over and should maybe be triggered!
                if (!doneDate || dateEnd > doneDate) {
                    await this.effect(this.data.settings.endEffect, command, context);
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
        let duration = ctx.rawCmd?.args[0] || '25m';
        duration = duration.match(/^\d+$/) ? `${duration}m` : duration;
        const durationMs = parseHumanDuration(duration);
        if (!durationMs) {
            const say = this.bot.sayFn(this.user);
            say('Unable to start the pomo, bad duration given. Usage: !pomo [duration [message]]');
            return;
        }
        this.data.state.running = true;
        this.data.state.startTs = JSON.stringify(new Date());
        this.data.state.doneTs = this.data.state.startTs;
        // todo: parse args and use that
        this.data.state.name = ctx.rawCmd?.args.slice(1).join(' ') || '';
        this.data.state.durationMs = durationMs;
        await this.save();
        this.tick(ctx.rawCmd, ctx.context);
        this.updateClients(await this.wsdata('init'));
        await this.effect(this.data.settings.startEffect, ctx.rawCmd, ctx.context);
    }
    async cmdPomoExit(ctx) {
        this.data.state.running = false;
        await this.save();
        this.tick(ctx.rawCmd, ctx.context);
        this.updateClients(await this.wsdata('init'));
        await this.effect(this.data.settings.stopEffect, ctx.rawCmd, ctx.context);
    }
    async userChanged(user) {
        this.user = user;
    }
    async save() {
        await this.bot.getRepos().module.save(this.user.id, this.name, this.data);
    }
    saveCommands() {
        // pass
    }
    async reinit() {
        const { data, enabled } = await this.bot.getRepos().module.load(this.user.id, this.name, {});
        return {
            settings: default_settings(data.settings),
            state: default_state(data.state),
            enabled,
        };
    }
    getRoutes() {
        return {};
    }
    async wsdata(event) {
        return {
            event,
            data: {
                enabled: this.data.enabled,
                settings: this.data.settings,
                state: this.data.state,
                widgetUrl: await this.bot.getWidgets().getWidgetUrl(WIDGET_TYPE.POMO, this.user.id),
            },
        };
    }
    isEnabled() {
        return this.data.enabled;
    }
    async setEnabled(enabled) {
        this.data.enabled = enabled;
        if (!this.data.enabled) {
            this.data.state.running = false;
        }
        await this.save();
        this.updateClients(await this.wsdata('init'));
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
    buildDate: "2024-08-15T18:43:23.424Z",
    // @ts-ignore
    buildVersion: "1.70.6",
};

const log$g = logger('StreamStatusUpdater.ts');
class StreamStatusUpdater {
    constructor(bot) {
        this.bot = bot;
        this.users = [];
        // pass
    }
    addUser(user) {
        this.users.push(user);
    }
    async updateForUser(userId) {
        for (const user of this.users) {
            if (user.id === userId) {
                await this._doUpdateForUser(user);
                return;
            }
        }
    }
    async _doUpdateForUser(user) {
        const client = this.bot.getUserTwitchClientManager(user).getHelixClient();
        if (!client || !user.twitch_id) {
            return;
        }
        const stream = await client.getStreamByUserId(user.twitch_id);
        await this.bot.getRepos().user.save({
            id: user.id,
            is_streaming: !!stream,
        });
    }
    async _doUpdate() {
        log$g.info('doing update');
        const updatePromises = [];
        for (const user of this.users) {
            updatePromises.push(this._doUpdateForUser(user));
        }
        await Promise.all(updatePromises);
        setTimeout(() => {
            void this._doUpdate();
        }, 5 * MINUTE);
        log$g.info('done update');
    }
    start() {
        void this._doUpdate();
    }
}

const log$f = logger('FrontendStatusUpdater.ts');
class FrontendStatusUpdater {
    constructor(bot) {
        this.bot = bot;
        this.users = [];
        // pass
    }
    addUser(user) {
        this.users.push(user);
    }
    async updateForUser(userId) {
        for (const user of this.users) {
            if (user.id === userId) {
                await this._doUpdateForUser(user);
                return;
            }
        }
    }
    async _doUpdateForUser(user) {
        const client = this.bot.getUserTwitchClientManager(user).getHelixClient();
        if (!client) {
            return;
        }
        // status for the user that should show in frontend
        // (eg. problems with their settings)
        // this only is relevant if the user is at the moment connected
        // to a websocket
        if (!this.bot.getWebSocketServer().isUserConnected(user.id)) {
            return;
        }
        const problems = [];
        if (this.bot.getConfig().bot.supportTwitchAccessTokens) {
            const result = await refreshExpiredTwitchChannelAccessToken(this.bot, user);
            if (result.error) {
                log$f.error('Unable to validate or refresh OAuth token.');
                log$f.error(`user: ${user.name}, channel: ${user.twitch_login}, error: ${result.error}`);
                problems.push({
                    message: 'access_token_invalid',
                    details: {
                        channel_name: user.twitch_login,
                    },
                });
            }
            else if (result.refreshed) {
                const changedUser = await this.bot.getRepos().user.getById(user.id);
                if (changedUser) {
                    this.bot.getEventHub().emit('access_token_refreshed', changedUser);
                }
                else {
                    log$f.error(`oauth token refresh: user doesn't exist after saving it: ${user.id}`);
                }
            }
        }
        const data = { event: 'status', data: { problems } };
        this.bot.getWebSocketServer().notifyAll([user.id], 'core', data);
    }
    async _doUpdate() {
        log$f.info('doing update');
        const updatePromises = [];
        for (const user of this.users) {
            updatePromises.push(this._doUpdateForUser(user));
        }
        await Promise.all(updatePromises);
        setTimeout(() => {
            void this._doUpdate();
        }, 1 * MINUTE);
        log$f.info('done update');
    }
    start() {
        void this._doUpdate();
    }
}

// @ts-ignore
class TwitchTmiClientManager {
    constructor() {
        // pass
    }
    get(identity, channels) {
        const client = new tmi.client({
            options: {
                clientId: identity.client_id,
            },
            identity: {
                username: identity.username,
                password: identity.password,
            },
            channels,
            connection: {
                reconnect: true,
            },
        });
        return client;
    }
}

const TABLE$8 = 'robyottoko.chat_log';
class ChatLogRepo extends Repo {
    async insert(context, msg) {
        await this.db.insert(TABLE$8, {
            created_at: new Date(),
            broadcaster_user_id: context['room-id'] || '',
            user_name: context.username || '',
            display_name: context['display-name'] || '',
            message: msg,
        });
    }
    async count(where) {
        const whereObject = this.db._buildWhere(where);
        const row = await this.db._get(`select COUNT(*) as c from ${TABLE$8} ${whereObject.sql}`, whereObject.values);
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
    // HACK: we have no other way of getting a user name by user display name atm
    // TODO: replace this functionality
    async getUsernameByUserDisplayName(displayName) {
        const row = await this.db.get(TABLE$8, {
            display_name: displayName,
        });
        return row ? row.user_name : null;
    }
    async getChatters(channelId, since) {
        const whereObject = this.db._buildWhere({
            broadcaster_user_id: channelId,
            created_at: { '$gte': since },
        });
        return (await this.db._getMany(`select display_name from robyottoko.chat_log ${whereObject.sql} group by display_name`, whereObject.values)).map(r => r.display_name);
    }
}

const TABLE$7 = 'robyottoko.command_execution';
logger('CommandExecutionRepo.ts');
class CommandExecutionRepo extends Repo {
    async insert(data) {
        return await this.db.insert(TABLE$7, data);
    }
    async getLastExecuted(data) {
        return await this.db.get(TABLE$7, data, [
            { executed_at: -1 },
        ]);
    }
}

const TABLE$6 = 'robyottoko.event_sub';
class EventSubRepo extends Repo {
    async insert(sub) {
        await this.db.upsert(TABLE$6, sub, {
            subscription_id: sub.subscription_id,
        });
    }
    async delete(where) {
        await this.db.delete(TABLE$6, where);
    }
    async getBySubscriptionId(subscriptionId) {
        return await this.db.get(TABLE$6, { subscription_id: subscriptionId });
    }
}

const TABLE$5 = 'robyottoko.module';
const log$e = logger('ModuleRepo.ts');
class ModuleRepo extends Repo {
    async load(userId, key, def) {
        try {
            const where = { user_id: userId, key };
            let row = await this.db.get(TABLE$5, where);
            if (!row) {
                await this.save(userId, key, def);
            }
            row = await this.db.get(TABLE$5, where);
            const data = JSON.parse('' + row.data);
            return {
                data: data ? Object.assign({}, def, data) : def,
                enabled: row ? !!row.enabled : true,
            };
        }
        catch (e) {
            log$e.error({ e });
            return {
                data: def,
                enabled: true,
            };
        }
    }
    async getInfosByUser(userId) {
        const sql = 'SELECT key, enabled FROM ' + TABLE$5 + ' WHERE user_id = $1';
        return await this.db._getMany(sql, [userId]);
    }
    async save(userId, key, rawData) {
        const where = { user_id: userId, key };
        const data = JSON.stringify(rawData);
        const dbData = Object.assign({}, where, { data });
        await this.db.upsert(TABLE$5, dbData, where);
    }
    async setEnabled(userId, key, enabled) {
        const where = { user_id: userId, key };
        await this.db.update(TABLE$5, { enabled }, where);
    }
}

const TABLE$4 = 'robyottoko.oauth_token';
class OauthTokenRepo extends Repo {
    // get the newest access token (even if it is already expired)
    async getMatchingAccessToken(user) {
        const row = await this.db.get(TABLE$4, {
            user_id: user.id,
            channel_id: user.twitch_id,
        }, [{ expires_at: -1 }]);
        return row ? row.access_token : null;
    }
    async getByAccessToken(accessToken) {
        return await this.db.get(TABLE$4, { access_token: accessToken });
    }
    async insert(row) {
        await this.db.insert(TABLE$4, row);
    }
}

const TABLE$3 = 'robyottoko.pub';
class PubRepo extends Repo {
    async getByTarget(target) {
        return await this.db.get(TABLE$3, { target });
    }
    async getById(id) {
        return await this.db.get(TABLE$3, { id });
    }
    async insert(row) {
        await this.db.insert(TABLE$3, row);
    }
}

const TABLE$2 = 'robyottoko.streams';
class StreamsRepo extends Repo {
    async getLatestByChannelId(channelId) {
        return await this.db.get(TABLE$2, {
            broadcaster_user_id: channelId,
        }, [{ started_at: -1 }]);
    }
    async setEndDate(streamId, date) {
        await this.db.update(TABLE$2, {
            ended_at: date,
        }, { id: streamId });
    }
    async insert(data) {
        await this.db.insert(TABLE$2, data);
    }
}

const TABLE$1 = 'robyottoko.user';
class Users extends Repo {
    async get(by) {
        return await this.db.get(TABLE$1, by) || null;
    }
    async all() {
        return await this.db.getMany(TABLE$1);
    }
    async getById(id) {
        return await this.get({ id });
    }
    async getByTwitchId(twitchId) {
        return await this.get({ twitch_id: twitchId });
    }
    async getByEmail(email) {
        return await this.get({ email });
    }
    async getByName(name) {
        return await this.db._get(`SELECT * FROM ${TABLE$1} WHERE LOWER(name) = LOWER($1)`, [name]);
    }
    async save(user) {
        await this.db.upsert(TABLE$1, user, { id: user.id });
    }
    async getGroups(id) {
        const rows = await this.db._getMany(`
select g.name from robyottoko.user_group g
inner join robyottoko.user_x_user_group x on x.user_group_id = g.id
where x.user_id = $1`, [id]);
        return rows.map(r => r.name);
    }
    async createUser(user) {
        return (await this.db.insert(TABLE$1, user, 'id'));
    }
    async countUsers() {
        const rows = await this.db.getMany(TABLE$1);
        return rows.length;
    }
    async countUniqueUsersStreaming() {
        const rows = await this.db.getMany(TABLE$1, { is_streaming: true });
        return rows.length;
    }
}

const TABLE = 'robyottoko.variables';
class VariablesRepo extends Repo {
    async set(userId, name, value) {
        await this.db.upsert(TABLE, {
            user_id: userId,
            name,
            value: JSON.stringify(value),
        }, {
            name,
            user_id: userId,
        });
    }
    async get(userId, name) {
        const row = await this.db.get(TABLE, { name, user_id: userId });
        return row ? JSON.parse(row.value) : null;
    }
    async all(userId) {
        const rows = await this.db.getMany(TABLE, { user_id: userId });
        return rows.map(row => ({
            name: row.name,
            value: JSON.parse(row.value),
        }));
    }
    async replace(userId, variables) {
        const names = variables.map(v => v.name);
        await this.db.delete(TABLE, { user_id: userId, name: { '$nin': names } });
        for (const { name, value } of variables) {
            await this.set(userId, name, value);
        }
    }
}

class Repos {
    constructor(db) {
        this.user = new Users(db);
        this.token = new Tokens(db);
        this.pub = new PubRepo(db);
        this.streams = new StreamsRepo(db);
        this.variables = new VariablesRepo(db);
        this.oauthToken = new OauthTokenRepo(db);
        this.module = new ModuleRepo(db);
        this.chatLog = new ChatLogRepo(db);
        this.eventSub = new EventSubRepo(db);
        this.commandExecutionRepo = new CommandExecutionRepo(db);
    }
}

// instances:
// https://api.invidious.io/instances.json?pretty=1&sort_by=version
// const instances = [
//   'https://invidious.nerdvpn.de',
//   'https://invidious.silur.me',
//   'https://invidious.dhusch.de/',
// ]
const BASE_URL = 'https://invidious.nerdvpn.de';
class Invidious {
    async video(youtubeId) {
        const resp = await xhr.get(`${BASE_URL}/api/v1/videos/${youtubeId}`);
        if (resp.status !== 200) {
            throw new NotFoundError();
        }
        return await resp.json();
    }
    async search(args) {
        const resp = await xhr.get(`${BASE_URL}/api/v1/search${asQueryArgs(args)}`);
        if (resp.status !== 200) {
            throw new NotFoundError();
        }
        return await resp.json();
    }
}

class Canny {
    constructor(config) {
        this.config = config;
        // pass
    }
    createToken(user) {
        const userData = {
            email: user.email,
            id: user.id,
            name: user.name,
        };
        return jwt.sign(userData, this.config.sso_private_key, { algorithm: 'HS256' });
    }
}

class Discord {
    constructor(config) {
        this.config = config;
        // pass
    }
    async announce(message) {
        return await fetch(this.config.bot.url + '/announce', {
            method: 'POST',
            headers: {
                'Accept': 'application/json',
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                guildId: this.config.announce.guildId,
                channelId: this.config.announce.channelId,
                message: message,
            }),
        });
    }
}

const loadedAssets = {};
const log$d = logger('emote-parse.ts');
var Scope;
(function (Scope) {
    Scope["GLOBAL"] = "global";
    Scope["CHANNEL"] = "channel";
})(Scope || (Scope = {}));
var Provider;
(function (Provider) {
    Provider["BTTV"] = "bttv";
    Provider["FFZ"] = "ffz";
    Provider["SEVENTV"] = "7tv";
    Provider["TWITCH"] = "twitch";
})(Provider || (Provider = {}));
const errorMessage = (provider, scope, channel) => {
    return `Failed to load ${provider} ${scope} emotes for ${channel}`;
};
const parseTwitchEmote = (obj) => {
    const url = obj.images['url_4x']
        || obj.images['url_2x']
        || obj.images['url_1x']
        || '';
    if (!url || !obj.name) {
        return null;
    }
    return {
        code: obj.name,
        img: url,
        type: Provider.TWITCH,
    };
};
const parseBttvEmote = (obj) => {
    if (!obj.code) {
        return null;
    }
    return {
        code: obj.code,
        img: `https://cdn.betterttv.net/emote/${obj.id}/3x`,
        type: Provider.BTTV,
    };
};
const parseFfzEmote = (obj) => {
    const img = obj.urls[4] != undefined ? obj.urls[4]
        : obj.urls[2] != undefined ? obj.urls[2]
            : obj.urls[1];
    if (!obj.name) {
        return null;
    }
    return {
        code: obj.name,
        img: `https:${img}`,
        type: Provider.FFZ,
    };
};
const parseSeventvV3Emote = (obj) => {
    const urls = {};
    obj.data.host.files.forEach((f) => {
        urls[f.name] = `${obj.data.host.url}/${f.name}`;
    });
    const img = urls['4x.webp'] != undefined ? urls['4x.webp']
        : urls['2x.webp'] != undefined ? urls['2x.webp']
            : urls['1x.webp'] != undefined ? urls['1x.webp']
                : '';
    if (!img || !obj.name) {
        return null;
    }
    return {
        code: obj.name,
        img,
        type: Provider.SEVENTV,
    };
};
async function loadAssets(channel, channelId, helixClient) {
    if (!channel || !channelId) {
        return;
    }
    const now = new Date().getTime();
    const lastLoadedTs = loadedAssets[channel] ? loadedAssets[channel].lastLoadedTs : null;
    if (lastLoadedTs && (now - lastLoadedTs) < 10 * MINUTE) {
        return;
    }
    loadedAssets[channel] = await loadConcurrent(channelId, channel, helixClient);
    loadedAssets[channel].lastLoadedTs = now;
}
async function loadConcurrent(channelId, channel, helixClient) {
    const loadedChannelAssets = {
        lastLoadedTs: null,
        channel,
        channelId,
        emotes: [],
        allLoaded: false,
        loaded: {
            [Provider.BTTV]: { global: false, channel: false },
            [Provider.FFZ]: { global: false, channel: false },
            [Provider.SEVENTV]: { global: false, channel: false },
            [Provider.TWITCH]: { global: false, channel: false },
        },
    };
    function checkLoadedAll(type, scope) {
        if (loadedChannelAssets.loaded[type][scope] == false) {
            loadedChannelAssets.loaded[type][scope] = true;
        }
        const trueVals = [];
        Object.keys(loadedChannelAssets.loaded).forEach((e, _ind) => {
            const obj = loadedChannelAssets.loaded[e];
            const allTrue = !Object.values(obj).includes(false);
            trueVals.push(allTrue);
        });
        loadedChannelAssets.allLoaded = !trueVals.includes(false);
        if (loadedChannelAssets.allLoaded) {
            loadedChannelAssets.emotes = loadedChannelAssets.emotes.sort(compareLength);
        }
    }
    const promises = [];
    // NOTE: FFZ
    promises.push(fetch(`https://api.frankerfacez.com/v1/room/${channel}`)
        .then(response => response.json())
        .then(body => {
        const provider = Provider.FFZ;
        const scope = Scope.CHANNEL;
        try {
            if (body.status === 404) {
                return;
            }
            Object.keys(body.sets).forEach(el => {
                const e = body.sets[el];
                e.emoticons.forEach((ele) => {
                    const emote = parseFfzEmote(ele);
                    if (emote) {
                        loadedChannelAssets.emotes.push(emote);
                    }
                });
            });
            checkLoadedAll(provider, scope);
        }
        catch (error) {
            log$d.error({
                channel,
                message: errorMessage(provider, scope, channel),
                error,
            });
        }
    }).catch((e) => {
        log$d.error(e);
    }));
    promises.push(fetch(`https://api.frankerfacez.com/v1/set/global`)
        .then(response => response.json())
        .then(body => {
        const provider = Provider.FFZ;
        const scope = Scope.GLOBAL;
        try {
            Object.values(body.sets).forEach((emoteSet) => {
                Object.values(emoteSet.emoticons).forEach((globalEmote) => {
                    const emote = parseFfzEmote(globalEmote);
                    if (emote) {
                        loadedChannelAssets.emotes.push(emote);
                    }
                });
            });
            checkLoadedAll(provider, scope);
        }
        catch (error) {
            log$d.error({
                channel,
                message: errorMessage(provider, scope, channel),
                error,
            });
        }
    }).catch((e) => {
        log$d.error(e);
    }));
    // NOTE: BTTV
    promises.push(fetch(`https://api.betterttv.net/3/cached/users/twitch/${channelId}`)
        .then(response => response.json())
        .then(body => {
        const provider = Provider.BTTV;
        const scope = Scope.CHANNEL;
        try {
            if (body.message === 'user not found') {
                return;
            }
            Object.values(body.channelEmotes).forEach((channelEmote) => {
                const emote = parseBttvEmote(channelEmote);
                if (emote) {
                    loadedChannelAssets.emotes.push(emote);
                }
            });
            Object.values(body.sharedEmotes).forEach((sharedEmote) => {
                const emote = parseBttvEmote(sharedEmote);
                if (emote) {
                    loadedChannelAssets.emotes.push(emote);
                }
            });
            checkLoadedAll(provider, scope);
        }
        catch (error) {
            log$d.error({
                channel,
                message: errorMessage(provider, scope, channel),
                error,
            });
        }
    }).catch((e) => {
        log$d.error(e);
    }));
    promises.push(fetch(`https://api.betterttv.net/3/cached/emotes/global`)
        .then(response => response.json())
        .then(body => {
        const provider = Provider.BTTV;
        const scope = Scope.GLOBAL;
        try {
            Object.values(body).forEach((globalEmote) => {
                const emote = parseBttvEmote(globalEmote);
                if (emote) {
                    loadedChannelAssets.emotes.push(emote);
                }
            });
            checkLoadedAll(provider, scope);
        }
        catch (error) {
            log$d.error({
                channel,
                message: errorMessage(provider, scope, channel),
                error,
            });
        }
    }).catch((e) => {
        log$d.error(e);
    }));
    // NOTE: 7TV
    promises.push(fetch(`https://7tv.io/v3/users/twitch/${channelId}`)
        .then(response => response.json())
        .then(body => {
        const provider = Provider.SEVENTV;
        const scope = Scope.CHANNEL;
        try {
            if (body.status_code === 404) {
                return;
            }
            const emotes = body.emote_set?.emotes || [];
            Object.values(emotes).forEach((channelEmote) => {
                const emote = parseSeventvV3Emote(channelEmote);
                if (emote) {
                    loadedChannelAssets.emotes.push(emote);
                }
            });
            checkLoadedAll(provider, scope);
        }
        catch (error) {
            log$d.error({
                channel,
                message: errorMessage(provider, scope, channel),
                error,
            });
        }
    }).catch((e) => {
        log$d.error(e);
    }));
    // 7TV doesnt have global emote api endpoint anymore
    // just set global to loaded
    checkLoadedAll(Provider.SEVENTV, Scope.GLOBAL);
    // Note: TWITCH
    promises.push(helixClient.getChannelEmotes(channelId)
        .then(body => {
        const provider = Provider.TWITCH;
        const scope = Scope.CHANNEL;
        if (body) {
            Object.values(body.data).forEach((channelEmote) => {
                const emote = parseTwitchEmote(channelEmote);
                if (emote) {
                    loadedChannelAssets.emotes.push(emote);
                }
            });
            checkLoadedAll(provider, scope);
        }
        else {
            log$d.error({
                channel,
                message: errorMessage(provider, scope, channel),
                error: null,
            });
        }
    }).catch((e) => {
        log$d.error(e);
    }));
    promises.push(helixClient.getGlobalEmotes()
        .then(body => {
        const provider = Provider.TWITCH;
        const scope = Scope.GLOBAL;
        if (body) {
            Object.values(body.data).forEach((globalEmote) => {
                const emote = parseTwitchEmote(globalEmote);
                if (emote) {
                    loadedChannelAssets.emotes.push(emote);
                }
            });
            checkLoadedAll(provider, scope);
        }
        else {
            log$d.error({
                channel,
                message: errorMessage(provider, scope, channel),
                error: null,
            });
        }
    }).catch((e) => {
        log$d.error(e);
    }));
    await Promise.allSettled(promises);
    return loadedChannelAssets;
}
function compareLength(a, b) {
    if (a.code.length < b.code.length) {
        return 1;
    }
    if (a.code.length > b.code.length) {
        return -1;
    }
    return 0;
}
function compareEnd(a, b) {
    if (a.end < b.end) {
        return 1;
    }
    if (a.end > b.end) {
        return -1;
    }
    return 0;
}
function getMessageEmotes(message, userstate, channel) {
    const emotes = [];
    if (userstate &&
        userstate.emotes != null &&
        typeof userstate.emotes !== 'undefined') {
        const repEmotes = [];
        const userstateEmotes = userstate.emotes;
        Object.keys(userstateEmotes).forEach((el, ind) => {
            const em = userstateEmotes[el];
            em.forEach((ele) => {
                repEmotes.push({
                    start: parseInt(ele.split('-')[0]),
                    end: parseInt(ele.split('-')[1]),
                    rep: Object.keys(userstateEmotes)[ind],
                });
            });
        });
        repEmotes.sort(compareEnd);
        repEmotes.forEach((ele) => {
            emotes.push({
                code: message.substring(ele.start, ele.end + 1),
                img: `https://static-cdn.jtvnw.net/emoticons/v2/${ele.rep}/default/dark/3.0`,
                type: Provider.TWITCH,
            });
            message = message.substring(0, ele.start) + message.substring(ele.end + 1, message.length);
        });
    }
    emotes.push(...detectEmotesInMessage(message, channel));
    return emotes;
}
function escapeRegex(str) {
    return str.replace(/[-[\]{}()*+!<=:?./\\^$|#\s,]/g, '\\$&');
}
function detectEmotesInMessage(msg, channel) {
    const emotes = [];
    const channelEmotes = loadedAssets[channel]?.emotes || [];
    channelEmotes.forEach((ele) => {
        const escCode = escapeRegex(ele.code);
        const regex = new RegExp(`(^${escCode}(?=[^?!."_*+#'´\`\\/%&$€§=])|(?=[^?!."_*+#'´\`\\/%&$€§=])${escCode}$|\\s${escCode}(?=[^?!."_*+#'´\`\\/%&$€§=])|(?=[^?!."_*+#'´\`\\/%&$€§=])${escCode}\\s)`, 'm');
        let m = null;
        do {
            m = msg.match(regex);
            msg = msg.replace(regex, '');
            if (m) {
                emotes.push(ele);
            }
        } while (m);
    });
    return emotes;
}
const loadAssetsForChannel = async (channel, channelId, helixClient) => {
    await loadAssets(channel.replace('#', '').trim().toLowerCase(), channelId, helixClient);
};
const getEmotes = function (message, tags, channel) {
    return getMessageEmotes(message, tags, channel.replace('#', '').trim().toLowerCase());
};

const i = [
  "🏳️‍🌈",
  "🏳️‍⚧️",
  "🇦🇨",
  "🇦🇩",
  "🇦🇪",
  "🇦🇫",
  "🇦🇬",
  "🇦🇮",
  "🇦🇱",
  "🇦🇲",
  "🇦🇴",
  "🇦🇶",
  "🇦🇷",
  "🇦🇸",
  "🇦🇹",
  "🇦🇺",
  "🇦🇼",
  "🇦🇽",
  "🇦🇿",
  "🇧🇦",
  "🇧🇧",
  "🇧🇩",
  "🇧🇪",
  "🇧🇫",
  "🇧🇬",
  "🇧🇭",
  "🇧🇮",
  "🇧🇯",
  "🇧🇱",
  "🇧🇲",
  "🇧🇳",
  "🇧🇴",
  "🇧🇶",
  "🇧🇷",
  "🇧🇸",
  "🇧🇹",
  "🇧🇻",
  "🇧🇼",
  "🇧🇾",
  "🇧🇿",
  "🇨🇦",
  "🇨🇨",
  "🇨🇩",
  "🇨🇫",
  "🇨🇬",
  "🇨🇭",
  "🇨🇮",
  "🇨🇰",
  "🇨🇱",
  "🇨🇲",
  "🇨🇳",
  "🇨🇴",
  "🇨🇵",
  "🇨🇷",
  "🇨🇺",
  "🇨🇻",
  "🇨🇼",
  "🇨🇽",
  "🇨🇾",
  "🇨🇿",
  "🇩🇪",
  "🇩🇬",
  "🇩🇯",
  "🇩🇰",
  "🇩🇲",
  "🇩🇴",
  "🇩🇿",
  "🇪🇦",
  "🇪🇨",
  "🇪🇪",
  "🇪🇬",
  "🇪🇭",
  "🇪🇷",
  "🇪🇸",
  "🇪🇹",
  "🇪🇺",
  "🇫🇮",
  "🇫🇯",
  "🇫🇰",
  "🇫🇲",
  "🇫🇴",
  "🇫🇷",
  "🇬🇦",
  "🇬🇧",
  "🇬🇩",
  "🇬🇪",
  "🇬🇫",
  "🇬🇬",
  "🇬🇭",
  "🇬🇮",
  "🇬🇱",
  "🇬🇲",
  "🇬🇳",
  "🇬🇵",
  "🇬🇶",
  "🇬🇷",
  "🇬🇸",
  "🇬🇹",
  "🇬🇺",
  "🇬🇼",
  "🇬🇾",
  "🇭🇰",
  "🇭🇲",
  "🇭🇳",
  "🇭🇷",
  "🇭🇹",
  "🇭🇺",
  "🇮🇨",
  "🇮🇩",
  "🇮🇪",
  "🇮🇱",
  "🇮🇲",
  "🇮🇳",
  "🇮🇴",
  "🇮🇶",
  "🇮🇷",
  "🇮🇸",
  "🇮🇹",
  "🇯🇪",
  "🇯🇲",
  "🇯🇴",
  "🇯🇵",
  "🇰🇪",
  "🇰🇬",
  "🇰🇭",
  "🇰🇮",
  "🇰🇲",
  "🇰🇳",
  "🇰🇵",
  "🇰🇷",
  "🇰🇼",
  "🇰🇾",
  "🇰🇿",
  "🇱🇦",
  "🇱🇧",
  "🇱🇨",
  "🇱🇮",
  "🇱🇰",
  "🇱🇷",
  "🇱🇸",
  "🇱🇹",
  "🇱🇺",
  "🇱🇻",
  "🇱🇾",
  "🇲🇦",
  "🇲🇨",
  "🇲🇩",
  "🇲🇪",
  "🇲🇫",
  "🇲🇬",
  "🇲🇭",
  "🇲🇰",
  "🇲🇱",
  "🇲🇲",
  "🇲🇳",
  "🇲🇴",
  "🇲🇵",
  "🇲🇶",
  "🇲🇷",
  "🇲🇸",
  "🇲🇹",
  "🇲🇺",
  "🇲🇻",
  "🇲🇼",
  "🇲🇽",
  "🇲🇾",
  "🇲🇿",
  "🇳🇦",
  "🇳🇨",
  "🇳🇪",
  "🇳🇫",
  "🇳🇬",
  "🇳🇮",
  "🇳🇱",
  "🇳🇴",
  "🇳🇵",
  "🇳🇷",
  "🇳🇺",
  "🇳🇿",
  "🇴🇲",
  "🇵🇦",
  "🇵🇪",
  "🇵🇫",
  "🇵🇬",
  "🇵🇭",
  "🇵🇰",
  "🇵🇱",
  "🇵🇲",
  "🇵🇳",
  "🇵🇷",
  "🇵🇸",
  "🇵🇹",
  "🇵🇼",
  "🇵🇾",
  "🇶🇦",
  "🇷🇪",
  "🇷🇴",
  "🇷🇸",
  "🇷🇺",
  "🇷🇼",
  "🇸🇦",
  "🇸🇧",
  "🇸🇨",
  "🇸🇩",
  "🇸🇪",
  "🇸🇬",
  "🇸🇭",
  "🇸🇮",
  "🇸🇯",
  "🇸🇰",
  "🇸🇱",
  "🇸🇲",
  "🇸🇳",
  "🇸🇴",
  "🇸🇷",
  "🇸🇸",
  "🇸🇹",
  "🇸🇻",
  "🇸🇽",
  "🇸🇾",
  "🇸🇿",
  "🇹🇦",
  "🇹🇨",
  "🇹🇩",
  "🇹🇫",
  "🇹🇬",
  "🇹🇭",
  "🇹🇯",
  "🇹🇰",
  "🇹🇱",
  "🇹🇲",
  "🇹🇳",
  "🇹🇴",
  "🇹🇷",
  "🇹🇹",
  "🇹🇻",
  "🇹🇼",
  "🇹🇿",
  "🇺🇦",
  "🇺🇬",
  "🇺🇲",
  "🇺🇳",
  "🇺🇸",
  "🇺🇾",
  "🇺🇿",
  "🇻🇦",
  "🇻🇨",
  "🇻🇪",
  "🇻🇬",
  "🇻🇮",
  "🇻🇳",
  "🇻🇺",
  "🇼🇫",
  "🇼🇸",
  "🇽🇰",
  "🇾🇪",
  "🇾🇹",
  "🇿🇦",
  "🇿🇲",
  "🇿🇼"
], r = [
  // two different rainbow flags (first is the broken one, when using windows)
  { from: "🏳‍🌈", to: "🏳️‍🌈" }
], s = new RegExp(`${i.join("|")}|(\\p{EPres}|\\p{ExtPict})(\\u200d(\\p{EPres}|\\p{ExtPict})\\ufe0f?)*`, "gu");
function* c(n) {
  const t = n.match(s);
  if (t)
    for (let o of t) {
      for (const e of r)
        o = o.replace(e.from, e.to);
      yield [...o].map((e) => e.codePointAt(0));
    }
}
const f = (n) => {
  const t = [];
  for (const o of c(n))
    t.push(o);
  return t;
}, d = (n) => {
  const t = [];
  for (const o of c(n))
    t.push(o.map((e) => e.toString(16)).join("-"));
  return t;
}, p = {
  detectCodePoints: f,
  detectStrings: d,
  EMOJI_REGEX: s
};

class EmoteParser {
    async loadAssetsForChannel(channel, channelId, helixClient) {
        await loadAssetsForChannel(channel, channelId, helixClient);
    }
    extractEmojiEmotes(message) {
        return p.detectStrings(message).map((str) => ({
            url: `https://cdn.betterttv.net/assets/emoji/${str}.svg`,
        }));
    }
    extractEmotes(message, context, channel) {
        const emotes = getEmotes(message, context, channel);
        return [
            ...emotes.map(e => ({ url: e.img })),
            ...this.extractEmojiEmotes(message),
        ];
    }
}

const log$c = logger('TimeApi.ts');
class TimeApi {
    async getTimeAtTimezone(timezone) {
        try {
            const resp = await xhr.get(`https://www.timeapi.io/api/Time/current/zone?timeZone=${timezone}`);
            const json = await resp.json();
            return json.time;
        }
        catch (e) {
            log$c.error(e);
            return '';
        }
    }
}

var _Effect_sayFn;
class Effect {
    constructor(effect, originalCmd, contextModule, rawCmd, context) {
        this.effect = effect;
        this.originalCmd = originalCmd;
        this.contextModule = contextModule;
        this.rawCmd = rawCmd;
        this.context = context;
        _Effect_sayFn.set(this, void 0);
        __classPrivateFieldSet(this, _Effect_sayFn, contextModule.bot.sayFn(contextModule.user), "f");
    }
    async doReplacements(str) {
        return await doReplacements(str, this.rawCmd, this.context, this.originalCmd, this.contextModule.bot, this.contextModule.user);
    }
    say(str) {
        __classPrivateFieldGet(this, _Effect_sayFn, "f").call(this, str);
    }
    getHelixClient() {
        return this.contextModule.bot
            .getUserTwitchClientManager(this.contextModule.user)
            .getHelixClient();
    }
    async getAccessToken() {
        return await this.contextModule.bot
            .getRepos().oauthToken
            .getMatchingAccessToken(this.contextModule.user);
    }
    notifyWs(moduleName, data) {
        this.contextModule.bot
            .getWebSocketServer()
            .notifyAll([this.contextModule.user.id], moduleName, data);
    }
}
_Effect_sayFn = new WeakMap();

const log$b = logger('AddStreamTagEffect.ts');
class AddStreamTagEffect extends Effect {
    async apply() {
        const helixClient = this.getHelixClient();
        if (!this.rawCmd || !this.context || !helixClient) {
            log$b.info({
                rawCmd: this.rawCmd,
                context: this.context,
                helixClient,
            }, 'unable to execute addStreamTags, client, command, context, or helixClient missing');
            return;
        }
        const tag = this.effect.data.tag === '' ? '$args()' : this.effect.data.tag;
        const tmpTag = await this.doReplacements(tag);
        const tagsResponse = await helixClient.getStreamTags(this.contextModule.user.twitch_id);
        if (!tagsResponse) {
            this.say('❌ Unable to fetch current tags.');
            return;
        }
        if (tmpTag === '') {
            const names = tagsResponse.data.map(entry => entry.localization_names['en-us']);
            this.say(`Current tags: ${names.join(', ')}`);
            return;
        }
        const idx = findIdxFuzzy(config.twitch.manual_tags, tmpTag, (item) => item.name);
        if (idx === -1) {
            this.say(`❌ No such tag: ${tmpTag}`);
            return;
        }
        const tagEntry = config.twitch.manual_tags[idx];
        const newTagIds = tagsResponse.data.map(entry => entry.tag_id);
        if (newTagIds.includes(tagEntry.id)) {
            const names = tagsResponse.data.map(entry => entry.localization_names['en-us']);
            this.say(`✨ Tag ${tagEntry.name} already exists, current tags: ${names.join(', ')}`);
            return;
        }
        newTagIds.push(tagEntry.id);
        const newSettableTagIds = newTagIds.filter(tagId => !config.twitch.auto_tags.find(t => t.id === tagId));
        if (newSettableTagIds.length > 5) {
            const names = tagsResponse.data.map(entry => entry.localization_names['en-us']);
            this.say(`❌ Too many tags already exist, current tags: ${names.join(', ')}`);
            return;
        }
        const accessToken = await this.getAccessToken();
        if (!accessToken) {
            this.say(`❌ Not authorized to add tag: ${tagEntry.name}`);
            return;
        }
        const resp = await helixClient.replaceStreamTags(accessToken, newSettableTagIds, this.contextModule.bot, this.contextModule.user);
        if (!resp || resp.status < 200 || resp.status >= 300) {
            log$b.error(resp);
            this.say(`❌ Unable to add tag: ${tagEntry.name}`);
            return;
        }
        this.say(`✨ Added tag: ${tagEntry.name}`);
    }
}

class ChatEffect extends Effect {
    async apply() {
        this.say(await this.doReplacements(getRandom(this.effect.data.text)));
    }
}

const log$a = logger('ChattersEffect.ts');
class ChattersEffect extends Effect {
    async apply() {
        const helixClient = this.getHelixClient();
        if (!this.context || !helixClient) {
            log$a.info({
                context: this.context,
                helixClient,
            }, 'unable to execute chatters command, client, context, or helixClient missing');
            return;
        }
        const stream = await helixClient.getStreamByUserId(this.contextModule.user.twitch_id);
        if (!stream) {
            this.say('It seems this channel is not live at the moment...');
            return;
        }
        const userNames = await this.contextModule.bot.getRepos().chatLog.getChatters(this.contextModule.user.twitch_id, new Date(stream.started_at));
        if (userNames.length === 0) {
            this.say('It seems nobody chatted? :(');
            return;
        }
        this.say('Thank you for chatting!');
        joinIntoChunks(userNames, ', ', 500).forEach(msg => {
            this.say(msg);
        });
    }
}

const log$9 = logger('CountdownEffect.ts');
class CountdownEffect extends Effect {
    async apply() {
        const actionDefinitions = await this.buildActionDefinitions();
        const actions = await this.buildActions(actionDefinitions);
        for (let i = 0; i < actions.length; i++) {
            await actions[i]();
        }
    }
    async buildActions(actionDefinitions) {
        const say = async (text) => {
            return this.say(await this.doReplacements(text));
        };
        const parseDuration = async (str) => {
            return mustParseHumanDuration(await this.doReplacements(str));
        };
        const actions = [];
        for (const a of actionDefinitions) {
            if (a.type === CountdownActionType.TEXT) {
                actions.push(async () => say(`${a.value}`));
            }
            else if (a.type === CountdownActionType.MEDIA) {
                actions.push(async () => {
                    this.notifyWs('general', {
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
                    log$9.error({ message: e.message, value: a.value });
                    return [];
                }
                actions.push(async () => {
                    await sleep(duration);
                });
            }
            else {
                log$9.warn(a, 'unknown countdown action type');
            }
        }
        return actions;
    }
    async buildActionDefinitions() {
        const t = (this.effect.data.type || 'auto');
        if (t === 'manual') {
            return this.effect.data.actions;
        }
        if (t !== 'auto') {
            // unsupported type!
            log$9.warn({ type: t }, 'unknown countdown type');
            return [];
        }
        const actionDefs = [];
        const steps = parseInt(await this.doReplacements(`${this.effect.data.steps}`), 10);
        const msgStep = this.effect.data.step || '{step}';
        const msgIntro = this.effect.data.intro || null;
        const msgOutro = this.effect.data.outro || null;
        if (msgIntro) {
            actionDefs.push({ type: CountdownActionType.TEXT, value: msgIntro.replace(/\{steps\}/g, `${steps}`) });
            actionDefs.push({ type: CountdownActionType.DELAY, value: this.effect.data.interval || '1s' });
        }
        for (let step = steps; step > 0; step--) {
            actionDefs.push({
                type: CountdownActionType.TEXT,
                value: msgStep.replace(/\{steps\}/g, `${steps}`).replace(/\{step\}/g, `${step}`),
            });
            actionDefs.push({ type: CountdownActionType.DELAY, value: this.effect.data.interval || '1s' });
        }
        if (msgOutro) {
            actionDefs.push({ type: CountdownActionType.TEXT, value: msgOutro.replace(/\{steps\}/g, `${steps}`) });
        }
        return actionDefs;
    }
}

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
const searchWord$1 = async (keyword, lang) => {
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
    searchWord: searchWord$1,
    parseResult,
    LANG_TO_URL_MAP,
};

const log$8 = logger('JishoOrg.ts');
const searchWord = async (keyword, page = 1) => {
    const url = 'https://jisho.org/api/v1/search/words' + asQueryArgs({
        keyword,
        page,
    });
    try {
        const resp = await xhr.get(url, { headers: { 'user-agent': 'Robyottoko' } });
        const json = (await resp.json());
        return json.data;
    }
    catch (e) {
        log$8.error(e);
        return [];
    }
};
var JishoOrg = {
    searchWord,
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
class DictLookupEffect extends Effect {
    async apply() {
        const tmpLang = await this.doReplacements(this.effect.data.lang);
        const dictFn = LANG_TO_FN[tmpLang] || null;
        if (!dictFn) {
            this.say(`Sorry, language not supported: "${tmpLang}"`);
            return;
        }
        // if no phrase is setup, use all args given to command
        const phrase = this.effect.data.phrase === '' ? '$args()' : this.effect.data.phrase;
        const tmpPhrase = await this.doReplacements(phrase);
        const items = await dictFn(tmpPhrase);
        if (items.length === 0) {
            this.say(`Sorry, I didn't find anything for "${tmpPhrase}" in language "${tmpLang}"`);
            return;
        }
        for (const item of items) {
            this.say(`Phrase "${item.from}": ${item.to.join(', ')}`);
        }
    }
}

class EmotesEffect extends Effect {
    async apply() {
        this.notifyWs('general', {
            event: 'emotes',
            data: this.effect.data,
        });
    }
}

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

const log$7 = logger('MadochanEffect.ts');
class MadochanEffect extends Effect {
    async apply() {
        const model = `${this.effect.data.model}` || Madochan.defaultModel;
        const weirdness = parseInt(this.effect.data.weirdness, 10) || Madochan.defaultWeirdness;
        if (!this.rawCmd) {
            return;
        }
        const definition = this.rawCmd.args.join(' ');
        if (!definition) {
            return;
        }
        this.say(`Generating word for "${definition}"...`);
        try {
            const data = await Madochan.createWord({ model, weirdness, definition });
            if (data.word === '') {
                this.say('Sorry, I could not generate a word :("');
            }
            else {
                this.say(`"${definition}": ${data.word}`);
            }
        }
        catch (e) {
            log$7.error({ e });
            this.say('Error occured, unable to generate a word :("');
        }
    }
}

const log$6 = logger('MediaEffect.ts');
const isTwitchClipUrl = (url) => {
    return !!url.match(/^https:\/\/clips\.twitch\.tv\/.+/);
};
const downloadVideo = async (originalUrl) => {
    // if video url looks like a twitch clip url, dl it first
    const filename = `${hash(originalUrl)}-clip.mp4`;
    const outfile = `./data/uploads/${filename}`;
    if (!fs.existsSync(outfile)) {
        log$6.debug({ outfile }, 'downloading the video');
        const child = childProcess.execFile(config.youtubeDlBinary, [originalUrl, '-o', outfile]);
        await new Promise((resolve) => {
            child.on('close', resolve);
        });
    }
    else {
        log$6.debug({ outfile }, 'video exists');
    }
    return `/uploads/${filename}`;
};
class MediaEffect extends Effect {
    async apply() {
        this.effect.data.image_url = await this.doReplacements(this.effect.data.image_url);
        if (this.effect.data.video.url) {
            log$6.debug({ url: this.effect.data.video.url }, 'video url is defined');
            this.effect.data.video.url = await this.doReplacements(this.effect.data.video.url);
            if (!this.effect.data.video.url) {
                log$6.debug('no video url found');
            }
            else if (isTwitchClipUrl(this.effect.data.video.url)) {
                // video url looks like a twitch clip url, dl it first
                log$6.debug({ url: this.effect.data.video.url }, 'twitch clip found');
                this.effect.data.video.url = await downloadVideo(this.effect.data.video.url);
            }
            else {
                // otherwise assume it is already a playable video url
                // TODO: youtube videos maybe should also be downloaded
                log$6.debug('video is assumed to be directly playable via html5 video element');
            }
        }
        this.notifyWs('general', {
            event: 'playmedia',
            data: this.effect.data,
            id: this.originalCmd.id,
        });
    }
}

class MediaVolumeEffect extends Effect {
    async apply() {
        if (!this.rawCmd) {
            return;
        }
        const m = this.contextModule;
        if (this.rawCmd.args.length === 0) {
            this.say(`Current volume: ${m.getCurrentMediaVolume()}`);
            return;
        }
        const newVolume = determineNewVolume(this.rawCmd.args[0], m.getCurrentMediaVolume());
        await m.volume(newVolume);
        this.say(`New volume: ${m.getCurrentMediaVolume()}`);
    }
}

const log$5 = logger('RemoveStreamTagEffect.ts');
class RemoveStreamTagEffect extends Effect {
    async apply() {
        const helixClient = this.getHelixClient();
        if (!this.rawCmd || !this.context || !helixClient) {
            log$5.info({
                rawCmd: this.rawCmd,
                context: this.context,
                helixClient,
            }, 'unable to execute removeStreamTags, client, command, context, or helixClient missing');
            return;
        }
        const tag = this.effect.data.tag === '' ? '$args()' : this.effect.data.tag;
        const tmpTag = await this.doReplacements(tag);
        const tagsResponse = await helixClient.getStreamTags(this.contextModule.user.twitch_id);
        if (!tagsResponse) {
            this.say('❌ Unable to fetch current tags.');
            return;
        }
        if (tmpTag === '') {
            const names = tagsResponse.data.map(entry => entry.localization_names['en-us']);
            this.say(`Current tags: ${names.join(', ')}`);
            return;
        }
        const manualTags = tagsResponse.data.filter(entry => !entry.is_auto);
        const idx = findIdxFuzzy(manualTags, tmpTag, (item) => item.localization_names['en-us']);
        if (idx === -1) {
            const autoTags = tagsResponse.data.filter(entry => entry.is_auto);
            const idx = findIdxFuzzy(autoTags, tmpTag, (item) => item.localization_names['en-us']);
            if (idx === -1) {
                this.say(`❌ No such tag is currently set: ${tmpTag}`);
            }
            else {
                this.say(`❌ Unable to remove automatic tag: ${autoTags[idx].localization_names['en-us']}`);
            }
            return;
        }
        const newTagIds = manualTags.filter((_value, index) => index !== idx).map(entry => entry.tag_id);
        const newSettableTagIds = newTagIds.filter(tagId => !config.twitch.auto_tags.find(t => t.id === tagId));
        const accessToken = await this.getAccessToken();
        if (!accessToken) {
            this.say(`❌ Not authorized to remove tag: ${manualTags[idx].localization_names['en-us']}`);
            return;
        }
        const resp = await helixClient.replaceStreamTags(accessToken, newSettableTagIds, this.contextModule.bot, this.contextModule.user);
        if (!resp || resp.status < 200 || resp.status >= 300) {
            this.say(`❌ Unable to remove tag: ${manualTags[idx].localization_names['en-us']}`);
            return;
        }
        this.say(`✨ Removed tag: ${manualTags[idx].localization_names['en-us']}`);
    }
}

class RouletteEffect extends Effect {
    async apply() {
        if (this.effect.data.entries.length === 0) {
            return;
        }
        this.notifyWs('general', {
            event: 'roulette',
            data: this.effect.data,
            id: this.originalCmd.id,
        });
    }
}

const log$4 = logger('SetChannelGameIdEffect.ts');
class SetChannelGameIdEffect extends Effect {
    async apply() {
        const helixClient = this.getHelixClient();
        if (!this.rawCmd || !this.context || !helixClient) {
            log$4.info({
                rawCmd: this.rawCmd,
                context: this.context,
                helixClient,
            }, 'unable to execute setChannelGameId, client, command, context, or helixClient missing');
            return;
        }
        const gameId = this.effect.data.game_id === '' ? '$args()' : this.effect.data.game_id;
        const tmpGameId = await this.doReplacements(gameId);
        if (tmpGameId === '') {
            const info = await helixClient.getChannelInformation(this.contextModule.user.twitch_id);
            if (info) {
                this.say(`Current category is "${info.game_name}".`);
            }
            else {
                this.say('❌ Unable to determine current category.');
            }
            return;
        }
        const category = await helixClient.searchCategory(tmpGameId);
        if (!category) {
            this.say('🔎 Category not found.');
            return;
        }
        const accessToken = await this.getAccessToken();
        if (!accessToken) {
            this.say('❌ Not authorized to update category.');
            return;
        }
        const resp = await helixClient.modifyChannelInformation(accessToken, { game_id: category.id }, this.contextModule.bot, this.contextModule.user);
        if (resp?.status === 204) {
            this.say(`✨ Changed category to "${category.name}".`);
        }
        else {
            this.say('❌ Unable to update category.');
        }
    }
}

const log$3 = logger('SetChannelTitleEffect.ts');
class SetChannelTitleEffect extends Effect {
    async apply() {
        const helixClient = this.getHelixClient();
        if (!this.rawCmd || !this.context || !helixClient) {
            log$3.info({
                rawCmd: this.rawCmd,
                context: this.context,
                helixClient,
            }, 'unable to execute setChannelTitle, client, command, context, or helixClient missing');
            return;
        }
        const title = this.effect.data.title === '' ? '$args()' : this.effect.data.title;
        const tmpTitle = await this.doReplacements(title);
        if (tmpTitle === '') {
            const info = await helixClient.getChannelInformation(this.contextModule.user.twitch_id);
            if (info) {
                this.say(`Current title is "${info.title}".`);
            }
            else {
                this.say('❌ Unable to determine current title.');
            }
            return;
        }
        // helix api returns 204 status code even if the title is too long and
        // cant actually be set. but there is no error returned in that case :(
        const len = unicodeLength(tmpTitle);
        const max = 140;
        if (len > max) {
            this.say(`❌ Unable to change title because it is too long (${len}/${max} characters).`);
            return;
        }
        const accessToken = await this.getAccessToken();
        if (!accessToken) {
            this.say('❌ Not authorized to change title.');
            return;
        }
        const resp = await helixClient.modifyChannelInformation(accessToken, { title: tmpTitle }, this.contextModule.bot, this.contextModule.user);
        if (resp?.status === 204) {
            this.say(`✨ Changed title to "${tmpTitle}".`);
        }
        else {
            this.say('❌ Unable to change title.');
        }
    }
}

const log$2 = logger('VariableChangeEffect.ts');
const _toInt = (value) => parseInt(`${value}`, 10);
const _increase = (value, by) => (_toInt(value) + _toInt(by));
const _decrease = (value, by) => (_toInt(value) - _toInt(by));
class VariableChangeEffect extends Effect {
    async apply() {
        const op = this.effect.data.change;
        const name = await this.doReplacements(this.effect.data.name);
        const value = await this.doReplacements(this.effect.data.value);
        const changed = this.changeLocalVariable(op, name, value)
            || await this.changeGlobalVariable(op, name, value);
        if (!changed) {
            log$2.warn({ op, name, value }, 'variable not changed');
        }
    }
    changeLocalVariable(op, name, value) {
        // check if there is a local variable for the change
        if (!this.originalCmd.variables) {
            return false;
        }
        const idx = this.originalCmd.variables.findIndex(v => (v.name === name));
        if (idx === -1) {
            return false;
        }
        if (op === 'set') {
            this.originalCmd.variables[idx].value = value;
        }
        else if (op === 'increase_by') {
            this.originalCmd.variables[idx].value = _increase(this.originalCmd.variables[idx].value, value);
        }
        else if (op === 'decrease_by') {
            this.originalCmd.variables[idx].value = _decrease(this.originalCmd.variables[idx].value, value);
        }
        else {
            log$2.warn({ op, name, value }, 'bad op');
        }
        // return true, because the variable was found, just the op is wrong :(
        return true;
    }
    async changeGlobalVariable(op, name, value) {
        const variables = this.contextModule.bot.getRepos().variables;
        const globalVars = await variables.all(this.contextModule.user.id);
        const idx = globalVars.findIndex(v => (v.name === name));
        if (idx === -1) {
            return false;
        }
        if (op === 'set') {
            await variables.set(this.contextModule.user.id, name, value);
        }
        else if (op === 'increase_by') {
            await variables.set(this.contextModule.user.id, name, _increase(globalVars[idx].value, value));
        }
        else if (op === 'decrease_by') {
            await variables.set(this.contextModule.user.id, name, _decrease(globalVars[idx].value, value));
        }
        else {
            log$2.warn({ op, name, value }, 'bad op');
        }
        return true;
    }
}

const EFFECTS_CLASS_MAP = {
    [CommandEffectType.VARIABLE_CHANGE]: VariableChangeEffect,
    [CommandEffectType.CHAT]: ChatEffect,
    [CommandEffectType.DICT_LOOKUP]: DictLookupEffect,
    [CommandEffectType.EMOTES]: EmotesEffect,
    [CommandEffectType.MEDIA]: MediaEffect,
    [CommandEffectType.MADOCHAN]: MadochanEffect,
    [CommandEffectType.SET_CHANNEL_TITLE]: SetChannelTitleEffect,
    [CommandEffectType.SET_CHANNEL_GAME_ID]: SetChannelGameIdEffect,
    [CommandEffectType.ADD_STREAM_TAGS]: AddStreamTagEffect,
    [CommandEffectType.REMOVE_STREAM_TAGS]: RemoveStreamTagEffect,
    [CommandEffectType.CHATTERS]: ChattersEffect,
    [CommandEffectType.COUNTDOWN]: CountdownEffect,
    [CommandEffectType.MEDIA_VOLUME]: MediaVolumeEffect,
    [CommandEffectType.ROULETTE]: RouletteEffect,
};
const log$1 = logger('EffectApplier.ts');
class EffectApplier {
    async applyEffects(originalCmd, contextModule, rawCmd, context) {
        if (!originalCmd.effects) {
            return;
        }
        for (const effect of originalCmd.effects) {
            if (!EFFECTS_CLASS_MAP[effect.type]) {
                // unknown effect...
                log$1.warn({ type: effect.type }, 'unknown effect type');
                continue;
            }
            const e = new (EFFECTS_CLASS_MAP[effect.type])(JSON.parse(JSON.stringify(effect)), originalCmd, contextModule, rawCmd, context);
            await e.apply();
        }
        contextModule.saveCommands();
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
    const repos = new Repos(db);
    const cache = new Cache(db);
    const canny = new Canny(config.canny);
    const discord = new Discord(config.discord);
    const auth = new Auth(repos, canny);
    const widgets = new Widgets(repos);
    const timeApi = new TimeApi();
    const eventHub = mitt();
    const moduleManager = new ModuleManager();
    const webSocketServer = new WebSocketServer();
    const webServer = new WebServer();
    const twitchTmiClientManager = new TwitchTmiClientManager();
    const effectsApplier = new EffectApplier();
    const youtube = new Youtube(new YoutubeApi(config.youtube), new Invidious(), cache);
    const emoteParser = new EmoteParser();
    class BotImpl {
        constructor() {
            this.userTwitchClientManagerInstances = {};
            this.streamStatusUpdater = null;
            this.frontendStatusUpdater = null;
        }
        getDb() { return db; }
        getDiscord() { return discord; }
        getBuildVersion() { return buildEnv.buildVersion; }
        getBuildDate() { return buildEnv.buildDate; }
        getModuleManager() { return moduleManager; }
        getConfig() { return config; }
        getRepos() { return repos; }
        getCache() { return cache; }
        getAuth() { return auth; }
        getWebServer() { return webServer; }
        getWebSocketServer() { return webSocketServer; }
        getYoutube() { return youtube; }
        getWidgets() { return widgets; }
        getTimeApi() { return timeApi; }
        getEventHub() { return eventHub; }
        getEffectsApplier() { return effectsApplier; }
        getStreamStatusUpdater() {
            if (!this.streamStatusUpdater) {
                this.streamStatusUpdater = new StreamStatusUpdater(this);
            }
            return this.streamStatusUpdater;
        }
        getFrontendStatusUpdater() {
            if (!this.frontendStatusUpdater) {
                this.frontendStatusUpdater = new FrontendStatusUpdater(this);
            }
            return this.frontendStatusUpdater;
        }
        getTwitchTmiClientManager() { return twitchTmiClientManager; }
        getCanny() { return canny; }
        // user specific
        // -----------------------------------------------------------------
        sayFn(user) {
            const chatClient = this.getUserTwitchClientManager(user).getChatClient();
            return chatClient
                ? fn.sayFn(chatClient, user.twitch_login)
                : ((msg) => { log.info('say(), client not set, msg', msg); });
        }
        getUserTwitchClientManager(user) {
            if (!this.userTwitchClientManagerInstances[user.id]) {
                this.userTwitchClientManagerInstances[user.id] = new TwitchClientManager(this, user);
            }
            return this.userTwitchClientManagerInstances[user.id];
        }
        getEmoteParser() {
            return emoteParser;
        }
    }
    return new BotImpl();
};
// this function may only be called once per user!
// changes to user will be handled by user_changed event
const initForUser = async (bot, user) => {
    const clientManager = bot.getUserTwitchClientManager(user);
    const timer = new Timer();
    timer.reset();
    await clientManager.init('init');
    // note: even tho we await the init,
    //       we may not be connected to twitch chat or event sub yet
    //       because those connects are not awaited, or the server
    //       startup will take forever
    timer.split();
    log.debug(`initiating client manager took ${timer.lastSplitMs()}ms`);
    for (const moduleClass of modules) {
        bot.getModuleManager().add(user.id, await new moduleClass(bot, user));
    }
    timer.split();
    log.debug(`initiating all modules took ${timer.lastSplitMs()}ms`);
    bot.getFrontendStatusUpdater().addUser(user);
    bot.getStreamStatusUpdater().addUser(user);
    bot.getEventHub().on('wss_user_connected', async (socket /* Socket */) => {
        if (socket.user_id === user.id && socket.module === 'core') {
            await bot.getFrontendStatusUpdater().updateForUser(user.id);
            await bot.getStreamStatusUpdater().updateForUser(user.id);
        }
    });
    bot.getEventHub().on('access_token_refreshed', async (changedUser /* User */) => {
        if (changedUser.id === user.id) {
            await clientManager.accessTokenRefreshed(changedUser);
            await bot.getFrontendStatusUpdater().updateForUser(user.id);
            await bot.getStreamStatusUpdater().updateForUser(user.id);
            await bot.getModuleManager().updateForUser(user.id, changedUser);
        }
    });
    bot.getEventHub().on('user_changed', async (changedUser /* User */) => {
        if (changedUser.id === user.id) {
            await clientManager.userChanged(changedUser);
            await bot.getFrontendStatusUpdater().updateForUser(user.id);
            await bot.getStreamStatusUpdater().updateForUser(user.id);
            await bot.getModuleManager().updateForUser(user.id, changedUser);
        }
    });
    timer.split();
    log.debug(`init for user took ${timer.totalMs()}ms`);
};
const run = async () => {
    const timer = new Timer();
    timer.reset();
    const bot = await createBot();
    timer.split();
    log.debug(`creating bot took ${timer.lastSplitMs()}ms`);
    // one for each user, all in parallel
    const initializers = [];
    for (const user of await bot.getRepos().user.all()) {
        initializers.push(initForUser(bot, user));
    }
    await Promise.all(initializers);
    timer.split();
    log.debug(`initializing users took ${timer.lastSplitMs()}ms`);
    bot.getEventHub().on('user_registration_complete', async (user /* User */) => {
        await initForUser(bot, user);
    });
    // as the last step, start websocketserver and webserver
    // it needs to be the last step, because modules etc.
    // need to be set up in advance so that everything is registered
    // at the point of connection from outside
    bot.getWebSocketServer().listen(bot);
    await bot.getWebServer().listen(bot);
    // start 'workers'
    bot.getFrontendStatusUpdater().start();
    bot.getStreamStatusUpdater().start();
    timer.split();
    log.debug(`starting server (websocket+web) took ${timer.lastSplitMs()}ms`);
    log.info(`bot started in ${timer.totalMs()}ms`);
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

void run();
