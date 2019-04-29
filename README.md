# Learning LDAP

## Create TLS certificates for client and server
Left as exercise for the reader. See [1](https://github.com/siddjain/openssl-demo) for help. Ignore this step if you do not want to enable TLS.

## Create the LDAP server
we use the docker image provided by [tiredofit](https://github.com/tiredofit/docker-openldap). Run:
```
$ ./run-ldap-server.sh
+ docker run -p 636:636 -p 389:389 --name my-ldap-server --volume /Users/sjain68/ldap-demo/certs:/assets/slapd/certs --volume /Users/sjain68/ldap-demo/backup:/data/backup --volume /Users/sjain68/ldap-demo/data:/var/lib/openldap --volume /Users/sjain68/ldap-demo/config:/etc/openldap/slapd.d --env BACKEND=mdb --env ENABLE_TLS=true --env BASE_DN=dc=example,dc=com --env TLS_CRT_FILENAME=tls-server.pem --env TLS_KEY_FILENAME=tls-server.key --env TLS_CA_CRT_FILENAME=ca-chain.pem --env TLS_VERIFY_CLIENT=demand --env TLS_ENFORCE=true --env HOSTNAME=localhost --env DOMAIN=example.com --env ADMIN_PASS=superman --env CONFIG_PASS=spiderman --env 'ORGANIZATION=Uber Inc.' --env LOG_LEVEL=1 --log-opt max-file=3 --log-opt max-size=10m --detach tiredofit/openldap
e9aff6f10263f1b5ccce9677bfd640d9dc6e1357d8b6366f53a068368ac2e667
```

## Populate database with base entry and users group
At this point the database is empty and it needs to be initialized with a root node in the LDAP tree [1](https://github.com/tiredofit/docker-openldap/issues/5). Do this by running:
```
$ LDAP_ADMIN_PASSWORD=superman LDAP_TLS_CRT_FILENAME=tls-server.pem LDAP_TLS_KEY_FILENAME=tls-server.key LDAP_SUBJECT_ALT_NAME=example.com LDAP_TLS_CA_CRT_FILENAME=ca-chain.pem LDAP_BASE_DN=dc=example,dc=com node init.js
done
```
The equiavlent commands to do this using the OpenLDAP CLI are as follows:
```
ldapadd -x -h jnj-ldap-server -p 389 -D "cn=admin,dc=example,dc=com" -w $LDAP_ADMIN_PASSWORD -f basedn.ldif 
ldapadd -x -h jnj-ldap-server -p 389 -D "cn=admin,dc=example,dc=com" -w $LDAP_ADMIN_PASSWORD -f users.ldif 
```
Above assumes no TLS. If you want to use TLS, add the `-Z` option at the end. Also you will need to define following environment variables: `LDAPTLS_CERT, LDAPTLS_KEY, LDAPTLS_CACERTDIR` [2](https://access.redhat.com/documentation/en-us/red_hat_directory_server/9.0/html/administration_guide/ldap-tools-examples#tab.ldap-tool-envvar). I still had some problems with it and hence had to resort to doing it with nodejs.

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
2. Try pinning the docker image to [this](https://github.com/tiredofit/docker-openldap/commit/87528f18a4487b621043fd706e901ef825e131a6) commit

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

LDAP documentation is clear as mud. [This](http://www.openldap.org/doc/admin24/) seems to be best resource.

## Miscellaneous

In the docker container, you will see following:

```
bash-4.4# ls etc/openldap/schema
collective.schema  duaconf.schema	 misc.schema	  ppolicy.schema
corba.schema	   dyngroup.schema	 nis.schema
core.schema	   inetorgperson.schema  openldap.schema
cosine.schema	   java.schema		 pmi.schema
```

the rootPW (hashed) can be seen in `/etc/openldap/slapd.d/'cn=config'/'olcDatabase={1}mdb.ldif'`

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
