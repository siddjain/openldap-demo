/*
 * This code sample will demonstrate various LdapJS APIs:
 * - Bind
 * - Search
 * - Add
 * - Delete
 * - Unbind 
 */

const utils = require("./ldapjs-client").utils;
const assert = require("assert");
const fs = require("fs");
var config = utils.loadConfig();
var bobsDN = "uid=bob,ou=users," + config.baseDN;
var bobsPassword = "bob's cat";
var adminDN = config.adminDN;
var adminPassword = config.adminPassword;

main(bobsDN, bobsPassword).then(()=> console.log("done"));

async function main(user, passwd) {
  try
  {
     var client = await utils.createClient(config);
     await client.bind(adminDN, adminPassword);
     console.log("logged in as admin");
     var exists = await client.exists(user);
     if (exists) {
       console.log(user + " already exists");
       console.log("deleting " + user);
       await client.del(user);
     }

    await addUser(client, user, passwd);
    console.log("added " + user);
    await client.unbind();
    // Note that you have to create a new client. Trying to reuse the existing client will abruptly exit without any warning or message.
    client = await utils.createClient(config);       
    await client.bind(user, passwd);
    console.log("tested logging with " + user + " credentials");
  } catch (e) {
      console.error(e);
  }
}

async function addUser(client, user, passwd) {
  var newUser = {
    cn: 'bob',
    sn: 'Robert',
    uid: 'bob',
    mail: 'bob@example.org',
    objectClass: 'inetOrgPerson',
    userPassword: passwd
  };
  // the await below is necessary. try removing it and see what happens.
	await client.add(user, newUser);
}
