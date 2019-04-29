const ldapjs = require("./ldapjs-client");
const fs = require("fs");
const utils = ldapjs.utils;
const config = utils.loadConfig();

async function main() {
    try {
        var client = await utils.createClient(config);        
        await client.bind(config.adminDN, config.adminPassword);
        await addBaseEntry(client);
        await addUsersGroup(client);
    } catch (e) {
        console.error(e);
    }
}

async function addBaseEntry(client) {
	var entry = {
        o: "ABC Inc.",
        objectClass: ['organization', "dcObject"],        
      };
    // the await below is necessary. try removing it and see what happens.
    await client.add(config.baseDN, entry);
}

async function addUsersGroup(client) {
    var entry = {
        objectClass: ["top", "organizationalUnit"]
    }
    await client.add("ou=users," + config.baseDN, entry);
}

main().then(() => console.log("done") );