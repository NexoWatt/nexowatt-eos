"use strict";
var __create = Object.create;
var __defProp = Object.defineProperty;
var __getOwnPropDesc = Object.getOwnPropertyDescriptor;
var __getOwnPropNames = Object.getOwnPropertyNames;
var __getProtoOf = Object.getPrototypeOf;
var __hasOwnProp = Object.prototype.hasOwnProperty;
var __export = (target, all) => {
  for (var name in all)
    __defProp(target, name, { get: all[name], enumerable: true });
};
var __copyProps = (to, from, except, desc) => {
  if (from && typeof from === "object" || typeof from === "function") {
    for (let key of __getOwnPropNames(from))
      if (!__hasOwnProp.call(to, key) && key !== except)
        __defProp(to, key, { get: () => from[key], enumerable: !(desc = __getOwnPropDesc(from, key)) || desc.enumerable });
  }
  return to;
};
var __reExport = (target, mod, secondTarget) => (__copyProps(target, mod, "default"), secondTarget && __copyProps(secondTarget, mod, "default"));
var __toESM = (mod, isNodeMode, target) => (target = mod != null ? __create(__getProtoOf(mod)) : {}, __copyProps(
  // If the importer is in node compatibility mode or this is not an ESM
  // file that has been converted to a CommonJS file using a Babel-
  // compatible transform (i.e. "__esModule" has not been set), then set
  // "default" to the CommonJS "module.exports" for node compatibility.
  isNodeMode || !mod || !mod.__esModule ? __defProp(target, "default", { value: mod, enumerable: true }) : target,
  mod
));
var __toCommonJS = (mod) => __copyProps(__defProp({}, "__esModule", { value: true }), mod);
var tools_exports = {};
__export(tools_exports, {
  ERRORS: () => ERRORS,
  FORBIDDEN_CHARS: () => FORBIDDEN_CHARS,
  MAX_CERT_VALIDITY: () => MAX_CERT_VALIDITY,
  appName: () => appName,
  appNameLowerCase: () => appNameLowerCase,
  appendStackTrace: () => appendStackTrace,
  checkNonEditable: () => checkNonEditable,
  compressFileGZip: () => compressFileGZip,
  copyAttributes: () => copyAttributes,
  createUuid: () => createUuid,
  decrypt: () => decrypt,
  decryptPhrase: () => decryptPhrase,
  detectPackageManagerWithFallback: () => detectPackageManagerWithFallback,
  encrypt: () => encrypt,
  ensureDNSOrder: () => ensureDNSOrder,
  execAsync: () => execAsync,
  findIPs: () => findIPs,
  formatAliasValue: () => formatAliasValue,
  generateDefaultCertificates: () => generateDefaultCertificates,
  getAdapterDir: () => getAdapterDir,
  getAllEnums: () => getAllEnums,
  getAllInstances: () => getAllInstances,
  getCertificateInfo: () => getCertificateInfo,
  getConfigFileName: () => getConfigFileName,
  getControllerDir: () => getControllerDir,
  getControllerPid: () => getControllerPid,
  getDefaultDataDir: () => getDefaultDataDir,
  getDefaultNodeArgs: () => getDefaultNodeArgs,
  getDefaultRequireResolvePaths: () => getDefaultRequireResolvePaths,
  getDiskInfo: () => getDiskInfo,
  getDockerInformation: () => getDockerInformation,
  getFile: () => getFile,
  getHostInfo: () => getHostInfo,
  getHostName: () => getHostName,
  getHostObject: () => getHostObject,
  getInstalledInfo: () => getInstalledInfo,
  getInstanceIndicatorObjects: () => getInstanceIndicatorObjects,
  getInstances: () => getInstances,
  getJson: () => getJson,
  getJsonAsync: () => getJsonAsync,
  getListenAllAddress: () => getListenAllAddress,
  getLocalAddress: () => getLocalAddress,
  getLogger: () => getLogger,
  getNewestDockerImageVersion: () => getNewestDockerImageVersion,
  getPids: () => getPids,
  getPidsFileName: () => getPidsFileName,
  getRepositoryFile: () => getRepositoryFile,
  getRepositoryFileAsync: () => getRepositoryFileAsync,
  getRootDir: () => getRootDir,
  installNodeModule: () => installNodeModule,
  isAdapterEsmModule: () => isAdapterEsmModule,
  isArray: () => isArray,
  isControllerUiUpgradeSupported: () => isControllerUiUpgradeSupported,
  isDevInstallation: () => isDevInstallation,
  isDevServerInstallation: () => isDevServerInstallation,
  isDocker: () => isDocker,
  isGithubPathname: () => isGithubPathname,
  isHostRunning: () => isHostRunning,
  isIoBrokerInstalledAsSystemd: () => isIoBrokerInstalledAsSystemd,
  isListenAllAddress: () => isListenAllAddress,
  isLocalAddress: () => isLocalAddress,
  isLogLevel: () => isLogLevel,
  isObject: () => isObject,
  isShortGithubUrl: () => isShortGithubUrl,
  isSingleHost: () => isSingleHost,
  isValidPattern: () => isValidPattern,
  maybeArrayToString: () => maybeArrayToString,
  measureEventLoopLag: () => measureEventLoopLag,
  parseDependencies: () => parseDependencies,
  parseGithubPathname: () => parseGithubPathname,
  parseShortGithubUrl: () => parseShortGithubUrl,
  pattern2RegEx: () => pattern2RegEx,
  pipeLinewise: () => pipeLinewise,
  promisify: () => promisify,
  promisifyNoError: () => promisifyNoError,
  rebuildNodeModules: () => rebuildNodeModules,
  removeIdFromAllEnums: () => removeIdFromAllEnums,
  removePreservedProperties: () => removePreservedProperties,
  resolveAdapterMainFile: () => resolveAdapterMainFile,
  sendDiagInfo: () => sendDiagInfo,
  setExecutableCapabilities: () => setExecutableCapabilities,
  setQualityForInstance: () => setQualityForInstance,
  uninstallNodeModule: () => uninstallNodeModule,
  upToDate: () => upToDate,
  updateLicenses: () => updateLicenses,
  validateDataDir: () => validateDataDir,
  validateGeneralObjectProperties: () => validateGeneralObjectProperties
});
module.exports = __toCommonJS(tools_exports);
var __import_meta_url = typeof document === "undefined" ? new (require("url".replace("", ""))).URL("file:" + __filename).href : document.currentScript && document.currentScript.src || new URL("main.js", document.baseURI).href;
var import_fs_extra = __toESM(require("fs-extra"), 1);
var import_node_path = __toESM(require("node:path"), 1);
var import_semver = __toESM(require("semver"), 1);
var import_node_os = __toESM(require("node:os"), 1);
var import_node_forge = __toESM(require("node-forge"), 1);
var import_deep_clone = __toESM(require("deep-clone"), 1);
var import_promisify_child_process = require("promisify-child-process");
var import_node_readline = require("node:readline");
var import_node_stream = require("node:stream");
var import_pak = require("@alcalzone/pak");
var import_exitCodes = require("../../lib/common/exitCodes.js");
var import_node_zlib = __toESM(require("node:zlib"), 1);
var import_password = require("../../lib/common/password.js");
var import_jsonwebtoken = __toESM(require("jsonwebtoken"), 1);
var import_axios = __toESM(require("axios"), 1);
var import_node_crypto = __toESM(require("node:crypto"), 1);
var import_node_child_process = require("node:child_process");
var import_node_url = require("node:url");
var import_node_events = __toESM(require("node:events"), 1);
var import_maybeCallback = require("../../lib/common/maybeCallback.js");
var import_node = __toESM(require("node.extend"), 1);
var import_node_dns = require("node:dns");
var import_aliasProcessing = require("../../lib/common/aliasProcessing.js");
var url = __toESM(require("node:url"), 1);
var import_node_module = require("node:module");
var import_constants = require("../../lib/common/constants.js");
__reExport(tools_exports, require("../../lib/common/maybeCallback.js"), module.exports);
const thisDir = url.fileURLToPath(new URL(".", __import_meta_url || `file://${__filename}`));
const require2 = (0, import_node_module.createRequire)(__import_meta_url || `file://${__filename}`);
var ERRORS;
(function(ERRORS2) {
  ERRORS2["ERROR_NOT_FOUND"] = "Not exists";
  ERRORS2["ERROR_EMPTY_OBJECT"] = "null object";
  ERRORS2["ERROR_NO_OBJECT"] = "no object";
  ERRORS2["ERROR_DB_CLOSED"] = "DB closed";
})(ERRORS || (ERRORS = {}));
import_node_events.default.EventEmitter.prototype.setMaxListeners(100);
let npmVersion;
let diskusage;
const randomID = Math.round(Math.random() * 1e13);
const VENDOR_FILE = "/etc/iob-vendor.json";
const OFFICIAL_DOCKER_FILE = "/opt/scripts/.docker_config/.thisisdocker";
const DOCKER_INFO_URL = "https://hub.docker.com/v2/namespaces/iobroker/repositories/iobroker/tags?page_size=1";
const DOCKER_HUB_BUILD_TIME_MS = 6 * 60 * 60 * 1e3;
const DOCKER_VERSION_UI_UPGRADE = "8.1.0";
let lastCalculationOfIps;
let ownIpArr = [];
const FORBIDDEN_CHARS = /[^._\-/ :!#$%&()+=@^{}|~\p{Ll}\p{Lu}\p{Nd}]+/gu;
function copyAttributes(oldObj, newObj, originalObj, isNonEdit) {
  for (const attr of Object.keys(oldObj)) {
    if (oldObj[attr] === void 0 || oldObj[attr] === null || typeof oldObj[attr] !== "object" || oldObj[attr] instanceof Array) {
      if (oldObj[attr] === "__no_change__" && originalObj && !isNonEdit) {
        if (originalObj[attr] !== void 0) {
          newObj[attr] = (0, import_deep_clone.default)(originalObj[attr]);
        } else {
          console.log(`Attribute ${attr} ignored by copying`);
        }
      } else if (oldObj[attr] === "__delete__" && !isNonEdit) {
        if (newObj[attr] !== void 0) {
          delete newObj[attr];
        }
      } else {
        newObj[attr] = oldObj[attr];
      }
    } else {
      newObj[attr] = newObj[attr] || {};
      copyAttributes(oldObj[attr], newObj[attr], originalObj && originalObj[attr], isNonEdit || attr === "nonEdit");
    }
  }
}
function checkNonEditable(oldObject, newObject) {
  if (!oldObject) {
    return true;
  }
  if (!oldObject.nonEdit && !newObject.nonEdit) {
    return true;
  }
  if (oldObject.nonEdit?.passHash) {
    if (newObject.nonEdit?.password) {
      const hash = import_node_crypto.default.createHash("sha256").update(newObject.nonEdit.password.toString()).digest("base64");
      if (oldObject.nonEdit.passHash !== hash) {
        delete newObject.nonEdit;
        return false;
      }
      oldObject.nonEdit = (0, import_deep_clone.default)(newObject.nonEdit);
      delete oldObject.nonEdit.password;
      delete newObject.nonEdit.password;
      oldObject.nonEdit.passHash = hash;
      newObject.nonEdit.passHash = hash;
      copyAttributes(newObject.nonEdit, newObject, newObject);
      if (newObject.nonEdit.passHash) {
        delete newObject.nonEdit.passHash;
      }
      if (newObject.nonEdit?.password) {
        delete newObject.nonEdit.password;
      }
      return true;
    }
    newObject.nonEdit = oldObject.nonEdit;
  } else if (newObject.nonEdit) {
    oldObject.nonEdit = (0, import_deep_clone.default)(newObject.nonEdit);
    if (newObject.nonEdit.password) {
      const hash = import_node_crypto.default.createHash("sha256").update(newObject.nonEdit.password.toString()).digest("base64");
      delete oldObject.nonEdit.password;
      delete newObject.nonEdit.password;
      oldObject.nonEdit.passHash = hash;
      newObject.nonEdit.passHash = hash;
    }
  }
  copyAttributes(oldObject.nonEdit, newObject, oldObject);
  if (newObject.nonEdit?.passHash) {
    delete newObject.nonEdit.passHash;
  }
  if (newObject.nonEdit?.password) {
    delete newObject.nonEdit.password;
  }
  return true;
}
function upToDate(repoVersion, installedVersion) {
  return import_semver.default.gte(installedVersion, repoVersion);
}
function decryptPhrase(password2, data, callback) {
  const decipher = import_node_crypto.default.createDecipher("aes192", password2);
  try {
    let decrypted = "";
    decipher.on("readable", () => {
      const data2 = decipher.read();
      if (data2) {
        decrypted += data2.toString("utf8");
      }
    });
    decipher.on("error", (error) => {
      console.error(`Cannot decode secret: ${error.message}`);
      callback(null);
    });
    decipher.on("end", () => callback(decrypted));
    decipher.write(data, "hex");
    decipher.end();
  } catch (e) {
    console.error(`Cannot decode secret: ${e.message}`);
    callback(null);
  }
}
async function isSingleHost(objects) {
  const res = await objects.getObjectList({
    startkey: "system.host.",
    endkey: "system.host.\u9999"
  });
  const hostObjs = res.rows.filter((obj) => obj.value && obj.value.type === "host");
  return hostObjs.length <= 1;
}
async function isHostRunning(objects, states) {
  const res = await objects.getObjectList({
    startkey: "system.host.",
    endkey: "system.host.\u9999"
  });
  res.rows = res.rows.filter((obj) => obj.value?.type === "host");
  for (const hostObj of res.rows) {
    const state = await states.getState(`${hostObj.id}.alive`);
    if (state && state.val) {
      return true;
    }
  }
  return false;
}
function isDevInstallation() {
  return import_fs_extra.default.pathExistsSync(`${getControllerDir()}/../../packages/controller`);
}
function getAppName() {
  if (isDevInstallation()) {
    return "ioBroker";
  }
  return "iobroker";
}
const appNameLowerCase = "iobroker";
const appName = getAppName();
function findIPs() {
  if (!lastCalculationOfIps || Date.now() - lastCalculationOfIps > 1e4) {
    lastCalculationOfIps = Date.now();
    ownIpArr = [];
    try {
      const ifaces = import_node_os.default.networkInterfaces();
      for (const iface of Object.values(ifaces)) {
        iface?.forEach((details) => !details.internal && ownIpArr.push(details.address));
      }
    } catch (e) {
      console.error(`Can not find local IPs: ${e.message}`);
    }
  }
  return ownIpArr;
}
function findPath(path2, url2) {
  if (!url2) {
    return "";
  }
  if (url2.startsWith("http://") || url2.startsWith("https://")) {
    return url2;
  }
  if (path2.startsWith("http://") || path2.startsWith("https://")) {
    return (path2 + url2).replace(/\/\//g, "/").replace("http:/", "http://").replace("https:/", "https://");
  }
  if (url2[0] === "/") {
    return `${thisDir}/..${url2}`;
  }
  return `${thisDir}/../${path2}${url2}`;
}
async function getMac() {
  const macRegex = /(?:[a-z0-9]{2}[:-]){5}[a-z0-9]{2}/gi;
  const zeroRegex = /(?:[0]{2}[:-]){5}[0]{2}/;
  const command = process.platform.indexOf("win") === 0 ? "getmac" : "ifconfig || ip link";
  const { stdout, stderr } = await execAsync(command);
  if (typeof stderr === "string") {
    throw new Error(stderr);
  }
  if (typeof stdout !== "string") {
    throw new Error(`Unexpected stdout: ${stdout?.toString()}`);
  }
  let macAddress;
  let match;
  let result = null;
  while (true) {
    match = macRegex.exec(stdout);
    if (!match) {
      break;
    }
    macAddress = match[0];
    if (!zeroRegex.test(macAddress) && !result) {
      result = macAddress;
    }
  }
  if (result === null) {
    throw new Error(`Could not determine the mac address from:
${stdout}`);
  }
  return result.replace(/-/g, ":").toLowerCase();
}
async function getNewestDockerImageVersion() {
  const res = await import_axios.default.get(DOCKER_INFO_URL);
  const dockerResult = res.data.results[0];
  const isNew = new Date(dockerResult.last_updated).getTime() > new Date(process.env.BUILD).getTime() + DOCKER_HUB_BUILD_TIME_MS;
  return { version: dockerResult.name, lastUpdated: dockerResult.last_updated, isNew };
}
function getDockerInformation() {
  try {
    const versionString = import_fs_extra.default.readFileSync(OFFICIAL_DOCKER_FILE, { encoding: "utf-8" }).trim();
    return { isDocker: true, isOfficial: true, officialVersion: versionString };
  } catch {
  }
  return { isDocker: isDocker(), isOfficial: false };
}
function isControllerUiUpgradeSupported() {
  const dockerInfo = getDockerInformation();
  if (dockerInfo.isDocker) {
    if (!dockerInfo.isOfficial) {
      return false;
    }
    if (!import_semver.default.valid(dockerInfo.officialVersion) || import_semver.default.lt(dockerInfo.officialVersion, DOCKER_VERSION_UI_UPGRADE)) {
      return false;
    }
    return true;
  }
  return !["win32", "darwin"].includes(import_node_os.default.platform());
}
function isDocker() {
  try {
    import_fs_extra.default.statSync("/.dockerenv");
    return true;
  } catch {
  }
  try {
    import_fs_extra.default.statSync(OFFICIAL_DOCKER_FILE);
    return true;
  } catch {
  }
  try {
    import_fs_extra.default.statSync("/run/.containerenv");
    return true;
  } catch {
  }
  try {
    return import_fs_extra.default.readFileSync("/proc/self/cgroup", "utf8").includes("docker");
  } catch {
    return false;
  }
}
async function uuid(givenMac) {
  givenMac = givenMac ?? "";
  const _isDocker = isDocker();
  if (require2("ci-info").isCI) {
    return "55travis-pipe-line-cior-githubaction";
  }
  let mac = givenMac !== null ? givenMac || "" : null;
  let u;
  if (!_isDocker && mac === "") {
    const ifaces = import_node_os.default.networkInterfaces();
    for (const iface of Object.values(ifaces)) {
      if (iface) {
        for (const entry of iface) {
          if (entry.mac !== "00:00:00:00:00:00") {
            mac = entry.mac;
            break;
          }
        }
      }
      if (mac) {
        break;
      }
    }
  }
  if (!_isDocker && mac === "") {
    const mac2 = await getMac();
    return uuid(mac2);
  }
  if (!_isDocker && mac) {
    const md5sum = import_node_crypto.default.createHash("md5");
    md5sum.update(mac);
    mac = md5sum.digest("hex");
    u = `${mac.substring(0, 8)}-${mac.substring(8, 12)}-${mac.substring(12, 16)}-${mac.substring(16, 20)}-${mac.substring(20)}`;
  } else {
    let a;
    let b;
    b = a = "";
    while (a++ < 36) {
      b += a * 51 & 52 ? (a ^ 15 ? 8 ^ Math.random() * (a ^ 20 ? 16 : 4) : 4).toString(16) : "-";
    }
    u = b;
  }
  return u;
}
async function updateUuid(newUuid, _objects) {
  let _uuid = await uuid("");
  _uuid = newUuid || _uuid;
  if (import_fs_extra.default.existsSync(VENDOR_FILE)) {
    try {
      const vendor = await import_fs_extra.default.readJSON(VENDOR_FILE);
      if (vendor.vendor?.uuidPrefix?.length === 2 && !_uuid.startsWith(vendor.vendor.uuidPrefix)) {
        _uuid = vendor.vendor.uuidPrefix + _uuid;
      }
    } catch {
      console.error(`Cannot parse ${VENDOR_FILE}`);
    }
  }
  try {
    await _objects.setObject("system.meta.uuid", {
      type: "meta",
      common: {
        name: "uuid",
        type: "uuid"
      },
      ts: (/* @__PURE__ */ new Date()).getTime(),
      from: `system.host.${getHostName()}.tools`,
      native: {
        uuid: _uuid
      }
    });
  } catch (e) {
    throw new Error(`Object system.meta.uuid cannot be updated: ${e.message}`);
  }
  const obj = await _objects.getObject("system.meta.uuid");
  if (obj.native.uuid !== _uuid) {
    console.error("object system.meta.uuid cannot be updated: write protected");
  } else {
    console.log(`object system.meta.uuid created: ${_uuid}`);
  }
  return _uuid;
}
async function createUuid(objects) {
  const userObj = await objects.getObject("system.user.admin");
  if (!userObj) {
    await new Promise((resolve) => {
      (0, import_password.password)(appName).hash(null, null, async (err, res) => {
        err && console.error(err);
        await objects.setObject("system.user.admin", {
          type: "user",
          common: {
            name: "admin",
            password: res,
            dontDelete: true,
            enabled: true
          },
          ts: (/* @__PURE__ */ new Date()).getTime(),
          from: `system.host.${getHostName()}.tools`,
          native: {}
        });
        console.log("object system.user.admin created");
        resolve();
      });
    });
  }
  const obj = await objects.getObject("system.meta.uuid");
  if (!obj?.native?.uuid) {
    return updateUuid("", objects);
  }
  const PROBLEM_UUIDS = [
    "ab265f4a-67f9-a46a-c0b2-61e4b95cefe5",
    "7abd3182-d399-f7bd-da19-9550d8babede",
    "deb6f2a8-fe69-5491-0a50-a9f9b8f3419c",
    "ec66c85e-fc36-f6f9-f1c9-f5a2882d23c7",
    "e6203b03-f5f4-253a-e4f6-b295fc543ab7",
    "d659fa3d-7ef9-202a-ea23-acd0aff67b24"
  ];
  if (!PROBLEM_UUIDS.includes(obj.native.uuid)) {
    return;
  }
  const licObj = objects.getObject("system.adapter.vis.0");
  if (!licObj || !licObj.native || !licObj.native.license) {
    return updateUuid("", objects);
  }
  let data;
  try {
    data = import_jsonwebtoken.default.decode(licObj.native.license);
  } catch {
    data = null;
  }
  if (!data || typeof data === "string" || !data.uuid) {
    return updateUuid("", objects);
  }
  if (data.uuid !== obj.native.uuid) {
    return updateUuid(data.correct ? data.uuid : "", objects);
  }
  console.warn(`Your iobroker.vis license must be updated. Please contact info@iobroker.net to get a new license!`);
  console.warn(`Provide following information in email: ${data.email}, invoice: ${data.invoice}`);
}
async function getFile(urlOrPath, fileName, callback) {
  if (urlOrPath.substring(0, "http://".length) === "http://" || urlOrPath.substring(0, "https://".length) === "https://") {
    const tmpFile = `${thisDir}/../tmp/${fileName || `${Math.floor(Math.random() * 268435454)}.zip`}`;
    try {
      const res = await import_axios.default.get(urlOrPath, {
        responseType: "stream",
        headers: {
          "User-Agent": `${appName}, RND: ${randomID}, N: ${process.version}`,
          "Accept-Encoding": "gzip"
        }
      });
      res.data.pipe(import_fs_extra.default.createWriteStream(tmpFile)).on("close", () => {
        console.log(`downloaded ${tmpFile}`);
        callback && callback(tmpFile);
      });
    } catch (e) {
      console.log(`Cannot download "${tmpFile}": ${e.message}`);
      callback && callback(tmpFile);
    }
  } else {
    try {
      if (import_fs_extra.default.existsSync(urlOrPath)) {
        callback && callback(urlOrPath);
      } else if (import_fs_extra.default.existsSync(`${thisDir}/../${urlOrPath}`)) {
        callback && callback(`${thisDir}/../${urlOrPath}`);
      } else if (import_fs_extra.default.existsSync(`${thisDir}/../tmp/${urlOrPath}`)) {
        callback && callback(`${thisDir}/../tmp/${urlOrPath}`);
      } else {
        console.log(`File not found: ${urlOrPath}`);
        process.exit(import_exitCodes.EXIT_CODES.FILE_NOT_FOUND);
      }
    } catch (err) {
      console.log(`File "${urlOrPath}" could no be read: ${err.message}`);
      process.exit(import_exitCodes.EXIT_CODES.FILE_NOT_FOUND);
    }
  }
}
async function getJson(urlOrPath, agent, callback) {
  if (typeof agent === "function") {
    callback = agent;
    agent = "";
  }
  agent = agent || "";
  let sources = {};
  if (urlOrPath && typeof urlOrPath === "object") {
    if (callback) {
      callback(urlOrPath);
    }
  } else if (!urlOrPath) {
    console.log("Empty url!");
    if (callback) {
      callback(null);
    }
  } else {
    if (urlOrPath.substring(0, "http://".length) === "http://" || urlOrPath.substring(0, "https://".length) === "https://") {
      try {
        const res = await import_axios.default.get(urlOrPath, {
          headers: { "Accept-Encoding": "gzip", timeout: 1e4, "User-Agent": agent }
        });
        if (res.status !== 200 || !res.data) {
          throw new Error(`Invalid response, body: ${res.data}, status code: ${res.status}`);
        }
        sources = res.data;
        if (callback) {
          callback(sources, urlOrPath);
        }
      } catch (e) {
        console.warn(`Cannot download json from ${urlOrPath}. Error: ${e.message}`);
        if (callback) {
          callback(null, urlOrPath);
        }
        return;
      }
    } else {
      if (import_fs_extra.default.existsSync(urlOrPath)) {
        try {
          sources = import_fs_extra.default.readJSONSync(urlOrPath);
        } catch (e) {
          console.log(`Cannot parse json file from ${urlOrPath}. Error: ${e.message}`);
          if (callback) {
            callback(null, urlOrPath);
          }
          return;
        }
        if (callback) {
          callback(sources, urlOrPath);
        }
      } else if (import_fs_extra.default.existsSync(`${thisDir}/../${urlOrPath}`)) {
        try {
          sources = import_fs_extra.default.readJSONSync(`${thisDir}/../${urlOrPath}`);
        } catch (e) {
          console.log(`Cannot parse json file from ${thisDir}/../${urlOrPath}. Error: ${e.message}`);
          if (callback) {
            callback(null, urlOrPath);
          }
          return;
        }
        if (callback) {
          callback(sources, urlOrPath);
        }
      } else if (import_fs_extra.default.existsSync(`${thisDir}/../tmp/${urlOrPath}`)) {
        try {
          sources = import_fs_extra.default.readJSONSync(`${thisDir}/../tmp/${urlOrPath}`);
        } catch (e) {
          console.log(`Cannot parse json file from ${thisDir}/../tmp/${urlOrPath}. Error: ${e.message}`);
          if (callback) {
            callback(null, urlOrPath);
          }
          return;
        }
        if (callback) {
          callback(sources, urlOrPath);
        }
      } else {
        if (callback) {
          callback(null, urlOrPath);
        }
      }
    }
  }
}
async function getJsonAsync(urlOrPath, agent) {
  agent = agent || "";
  let sources = {};
  if (urlOrPath && typeof urlOrPath === "object") {
    return urlOrPath;
  } else if (!urlOrPath) {
    console.log("Empty url!");
    return null;
  }
  if (urlOrPath.startsWith("http://") || urlOrPath.startsWith("https://")) {
    try {
      const result = await (0, import_axios.default)(urlOrPath, {
        timeout: 1e4,
        headers: { "User-Agent": agent },
        validateStatus: (status) => status !== 200
      });
      return result.data;
    } catch (e) {
      console.warn(`Cannot download json from ${urlOrPath}. Error: ${e.message}`);
      return null;
    }
  } else {
    if (import_fs_extra.default.existsSync(urlOrPath)) {
      try {
        sources = import_fs_extra.default.readJSONSync(urlOrPath);
      } catch (e) {
        console.warn(`Cannot parse json file from ${urlOrPath}. Error: ${e.message}`);
        return null;
      }
      return sources;
    } else if (import_fs_extra.default.existsSync(`${thisDir}/../${urlOrPath}`)) {
      try {
        sources = import_fs_extra.default.readJSONSync(`${thisDir}/../${urlOrPath}`);
      } catch (e) {
        console.warn(`Cannot parse json file from ${thisDir}/../${urlOrPath}. Error: ${e.message}`);
        return null;
      }
      return sources;
    } else if (import_fs_extra.default.existsSync(`${thisDir}/../tmp/${urlOrPath}`)) {
      try {
        sources = import_fs_extra.default.readJSONSync(`${thisDir}/../tmp/${urlOrPath}`);
      } catch (e) {
        console.log(`Cannot parse json file from ${thisDir}/../tmp/${urlOrPath}. Error: ${e.message}`);
        return null;
      }
      return sources;
    }
    return null;
  }
}
function scanDirectory(dirName, list, regExp) {
  if (import_fs_extra.default.existsSync(dirName)) {
    let dirs;
    try {
      dirs = import_fs_extra.default.readdirSync(dirName);
    } catch (e) {
      console.log(`Cannot read or parse ${dirName}: ${e.message}`);
      return;
    }
    for (let i = 0; i < dirs.length; i++) {
      try {
        const fullPath = import_node_path.default.join(dirName, dirs[i]);
        const fileIoName = import_node_path.default.join(fullPath, "io-package.json");
        const fileName = import_node_path.default.join(fullPath, "package.json");
        if (regExp.test(dirs[i]) && import_fs_extra.default.existsSync(fileIoName)) {
          const ioPackage = import_fs_extra.default.readJSONSync(fileIoName);
          const package_ = import_fs_extra.default.existsSync(fileName) ? import_fs_extra.default.readJSONSync(fileName) : {};
          const localIcon = ioPackage.common.icon ? `/adapter/${dirs[i].substring(appName.length + 1)}/${ioPackage.common.icon}` : "";
          list[ioPackage.common.name] = {
            controller: ioPackage.common.controller || false,
            version: ioPackage.common.version,
            icon: ioPackage.common.extIcon || localIcon,
            localIcon,
            title: ioPackage.common.title,
            // deprecated 2021.04.18 BF
            titleLang: ioPackage.common.titleLang,
            desc: ioPackage.common.desc,
            platform: ioPackage.common.platform,
            keywords: ioPackage.common.keywords,
            readme: ioPackage.common.readme,
            type: ioPackage.common.type,
            license: ioPackage.common.license ? ioPackage.common.license : package_.licenses && package_.licenses.length ? package_.licenses[0].type : "",
            licenseUrl: package_.licenses && package_.licenses.length ? package_.licenses[0].url : ""
          };
        }
      } catch (e) {
        console.log(`Cannot read or parse ${thisDir}/../node_modules/${dirs[i]}/io-package.json: ${e.message}`);
      }
    }
  }
}
function getInstalledInfo(hostRunningVersion) {
  const result = {};
  const fullPath = getControllerDir();
  if (!fullPath) {
    console.error("Could not determine controller directory on getInstalledInfo.");
    return result;
  }
  let ioPackage;
  try {
    ioPackage = import_fs_extra.default.readJSONSync(import_node_path.default.join(fullPath, "io-package.json"));
  } catch (e) {
    console.error(`Cannot get installed host information: ${e.message}`);
  }
  const package_ = import_fs_extra.default.existsSync(import_node_path.default.join(fullPath, "package.json")) ? import_fs_extra.default.readJSONSync(import_node_path.default.join(fullPath, "package.json")) : {};
  const regExp = new RegExp(`^${appName}\\.`, "i");
  if (ioPackage) {
    result[ioPackage.common.name] = {
      controller: true,
      type: ioPackage.common.type,
      version: ioPackage.common.version,
      icon: ioPackage.common.extIcon || ioPackage.common.icon,
      title: ioPackage.common.title,
      // deprecated 2021.04.18 BF
      titleLang: ioPackage.common.titleLang,
      desc: ioPackage.common.desc,
      platform: ioPackage.common.platform,
      keywords: ioPackage.common.keywords,
      readme: ioPackage.common.readme,
      runningVersion: hostRunningVersion,
      license: ioPackage.common.license ? ioPackage.common.license : package_.licenses && package_.licenses.length ? package_.licenses[0].type : "",
      licenseUrl: package_.licenses && package_.licenses.length ? package_.licenses[0].url : ""
    };
  }
  scanDirectory(import_node_path.default.join(fullPath, "node_modules"), result, regExp);
  scanDirectory(import_node_path.default.join(fullPath, ".."), result, regExp);
  return result;
}
function getNpmVersion(adapter, callback) {
  adapter = adapter ? `${appName}.${adapter}` : appName;
  adapter = adapter.toLowerCase();
  const cliCommand = `npm view ${adapter}@latest version`;
  (0, import_node_child_process.exec)(cliCommand, { timeout: 2e3, windowsHide: true }, (error, stdout, _stderr) => {
    let version;
    if (error) {
      if (typeof callback === "function") {
        callback(error);
        return;
      }
    } else if (stdout) {
      version = import_semver.default.valid(stdout.trim());
    }
    if (typeof callback === "function") {
      callback(null, version);
    }
  });
}
function getIoPack(sources, name, callback) {
  getJson(sources[name].meta, "", (ioPack) => {
    const packUrl = sources[name].meta.replace("io-package.json", "package.json");
    if (!ioPack) {
      if (sources._helper) {
        sources._helper.failCounter.push(name);
      }
      if (callback) {
        callback(sources, name);
      }
    } else {
      setImmediate(() => {
        getJson(packUrl, "", (pack) => {
          const version = sources[name].version;
          const type = sources[name].type;
          if (sources[name].url && name !== "js-controller") {
            if (ioPack && ioPack.common) {
              sources[name] = (0, import_node.default)(true, sources[name], ioPack.common);
              if (type) {
                sources[name].type = type;
              }
              if (pack && pack.licenses && pack.licenses.length) {
                if (!sources[name].license) {
                  sources[name].license = pack.licenses[0].type;
                }
                if (!sources[name].licenseUrl) {
                  sources[name].licenseUrl = pack.licenses[0].url;
                }
              }
            }
            if (callback) {
              callback(sources, name);
            }
          } else {
            if (ioPack && ioPack.common) {
              sources[name] = (0, import_node.default)(true, sources[name], ioPack.common);
              if (pack && pack.licenses && pack.licenses.length) {
                if (!sources[name].license) {
                  sources[name].license = pack.licenses[0].type;
                }
                if (!sources[name].licenseUrl) {
                  sources[name].licenseUrl = pack.licenses[0].url;
                }
              }
            }
            if (type) {
              sources[name].type = type;
            }
            if (version) {
              sources[name].version = version;
              if (callback) {
                callback(sources, name);
              }
            } else {
              if (sources[name].meta.substring(0, "http://".length) === "http://" || sources[name].meta.substring(0, "https://".length) === "https://") {
                getNpmVersion(name, (_err, version2) => {
                  if (version2) {
                    sources[name].version = version2;
                  } else {
                    sources[name].version = "npm error";
                  }
                  if (callback) {
                    callback(sources, name);
                  }
                });
              } else {
                if (callback) {
                  callback(sources, name);
                }
              }
            }
          }
        });
      });
    }
  });
}
function _getRepositoryFile(sources, path2, callback) {
  if (!sources._helper) {
    let count = 0;
    for (const _name in sources) {
      if (!Object.prototype.hasOwnProperty.call(sources, _name)) {
        continue;
      }
      count++;
    }
    sources._helper = { failCounter: [] };
    sources._helper.timeout = setTimeout(() => {
      if (sources._helper) {
        delete sources._helper;
        for (const __name of Object.keys(sources)) {
          if (sources[__name].processed !== void 0) {
            delete sources[__name].processed;
          }
        }
        if (callback) {
          callback(new Error(`Timeout by read all package.json (${count}) seconds`), sources);
        }
        callback = void 0;
      }
    }, count * 1e3);
  }
  for (const name of Object.keys(sources)) {
    if (sources[name].processed || name === "_helper") {
      continue;
    }
    sources[name].processed = true;
    if (sources[name].url) {
      sources[name].url = findPath(path2, sources[name].url);
    }
    if (sources[name].meta) {
      sources[name].meta = findPath(path2, sources[name].meta);
    }
    if (sources[name].icon) {
      sources[name].icon = findPath(path2, sources[name].icon);
    }
    if (!sources[name].name && sources[name].meta) {
      getIoPack(sources, name, (_ignore) => {
        if (sources._helper) {
          if (sources._helper.failCounter.length > 10) {
            clearTimeout(sources._helper.timeout);
            delete sources._helper;
            for (const _name of Object.keys(sources)) {
              if (sources[_name].processed !== void 0) {
                delete sources[_name].processed;
              }
            }
            if (callback) {
              callback(new Error("Looks like there is no internet."), sources);
            }
            callback = void 0;
          } else {
            setImmediate(() => _getRepositoryFile(sources, path2, callback));
          }
        }
      });
      return;
    }
  }
  if (sources._helper) {
    let err;
    if (sources._helper.failCounter.length) {
      err = new Error(`Following packages cannot be read: ${sources._helper.failCounter.join(", ")}`);
    }
    clearTimeout(sources._helper.timeout);
    delete sources._helper;
    for (const __name of Object.keys(sources)) {
      if (sources[__name].processed !== void 0) {
        delete sources[__name].processed;
      }
    }
    if (callback) {
      callback(err, sources);
    }
    callback = void 0;
  }
}
async function _checkRepositoryFileHash(urlOrPath, additionalInfo, callback) {
  if (urlOrPath.startsWith("http://") || urlOrPath.startsWith("https://")) {
    urlOrPath = urlOrPath.replace(/\.json$/, "-hash.json");
    let json = null;
    try {
      const res = await import_axios.default.get(urlOrPath, { headers: { "Accept-Encoding": "gzip", timeout: 1e4 } });
      if (!res.data || res.status !== 200) {
        throw new Error(`Invalid response, body: ${res.data}, status code: ${res.status}`);
      }
      json = res.data;
    } catch (e) {
      console.warn(`Cannot download json from ${urlOrPath}. Error: ${e.message}`);
    }
    if (json && json.hash) {
      if (additionalInfo && additionalInfo.sources && json.hash === additionalInfo.hash) {
        console.log("hash unchanged, use cached sources");
        callback(null, additionalInfo.sources, json.hash);
      } else {
        console.log("hash changed or no sources cached => force download of new sources");
        callback(null, null, json.hash);
      }
    } else {
      console.log("failed to download new sources, use cached sources");
      callback(null, additionalInfo.sources, "");
    }
  } else {
    callback(null, null, 0);
  }
}
function getRepositoryFile(urlOrPath, additionalInfo, callback) {
  let sources = {};
  let _path = "";
  if (typeof additionalInfo === "function") {
    callback = additionalInfo;
    additionalInfo = {};
  }
  additionalInfo = additionalInfo || {};
  if (urlOrPath) {
    const parts = urlOrPath.split("/");
    _path = `${parts.splice(0, parts.length - 1).join("/")}/`;
  }
  if (urlOrPath && typeof urlOrPath === "object") {
    if (typeof callback === "function") {
      callback(null, urlOrPath);
    }
  } else if (!urlOrPath) {
    try {
      const controllerDir = getControllerDir();
      if (controllerDir) {
        sources = import_fs_extra.default.readJSONSync(import_node_path.default.join(controllerDir, getDefaultDataDir(), "sources.json"));
      }
    } catch {
      sources = {};
    }
    try {
      const controllerDir = getControllerDir();
      if (controllerDir) {
        const sourcesDist = import_fs_extra.default.readJSONSync(import_node_path.default.join(controllerDir, "conf", "sources-dist.json"));
        sources = (0, import_node.default)(true, sourcesDist, sources);
      }
    } catch {
    }
    for (const s of Object.keys(sources)) {
      if (additionalInfo[s] && additionalInfo[s].published) {
        sources[s].published = additionalInfo[s].published;
      }
    }
    _getRepositoryFile(sources, _path, (err) => {
      if (err) {
        console.error(`[${(/* @__PURE__ */ new Date()).toString()}] ${err.message}`);
      }
      if (typeof callback === "function") {
        callback(err, sources);
      }
    });
  } else {
    let agent = "";
    if (additionalInfo) {
      agent = `${additionalInfo.name}, RND: ${additionalInfo.randomID || randomID}, Node:${additionalInfo.node}, V:${additionalInfo.controller}`;
    }
    _checkRepositoryFileHash(urlOrPath, additionalInfo, (err, sources2, actualSourcesHash) => {
      if (!err && sources2) {
        typeof callback === "function" && callback(err, sources2, actualSourcesHash);
      } else {
        getJson(urlOrPath, agent, (sources3) => {
          if (sources3) {
            for (const s of Object.keys(sources3)) {
              if (additionalInfo[s] && additionalInfo[s].published) {
                sources3[s].published = additionalInfo[s].published;
              }
            }
            setImmediate(() => _getRepositoryFile(sources3, _path, (err2) => {
              err2 && console.error(`[${(/* @__PURE__ */ new Date()).toString()}] ${err2.message}`);
              typeof callback === "function" && callback(err2, sources3, actualSourcesHash);
            }));
          } else {
            console.log(`failed to download new sources, ${additionalInfo.sources ? "use cached sources" : "no cached sources available"}`);
            return (0, import_maybeCallback.maybeCallbackWithError)(callback, `Cannot read "${urlOrPath}"`, additionalInfo.sources, "");
          }
        });
      }
    });
  }
}
async function getRepositoryFileAsync(url2, hash, force, _actualRepo) {
  let _hash;
  let data;
  if (url2.startsWith("http://") || url2.startsWith("https://")) {
    try {
      _hash = await (0, import_axios.default)({ url: url2.replace(/\.json$/, "-hash.json"), timeout: 1e4 });
    } catch {
    }
    if (_actualRepo && !force && hash && _hash?.data && _hash.data.hash === hash) {
      data = _actualRepo;
    } else {
      const agent = `${appName}, RND: ${randomID}, Node:${process.version}, V:${require2("@iobroker/js-controller-common/package.json").version}`;
      try {
        data = await (0, import_axios.default)({
          url: url2,
          timeout: 1e4,
          headers: { "User-Agent": agent }
        });
        data = data.data;
      } catch (e) {
        throw new Error(`Cannot download repository file from "${url2}": ${e.message}`);
      }
    }
  } else {
    if (import_fs_extra.default.existsSync(url2)) {
      try {
        data = JSON.parse(import_fs_extra.default.readFileSync(url2).toString("utf8"));
      } catch (e) {
        throw new Error(`Error: Cannot read or parse file "${url2}": ${e}`);
      }
    } else {
      throw new Error(`Error: Cannot find file "${url2}"`);
    }
  }
  return {
    json: data,
    changed: _hash?.data ? hash !== _hash.data.hash : true,
    hash: _hash?.data ? _hash.data.hash : ""
  };
}
async function sendDiagInfo(obj) {
  const objStr = JSON.stringify(obj);
  console.log(`Send diag info: ${objStr}`);
  const params = new import_node_url.URLSearchParams();
  params.append("data", objStr);
  const config = {
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    timeout: 4e3
  };
  try {
    await import_axios.default.post(`http://download.${appName}.net/diag.php`, params, config);
  } catch (e) {
    console.log(`Cannot send diag info: ${e.message}`);
  }
}
function getAdapterDir(adapter) {
  if (adapter.toLowerCase().startsWith(`${appNameLowerCase}.`)) {
    adapter = adapter.substring(appName.length + 1);
  }
  if (/\.\d+$/.test(adapter)) {
    adapter = adapter.slice(0, adapter.lastIndexOf("."));
  }
  const possibilities = [`${appName.toLowerCase()}.${adapter}/package.json`, `${appName}.${adapter}/package.json`];
  let adapterPath;
  for (const possibility of possibilities) {
    if (import_fs_extra.default.existsSync(import_node_path.default.join(getControllerDir(), "..", possibility))) {
      adapterPath = import_node_path.default.join(getControllerDir(), "..", possibility);
    } else if (import_fs_extra.default.existsSync(import_node_path.default.join(getControllerDir(), "node_modules", possibility))) {
      adapterPath = import_node_path.default.join(getControllerDir(), "node_modules", possibility);
    } else {
      try {
        adapterPath = require2.resolve(possibility);
      } catch {
      }
    }
    if (adapterPath) {
      break;
    }
  }
  if (!adapterPath) {
    return null;
  }
  const parts = import_node_path.default.normalize(adapterPath).split(/[\\/]/g);
  parts.pop();
  return parts.join("/");
}
function getHostName() {
  if (process.env.IOB_HOSTNAME) {
    return process.env.IOB_HOSTNAME;
  }
  try {
    const configName = getConfigFileName();
    const config = import_fs_extra.default.readJSONSync(configName);
    return config.system?.hostname || import_node_os.default.hostname();
  } catch {
    return import_node_os.default.hostname();
  }
}
function getSystemNpmVersion(callback) {
  const { exec: exec2 } = require2("node:child_process");
  const newEnv = Object.assign({}, process.env);
  newEnv.PATH = (newEnv.PATH || newEnv.Path || newEnv.path).split(import_node_path.default.delimiter).filter((dir) => {
    dir = dir.toLowerCase();
    return !dir.includes("iobroker") || !dir.includes(import_node_path.default.join("node_modules", ".bin"));
  }).join(import_node_path.default.delimiter);
  try {
    let timeout = setTimeout(() => {
      timeout = null;
      if (callback) {
        callback(new Error("timeout"));
        callback = void 0;
      }
    }, 1e4);
    exec2("npm -v", { encoding: "utf8", env: newEnv, windowsHide: true }, (error, stdout) => {
      if (timeout) {
        clearTimeout(timeout);
        timeout = null;
      }
      if (stdout) {
        stdout = import_semver.default.valid(stdout.trim());
      }
      if (callback) {
        callback(error, stdout);
        callback = void 0;
      }
    });
  } catch (e) {
    if (callback) {
      callback(e);
      callback = void 0;
    }
  }
}
const getSystemNpmVersionAsync = promisify(getSystemNpmVersion);
async function detectPackageManagerWithFallback(cwd) {
  try {
    return await (0, import_pak.detectPackageManager)(typeof cwd === "string" ? (
      // If a cwd was provided, use it
      { cwd }
    ) : (
      // Otherwise, try to find the ioBroker root dir
      {
        cwd: isDevServerInstallation() && require2.main?.path || thisDir,
        setCwdToPackageRoot: true
      }
    ));
  } catch {
  }
  const ioBrokerRootDir = getRootDir();
  const pak = new import_pak.packageManagers.npm();
  pak.cwd = cwd || ioBrokerRootDir;
  return pak;
}
async function installNodeModule(npmUrl, options = {}) {
  const pak = await detectPackageManagerWithFallback(options.cwd);
  if (!options.debug) {
    pak.loglevel = "error";
  }
  const installOpts = {
    additionalArgs: []
  };
  if (options.debug) {
    const stdall = new import_node_stream.PassThrough();
    pak.stdall = stdall;
    pipeLinewise(stdall, process.stdout);
    installOpts.additionalArgs.push("--foreground-scripts");
  } else {
    const stdout = new import_node_stream.PassThrough();
    pak.stdout = stdout;
    pipeLinewise(stdout, process.stdout);
  }
  if (options.unsafePerm) {
    installOpts.additionalArgs.push("--unsafe-perm");
  }
  return pak.install([npmUrl], installOpts);
}
async function uninstallNodeModule(packageName, options = {}) {
  const pak = await detectPackageManagerWithFallback(options.cwd);
  if (!options.debug) {
    pak.loglevel = "error";
  }
  if (options.debug) {
    const stdall = new import_node_stream.PassThrough();
    pak.stdall = stdall;
    pipeLinewise(stdall, process.stdout);
  } else {
    const stdout = new import_node_stream.PassThrough();
    pak.stdout = stdout;
    pipeLinewise(stdout, process.stdout);
  }
  return pak.uninstall([packageName]);
}
async function rebuildNodeModules(options = {}) {
  const pak = await detectPackageManagerWithFallback(options.cwd);
  if (!options.debug) {
    pak.loglevel = "error";
  }
  if (options.debug) {
    const stdall = new import_node_stream.PassThrough();
    pak.stdall = stdall;
    pipeLinewise(stdall, process.stdout);
  } else {
    const stdout = new import_node_stream.PassThrough();
    pak.stdout = stdout;
    pipeLinewise(stdout, process.stdout);
  }
  return pak.rebuild(options.module ? [options.module] : void 0);
}
async function getDiskInfo() {
  const platform = process.platform;
  if (diskusage) {
    try {
      const path2 = platform === "win32" ? thisDir.substring(0, 2) : "/";
      const info = diskusage.checkSync(path2);
      return { "Disk size": info.total, "Disk free": info.free };
    } catch (e) {
      console.log(e.message);
    }
  } else {
    if (platform === "win32") {
      const disk = thisDir.substring(0, 2).toUpperCase();
      const { stdout } = await execAsync("wmic logicaldisk get size,freespace,caption");
      if (typeof stdout === "string") {
        const lines = stdout.split("\n");
        const line = lines.find((line2) => {
          const parts = line2.split(/\s+/);
          return parts[0].toUpperCase() === disk;
        });
        if (line) {
          const parts = line.split(/\s+/);
          return {
            "Disk size": parseInt(parts[2]),
            "Disk free": parseInt(parts[1])
          };
        }
      }
    } else {
      const { stdout } = await execAsync(`df -k ${getRootDir()}`);
      try {
        if (typeof stdout === "string") {
          const parts = stdout.split("\n")[1].split(/\s+/);
          return {
            "Disk size": parseInt(parts[1]) * 1024,
            "Disk free": parseInt(parts[3]) * 1024
          };
        }
      } catch {
      }
    }
  }
  return null;
}
function getCertificateInfo(cert) {
  let info = null;
  if (!cert) {
    return null;
  }
  const pki = import_node_forge.default.pki;
  let certFile = null;
  try {
    if (typeof cert === "string" && cert.length < 1024 && import_fs_extra.default.existsSync(cert)) {
      certFile = cert;
      cert = import_fs_extra.default.readFileSync(cert, "utf8");
    }
    const crt = pki.certificateFromPem(cert);
    info = {
      certificateFilename: certFile,
      certificate: cert,
      serialNumber: crt.serialNumber,
      signature: pki.oids[crt.signatureOid],
      keyLength: crt.publicKey.n.toString(2).length,
      issuer: crt.issuer,
      subject: crt.subject,
      dnsNames: crt.getExtension("subjectAltName").altNames,
      keyUsage: crt.getExtension("keyUsage"),
      extKeyUsage: crt.getExtension("extKeyUsage"),
      validityNotBefore: crt.validity.notBefore,
      validityNotAfter: crt.validity.notAfter
    };
    delete info.keyUsage.value;
    delete info.extKeyUsage.value;
    return info;
  } catch {
    return null;
  }
}
const MAX_CERT_VALIDITY = 365 * 24 * 60 * 60 * 1e3;
function generateDefaultCertificates() {
  const pki = import_node_forge.default.pki;
  const keys = pki.rsa.generateKeyPair({ bits: 2048, e: 65537 });
  const cert = pki.createCertificate();
  cert.publicKey = keys.publicKey;
  cert.serialNumber = `0${makeid(17)}`;
  cert.validity.notBefore = /* @__PURE__ */ new Date();
  cert.validity.notAfter = new Date(Date.now() + MAX_CERT_VALIDITY);
  const subAttrs = [
    { name: "commonName", value: getHostName() },
    { name: "organizationName", value: "ioBroker GmbH" },
    { shortName: "OU", value: "iobroker" }
  ];
  const issAttrs = [
    { name: "commonName", value: "iobroker" },
    { name: "organizationName", value: "ioBroker GmbH" },
    { shortName: "OU", value: "iobroker" }
  ];
  cert.setSubject(subAttrs);
  cert.setIssuer(issAttrs);
  cert.setExtensions([
    {
      name: "basicConstraints",
      critical: true,
      cA: false
    },
    {
      name: "keyUsage",
      critical: true,
      digitalSignature: true,
      contentCommitment: true,
      keyEncipherment: true,
      dataEncipherment: true,
      keyAgreement: true,
      keyCertSign: true,
      cRLSign: true,
      encipherOnly: true,
      decipherOnly: true
    },
    {
      name: "subjectAltName",
      altNames: [
        {
          type: 2,
          value: import_node_os.default.hostname()
        }
      ]
    },
    {
      name: "subjectKeyIdentifier"
    },
    {
      name: "extKeyUsage",
      serverAuth: true,
      clientAuth: true,
      codeSigning: false,
      emailProtection: false,
      timeStamping: false
    },
    {
      name: "authorityKeyIdentifier"
    }
  ]);
  cert.sign(keys.privateKey, import_node_forge.default.md.sha256.create());
  const pem_pkey = pki.privateKeyToPem(keys.privateKey);
  const pem_cert = pki.certificateToPem(cert);
  return {
    defaultPrivate: pem_pkey,
    defaultPublic: pem_cert
  };
}
function makeid(length) {
  let result = "";
  const characters = "abcdef0123456789";
  const charactersLength = characters.length;
  for (let i = 0; i < length; i++) {
    result += characters.charAt(Math.floor(Math.random() * charactersLength));
  }
  return result;
}
async function getHostInfo(objects) {
  if (!diskusage) {
    try {
      diskusage = require2("diskusage");
    } catch {
    }
  }
  const systemConfig = await objects.getObjectAsync("system.config");
  const systemRepos = await objects.getObjectAsync("system.repositories");
  const allRepos = {};
  if (systemRepos?.native?.repositories && systemConfig) {
    const repos = Array.isArray(systemConfig.common.activeRepo) ? systemConfig.common.activeRepo : [systemConfig.common.activeRepo];
    repos.filter((repo) => systemRepos.native.repositories[repo] && systemRepos.native.repositories[repo].json).forEach((repo) => Object.assign(allRepos, systemRepos.native.repositories[repo].json));
  }
  if (!npmVersion) {
    try {
      npmVersion = await getSystemNpmVersionAsync();
    } catch (e) {
      console.error(`Cannot get NPM version: ${e.message}`);
    }
  }
  const cpus = import_node_os.default.cpus();
  const dateObj = /* @__PURE__ */ new Date();
  const data = {
    Platform: isDocker() ? "docker" : import_node_os.default.platform(),
    os: process.platform,
    Architecture: import_node_os.default.arch(),
    CPUs: cpus && Array.isArray(cpus) ? cpus.length : null,
    Speed: cpus && Array.isArray(cpus) ? cpus[0].speed : null,
    Model: cpus && Array.isArray(cpus) ? cpus[0].model : null,
    RAM: import_node_os.default.totalmem(),
    "System uptime": Math.round(import_node_os.default.uptime()),
    "Node.js": process.version,
    time: dateObj.getTime(),
    timeOffset: dateObj.getTimezoneOffset(),
    NPM: npmVersion,
    "adapters count": Object.keys(allRepos).length
  };
  if (data.Platform === "win32") {
    data.Platform = "Windows";
  } else if (data.Platform === "darwin") {
    data.Platform = "OSX";
  }
  if (data.Platform === "docker") {
    data.dockerInformation = getDockerInformation();
  }
  try {
    const info = await getDiskInfo();
    if (info) {
      Object.assign(data, info);
    }
  } catch (e) {
    console.error(`Cannot get disk information: ${e.message}`);
  }
  return data;
}
function getControllerDir() {
  const possibilities = ["iobroker.js-controller", "ioBroker.js-controller"];
  for (const pkg of possibilities) {
    try {
      const possiblePath = require2.resolve(`${pkg}/package.json`);
      if (import_fs_extra.default.existsSync(possiblePath)) {
        return import_node_path.default.dirname(possiblePath);
      }
    } catch {
    }
  }
  let checkPath = import_node_path.default.join(thisDir, "..", "..");
  possibilities.unshift("");
  while (true) {
    for (const pkg of possibilities) {
      try {
        const possiblePath = import_node_path.default.join(checkPath, pkg);
        if (import_fs_extra.default.existsSync(import_node_path.default.join(possiblePath, `${appNameLowerCase}.js`))) {
          return possiblePath;
        }
      } catch {
      }
    }
    const newPath = import_node_path.default.dirname(checkPath);
    if (newPath === checkPath) {
      break;
    }
    checkPath = newPath;
  }
  throw new Error("Could not determine controller directory");
}
function getRootDir() {
  return import_node_path.default.join(getControllerDir(), "..", "..");
}
function isDevServerInstallation() {
  return !!require2.main?.path.includes(`${import_node_path.default.sep}.dev-server${import_node_path.default.sep}`);
}
function getDefaultDataDir() {
  let envDataDir = process.env[`${appName.toUpperCase()}_DATA_DIR`];
  if (envDataDir) {
    if (import_node_path.default.isAbsolute(envDataDir)) {
      envDataDir = import_node_path.default.relative(getControllerDir(), envDataDir);
    }
    return envDataDir;
  }
  if (isDevInstallation()) {
    return "./data/";
  }
  return import_node_path.default.join("..", "..", `${appNameLowerCase}-data/`);
}
function getConfigFileName() {
  let envDataDir = process.env[`${appName.toUpperCase()}_DATA_DIR`];
  if (envDataDir) {
    if (!import_node_path.default.isAbsolute(envDataDir)) {
      envDataDir = import_node_path.default.join(getControllerDir(), envDataDir);
    }
    return import_node_path.default.join(envDataDir, `${appNameLowerCase}.json`);
  }
  const controllerDir = getControllerDir();
  const fallbackConfigFile = import_node_path.default.join(controllerDir, "data", `${appNameLowerCase}.json`);
  const isDevInstall = isDevInstallation();
  if (isDevInstall) {
    const devConfigFile = import_node_path.default.join(controllerDir, "conf", `${appNameLowerCase}.json`);
    if (import_fs_extra.default.existsSync(devConfigFile)) {
      return devConfigFile;
    } else if (import_fs_extra.default.existsSync(fallbackConfigFile)) {
      return fallbackConfigFile;
    }
  }
  const prodConfigFile = import_node_path.default.join(getRootDir(), `${appNameLowerCase}-data`, `${appNameLowerCase}.json`);
  if (!import_fs_extra.default.existsSync(prodConfigFile) && isDevInstall) {
    return fallbackConfigFile;
  }
  return prodConfigFile;
}
function sliceArgs(argsObj, startIndex = 0) {
  if (startIndex === null || startIndex === void 0) {
    startIndex = 0;
  }
  const ret = [];
  for (let i = startIndex; i < argsObj.length; i++) {
    ret.push(argsObj[i]);
  }
  return ret;
}
function promisify(fn, context, returnArgNames) {
  return function() {
    const args = sliceArgs(arguments);
    context = context || this;
    return new Promise(async (resolve, reject) => {
      try {
        await fn.apply(context, args.concat([
          function(error, result) {
            if (error) {
              return reject(error instanceof Error ? error : new Error(error));
            }
            switch (arguments.length) {
              case 1:
                return resolve();
              // Promise<void>
              case 2:
                return resolve(result);
              default: {
                let ret;
                const extraArgs = sliceArgs(arguments, 1);
                if (returnArgNames && returnArgNames.length === extraArgs.length) {
                  ret = {};
                  for (let i = 0; i < returnArgNames.length; i++) {
                    ret[returnArgNames[i]] = extraArgs[i];
                  }
                } else {
                  ret = extraArgs;
                }
                return resolve(ret);
              }
            }
          }
        ]));
      } catch (e) {
        reject(e);
      }
    });
  };
}
function promisifyNoError(fn, context, returnArgNames) {
  return function() {
    const args = sliceArgs(arguments);
    context = context || this;
    return new Promise((resolve, _reject) => {
      fn.apply(context, args.concat([
        function(result) {
          switch (arguments.length) {
            case 0:
              return resolve();
            // Promise<void>
            case 1:
              return resolve(result);
            default: {
              let ret;
              const extraArgs = sliceArgs(arguments, 0);
              if (returnArgNames && returnArgNames.length === extraArgs.length) {
                ret = {};
                for (let i = 0; i < returnArgNames.length; i++) {
                  ret[returnArgNames[i]] = extraArgs[i];
                }
              } else {
                ret = extraArgs;
              }
              return resolve(ret);
            }
          }
        }
      ]));
    });
  };
}
async function _setQualityForStates(states, keys, quality) {
  for (const key of keys) {
    try {
      await states.setState(key, { ack: null, q: quality });
    } catch {
    }
  }
}
function setQualityForInstance(objects, states, namespace, q) {
  return new Promise((resolve, reject) => {
    objects.getObjectView("system", "state", {
      startkey: `${namespace}.`,
      endkey: `${namespace}.\u9999`,
      include_docs: false
    }, (err, _states) => {
      if (err) {
        reject(err);
      } else {
        let keys = [];
        if (_states?.rows) {
          for (const row of _states.rows) {
            const id = row.id;
            if (!(q & 16) && id.match(/\.info\.connection$/)) {
              continue;
            }
            keys.push(id);
          }
        }
        states.getStates(keys, async (_err, values) => {
          keys = keys.filter((_id, i) => values[i] && values[i].ack);
          await _setQualityForStates(states, keys, q);
          resolve();
        });
      }
    });
  });
}
function pattern2RegEx(pattern) {
  pattern = (pattern || "").toString();
  if (!isValidPattern(pattern)) {
    throw new Error(`The pattern "${pattern}" is not a valid ID pattern`);
  }
  const startsWithWildcard = pattern[0] === "*";
  const endsWithWildcard = pattern[pattern.length - 1] === "*";
  pattern = pattern.replace(/[-/\\^$+?.()|[\]{}]/g, "\\$&").replace(/\*/g, ".*");
  return (startsWithWildcard ? "" : "^") + pattern + (endsWithWildcard ? "" : "$");
}
function isValidPattern(pattern) {
  pattern = pattern.replace(/\*/g, "");
  return !FORBIDDEN_CHARS.test(pattern);
}
function captureStackTrace(wrapperName) {
  if (typeof wrapperName !== "string") {
    wrapperName = "captureStackTrace";
  }
  const ret = new Error();
  if (ret.stack) {
    let foundSelf = false;
    const lines = ret.stack.split("\n").filter((line) => {
      if (foundSelf) {
        return true;
      }
      if (line.includes(wrapperName)) {
        foundSelf = true;
      }
      return false;
    });
    return lines.join("\n");
  }
  return "";
}
function appendStackTrace(str) {
  if (typeof str !== "string") {
    str = String(str);
  }
  if (!str.endsWith("\n")) {
    str += "\n";
  }
  return str + captureStackTrace("appendStackTrace");
}
function encryptLegacy(key, value) {
  let result = "";
  for (let i = 0; i < value.length; i++) {
    result += String.fromCharCode(key[i % key.length].charCodeAt(0) ^ value.charCodeAt(i));
  }
  return result;
}
function decryptLegacy(key, value) {
  let result = "";
  for (let i = 0; i < value.length; i++) {
    result += String.fromCharCode(key[i % key.length].charCodeAt(0) ^ value.charCodeAt(i));
  }
  return result;
}
function encrypt(key, value) {
  if (!/^[0-9a-f]{48}$/.test(key)) {
    return encryptLegacy(key, value);
  }
  const iv = import_node_crypto.default.randomBytes(16);
  const cipher = import_node_crypto.default.createCipheriv("aes-192-cbc", Buffer.from(key, "hex"), iv);
  const encrypted = Buffer.concat([cipher.update(value), cipher.final()]);
  return `$/aes-192-cbc:${iv.toString("hex")}:${encrypted.toString("hex")}`;
}
function decrypt(key, value) {
  if (!value.startsWith(`$/aes-192-cbc:`) || !/^[0-9a-f]{48}$/.test(key)) {
    return decryptLegacy(key, value);
  }
  const textParts = value.split(":", 3);
  const iv = Buffer.from(textParts[1], "hex");
  const encryptedText = Buffer.from(textParts[2], "hex");
  const decipher = import_node_crypto.default.createDecipheriv("aes-192-cbc", Buffer.from(key, "hex"), iv);
  const decrypted = Buffer.concat([decipher.update(encryptedText), decipher.final()]);
  return decrypted.toString();
}
function isObject(it) {
  return Object.prototype.toString.call(it) === "[object Object]";
}
function isArray(it) {
  return Array.isArray(it);
}
function measureEventLoopLag(ms, cb) {
  let start = hrtime();
  let timeout = setTimeout(check, ms);
  timeout.unref();
  function check() {
    clearTimeout(timeout);
    const t = hrtime();
    cb && cb(Math.max(0, t - start - ms));
    start = t;
    timeout = setTimeout(check, ms);
    timeout.unref();
  }
  function hrtime() {
    const t = process.hrtime();
    return t[0] * 1e3 + t[1] / 1e6;
  }
}
function formatAliasValue(options) {
  const { sourceCommon, sourceId, targetCommon, targetId, state, logger } = options;
  const logNamespace = options.logNamespace ? `${options.logNamespace} ` : "";
  if (!state) {
    return null;
  }
  if (state.val === void 0) {
    state.val = null;
    return state;
  }
  if (targetCommon?.alias?.read) {
    if (!sourceCommon) {
      logger.error(`${logNamespace}source in "${targetId}" does not exist for "read" function: "${targetCommon.alias.read}"`);
      return null;
    }
    try {
      state.val = (0, import_aliasProcessing.applyAliasTransformer)({
        transformer: targetCommon.alias.read,
        firstCommon: targetCommon,
        secondCommon: sourceCommon,
        isRead: true,
        state
      });
    } catch (e) {
      logger.error(`${logNamespace}Invalid read function for "${targetId}": "${targetCommon.alias.read}" => ${e.message}`);
      return null;
    }
  }
  if (sourceCommon?.alias?.write) {
    if (!targetCommon) {
      logger.error(`${logNamespace}target for "${sourceId}" does not exist for "write" function: "${sourceCommon.alias.write}"`);
      return null;
    }
    try {
      state.val = (0, import_aliasProcessing.applyAliasTransformer)({
        transformer: sourceCommon.alias.write,
        firstCommon: sourceCommon,
        secondCommon: targetCommon,
        isRead: false,
        state
      });
    } catch (e) {
      logger.error(`${logNamespace}Invalid write function for "${sourceId}": "${sourceCommon.alias.write}" => ${e.message}`);
      return null;
    }
  }
  state.val = (0, import_aliasProcessing.applyAliasConvenienceConversion)({ state, targetCommon });
  state.val = (0, import_aliasProcessing.applyAliasAutoScaling)({ state, sourceCommon, targetCommon });
  return state;
}
async function removeIdFromAllEnums(objects, id, allEnums) {
  if (!allEnums) {
    allEnums = await getAllEnums(objects);
  }
  let error = null;
  for (const [enumId, enumObj] of Object.entries(allEnums)) {
    const idx = enumObj.common.members ? enumObj.common.members.indexOf(id) : -1;
    if (idx !== -1) {
      enumObj.common.members.splice(idx, 1);
      try {
        await objects.setObjectAsync(enumId, enumObj);
        allEnums[enumId] = enumObj;
      } catch (err) {
        if (!error) {
          error = err;
        }
      }
    }
  }
  if (error) {
    throw error;
  }
}
function parseDependencies(dependencies) {
  let adapters = {};
  if (Array.isArray(dependencies)) {
    dependencies.forEach((rule) => {
      if (typeof rule === "string") {
        adapters[rule] = "*";
      } else if (isObject(rule)) {
        Object.keys(rule).filter((adapter) => !adapters[adapter]).forEach((adapter) => adapters[adapter] = rule[adapter]);
      }
    });
  } else if (typeof dependencies === "string") {
    adapters[dependencies] = "*";
  } else if (isObject(dependencies)) {
    adapters = dependencies;
  }
  return adapters;
}
function validateGeneralObjectProperties(obj, extend2) {
  if (!obj || obj.type === void 0 && !extend2) {
    throw new Error(`obj.type has to exist`);
  }
  if (obj.type !== void 0 && typeof obj.type !== "string") {
    throw new Error(`obj.type has an invalid type! Expected "string", received "${typeof obj.type}"`);
  }
  if (obj.native !== void 0 && !isObject(obj.native)) {
    throw new Error(`obj.native has an invalid type! Expected a "real object", received "${typeof obj.native}"`);
  }
  const allowedObjectTypes = [
    "state",
    "channel",
    "device",
    "enum",
    "host",
    "adapter",
    "instance",
    "meta",
    "config",
    "script",
    "user",
    "group",
    "chart",
    "folder",
    "schedule",
    "design"
  ];
  if (obj.type !== void 0 && !allowedObjectTypes.includes(obj.type)) {
    throw new Error(`obj.type has an invalid value (${obj.type}) but has to be one of ${allowedObjectTypes.join(", ")}`);
  }
  if (!obj.common) {
    return;
  }
  if (obj.common.name !== void 0 && typeof obj.common.name !== "string" && typeof obj.common.name !== "object") {
    throw new Error(`obj.common.name has an invalid type! Expected "string" or "object", received "${typeof obj.common.name}"`);
  } else if (["adapter"].includes(obj.type) && typeof obj.common.name !== "string") {
    throw new Error(`obj.common.name has an invalid type! Expected "string", received "${typeof obj.common.name}"`);
  }
  if (obj.common.type !== void 0) {
    if (typeof obj.common.type !== "string") {
      throw new Error(`obj.common.type has an invalid type! Expected "string", received "${typeof obj.common.type}"`);
    }
    if (obj.type === "state") {
      const allowedStateTypes = ["number", "string", "boolean", "array", "object", "mixed", "json"];
      if (!allowedStateTypes.includes(obj.common.type)) {
        throw new Error(`obj.common.type has an invalid value (${obj.common.type}) but has to be one of ${allowedStateTypes.join(", ")}`);
      }
      if (obj.common.min !== void 0) {
        if (typeof obj.common.min !== "number") {
          throw new Error(`obj.common.min has an invalid type! Expected "number", received "${typeof obj.common.min}"`);
        }
        if (obj.common.type !== "number" && obj.common.type !== "mixed") {
          throw new Error(`obj.common.min is only allowed on obj.common.type "number" or "mixed", received "${obj.common.type}"`);
        }
      }
      if (obj.common.max !== void 0) {
        if (typeof obj.common.max !== "number") {
          throw new Error(`obj.common.max has an invalid type! Expected "number", received "${typeof obj.common.max}"`);
        }
        if (obj.common.type !== "number" && obj.common.type !== "mixed") {
          throw new Error(`obj.common.max is only allowed on obj.common.type "number" or "mixed", received "${obj.common.type}"`);
        }
        if (obj.common.min !== void 0 && obj.common.min > obj.common.max) {
          throw new Error(`obj.common.min (${obj.common.min}) needs to be less than or equal to obj.common.max (${obj.common.max})`);
        }
      }
      if (obj.common.def !== void 0 && obj.common.def !== null) {
        if (!(obj.common.type === "mixed" && typeof obj.common.def !== "object" || obj.common.type !== "object" && obj.common.type === typeof obj.common.def || obj.common.type === "array" && typeof obj.common.def === "string" || obj.common.type === "json" && typeof obj.common.def === "string" || obj.common.type === "object" && typeof obj.common.def === "string")) {
          if (["object", "json", "array"].includes(obj.common.type)) {
            throw new Error(`Default value has to be stringified but received type "${typeof obj.common.def}"`);
          } else {
            throw new Error(`Default value has to be ${obj.common.type === "mixed" ? `one of type "string", "number", "boolean"` : `type "${obj.common.type}"`} but received type "${typeof obj.common.def}"`);
          }
        }
      }
    }
  }
  if (obj.common.read !== void 0 && typeof obj.common.read !== "boolean") {
    throw new Error(`obj.common.read has an invalid type! Expected "boolean", received "${typeof obj.common.read}"`);
  }
  if (obj.common.write !== void 0 && typeof obj.common.write !== "boolean") {
    throw new Error(`obj.common.write has an invalid type! Expected "boolean", received "${typeof obj.common.write}"`);
  }
  if (obj.common.role !== void 0 && typeof obj.common.role !== "string") {
    throw new Error(`obj.common.role has an invalid type! Expected "string", received "${typeof obj.common.role}"`);
  }
  if (obj.common.desc !== void 0 && typeof obj.common.desc !== "string" && typeof obj.common.desc !== "object") {
    throw new Error(`obj.common.desc has an invalid type! Expected "string" or "object", received "${typeof obj.common.desc}"`);
  }
  if (obj.type === "state" && obj.common.custom !== void 0 && obj.common.custom !== null && !isObject(obj.common.custom)) {
    throw new Error(`obj.common.custom has an invalid type! Expected "object", received "${typeof obj.common.custom}"`);
  }
  if (obj.common.states !== null && // we allow null for deletion TODO: implement https://github.com/ioBroker/ioBroker.js-controller/issues/1735
  obj.common.states !== void 0 && !isObject(obj.common.states) && !Array.isArray(obj.common.states)) {
    throw new Error(`obj.common.states has an invalid type! Expected "object", received "${typeof obj.common.states}"`);
  }
}
async function getAllInstances(adapters, objects) {
  const instances = [];
  for (let i = 0; i < adapters.length; i++) {
    if (!adapters[i]) {
      continue;
    }
    if (!adapters[i].includes(".")) {
      const inst = await getInstances(adapters[i], objects, false);
      for (let j = 0; j < inst.length; j++) {
        if (!instances.includes(inst[j])) {
          instances.push(inst[j]);
        }
      }
    } else {
      if (!instances.includes(adapters[i])) {
        instances.push(adapters[i]);
      }
    }
  }
  return instances;
}
async function getAllEnums(objects) {
  const allEnums = {};
  const res = await objects.getObjectViewAsync("system", "enum", {
    startkey: "enum.",
    endkey: "enum.\u9999"
  });
  if (res?.rows) {
    for (const row of res.rows) {
      allEnums[row.id] = row.value;
    }
  }
  return allEnums;
}
async function getInstances(adapter, objects, withObjects) {
  const arr = await objects.getObjectListAsync({
    startkey: `system.adapter.${adapter}.`,
    endkey: `system.adapter.${adapter}.\u9999`
  });
  const instances = [];
  if (arr?.rows) {
    for (const row of arr.rows) {
      if (row.value.type !== "instance") {
        continue;
      }
      if (withObjects) {
        instances.push(row.value);
      } else {
        instances.push(row.value._id);
      }
    }
  }
  return instances;
}
function execAsync(command, execOptions) {
  const defaultOptions = {
    // we do not want to show the node.js window on Windows
    windowsHide: true,
    // And we want to capture stdout/stderr
    encoding: "utf8"
  };
  return (0, import_promisify_child_process.exec)(command, { ...defaultOptions, ...execOptions });
}
function pipeLinewise(input, output) {
  const rl = (0, import_node_readline.createInterface)({
    input,
    crlfDelay: Infinity
  });
  rl.on("line", (line) => {
    try {
      output.write(line + import_node_os.default.EOL);
    } catch {
    }
  });
  rl.on("error", () => {
  });
}
async function isAdapterEsmModule(adapter) {
  const adapterDir = getAdapterDir(adapter);
  if (!adapterDir) {
    throw new Error(`Could not find adapter dir of ${adapter}`);
  }
  const packJson = await import_fs_extra.default.readJSON(import_node_path.default.join(adapterDir, "package.json"), { encoding: "utf-8" });
  return packJson.type === "module";
}
async function resolveAdapterMainFile(adapter) {
  const adapterDir = getAdapterDir(adapter);
  if (!adapterDir) {
    throw new Error(`Could not find adapter dir of ${adapter}`);
  }
  const possibleMainFiles = ["main.js", `${adapter}.js`];
  try {
    const pack = JSON.parse(await import_fs_extra.default.readFile(import_node_path.default.join(adapterDir, "package.json"), "utf8"));
    if (pack && typeof pack.main === "string") {
      possibleMainFiles.unshift(pack.main);
    }
  } catch {
  }
  try {
    const ioPack = JSON.parse(await import_fs_extra.default.readFile(import_node_path.default.join(adapterDir, "io-package.json"), "utf8"));
    if (ioPack && ioPack.common && typeof ioPack.common.main === "string") {
      possibleMainFiles.unshift(ioPack.common.main);
    }
  } catch {
  }
  for (const mainFile of possibleMainFiles) {
    const fullFileName = import_node_path.default.join(adapterDir, mainFile);
    if (await import_fs_extra.default.pathExists(fullFileName)) {
      return fullFileName;
    }
  }
  throw new Error(`Could not find main file of ${adapter}`);
}
function getDefaultNodeArgs(mainFile) {
  const ret = [];
  if (mainFile.endsWith(".ts")) {
    ret.push("-r", "@alcalzone/esbuild-register");
  }
  if (process.execArgv.includes("--preserve-symlinks")) {
    ret.push("--preserve-symlinks-main", "--preserve-symlinks");
  }
  return ret;
}
function getDefaultRequireResolvePaths(callerModule) {
  const ret = [
    // This is the default for require.resolve
    ...callerModule.paths
  ];
  if (process.execArgv.includes("--preserve-symlinks") && require2.main) {
    ret.unshift(...require2.main.paths);
  }
  return ret;
}
const shortGithubUrlRegex = /^(?<user>[^/]+)\/(?<repo>[^#]+)(?:#(?<commit>.+))?$/;
function isShortGithubUrl(url2) {
  return shortGithubUrlRegex.test(url2);
}
function parseShortGithubUrl(url2) {
  const match = shortGithubUrlRegex.exec(url2);
  if (!match || !match.groups) {
    return null;
  }
  return {
    user: match.groups.user,
    repo: match.groups.repo,
    commit: match.groups.commit
  };
}
const githubPathnameRegex = /^\/(?<user>[^/]+)\/(?<repo>[^/]*?)(?:\.git)?(?:\/(?:tree|tarball|archive)\/(?<commit>.*?)(?:\.(?:zip|gz|tar\.gz))?)?$/;
function isGithubPathname(pathname) {
  return githubPathnameRegex.test(pathname);
}
function parseGithubPathname(pathname) {
  const match = githubPathnameRegex.exec(pathname);
  if (!match || !match.groups) {
    return null;
  }
  return {
    user: match.groups.user,
    repo: match.groups.repo,
    commit: match.groups.commit
  };
}
function removePreservedProperties(preserve, oldObj, newObj) {
  for (const prop of Object.keys(preserve)) {
    if (isObject(preserve[prop]) && isObject(newObj[prop])) {
      removePreservedProperties(preserve[prop], oldObj[prop], newObj[prop]);
    } else if (newObj && newObj[prop] !== void 0 && oldObj && oldObj[prop] !== void 0) {
      if (typeof preserve[prop] === "boolean") {
        delete newObj[prop];
      } else if (Array.isArray(preserve[prop])) {
        for (const rmProp of preserve[prop]) {
          if (oldObj[prop][rmProp] !== void 0 && newObj[prop][rmProp] !== void 0) {
            delete newObj[prop][rmProp];
          }
        }
      }
    }
  }
}
function getInstanceIndicatorObjects(namespace, adapterCommon) {
  const id = `system.adapter.${namespace}`;
  return [
    {
      _id: `${id}.alive`,
      type: "state",
      common: {
        name: `${namespace} alive`,
        type: "boolean",
        read: true,
        write: true,
        role: "indicator.state"
      },
      native: {}
    },
    {
      _id: `${id}.connected`,
      type: "state",
      common: {
        name: `${namespace} is connected`,
        type: "boolean",
        read: true,
        write: false,
        role: "indicator.state"
      },
      native: {}
    },
    {
      _id: `${id}.compactMode`,
      type: "state",
      common: {
        name: `${namespace}.compactMode`,
        type: "boolean",
        read: true,
        write: false,
        role: "indicator.state"
      },
      native: {}
    },
    {
      _id: `${id}.cpu`,
      type: "state",
      common: {
        name: `${namespace}.cpu`,
        type: "number",
        read: true,
        write: false,
        role: "indicator.state",
        unit: "% of one core"
      },
      native: {}
    },
    {
      _id: `${id}.cputime`,
      type: "state",
      common: {
        name: `${namespace}.cputime`,
        type: "number",
        read: true,
        write: false,
        role: "indicator.state",
        unit: "seconds"
      },
      native: {}
    },
    {
      _id: `${id}.memHeapUsed`,
      type: "state",
      common: {
        name: `${namespace} heap actually Used`,
        type: "number",
        read: true,
        write: false,
        role: "indicator.state",
        unit: "MB"
      },
      native: {}
    },
    {
      _id: `${id}.memHeapTotal`,
      type: "state",
      common: {
        name: `${namespace} total Size of the Heap`,
        read: true,
        write: false,
        type: "number",
        role: "indicator.state",
        unit: "MB"
      },
      native: {}
    },
    {
      _id: `${id}.memRss`,
      type: "state",
      common: {
        name: `${namespace} resident Set Size`,
        desc: "Resident set size",
        read: true,
        write: false,
        type: "number",
        role: "indicator.state",
        unit: "MB"
      },
      native: {}
    },
    {
      _id: `${id}.uptime`,
      type: "state",
      common: {
        name: `${namespace} uptime`,
        type: "number",
        read: true,
        write: false,
        role: "indicator.state",
        unit: "seconds"
      },
      native: {}
    },
    {
      _id: `${id}.inputCount`,
      type: "state",
      common: {
        name: `${namespace} events input counter`,
        desc: "State's inputs in 15 seconds",
        type: "number",
        read: true,
        write: false,
        role: "state",
        unit: "events/15 seconds"
      },
      native: {}
    },
    {
      _id: `${id}.outputCount`,
      type: "state",
      common: {
        name: `${namespace} events output counter`,
        desc: "State's outputs in 15 seconds",
        type: "number",
        read: true,
        write: false,
        role: "state",
        unit: "events/15 seconds"
      },
      native: {}
    },
    {
      _id: `${id}.eventLoopLag`,
      type: "state",
      common: {
        name: `${namespace} Node.js event loop lag`,
        desc: "Node.js event loop lag in ms averaged over 15 seconds",
        type: "number",
        read: true,
        write: false,
        role: "state",
        unit: "ms"
      },
      native: {}
    },
    {
      _id: `${id}.sigKill`,
      type: "state",
      common: {
        name: `${namespace} kill signal`,
        type: "number",
        read: true,
        write: false,
        desc: "Process id that must survive. All other IDs must terminate itself",
        role: "state"
      },
      native: {}
    },
    {
      _id: `${id}.logLevel`,
      type: "state",
      common: {
        name: `${namespace} loglevel`,
        type: "string",
        read: true,
        write: true,
        desc: "Loglevel of the adapter. Will be set on start with defined value but can be overridden during runtime",
        role: "state"
      },
      native: {}
    },
    {
      _id: `${id}.objectsWarnLimit`,
      type: "state",
      common: {
        name: `${namespace} objects warn limit`,
        type: "number",
        read: true,
        write: true,
        desc: "If the number of objects of this adapter instance exceeds this limit, the user will receive a warning",
        role: "state",
        def: adapterCommon.defaultObjectsWarnLimit ?? import_constants.DEFAULT_OBJECTS_WARN_LIMIT
      },
      native: {}
    }
  ];
}
function getLogger(log) {
  if (!log) {
    log = {
      silly: function(_msg) {
      },
      debug: function(_msg) {
      },
      info: function(_msg) {
      },
      warn: function(msg) {
        console.log(msg);
      },
      error: function(msg) {
        console.log(msg);
      }
    };
  } else if (!log.silly) {
    log.silly = log.debug;
  }
  return log;
}
async function setExecutableCapabilities(execPath, capabilities, modeEffective, modePermitted, modeInherited) {
  if (import_node_os.default.platform() !== "linux") {
    return;
  }
  if (isDocker() && capabilities.includes("cap_net_admin")) {
    try {
      const systemCaps = import_fs_extra.default.readFileSync(`/proc/${process.pid}/status`, "utf-8");
      const capBnd = systemCaps.match(/^CapBnd:\s(.+)$/m);
      if (capBnd && capBnd[1]) {
        const { stdout } = await execAsync(`capsh --decode=${capBnd[1]}`);
        if (typeof stdout === "string" && stdout.startsWith(`0x${capBnd[1]}=`)) {
          const capBndArr = stdout.substring(capBnd[1].length + 3).split(",");
          if (!capBndArr.includes("cap_net_admin")) {
            capabilities = capabilities.filter((c) => c !== "cap_net_admin");
          }
        }
      }
    } catch {
      capabilities = capabilities.filter((c) => c !== "cap_net_admin");
    }
  }
  if (capabilities.length) {
    let modes = "";
    const capabilitiesStr = capabilities.join(",");
    if (modeEffective) {
      modes += "e";
    }
    if (modePermitted) {
      modes += "p";
    }
    if (modeInherited) {
      modes += "i";
    }
    if (modes.length) {
      modes = `+${modes}`;
    }
    await execAsync(`sudo setcap ${capabilitiesStr}${modes} ${execPath}`);
  }
}
async function _readLicenses(login, password2) {
  const config = {
    headers: { Authorization: `Basic ${Buffer.from(`${login}:${password2}`).toString("base64")}` },
    timeout: 4e3
  };
  try {
    const response = await import_axios.default.get(`https://iobroker.net:3001/api/v1/licenses`, config);
    if (response.data?.length) {
      const now = Date.now();
      response.data = response.data.filter((license) => !license.validTill || license.validTill === "0000-00-00 00:00:00" || new Date(license.validTill).getTime() > now);
    }
    return response.data;
  } catch (err) {
    if (err.response) {
      throw new Error(err.response.data && err.response.data.error || err.response.data || err.response.status);
    } else if (err.request) {
      throw new Error("no response");
    } else {
      throw err;
    }
  }
}
async function updateLicenses(objects, login, password2) {
  if (login && password2) {
    return _readLicenses(login, password2);
  }
  const systemLicenses = await objects.getObjectAsync("system.licenses");
  if (systemLicenses && systemLicenses.native && systemLicenses.native.password && systemLicenses.native.login) {
    try {
      const systemConfig = await objects.getObjectAsync("system.config");
      let password3;
      try {
        password3 = decrypt(systemConfig.native.secret, systemLicenses.native.password);
      } catch (err) {
        throw new Error(`Cannot decode password: ${err.message}`);
      }
      const licenses = await _readLicenses(systemLicenses.native.login, password3);
      const oldLicenses = systemLicenses.native.licenses || [];
      systemLicenses.native.licenses = licenses;
      oldLicenses.forEach((oldLicense) => {
        if (oldLicense.usedBy) {
          const newLicense = licenses.find((item) => item.json === oldLicense.json);
          if (newLicense) {
            newLicense.usedBy = oldLicense.usedBy;
          }
        }
      });
      systemLicenses.native.readTime = (/* @__PURE__ */ new Date()).toISOString();
      await objects.setObjectAsync("system.licenses", systemLicenses);
      return licenses;
    } catch (err) {
      if (err.message.includes("Authentication required") || err.message.includes("Cannot decode password:")) {
        if (systemLicenses && systemLicenses.native && systemLicenses.native.licenses && systemLicenses.native.licenses.length) {
          systemLicenses.native.licenses = [];
          systemLicenses.native.readTime = (/* @__PURE__ */ new Date()).toISOString();
          await objects.setObjectAsync("system.licenses", systemLicenses);
        }
      }
      throw err;
    }
  } else {
    if (systemLicenses && systemLicenses.native && systemLicenses.native.licenses && systemLicenses.native.licenses.length) {
      systemLicenses.native.licenses = [];
      systemLicenses.native.readTime = (/* @__PURE__ */ new Date()).toISOString();
      await objects.setObjectAsync("system.licenses", systemLicenses);
    }
    throw new Error("No password or login");
  }
}
function compressFileGZip(inputFilename, outputFilename, options = {}) {
  const { deleteInput = false } = options;
  return new Promise((resolve, reject) => {
    const input = import_fs_extra.default.createReadStream(inputFilename);
    const output = import_fs_extra.default.createWriteStream(outputFilename);
    const compress = import_node_zlib.default.createGzip();
    input.on("error", (err) => {
      reject(err);
    });
    output.on("error", (err) => {
      reject(err);
    });
    compress.on("error", (err) => {
      reject(err);
    });
    output.on("close", () => {
      if (deleteInput) {
        try {
          import_fs_extra.default.unlinkSync(inputFilename);
        } catch {
        }
      }
      resolve();
    });
    input.pipe(compress).pipe(output);
  });
}
function validateDataDir(dataDir) {
  if (!import_node_path.default.isAbsolute(dataDir)) {
    dataDir = import_node_path.default.normalize(import_node_path.default.join(getControllerDir(), dataDir));
  }
  const pathParts = dataDir.split(import_node_path.default.sep);
  const isValid = !pathParts.includes("node_modules");
  return {
    valid: isValid,
    path: dataDir,
    reason: isValid ? "Valid data directory" : "Data directory is not allowed to point into node_modules folder"
  };
}
function maybeArrayToString(maybeArr) {
  if (Array.isArray(maybeArr)) {
    return JSON.stringify(maybeArr);
  }
  return maybeArr;
}
function getDNSResolutionOrder() {
  let dnsOrder = "ipv4first";
  try {
    const configName = getConfigFileName();
    const config = import_fs_extra.default.readJSONSync(configName);
    dnsOrder = config.dnsResolution || dnsOrder;
  } catch (e) {
    if (e.code !== "ENOENT") {
      console.warn(`Could not determine dns resolution order, fallback to "ipv4first": ${e.message}`);
    }
  }
  return dnsOrder;
}
function isLocalAddress(ip) {
  const localAddresses = ["::1", "127.0.0.1", "localhost"];
  return localAddresses.includes(ip);
}
function isListenAllAddress(ip) {
  return ip === "0.0.0.0" || ip === "::";
}
function getLocalAddress() {
  const dnsOrder = getDNSResolutionOrder();
  return dnsOrder === "ipv4first" ? "127.0.0.1" : "::1";
}
function getListenAllAddress() {
  const dnsOrder = getDNSResolutionOrder();
  return dnsOrder === "ipv4first" ? "0.0.0.0" : "::";
}
function ensureDNSOrder() {
  const dnsOrder = getDNSResolutionOrder();
  (0, import_node_dns.setDefaultResultOrder)(dnsOrder);
}
async function isIoBrokerInstalledAsSystemd() {
  try {
    const res = await execAsync("systemctl status iobroker");
    return !res.stderr;
  } catch {
    return false;
  }
}
function getHostObject(oldObj) {
  const hostname = getHostName();
  const ioPackage = import_fs_extra.default.readJSONSync(import_node_path.default.join(getControllerDir(), "io-package.json"));
  const newObj = {
    _id: `system.host.${hostname}`,
    type: "host",
    common: {
      name: hostname,
      title: oldObj?.common?.title || ioPackage.common.title,
      installedVersion: ioPackage.common.version,
      platform: ioPackage.common.platform,
      cmd: `${process.argv[0]} ${`${process.execArgv.join(" ")} `.replace(/--inspect-brk=\d+ /, "")}${process.argv.slice(1).join(" ")}`,
      hostname,
      address: findIPs(),
      type: ioPackage.common.name
    },
    native: {
      process: {
        title: process.title,
        versions: process.versions,
        env: process.env
      },
      os: {
        hostname,
        type: import_node_os.default.type(),
        platform: import_node_os.default.platform(),
        arch: import_node_os.default.arch(),
        release: import_node_os.default.release(),
        endianness: import_node_os.default.endianness(),
        tmpdir: import_node_os.default.tmpdir()
      },
      hardware: {
        cpus: import_node_os.default.cpus(),
        totalmem: import_node_os.default.totalmem(),
        networkInterfaces: {}
      }
    }
  };
  if (oldObj?.common?.icon) {
    newObj.common.icon = oldObj.common.icon;
  }
  if (oldObj?.common?.color) {
    newObj.common.color = oldObj.common.color;
  }
  if (newObj.native?.hardware?.cpus) {
    for (const cpu of newObj.native.hardware.cpus) {
      if (cpu.times) {
        delete cpu.times;
      }
    }
  }
  if (oldObj?.native.hardware?.networkInterfaces) {
    newObj.native.hardware.networkInterfaces = oldObj.native.hardware.networkInterfaces;
  }
  return newObj;
}
function getPidsFileName() {
  return import_node_path.default.join(getControllerDir(), "pids.txt");
}
async function getPids() {
  let pids = [];
  try {
    const pidsContent = await import_fs_extra.default.readFile(getPidsFileName(), { encoding: "utf-8" });
    pids = JSON.parse(pidsContent);
  } catch (e) {
    if (e.code !== "ENOENT") {
      throw e;
    }
  }
  return pids;
}
function isLogLevel(level) {
  return ["silly", "debug", "info", "warn", "error"].includes(level);
}
async function getControllerPid() {
  const pids = await getPids();
  return pids.pop();
}
// Annotate the CommonJS export names for ESM import in node:
0 && (module.exports = {
  ERRORS,
  FORBIDDEN_CHARS,
  MAX_CERT_VALIDITY,
  appName,
  appNameLowerCase,
  appendStackTrace,
  checkNonEditable,
  compressFileGZip,
  copyAttributes,
  createUuid,
  decrypt,
  decryptPhrase,
  detectPackageManagerWithFallback,
  encrypt,
  ensureDNSOrder,
  execAsync,
  findIPs,
  formatAliasValue,
  generateDefaultCertificates,
  getAdapterDir,
  getAllEnums,
  getAllInstances,
  getCertificateInfo,
  getConfigFileName,
  getControllerDir,
  getControllerPid,
  getDefaultDataDir,
  getDefaultNodeArgs,
  getDefaultRequireResolvePaths,
  getDiskInfo,
  getDockerInformation,
  getFile,
  getHostInfo,
  getHostName,
  getHostObject,
  getInstalledInfo,
  getInstanceIndicatorObjects,
  getInstances,
  getJson,
  getJsonAsync,
  getListenAllAddress,
  getLocalAddress,
  getLogger,
  getNewestDockerImageVersion,
  getPids,
  getPidsFileName,
  getRepositoryFile,
  getRepositoryFileAsync,
  getRootDir,
  installNodeModule,
  isAdapterEsmModule,
  isArray,
  isControllerUiUpgradeSupported,
  isDevInstallation,
  isDevServerInstallation,
  isDocker,
  isGithubPathname,
  isHostRunning,
  isIoBrokerInstalledAsSystemd,
  isListenAllAddress,
  isLocalAddress,
  isLogLevel,
  isObject,
  isShortGithubUrl,
  isSingleHost,
  isValidPattern,
  maybeArrayToString,
  measureEventLoopLag,
  parseDependencies,
  parseGithubPathname,
  parseShortGithubUrl,
  pattern2RegEx,
  pipeLinewise,
  promisify,
  promisifyNoError,
  rebuildNodeModules,
  removeIdFromAllEnums,
  removePreservedProperties,
  resolveAdapterMainFile,
  sendDiagInfo,
  setExecutableCapabilities,
  setQualityForInstance,
  uninstallNodeModule,
  upToDate,
  updateLicenses,
  validateDataDir,
  validateGeneralObjectProperties,
  ...require("../../lib/common/maybeCallback.js")
});
//# sourceMappingURL=tools.js.map
