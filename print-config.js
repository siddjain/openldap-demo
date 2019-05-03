const ldapjs = require("./ldapjs-client");
const fs = require("fs");
const utils = ldapjs.utils;
const config = utils.loadConfig();
console.log(config);
