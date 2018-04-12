# pxl

Access counting for any Express-served url - e.g. for a [tracking pixel](https://en.wikipedia.org/wiki/Web_beacon) in emails

[![Build Status](https://img.shields.io/travis/analog-nico/pxl.svg?style=flat-square)](https://travis-ci.org/analog-nico/pxl)
[![Coverage Status](https://img.shields.io/coveralls/analog-nico/pxl.svg?style=flat-square)](https://coveralls.io/r/analog-nico/pxl)
[![Dependency Status](https://img.shields.io/david/analog-nico/pxl.svg?style=flat-square)](https://david-dm.org/analog-nico/pxl)
[![Known Vulnerabilities](https://snyk.io/test/npm/pxl/badge.svg?style=flat-square)](https://snyk.io/test/npm/pxl)

## What for?

Assume you have a newsletter or webpage &ndash; but let's focus on an html email &ndash; likes this one:

- Logo image
- Link to a post on your own blog
- Link to a post on an external blog

You want analytics about your recipients, right?!

### Question 1: Did the recipient open the email?

When the recipient opens the email, the email client will download the logo image. If you do the following you can easily answer the question:

1. Serve the logo image with your Express app, e.g. using [`serve-static`](https://www.npmjs.com/package/serve-static). If you don't have a suitable image in your html email, use a 1x1 transparent pixel image instead.
2. Unless you shorten the image url as described for question 3, make sure caching is disabled for this image. You may use [`nocache`](https://www.npmjs.com/package/nocache) to achieve this.
3. Extend the image url by the query `?pxl=<created pxl>`. Your html markup then contains: `<img src="http://mysite.com/img/logo.png?pxl=<created pxl>" alt="logo">`
4. This library provides:
    - A `createPxl(...)` function to generate the new code that you use for `<created pxl>` and 
    - A `trackPxl` middleware to bump up a counter each time the image url is accessed &ndash; that is the email is opened and the logo is downloaded.
5. Since you are really clever you generate a new pxl code for each email you send out so you can track if the email was opened by each recipient individually.

### Question 2: Did the recipient click on the link to the post on your own blog?

Of course with Google Analytics and the clever use of `utm_source` you can track how many of your email recipients visited the post on your own blog. But you cannot see WHO it was in particular.
 
Assuming you host your own blog with your Express app you can do the following to easily answer the question:

1. Extend the link to the post on your own blog by the query `?pxl=<created pxl>`. Your html markup then contains: `<a href="http://mysite.com/blog/10-things-you-didnt-know?pxl=<created pxl>">10 things you didn't know</a>`
2. Unless you shorten the link as described for question 3, make sure caching is disabled for this link. You may use [`nocache`](https://www.npmjs.com/package/nocache) to achieve this.
3. This library provides:
    - A `createPxl(...)` function to generate the new code that you use for `<created pxl>` and 
    - A `trackPxl` middleware to bump up a counter each time the blog post url is accessed &ndash; that is the recipient clicks on the link to the post on your own blog.
4. Since you are really clever you generate a new pxl code for each email you send out so you can track if the link was clicked by each recipient individually.

### Question 3: Did the recipient click on the link to the post on an external blog?

Of course with a link shortener service like bit.ly you can track how many of your email recipients visited the post on an external blog. But you cannot see WHO it was in particular.

Using `pxl`'s own link shortener you can do the following to easily answer the question:

1. Shorten the link to the post on an external blog by using `pxl.shorten('http://externalblog.com/5-things-your-todo-list-is-missing')`.
2. Replace the link to the post with the shortened version. Your html markup then contains: `<a href="http://mysite.com/shortly/<linkId>">5 things your Todo list is missing</a>`
3. This library provides:
    - A `shorten(...)` function to generate the new code that you use for `<linkId>` and
    - A `redirect` middleware to redirect the shortened links to the original location, i.e. the post on the external blog.
4. Extend the shortened link by the query `?pxl=<created pxl>`. Your html markup then contains: `<a href="http://mysite.com/shortly/<linkId>?pxl=<created pxl>">5 things your Todo list is missing</a>`
5. This library provides:
    - A `createPxl(...)` function to generate the new code that you use for `<created pxl>` and 
    - A `trackPxl` middleware to bump up a counter each time the blog post url is accessed &ndash; that is the recipient clicks on the link to the post on the external blog.
6. Since you are really clever you generate a new pxl code for each email you send out so you can track if the link was clicked by each recipient individually.

## Installation

[![NPM Stats](https://nodei.co/npm/pxl.png?downloads=true)](https://npmjs.org/package/pxl)

This is a module for node.js and is installed via npm:

``` bash
npm install pxl --save
```

Since `pxl` does not include a persistence layer you either need to implement your own or you install an extended package instead. The following packages currently exist that include a ready-to-use persistence layer:

- [`pxl-mongodb`](https://github.com/analog-nico/pxl-mongodb)
- [`pxl-dynamodb`](https://github.com/raphaelmun/pxl-dynamodb)
- If you implement a package for another database I will gladly list it here!

## Usage

### Initialization

Initialize `pxl` like this:

``` js
let Pxl = require('pxl')

let pxl = new Pxl({
    persistenceLayer: yourPersistenceLayer,
    queryParam: 'pxl',
    logPxlFailed(err, pxlCode, url) {}
})
```

- `persistenceLayer` must be an instance of a class extending [`Pxl.PersistenceLayerBase`](https://github.com/analog-nico/pxl/blob/master/lib/PersistenceLayerBase.js). Usually, you don't want to implement it yourself and use a package that provides one for your database instead. But if such package doesn't exist please have a look at [`pxl-mongodb`](https://github.com/analog-nico/pxl-mongodb/blob/master/lib/MongodbPersistenceLayer.js) as a reference implementation.
- `queryParam` with `'pxl'` as the default is the query key to be used with the `trackPxl` middleware.
- `logPxlFailed` is a callback that gets called if the `trackPxl` middleware was unable to bump up the counter for the given pxl. This makes sure that the tracking doesn't interfere with serving images etc. and allows you to e.g. monitor any tracking issues like invalid pxl codes etc.

Depending on the persistence layer you use, additional initialization steps may be required. If you e.g. use `pxl-mongodb` check [its README](https://github.com/analog-nico/pxl-mongodb#readme) for details.

### Pxl Tracking

``` js
// The database stores a counter for each pxl plus metadata you provide.
// The metadata is important for the user behavior analysis you aim to do!
let metadata = {
    emailRecepient: 'user@gmail.com'
}

pxl.createPxl(metadata)
    .then((createdPxl) => {
        // createdPxl.pxl is the code to use in the query - `?pxl=${ createdPxl.pxl }`
    })
    .catch((err) => {
        // Handle any error here
    })
```

To bump up the counter for a pxl you can do it programmatically:

``` js
pxl.logPxl(pxlCode)
    .catch((err) => {
        // Handle any error here
    })
```

However, the usual way to do it is to use the provided middleware:

``` js
let app = express()

app.use(pxl.trackPxl)
```

The middleware will check all requests that pass through for the pxl code in `req.query` and bump up its counter accordingly. If any error occurs durings its operation the `logPxlFailed` callback will be called without interfering with serving the request.

#### Pxl References

``` js
pxl.createPxl({ for: 'open tracking' })
    .then((openTrackingPxl) => {

        pxl.createPxl({
            for: 'click tracking',
            ref: openTrackingPxl.pxl // <-- The click tracking pxl references the open tracking pxl
        })
            .then((clickTrackingPxl) => {
            
                pxl.logPxl(clickTrackingPxl.pxl) // --> BOTH pxls' counters get bumped up
            
            })

    })
```

The example follows a common use case relevant for email tracking: Usually, the url of an image of the html email is used to track if the recipient opens the email. However, the recipient's email client may be configured to not load any images. In that case the open tracking won't work. But once the recipient clicks on a link in the email we know that the email was opened. With the `ref` property the `clickTrackingPxl` will automatically log the `openTrackingPxl` as well.

Chaining pxls with the `ref` property is not possible. Only the direct reference will be resolved.

### Link Shortening

``` js
pxl.shorten('http://externalblog.com/5-things-your-todo-list-is-missing')
    .then((createdLink) => {
        // createdLink.linkId is the code to use with the endpoint mounted with the redirect middleware
    })
    .catch((err) => {
        // Handle any error here
    })
```

You can unshorten programmatically:

``` js
pxl.unshorten(linkId)
    .then((retrievedLink) => {
        // retrievedLink.link is the orginal link you shortened
    })
    .catch((err) => {
        // Handle any error here
    })
```

However, unshortening is mainly used for redirecting the user who clicked on the shortened link. For that mount a middleware:

``` js
let app = express()

app.get('/shortly/:linkId', pxl.redirect)
```

Assume you shortened a link and got `'abcdefgh'` as the `linkId`. Then the url `'http://mysite.com/shortly/abcdefgh` will be forwarded to the original url.

If anything goes wrong &ndash; like using an invalid linkId or a technical error &ndash; this error will be forwarded through the middleware chain and can be handled using an [error-handling middleware](http://expressjs.com/en/guide/error-handling.html). E.g.:

``` js
app.get('/shortly/*', (err, req, res, next) => {
    res.redirect('/404.html')
})
```

## Contributing

To set up your development environment for `pxl`:

1. Clone this repo to your desktop,
2. in the shell `cd` to the main folder,
3. hit `npm install`,
4. hit `npm install gulp -g` if you haven't installed gulp globally yet, and
5. run `gulp dev`. (Or run `node ./node_modules/.bin/gulp dev` if you don't want to install gulp globally.)

`gulp dev` watches all source files and if you save some changes it will lint the code and execute all tests. The test coverage report can be viewed from `./coverage/lcov-report/index.html`.

If you want to debug a test you should use `gulp test-without-coverage` to run all tests without obscuring the code by the test coverage instrumentation.

## Change History

- v0.0.4 (2018-04-12)
    - Debouncing `.logPxl(...)` calls to filter double clicks by the user. This can happen when a logging call is tied to a button the user can click.
    - **Breaking Change**: If you call `.logPxl(...)` directly instead of using the `trackPxl` middleware then `.logPxl(...)` calls which get debounced resolve to `undefined`.
- v0.0.3 (2016-10-08)
    - Introduced the `ref` property to [reference another pxl](#pxl-references)
    - `redirect` middleware disables caching for reliable tracking of requests to shortened urls
    - Extended `logPxlFailed` signature
- v0.0.2 (2016-10-06)
    - Extended `logPxlFailed` signature
- v0.0.1 (2016-10-05)
    - Initial version

## License (ISC)

In case you never heard about the [ISC license](http://en.wikipedia.org/wiki/ISC_license) it is functionally equivalent to the MIT license.

See the [LICENSE file](LICENSE) for details.
