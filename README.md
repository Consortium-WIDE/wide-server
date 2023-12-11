# WIDE Server
WIDE Server is responsible for the storage layer of WIDE. It assumes all data received and all the data it transmits is encrypted, with the exception of addresses and public keys, which are meant to be public anyway.

Any data transmitted on the server should be via HTTPS for an added layer of security.

## Redis Data Model

`user:{accountAddress}:publicKey` - return encryption public key for use eth address
`user:{accountAddress}:vc:{vcId}` - return vc by id for user
`user:{accountAddress}:vc:{vcId}:claim:{claimid}` - return claim for specific vc for user
`user:{accountAddress}:claim:{claimId}` - return claim for user
`user:{accountAddress}:secondaryAddresses` - return secondary addresses for a user account
`user:{secondaryAddress}:primaryAddress` - return primary address for a user account