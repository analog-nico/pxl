'use strict'

let errors = require('../../lib/errors.js')
let PersistenceLayerBase = require('../../lib/PersistenceLayerBase.js')


class MemoryPersistenceLayer extends PersistenceLayerBase {

    constructor() {

        super()

        this.nextResponse = undefined
        this.pxls = {}
        this.links = {}

    }

    respond() {

        let response = this.nextResponse
        this.nextResponse = undefined

        switch (response) {
            case 'Error': throw new Error()
            case 'KeyCollisionError': throw new errors.KeyCollisionError()
        }

        return response

    }

    checkAndAddPxl(pxl, metadata) {

        return new Promise((resolve, reject) => {

            let reponse = this.respond()

            if (this.pxls[pxl]) {
                throw new errors.KeyCollisionError()
            }

            this.pxls[pxl] = {
                pxl,
                metadata,
                count: 0
            }

            if (metadata && metadata.ref) {
                this.pxls[pxl].ref = metadata.ref
                delete metadata.ref
            }

            resolve(this.pxls[pxl])

        })

    }

    logPxl(pxl) {

        return new Promise((resolve, reject) => {

            let response = this.respond()

            if (!this.pxls[pxl]) {
                throw new Error('Pxl unknown')
            }

            this.pxls[pxl].count += 1

            resolve(this.pxls[pxl])

        })

    }

    checkAndAddLink(linkId, link) {

        return new Promise((resolve, reject) => {

            let reponse = this.respond()

            if (this.links[linkId]) {
                throw new errors.KeyCollisionError()
            }

            this.links[linkId] = {
                linkId,
                link
            }

            resolve(this.links[linkId])

        })

    }

    lookupLink(linkId) {

        return new Promise((resolve, reject) => {

            let response = this.respond()

            if (!this.links[linkId]) {
                throw new Error('Link unknown')
            }

            resolve(this.links[linkId].link)

        })

    }

}

module.exports = MemoryPersistenceLayer
