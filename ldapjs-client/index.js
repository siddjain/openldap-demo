var client = require("./client");
var utils = require("./utils");
var ldapjs = require("ldapjs");

module.exports = {
    Client: client,
    utils: utils,
    Change: ldapjs.Change
}