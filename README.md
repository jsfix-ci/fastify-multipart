# fastify-multipart

A wrapper of [fastify-multipart](https://github.com/fastify/fastify-multipart) with [confident mimetype](https://github.com/sindresorhus/file-type)
which [accumulates whole file in memory](https://github.com/fastify/fastify-multipart#parse-all-fields-and-assign-them-to-the-body).

## Note

This plugin has some characteristics:

1. Loads whole file in memory, so don't use this plugin if you want to upload large files!
2. Assign all fields to the body, so you can use JSON schema to validate them
3. MIME type only works with binaries, such as images, videos, documents...

## Install

```
$ npm install @trubavuong/fastify-multipart
```

## Usage

```
const fastify = require('fastify');
const plugin = require('@trubavuong/fastify-multipart');

const app = fastify();
app.register(plugin);
```

## JSON schema

You should write your own JSON schema to fit your need. Here is an example of the `req.body`:

```
{
  name: {
    fieldname: 'name',
    value: 'Vuong Tru',
  },
  avatar: {
    fieldname: 'avatar',
    filename: 'image.jpg',
    encoding: '7bit',
    mimetype: 'image/jpeg', // original mimetype
    mime: 'image/jpeg',     // corrected mimetype, added by this plugin
    ext: 'jpg',             // corrected extension, added by this plugin
    toBuffer: <function>
  }
}
```
