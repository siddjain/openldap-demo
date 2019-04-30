# Learning LDAP

This document describes:  
- How to run an instance of OpenLDAP in a docker container  
- How to interact with it using NodeJS  

LDAP stands for Lightweight Directory Access Protocol. It is a spec and implementation can be anything. OpenLDAP is one implementation of LDAP and uses Memory Mapped DB (or MDB in short) database as the backing datastore by default [[1](http://www.openldap.org/pub/hyc/mdb-paper.pdf)]. The database organizes entries in a tree data structure. Because of this, reads are very fast.

## Create TLS certificates for client and server
Left as exercise for the reader. See [[2](https://github.com/siddjain/openssl-demo)] for help. Ignore this step if you do not want to enable TLS.

## Create the LDAP server
we use the docker image provided by [tiredofit](https://github.com/tiredofit/docker-openldap). Run:
```
$ ./run-ldap-server.sh
+ docker run -p 636:636 -p 389:389 --name my-ldap-server --volume /Users/sjain68/ldap-demo/certs:/assets/slapd/certs --volume /Users/sjain68/ldap-demo/backup:/data/backup --volume /Users/sjain68/ldap-demo/data:/var/lib/openldap --volume /Users/sjain68/ldap-demo/config:/etc/openldap/slapd.d --env BACKEND=mdb --env ENABLE_TLS=true --env BASE_DN=dc=example,dc=com --env TLS_CRT_FILENAME=tls-server.pem --env TLS_KEY_FILENAME=tls-server.key --env TLS_CA_CRT_FILENAME=ca-chain.pem --env TLS_VERIFY_CLIENT=demand --env TLS_ENFORCE=true --env HOSTNAME=localhost --env DOMAIN=example.com --env ADMIN_PASS=superman --env CONFIG_PASS=spiderman --env 'ORGANIZATION=Uber Inc.' --env LOG_LEVEL=1 --log-opt max-file=3 --log-opt max-size=10m --detach tiredofit/openldap
e9aff6f10263f1b5ccce9677bfd640d9dc6e1357d8b6366f53a068368ac2e667
```

## Populate database with base entry and users group
At this point the database is empty and the LDAP tree needs to be initialized with a root node [[3](https://github.com/tiredofit/docker-openldap/issues/5)]. Do this by running:
```
$ LDAP_CONFIG_PASSWORD=spiderman LDAP_ADMIN_PASSWORD=superman LDAP_TLS_CRT_FILENAME=tls-server.pem LDAP_TLS_KEY_FILENAME=tls-server.key LDAP_SUBJECT_ALT_NAME=example.com LDAP_TLS_CA_CRT_FILENAME=ca-chain.pem LDAP_BASE_DN=dc=example,dc=com node init.js
```
It should output:
```
logging in as admin...
adding base entry...
adding users group...
logging out as admin...
creating new client...
logging in as cn=admin,cn=config...
setting password policy...
done
```
The equivalent commands to do this using the OpenLDAP CLI are as follows:
```
ldapadd -x -h my-ldap-server -p 389 -D "cn=admin,dc=example,dc=com" -w $LDAP_ADMIN_PASSWORD -f basedn.ldif 
ldapadd -x -h my-ldap-server -p 389 -D "cn=admin,dc=example,dc=com" -w $LDAP_ADMIN_PASSWORD -f users.ldif 
```
Above assumes no TLS. If you want to use TLS, add the `-Z` option at the end. Also you will need to define following environment variables: `LDAPTLS_CERT, LDAPTLS_KEY, LDAPTLS_CACERTDIR` [[4](http://www.openldap.org/doc/admin24/tls.html#Client%20Configuration)]. I still had some problems with it and hence had to resort to doing it with nodejs.

## Add a user to the database
```
$ LDAP_ADMIN_PASSWORD=superman LDAP_TLS_CRT_FILENAME=tls-server.pem LDAP_TLS_KEY_FILENAME=tls-server.key LDAP_SUBJECT_ALT_NAME=example.com LDAP_TLS_CA_CRT_FILENAME=ca-chain.pem LDAP_BASE_DN=dc=example,dc=com node add-user.js
logged in as admin
uid=bob,ou=users,dc=example,dc=com already exists
deleting uid=bob,ou=users,dc=example,dc=com
added uid=bob,ou=users,dc=example,dc=com
tested logging with uid=bob,ou=users,dc=example,dc=com credentials
done
```

## Troubleshooting

#### ldap server won't start  

1. First make sure you have set environment variables to correct values etc.
2. Try pinning the docker image to [this](https://github.com/tiredofit/docker-openldap/commit/87528f18a4487b621043fd706e901ef825e131a6) commit if all else fails. This is the commit used in the demo.

#### Invalid credentials  

Did you change admin password and are re-starting the server? Remember to `rm -r` the `data`, `backup`, and `config` folders if you want a clean re-start.

#### ldap_modify: Other (e.g., implementation specific) error (80) modifying entry "cn=config"  

One thing to check is ensure that the TLS cert says its version 3. Data: Version: should be 3. Below is example of problematic cert:  
```
$ openssl x509 -in abcl.pem -text -noout
Certificate:
    Data:
        Version: 1 (0x0)
        Serial Number: 14676524023181422786 (0xcbad7cd6eb3730c2)
```

#### Error: certificate signature failure

Verify your certificate is valid by running
```
$ openssl verify -CAfile <ca-cert> <server-tls-cert>
```
If verification passes, debug the issue using
```
$ openssl s_client -connect localhost:636 -state -nbio -CAfile my-ca-chain.pem -showcerts
```
as described e.g., in [[5](https://github.com/siddjain/openldap-bug)]. The `slapd` that comes with debian seems to have a bug because of which above can happen even when a genuine certificate is being used [[6](https://www.openldap.org/its/index.cgi/Incoming?id=9014)]. "If you generated them using OpenSSL, you're going to run into problems. Debian switched over to using gnutls a while ago, and it doesn't play nice with OpenSSL certificates" [7](https://wiki.debian.org/LDAP/OpenLDAPSetup). The docker image used here is based on alpine and did not have this bug in our test.

LDAP documentation is clear as mud. Here are some resources [[8](http://www.openldap.org/doc/admin24/),[9](http://www.zytrax.com/books/ldap/)].

## Miscellaneous

In the docker container, you will see following:

```
bash-4.4# ls etc/openldap/schema
collective.schema  duaconf.schema	 misc.schema	  ppolicy.schema
corba.schema	   dyngroup.schema	 nis.schema
core.schema	   inetorgperson.schema  openldap.schema
cosine.schema	   java.schema		 pmi.schema
```

the rootPW (hashed) can be seen in `/etc/openldap/slapd.d/'cn=config'/'olcDatabase={1}mdb.ldif'` and also `/assets/slapd/config/bootstrap/ldif/01-config-password.ldif`

Indexes can be seen in `/assets/slapd/config/bootstrap/ldif/05-index.ldif`

Security Policies can be seen in `/assets/slapd/config/bootstrap/ldif/02-security.ldif`

`ldap.conf` file can be found in `/etc/openldap/ldap.conf`

this is the startup script:
https://github.com/tiredofit/docker-openldap/blob/master/install/etc/s6/services/10-openldap/run
```
bash-4.4# cat /run/openldap/slapd.args
/usr/sbin/slapd -h ldap://localhost ldaps://localhost ldapi:/// -u ldap -g ldap -d 1  ##### this is how openldap is started.
```

https://www.openldap.org/doc/admin24/security.html#SSHA%20password%20storage%20scheme
The storage scheme is stored as a prefix on the value, so a hashed password using the Salted SHA1 (SSHA) scheme looks like:
 userPassword: {SSHA}DkMTwBl+a/3DQTxCYEApdUtNXGgdUac3 
 
 
```
$ docker image inspect tiredofit/openldap 
```
will show useful information

There is a very useful utility called [slapcat](https://linux.die.net/man/8/slapcat) which can be used to view the OpenLDAP mdb database as plain-text. Here is an example:

```
bash-4.4# slapcat
dn: dc=example,dc=com
o: ABC Inc.
objectClass: organization
objectClass: dcObject
structuralObjectClass: organization
dc: example
entryUUID: 48571d94-b774-499c-a17f-9eb9f10678f9
creatorsName: cn=admin,dc=example,dc=com
createTimestamp: 20190429222207Z
entryCSN: 20190429222207.755664Z#000000#000#000000
modifiersName: cn=admin,dc=example,dc=com
modifyTimestamp: 20190429222207Z
...
```

Another useful utility is [slappasswd](https://linux.die.net/man/8/slappasswd) which can be used to hash passwords:
```
bash-4.4# slappasswd -s "bob's cat"
{SSHA}n724/QibgNQubG39r1Gu2fqH9l1SA6GB
```
The last four bytes are supposed to contain the salt [[10](https://serverfault.com/a/675846/77118)]