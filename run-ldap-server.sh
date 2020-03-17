#!/bin/bash
# - see all environment variables at https://github.com/tiredofit/docker-openldap/blob/master/Dockerfile
# - also see https://github.com/tiredofit/docker-openldap/blob/master/examples/docker-compose.yml for reference
set -e
IMAGE="siddjain/openldap"
NETWORK=${NETWORK:-bridge}
CONTAINER_NAME=${CONTAINER_NAME:-"my-ldap-server"}
LDAP_ORGANIZATION=${ORGANIZATION:-"Uber Inc."}
LDAP_ADMIN_PASSWORD=${LDAP_ADMIN_PASSWORD:-"superman"}
LDAP_CONFIG_PASSWORD=${LDAP_CONFIG_PASSWORD:-"spiderman"}
LDAP_DOMAIN=${LDAP_DOMAIN:-"example.com"}
LDAP_BASE_DN=${LDAP_BASE_DN:-"dc=example,dc=com"}
# see http://www.openldap.org/software//man.cgi?query=ldap.conf&sektion=5&apropos=0&manpath=OpenLDAP+2.4-Release for explanation of TLS options
# this will be the TLS cert that the openldap server will send to a client when TLS is enabled
LDAP_TLS_CRT_FILENAME=${LDAP_TLS_CRT_FILENAME:-"tls-server.pem"}
# this will be the private key corresponding to the public cert
LDAP_TLS_KEY_FILENAME=${LDAP_TLS_KEY_FILENAME:-"tls-server.key"}
# this file will have all the CA(s) recognized by the openldap server. To be used when client auth is enabled to verify client cert.
# The TLS_CACERT is always used before TLS_CACERTDIR. This value gets written to /etc/openldap/ldap.conf
# in https://github.com/tiredofit/docker-openldap/blob/master/install/etc/cont-init.d/10-openldap 
LDAP_TLS_CA_CRT_FILENAME=${LDAP_TLS_CA_CRT_FILENAME:-"ca-chain.pem"}
LDAP_PORT=${LDAP_PORT:-389}
LDAPS_PORT=${LDAPS_PORT:-636}
LDAP_ENABLE_TLS=${LDAP_ENABLE_TLS:-true}
LDAP_ENFORCE_TLS=${LDAP_ENFORCE_TLS:-true}
# enable client auth (aka mutual authentication)
LDAP_TLS_VERIFY_CLIENT=${LDAP_TLS_VERIFY_CLIENT:-demand}
LDAP_LOG_LEVEL=${LDAP_LOG_LEVEL:-1}
if [ ! -d certs ]; then
   mkdir certs
fi
if [ ! -d backup ]; then
   mkdir backup
fi
if [ ! -d data ]; then
   mkdir data
fi
if [ ! -d config ]; then
   mkdir config
fi
cp $LDAP_TLS_CRT_FILENAME certs/.
cp $LDAP_TLS_KEY_FILENAME certs/.
cp $LDAP_TLS_CA_CRT_FILENAME certs/.
set -x
# to see debug logs set --env DEBUG_MODE=TRUE
# HOSTNAME has to be localhost otherwise output will be stuck at
# Waiting for OpenLDAP to be ready. see https://github.com/tiredofit/docker-openldap/issues/4
docker run -p $LDAPS_PORT:636 -p $LDAP_PORT:389 \
--name $CONTAINER_NAME \
--network $NETWORK \
--volume ${PWD}/certs:/assets/slapd/certs \
--volume ${PWD}/backup:/data/backup \
--volume ${PWD}/data:/var/lib/openldap \
--volume ${PWD}/config:/etc/openldap/slapd.d \
--env BACKEND=mdb \
--env ENABLE_TLS=$LDAP_ENABLE_TLS \
--env BASE_DN=$LDAP_BASE_DN \
--env TLS_CRT_FILENAME=$LDAP_TLS_CRT_FILENAME \
--env TLS_KEY_FILENAME=$LDAP_TLS_KEY_FILENAME \
--env TLS_CA_CRT_FILENAME=$LDAP_TLS_CA_CRT_FILENAME \
--env TLS_VERIFY_CLIENT=$LDAP_TLS_VERIFY_CLIENT \
--env TLS_ENFORCE=$LDAP_ENFORCE_TLS \
--env HOSTNAME=localhost \
--env DOMAIN=$LDAP_DOMAIN \
--env ADMIN_PASS=$LDAP_ADMIN_PASSWORD \
--env CONFIG_PASS=$LDAP_CONFIG_PASSWORD \
--env ORGANIZATION="$LDAP_ORGANIZATION" \
--env LOG_LEVEL=$LDAP_LOG_LEVEL \
--log-opt max-file=3 \
--log-opt max-size=10m \
--detach $IMAGE
