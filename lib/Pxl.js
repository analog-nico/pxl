'use strict'

let isFunction = require('lodash/isFunction')
let isObject = require('lodash/isObject')
let isString = require('lodash/isString')
let TwoBucketsMemcache = require('two-buckets-memcache')

let errors = require('./errors.js')
let keygen = require('./keygen.js')
let PersistenceLayerBase = require('./PersistenceLayerBase.js')


class Pxl {

    constructor({ persistenceLayer, queryParam = 'pxl', logPxlFailed = function () {} } = {}) {

        if (persistenceLayer instanceof PersistenceLayerBase === false || persistenceLayer.constructor === PersistenceLayerBase) {
            throw new TypeError('options.persistenceLayer must extend Pxl.PersistenceLayerBase')
        }

        if (!isString(queryParam) || queryParam.length === 0) {
            throw new TypeError('options.queryParam must be non-empty string')
        }

        if (!isFunction(logPxlFailed)) {
            throw new TypeError('options.logPxlFailed must be a function')
        }

        this.logPxlFailed = logPxlFailed
        this.persistenceLayer = persistenceLayer
        this.queryParam = queryParam

        this.trackPxl = this.trackPxl.bind(this)
        this.redirect = this.redirect.bind(this)

        this.logPxlCache = new TwoBucketsMemcache(2000)

    }

    createPxl(metadata) {

        return this.persistenceLayer.checkAndAddPxl(keygen(), metadata)
            .catch((err) => {

                if (err.constructor === errors.KeyCollisionError) {
                    return this.createPxl(metadata)
                }

                throw err

            })

    }

    logPxl(pxl) {

        // The cache is used to debounce double clicks by the user

        if (this.logPxlCache.has(pxl)) {
            return new Promise((resolve, reject) => {
                resolve()
            })
        }

        this.logPxlCache.set(pxl, true)

        return this.persistenceLayer.logPxl(pxl)
            .then((updatedPxl) => {

                if (isObject(updatedPxl) && isString(updatedPxl.ref)) {

                    return this.persistenceLayer.logPxl(updatedPxl.ref) // Calling this.logPxl(pxl) recursively would be too complex because chained refs may contain circles
                        .then(() => {
                            return updatedPxl
                        })

                }

                return updatedPxl

            })

    }

    trackPxl(req, res, next) {

        if (req.query && isString(req.query[this.queryParam]) && req.query[this.queryParam].length > 0) {

            this.logPxl(req.query[this.queryParam])
                .catch((err) => {
                    this.logPxlFailed(err, req.query[this.queryParam], req.url)
                })

        }

        return next()

    }

    shorten(link) {

        return this.persistenceLayer.checkAndAddLink(keygen(), link)
            .catch((err) => {

                if (err.constructor === errors.KeyCollisionError) {
                    return this.shorten(link)
                }

                throw err

            })

    }

    unshorten(linkId) {

        return this.persistenceLayer.lookupLink(linkId)

    }

    redirect(req, res, next) {

        this.unshorten(req.params.linkId)
            .then((link) => {

                res.set({
                    'Surrogate-Control': 'no-store',
                    'Cache-Control': 'no-cache, no-store, must-revalidate',
                    'Pragma': 'no-cache',
                    'Expires': '0'
                })

                res.redirect(link) // Implicit binding to res must remain intact! In case you think about using .then(res.redirect)

            })
            .catch(next)

    }

}

Pxl.errors = errors
Pxl.PersistenceLayerBase = PersistenceLayerBase

module.exports = Pxl
