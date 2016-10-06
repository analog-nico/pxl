'use strict'

class KeyCollisionError extends Error {

    constructor() {

        super()

        this.name = 'KeyCollisionError'

    }

}

module.exports.KeyCollisionError = KeyCollisionError // Using this notation in case a circular dependency arises
