var fs = require("fs");
var Client = require("./client.js");

function getEnv(name) {
    var v = tryGetEnv(name);
    if (!v) {
        console.error(name + " is not defined");
        process.exit(1);
    }
    return v;
}

function tryGetEnv(name, defaultValue) {
    var x = process.env[name];
    if (!x) {
        x = defaultValue;
    }
    return x;
}

function loadConfig() {
    var baseDN = tryGetEnv("LDAP_BASE_DN", "");
    var host = tryGetEnv("LDAP_HOST", "localhost");
    var port = tryGetEnv("LDAP_PORT", "389");
    var caCertFile = tryGetEnv("LDAP_TLS_CA_CRT_FILENAME");
    var clientCertFile = tryGetEnv("LDAP_TLS_CRT_FILENAME");
    var clientKeyFile = tryGetEnv("LDAP_TLS_KEY_FILENAME");
    var subjectAltName = tryGetEnv("LDAP_SUBJECT_ALT_NAME");
    var baseUrl = "ldap://" + host + ":" + port + "/";
    var url = baseUrl + baseDN;
    var configUrl = baseUrl + "cn=config";
    var adminDN = "cn=admin," + baseDN;
    var configDN = "cn=admin,cn=config";
    var adminPassword = tryGetEnv("LDAP_ADMIN_PASSWORD", "");
    var configPassword = tryGetEnv("LDAP_CONFIG_PASSWORD", "");
    if (caCertFile) {        
        var tlsOpts = {
            ca: [fs.readFileSync(caCertFile)],
            // Necessary only if the server requires client certificate authentication.
            key: clientKeyFile && fs.readFileSync(clientKeyFile),
            cert: clientCertFile && fs.readFileSync(clientCertFile),  
            host: host,
            servername: subjectAltName, // the subjectAltName in cert returned by server must match this string
            ecdhCurve: 'auto', // see https://github.com/nodejs/node/issues/16196 and https://github.com/joyent/node-ldapjs/issues/464
        };
    }
    return {
        url: url,
        tlsOptions: tlsOpts,
        baseDN: baseDN,
        adminDN: adminDN,
        adminPassword: adminPassword,
        configUrl: configUrl,
        configDN: configDN,
        configPassword: configPassword,
        tlsOptions: tlsOpts
    }
}

async function createClient(config, isConfig) {
    if (isConfig) {
        var url = config.configUrl;
    } else {
        url = config.url;
    }
    var client = new Client({url: url});
    if (config.tlsOptions) {
        await client.starttls(config.tlsOptions, client.controls);
    }
    return client;
}

module.exports = {
    loadConfig: loadConfig,
    createClient: createClient
}