
```
$ ./run-ldap-server.sh
+ docker run -p 636:636 -p 389:389 --name my-ldap-server --volume /Users/sjain68/ldap-demo/certs:/assets/slapd/certs --volume /Users/sjain68/ldap-demo/backup:/data/backup --volume /Users/sjain68/ldap-demo/data:/var/lib/openldap --volume /Users/sjain68/ldap-demo/config:/etc/openldap/slapd.d --env BACKEND=mdb --env ENABLE_TLS=true --env BASE_DN=dc=example,dc=com --env TLS_CRT_FILENAME=tls-server.pem --env TLS_KEY_FILENAME=tls-server.key --env TLS_CA_CRT_FILENAME=ca-chain.pem --env TLS_VERIFY_CLIENT=demand --env TLS_ENFORCE=true --env HOSTNAME=localhost --env DOMAIN=example.com --env ADMIN_PASS=superman --env CONFIG_PASS=spiderman --env 'ORGANIZATION=Uber Inc.' --env LOG_LEVEL=1 --log-opt max-file=3 --log-opt max-size=10m --detach tiredofit/openldap
e9aff6f10263f1b5ccce9677bfd640d9dc6e1357d8b6366f53a068368ac2e667
```

```
$ LDAP_ADMIN_PASSWORD=superman LDAP_TLS_CRT_FILENAME=tls-server.pem LDAP_TLS_KEY_FILENAME=tls-server.key LDAP_SUBJECT_ALT_NAME=example.com LDAP_TLS_CA_CRT_FILENAME=ca-chain.pem LDAP_BASE_DN=dc=example,dc=com node init.js
done
```