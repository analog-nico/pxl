'use strict'

let _ = require('lodash')
let express = require('express')
let MemoryPersistenceLayer = require('../fixtures/MemoryPersistenceLayer.js')
let Pxl = require('../../')
let request = require('request-promise-native')
let sinon = require('sinon')
let TwoBucketsMemcache = require('two-buckets-memcache')


describe('Pxl', () => {

    function initPxl(options) {

        return new Pxl(_.assign({
            persistenceLayer: new MemoryPersistenceLayer()
        }, options))

    }

    describe('should validate during init', () => {

        it('the persistenceLayer', () => {

            expect(() => {
                initPxl({ persistenceLayer: null })
            }).to.throw()

            class SomethingElse {}

            expect(() => {
                initPxl({ persistenceLayer: new SomethingElse() })
            }).to.throw()

            expect(() => {
                initPxl({ persistenceLayer: new Pxl.PersistenceLayerBase() })
            }).to.throw()

            expect(() => {
                initPxl()
            }).to.not.throw()

        })

        it('the queryParam', () => {

            expect(() => {
                initPxl({ queryParam: null })
            }).to.throw()

            expect(() => {
                initPxl({ queryParam: '' })
            }).to.throw()

            expect(() => {
                initPxl({ queryParam: 'myPxl' })
            }).to.not.throw()

        })

        it('the logPxlFailed', () => {

            expect(() => {
                initPxl({ logPxlFailed: null })
            }).to.throw()

            expect(() => {
                initPxl({ logPxlFailed() {} })
            }).to.not.throw()

        })

    })

    describe('should track pxls', () => {

        it('without the middleware', (done) => {

            let pxl = initPxl()
            let checkAndAddPxlSpy = sinon.spy(pxl.persistenceLayer, 'checkAndAddPxl')

            new Promise((resolve) => { resolve() })
                .then(() => {

                    return pxl.createPxl({ id: 1 })
                        .then((createdPxl) => {

                            expect(createdPxl.pxl).to.be.a('string')
                            expect(createdPxl.pxl.length).to.eql(8)

                            expect(createdPxl).to.eql({
                                pxl: createdPxl.pxl,
                                metadata: {
                                    id: 1
                                },
                                count: 0
                            })

                            return pxl.logPxl(createdPxl.pxl)

                        })
                        .then((loggedPxl) => {

                            expect(loggedPxl).to.eql({
                                pxl: loggedPxl.pxl,
                                metadata: {
                                    id: 1
                                },
                                count: 1
                            })

                        })

                })
                .then(() => {

                    pxl.persistenceLayer.nextResponse = 'KeyCollisionError'

                    checkAndAddPxlSpy.reset()

                    return pxl.createPxl({ id: 2 })
                        .then((createdPxl) => {

                            expect(createdPxl).to.eql({
                                pxl: createdPxl.pxl,
                                metadata: {
                                    id: 2
                                },
                                count: 0
                            })

                            return checkAndAddPxlSpy.returnValues[0]
                                .then(() => {
                                    throw new Error('Expected first call to throw KeyCollisionError')
                                })
                                .catch((err) => {
                                    expect(err.name).to.eql('KeyCollisionError')
                                })

                        })

                })
                .then(() => {

                    pxl.persistenceLayer.nextResponse = 'Error'

                    return pxl.createPxl({ id: 3 })
                        .then(
                            () => {
                                throw new Error('Expected Error')
                            },
                            () => {
                                // Expected
                            }
                        )

                })
                .then(() => {

                    return pxl.logPxl('impossible pxl')
                        .then(
                            () => {
                                throw new Error('Expected Error')
                            },
                            () => {
                                // Expected
                            }
                        )

                })
                .then(() => {
                    done()
                })
                .catch((err) => {
                    done(err)
                })

        })

        it('with the middleware', (done) => {

            let logPxlFailedSpy = sinon.spy()
            let pxl = initPxl({
                logPxlFailed: logPxlFailedSpy
            })
            let logPxlSpy = sinon.spy(pxl, 'logPxl')

            let app = express()

            app.use(pxl.trackPxl)

            app.get('/ok', (req, res) => {
                res.send('ok')
            })

            let existingPxl = null

            let server = app.listen(3030, () => {

                new Promise((resolve) => { resolve() })
                    .then(() => {

                        return pxl.createPxl()
                            .then((createdPxl) => {
                                existingPxl = createdPxl
                            })

                    })
                    .then(() => {

                        return request('http://localhost:3030/ok')
                            .then((body) => {

                                expect(body).to.eql('ok')

                                expect(logPxlSpy.called).to.eql(false)

                            })

                    })
                    .then(() => {

                        return request('http://localhost:3030/ok?pxl=')
                            .then((body) => {

                                expect(body).to.eql('ok')

                                expect(logPxlSpy.called).to.eql(false)

                            })

                    })
                    .then(() => {

                        return request('http://localhost:3030/ok?pxl=impossible%20pxl')
                            .then((body) => {

                                expect(body).to.eql('ok')

                                expect(logPxlSpy.called).to.eql(true)
                                expect(logPxlFailedSpy.calledOnce).to.eql(true)
                                expect(logPxlFailedSpy.args[0][0].message).to.eql('Pxl unknown')
                                expect(logPxlFailedSpy.args[0][1]).is.a('string')
                                expect(logPxlFailedSpy.args[0][2]).to.eql('/ok?pxl=impossible%20pxl')

                            })

                    })
                    .then(() => {

                        logPxlSpy.reset()
                        logPxlFailedSpy.reset()

                        return request(`http://localhost:3030/ok?pxl=${ existingPxl.pxl }`)
                            .then((body) => {

                                expect(body).to.eql('ok')

                                expect(logPxlSpy.called).to.eql(true)
                                expect(logPxlFailedSpy.called).to.eql(false)

                                expect(existingPxl.count).to.eql(1)

                            })

                    })
                    .then(() => {
                        server.close()
                        done()
                    })
                    .catch((err) => {
                        server.close()
                        done(err)
                    })

            })

        })

        it('with a referenced pxl', () => {

            let pxl = initPxl()
            let refdPxl = null

            return new Promise((resolve) => { resolve() })
                .then(() => {

                    return pxl.createPxl({
                        id: 1,
                        ref: 'does not exist' // to verify that ref chaining is not possible - if it was logPxl would throw an error
                    })
                        .then((createdPxl) => {

                            expect(createdPxl.pxl).to.be.a('string')
                            expect(createdPxl.pxl.length).to.eql(8)

                            expect(createdPxl).to.eql({
                                pxl: createdPxl.pxl,
                                metadata: {
                                    id: 1
                                },
                                ref: 'does not exist',
                                count: 0
                            })

                            refdPxl = createdPxl.pxl

                            return pxl.createPxl({ id: 2, ref: refdPxl })

                        })
                        .then((createdPxl) => {

                            expect(createdPxl.pxl).to.be.a('string')
                            expect(createdPxl.pxl.length).to.eql(8)

                            expect(createdPxl).to.eql({
                                pxl: createdPxl.pxl,
                                metadata: {
                                    id: 2
                                },
                                ref: refdPxl,
                                count: 0
                            })

                            return pxl.logPxl(createdPxl.pxl)

                        })
                        .then((loggedPxl) => {

                            expect(loggedPxl).to.eql({
                                pxl: loggedPxl.pxl,
                                metadata: {
                                    id: 2
                                },
                                ref: refdPxl,
                                count: 1
                            })

                            expect(pxl.persistenceLayer.pxls[refdPxl]).to.eql({
                                pxl: refdPxl,
                                metadata: {
                                    id: 1
                                },
                                ref: 'does not exist',
                                count: 1
                            })

                        })

                })


        })

        it('and debounce a double click by the user', (done) => {

            let pxl = initPxl()

            new Promise((resolve) => { resolve() })
                .then(() => {

                    return pxl.createPxl({ id: 1 })
                        .then((createdPxl) => {

                            expect(createdPxl.pxl).to.be.a('string')
                            expect(createdPxl.pxl.length).to.eql(8)

                            expect(createdPxl).to.eql({
                                pxl: createdPxl.pxl,
                                metadata: {
                                    id: 1
                                },
                                count: 0
                            })

                            return pxl.logPxl(createdPxl.pxl) // First click
                                .then((loggedPxl) => {

                                    expect(loggedPxl).to.eql({
                                        pxl: loggedPxl.pxl,
                                        metadata: {
                                            id: 1
                                        },
                                        count: 1
                                    })

                                    return pxl.logPxl(createdPxl.pxl) // Second click

                                })
                                .then((loggedPxl) => {

                                    expect(loggedPxl).to.eql(undefined) // eslint-disable-line no-undefined

                                })

                        })

                })
                .then(() => {
                    done()
                })
                .catch((err) => {
                    done(err)
                })

        })

        it('and debounce a double click by the user and continue to track clicks done later', (done) => {

            let pxl = initPxl()
            pxl.logPxlCache = new TwoBucketsMemcache(10)

            new Promise((resolve) => { resolve() })
                .then(() => {

                    return pxl.createPxl({ id: 1 })
                        .then((createdPxl) => {

                            expect(createdPxl.pxl).to.be.a('string')
                            expect(createdPxl.pxl.length).to.eql(8)

                            expect(createdPxl).to.eql({
                                pxl: createdPxl.pxl,
                                metadata: {
                                    id: 1
                                },
                                count: 0
                            })

                            return pxl.logPxl(createdPxl.pxl) // First click
                                .then((loggedPxl) => {

                                    expect(loggedPxl).to.eql({
                                        pxl: loggedPxl.pxl,
                                        metadata: {
                                            id: 1
                                        },
                                        count: 1
                                    })

                                    return pxl.logPxl(createdPxl.pxl) // Second click

                                })
                                .then((loggedPxl) => {

                                    expect(loggedPxl).to.eql(undefined) // eslint-disable-line no-undefined

                                    return createdPxl

                                })

                        })

                })
                .then((createdPxl) => {

                    return new Promise((resolve) => {

                        setTimeout(() => {
                            resolve(createdPxl)
                        }, 30)

                    })

                })
                .then((createdPxl) => {

                    return pxl.logPxl(createdPxl.pxl) // Click done later
                        .then((loggedPxl) => {

                            expect(loggedPxl).to.eql({
                                pxl: loggedPxl.pxl,
                                metadata: {
                                    id: 1
                                },
                                count: 2
                            })

                        })

                })
                .then(() => {
                    done()
                })
                .catch((err) => {
                    done(err)
                })

        })

    })

    describe('should manage short urls', () => {

        it('without the middleware', (done) => {

            let pxl = initPxl()
            let checkAndAddLinkSpy = sinon.spy(pxl.persistenceLayer, 'checkAndAddLink')

            new Promise((resolve) => { resolve() })
                .then(() => {

                    return pxl.shorten('some link')
                        .then((createdLink) => {

                            expect(createdLink.linkId).to.be.a('string')
                            expect(createdLink.linkId.length).to.eql(8)

                            expect(createdLink).to.eql({
                                linkId: createdLink.linkId,
                                link: 'some link'
                            })

                            return pxl.unshorten(createdLink.linkId)

                        })
                        .then((unshortenedLink) => {

                            expect(unshortenedLink).to.eql('some link')

                        })

                })
                .then(() => {

                    pxl.persistenceLayer.nextResponse = 'KeyCollisionError'

                    checkAndAddLinkSpy.reset()

                    return pxl.shorten('some link 2')
                        .then((createdLink) => {

                            expect(createdLink).to.eql({
                                linkId: createdLink.linkId,
                                link: 'some link 2'
                            })

                            return checkAndAddLinkSpy.returnValues[0]
                                .then(() => {
                                    throw new Error('Expected first call to throw KeyCollisionError')
                                })
                                .catch((err) => {
                                    expect(err.name).to.eql('KeyCollisionError')
                                })

                        })

                })
                .then(() => {

                    pxl.persistenceLayer.nextResponse = 'Error'

                    return pxl.shorten('some link 3')
                        .then(
                            () => {
                                throw new Error('Expected Error')
                            },
                            () => {
                                // Expected
                            }
                        )

                })
                .then(() => {

                    return pxl.unshorten('impossible linkId')
                        .then(
                            () => {
                                throw new Error('Expected Error')
                            },
                            () => {
                                // Expected
                            }
                        )

                })
                .then(() => {
                    done()
                })
                .catch((err) => {
                    done(err)
                })

        })

        it('with the middleware', (done) => {

            let pxl = initPxl()

            let app = express()

            app.get('/shorty/:linkId', pxl.redirect)

            app.get('/ok', (req, res) => {
                res.send('ok')
            })

            let errSpy = sinon.spy()
            app.use((err, req, res, next) => {
                errSpy(err)
                res.send('err')
            })

            let existingLink = null

            let server = app.listen(3030, () => {

                new Promise((resolve) => { resolve() })
                    .then(() => {

                        return pxl.shorten('http://localhost:3030/ok')
                            .then((shortenedLink) => {
                                existingLink = shortenedLink
                            })

                    })
                    .then(() => {

                        return request(`http://localhost:3030/shorty/${ existingLink.linkId }`)
                            .then((body) => {

                                expect(body).to.eql('ok')

                            })

                    })
                    .then(() => {

                        errSpy.reset()

                        return request('http://localhost:3030/shorty/impossible%20linkId')
                            .then((body) => {

                                expect(body).to.eql('err')

                                expect(errSpy.called).to.eql(true)

                            })

                    })
                    .then(() => {

                        return request({
                            uri: `http://localhost:3030/shorty/${ existingLink.linkId }`,
                            resolveWithFullResponse: true,
                            followRedirect: false,
                            simple: false
                        })
                            .then((response) => {

                                expect(response.statusCode).to.eql(302)
                                expect(response.headers['expires']).to.eql('0')

                            })

                    })
                    .then(() => {
                        server.close()
                        done()
                    })
                    .catch((err) => {
                        server.close()
                        done(err)
                    })

            })

        })

    })

    describe('should process short links and tracking pxls combined', () => {

        it('pxl on short url', (done) => {

            let pxl = initPxl()
            let logPxlSpy = sinon.spy(pxl, 'logPxl')

            let app = express()

            app.use(pxl.trackPxl)

            app.get('/shorty/:linkId', pxl.redirect)

            app.get('/ok', (req, res) => {
                res.send('ok')
            })

            let existingPxl = null
            let existingLink = null

            let server = app.listen(3030, () => {

                new Promise((resolve) => { resolve() })
                    .then(() => {

                        return pxl.createPxl()
                            .then((createdPxl) => {
                                existingPxl = createdPxl
                            })

                    })
                    .then(() => {

                        return pxl.shorten('http://localhost:3030/ok')
                            .then((shortenedLink) => {
                                existingLink = shortenedLink
                            })

                    })
                    .then(() => {

                        return request(`http://localhost:3030/shorty/${ existingLink.linkId }?pxl=${ existingPxl.pxl }`)
                            .then((body) => {

                                expect(body).to.eql('ok')
                                expect(logPxlSpy.calledOnce).to.eql(true)

                            })

                    })
                    .then(() => {
                        server.close()
                        done()
                    })
                    .catch((err) => {
                        server.close()
                        done(err)
                    })

            })

        })

        it('pxl on long url', (done) => {

            let pxl = initPxl()
            let logPxlSpy = sinon.spy(pxl, 'logPxl')

            let app = express()

            app.use(pxl.trackPxl)

            app.get('/shorty/:linkId', pxl.redirect)

            app.get('/ok', (req, res) => {
                res.send('ok')
            })

            let existingPxl = null
            let existingLink = null

            let server = app.listen(3030, () => {

                new Promise((resolve) => { resolve() })
                    .then(() => {

                        return pxl.createPxl()
                            .then((createdPxl) => {
                                existingPxl = createdPxl
                            })

                    })
                    .then(() => {

                        return pxl.shorten(`http://localhost:3030/ok?pxl=${ existingPxl.pxl }`)
                            .then((shortenedLink) => {
                                existingLink = shortenedLink
                            })

                    })
                    .then(() => {

                        return request(`http://localhost:3030/shorty/${ existingLink.linkId }`)
                            .then((body) => {

                                expect(body).to.eql('ok')
                                expect(logPxlSpy.calledOnce).to.eql(true)

                            })

                    })
                    .then(() => {
                        server.close()
                        done()
                    })
                    .catch((err) => {
                        server.close()
                        done(err)
                    })

            })

        })

    })

})
