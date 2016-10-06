'use strict'

let random = require('lodash/random')

const alphabet = '0123456789abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ-_' // chars that can be safely used in urls
const keylen = 8


module.exports = function () {
    let key = ''
    for ( let i = 0; i < keylen; i+=1 ) {
        key += alphabet[random(0, alphabet.length-1)]
    }
    return key
}
