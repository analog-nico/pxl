'use strict'

class PersistenceLayerBase {

    checkAndAddPxl(pxl, metadata) {
        return new Promise((resolve, reject) => {
            throw new Error('Mising implementation for PersistenceLayerBase.checkAndAddPxl(pxl, metadata)')
        })
    }

    logPxl(pxl) {
        return new Promise((resolve, reject) => {
            throw new Error('Mising implementation for PersistenceLayerBase.logPxl(pxl)')
        })
    }

    checkAndAddLink(linkId, link) {
        return new Promise((resolve, reject) => {
            throw new Error('Mising implementation for PersistenceLayerBase.checkAndAddLink(linkId, link)')
        })
    }

    lookupLink(linkId) {
        return new Promise((resolve, reject) => {
            throw new Error('Mising implementation for PersistenceLayerBase.lookupLink(linkId)')
        })
    }

}

module.exports = PersistenceLayerBase
