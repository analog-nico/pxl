# pxl

Access counting for any Express-served url - e.g. for a tracking pixel in emails

[![Build Status](https://img.shields.io/travis/analog-nico/pxl/master.svg?style=flat-square&maxAge=2592000)](https://travis-ci.org/analog-nico/pxl)
[![Coverage Status](https://img.shields.io/coveralls/analog-nico/pxl.svg?style=flat-square&maxAge=2592000)](https://coveralls.io/r/analog-nico/pxl)
[![Dependency Status](https://img.shields.io/david/analog-nico/pxl.svg?style=flat-square&maxAge=2592000)](https://david-dm.org/analog-nico/pxl)
[![Known Vulnerabilities](https://snyk.io/test/npm/pxl/badge.svg?style=flat-square&maxAge=2592000)](https://snyk.io/test/npm/pxl)

## Installation

[![NPM Stats](https://nodei.co/npm/pxl.png?downloads=true)](https://npmjs.org/package/pxl)

This is a module for node.js and is installed via npm:

``` bash
npm install pxl --save
```

## Usage

Description forthcoming.

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

- v0.0.1 (upcoming)
    - Initial version

## License (ISC)

In case you never heard about the [ISC license](http://en.wikipedia.org/wiki/ISC_license) it is functionally equivalent to the MIT license.

See the [LICENSE file](LICENSE) for details.
