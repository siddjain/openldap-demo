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
const readline = require("readline");
var config = utils.loadConfig();
var argv = process.argv.slice(2);
var ok = false;
if (argv.length === 3) {
  var username = argv[0];
  var password = argv[1];
  var fullName = argv[2];
  if (username && password && fullName) {
    ok = true;
    console.log(config);
    const rl = readline.createInterface({
        input: process.stdin,
        output: process.stdout
      });      
    rl.question('Continue? (y/n) ', (answer) => {
        if (answer === "y") {
          main(username, password, fullName).then(()=> console.log("done"));                      
        }
        rl.close();        
    });
  }  
}

if (!ok) {
  console.log("Usage: node add-user.js <username> <password> <full name>");
  Console.log('E.g.,: node add-user.js siddjain superman "Siddharth Jain"');
}

async function main(username, passwd, fullName) {
  try
  {
     var user = getDN(username);
     var adminDN = config.adminDN;
     var adminPassword = config.adminPassword;
     var client = await utils.createClient(config);     
     await client.bind(adminDN, adminPassword);
     console.log("logged in as admin");
     var exists = await client.exists(user);
     if (exists) {
       console.log(user + " already exists");
       console.log("deleting " + user);
       await client.del(user);
     }

    await addUser(client, username, passwd, fullName);
    console.log("added " + username);
    await client.unbind();
    // Note that you have to create a new client. Trying to reuse the existing client will abruptly exit without any warning or message.
    client = await utils.createClient(config);       
    await client.bind(user, passwd);
    console.log("tested logging with " + username + " credentials");
  } catch (e) {
      console.error(e);
  }
}

async function addUser(client, username, passwd, fullName) {
  // cn and sn fields are required for inetorgperson
  var newUser = {
    cn: fullName,
    sn: getSurname(fullName),
    uid: username,
    objectClass: 'inetOrgPerson',
    userPassword: passwd
  };
  // the await below is necessary. try removing it and see what happens.
	await client.add(getDN(username), newUser);
}

function getDN(username) {
  return "uid=" + username + ",ou=users," + config.baseDN;
}

function getSurname(fullName) {
  var words = fullName.split(" ");
  return words[words.length - 1];
}