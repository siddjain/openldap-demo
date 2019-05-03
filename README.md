# Learning LDAP

This document describes:  
- How to run an instance of OpenLDAP in a docker container  
- How to interact with it using NodeJS  

LDAP stands for Lightweight Directory Access Protocol. It is a spec and OpenLDAP is one implementation of LDAP and uses Memory Mapped DB (or MDB in short) database as the backing datastore by default [[1](http://www.openldap.org/pub/hyc/mdb-paper.pdf)]. The database organizes entries in a tree data structure. Because of this, reads are very fast.

## Create TLS certificates for client and server
Left as exercise for the reader. See [[2](https://sourcecode.jnj.com/users/sjain68/repos/openssl_demo/browse)] for help. Ignore this step if you do not want to enable TLS. Sample certificates are included in the repo.

## Build docker image
we use a fork of the image provided by [tiredofit](https://github.com/tiredofit/docker-openldap) to which we have made some bug fixes. Clone the [fork](https://sourcecode.jnj.com/users/sjain68/repos/docker_openldap/browse) and build it as follows:
```
$ git clone https://github.com/siddjain/docker-openldap.git
$ docker image build -t siddjain/openldap .
```
Complete successful build [log](https://gist.github.com/siddjain/0f8cc8629a3ac9063921c43179915e21) for reference

## Create the LDAP server
Run:
```
$ ./run-ldap-server.sh
```
It should output something like:
```
+ docker run -p 636:636 -p 389:389 --name my-ldap-server --volume /Users/sjain68/openldap-demo/certs:/assets/slapd/certs --volume /Users/sjain68/openldap-demo/backup:/data/backup --volume /Users/sjain68/openldap-demo/data:/var/lib/openldap --volume /Users/sjain68/openldap-demo/config:/etc/openldap/slapd.d --env BACKEND=mdb --env ENABLE_TLS=true --env BASE_DN=dc=example,dc=com --env TLS_CRT_FILENAME=tls-server.pem --env TLS_KEY_FILENAME=tls-server.key --env TLS_CA_CRT_FILENAME=ca-chain.pem --env TLS_VERIFY_CLIENT=demand --env TLS_ENFORCE=true --env HOSTNAME=localhost --env DOMAIN=example.com --env ADMIN_PASS=superman --env CONFIG_PASS=spiderman --env 'ORGANIZATION=Uber Inc.' --env LOG_LEVEL=1 --log-opt max-file=3 --log-opt max-size=10m --detach siddjain/openldap
0d785cab3447ebeef4c81db52496223c1927f8ae63bec9319bcfbfd0d2e60e3f
```

## Populate database with base entry and users group
At this point the database is empty and the LDAP tree needs to be initialized with a root node [[3](https://github.com/tiredofit/docker-openldap/issues/5)]. Do this by running:
```
$ LDAP_CONFIG_PASSWORD=spiderman LDAP_ADMIN_PASSWORD=superman LDAP_TLS_CRT_FILENAME=tls-server.pem LDAP_TLS_KEY_FILENAME=tls-server.key LDAP_SUBJECT_ALT_NAME=localhost LDAP_TLS_CA_CRT_FILENAME=ca-chain.pem LDAP_BASE_DN=dc=example,dc=com node init.js
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
$ LDAP_ADMIN_PASSWORD=superman LDAP_TLS_CRT_FILENAME=tls-server.pem LDAP_TLS_KEY_FILENAME=tls-server.key LDAP_SUBJECT_ALT_NAME=localhost LDAP_TLS_CA_CRT_FILENAME=ca-chain.pem LDAP_BASE_DN=dc=example,dc=com node add-user.js bob "bob's cat" "Robert Wilson"
logged in as admin
uid=bob,ou=users,dc=example,dc=com already exists
deleting uid=bob,ou=users,dc=example,dc=com
added uid=bob,ou=users,dc=example,dc=com
tested logging with uid=bob,ou=users,dc=example,dc=com credentials
done
```

## Verify
Log in to the container
```
$ docker exec -it my-ldap-server /bin/bash
```

Run [slapcat](https://linux.die.net/man/8/slapcat):
```
bash-4.4# slapcat
dn: dc=example,dc=com
o: ABC Inc.
objectClass: organization
objectClass: dcObject
structuralObjectClass: organization
dc: example
entryUUID: 7fab57d8-3bc5-4fc8-a67e-3ad7941bab33
creatorsName: cn=admin,dc=example,dc=com
createTimestamp: 20190501211554Z
entryCSN: 20190501211554.790901Z#000000#000#000000
modifiersName: cn=admin,dc=example,dc=com
modifyTimestamp: 20190501211554Z

dn: ou=users,dc=example,dc=com
objectClass: top
objectClass: organizationalUnit
structuralObjectClass: organizationalUnit
ou: users
entryUUID: 50fa66ff-cd60-4b94-9c3c-8aa4c061a9ed
creatorsName: cn=admin,dc=example,dc=com
createTimestamp: 20190501211554Z
entryCSN: 20190501211554.795418Z#000000#000#000000
modifiersName: cn=admin,dc=example,dc=com
modifyTimestamp: 20190501211554Z

dn: uid=bob,ou=users,dc=example,dc=com
cn: Robert Wilson
sn: Wilson
uid: bob
objectClass: inetOrgPerson
userPassword:: e1NTSEF9UnhkMXFLcitMUVE0UFdzK3FXZHNnN0JIQzljNmtFVFc=
structuralObjectClass: inetOrgPerson
entryUUID: 06aae4a8-5c5b-4cae-b00d-d0b1ab875c08
creatorsName: cn=admin,dc=example,dc=com
createTimestamp: 20190501211630Z
entryCSN: 20190501211630.009352Z#000000#000#000000
modifiersName: cn=admin,dc=example,dc=com
modifyTimestamp: 20190501211630Z
```

The `::` against `userPassword` means the value is base64 encoded. Decode Bob's password:
```
bash-4.4# base64 -d <<< e1NTSEF9UnhkMXFLcitMUVE0UFdzK3FXZHNnN0JIQzljNmtFVFc=
{SSHA}Rxd1qKr+LQQ4PWs+qWdsg7BHC9c6kETW
```

## Finally

Remember to `rm -r` the `data`, `backup`, and `config` folders to do a clean re-start. If these folders are not deleted, then the [initialization](https://github.com/siddjain/docker-openldap/blob/master/install/etc/cont-init.d/10-openldap) script will not run. The server will be re-started using the settings of previous run.

## Troubleshooting

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
If that passes, debug the issue using
```
$ openssl s_client -connect localhost:636 -state -nbio -CAfile my-ca-chain.pem -showcerts
```
as described e.g., in [[5](https://github.com/siddjain/openldap-bug)]. The `slapd` that comes with debian seems to have a bug because of which above can happen even when a genuine certificate is being used [[6](https://www.openldap.org/its/index.cgi/Incoming?id=9014)]. "If you generated them using OpenSSL, you're going to run into problems. Debian switched over to using gnutls a while ago, and it doesn't play nice with OpenSSL certificates" [[7](https://wiki.debian.org/LDAP/OpenLDAPSetup)]. The docker image used here is based on alpine and did not have this bug in our test.

LDAP documentation is clear as mud and you will find conflicting answers to same question. Here are some resources [[8](http://www.openldap.org/doc/admin24/),[9](http://www.zytrax.com/books/ldap/)] but by no means the best.

## Miscellaneous

In the docker container, you will see following:

```
bash-4.4# ls etc/openldap/schema
collective.schema  duaconf.schema	 misc.schema	  ppolicy.schema
corba.schema	   dyngroup.schema	 nis.schema
core.schema	   inetorgperson.schema  openldap.schema
cosine.schema	   java.schema		 pmi.schema
```

the rootPW (base64 encoded) can be seen in `/etc/openldap/slapd.d/'cn=config'/'olcDatabase={1}mdb.ldif'` and also `/assets/slapd/config/bootstrap/ldif/01-config-password.ldif`

Indexes can be seen in `/assets/slapd/config/bootstrap/ldif/05-index.ldif`

Security Policies can be seen in `/assets/slapd/config/bootstrap/ldif/02-security.ldif`

`ldap.conf` file can be found in `/etc/openldap/ldap.conf`

this is the command that starts the server:

```
bash-4.4# cat /run/openldap/slapd.args
/usr/sbin/slapd -h ldap://localhost ldaps://localhost ldapi:/// -u ldap -g ldap -d 1  ##### this is how openldap is started.
```


From [[10](https://www.openldap.org/doc/admin24/security.html#SSHA%20password%20storage%20scheme)], "The storage scheme is stored as a prefix on the value, so a hashed password using the Salted SHA1 (SSHA) scheme looks like:
 userPassword: {SSHA}DkMTwBl+a/3DQTxCYEApdUtNXGgdUac3 "
The last four bytes are supposed to contain the salt [[11](https://serverfault.com/a/675846/77118)] 
 
```
$ docker image inspect siddjain/openldap 
```
will show useful information

[slappasswd](https://linux.die.net/man/8/slappasswd) is a utility that can be used to hash passwords:
```
bash-4.4# slappasswd -s "bob's cat"
{SSHA}n724/QibgNQubG39r1Gu2fqH9l1SA6GB
```
