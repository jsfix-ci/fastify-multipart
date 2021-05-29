const fs = require('fs');
const path = require('path');
const util = require('util');
const fastify = require('fastify');
const FormData = require('form-data');
const fastifyMultipart = require('fastify-multipart');
const { pipeline } = require('stream');

const plugin = require('../lib/index');

const pump = util.promisify(pipeline);

describe('index.js', () => {
  describe('plugin', () => {
    const imageFilePath = path.join(__dirname, '__data__', 'image.jpg');
    const imageFileCopyPath1 = path.join(__dirname, '__data__', 'image-copy-1.jpg');
    const imageFileCopyPath2 = path.join(__dirname, '__data__', 'image-copy-2.jpg');

    const imageFileSize = fs.readFileSync(imageFilePath).length;

    const removeCopiedImages = () => {
      [imageFileCopyPath1, imageFileCopyPath2].forEach(imagePath => {
        try {
          fs.unlinkSync(imagePath);
        }
        // eslint-disable-next-line no-empty
        catch (error) {}
      });
    };

    const buildApp = ({ ignoreMimetypeCorrection = false } = {}) => {
      const app = fastify();

      if (ignoreMimetypeCorrection) {
        app.register(fastifyMultipart, { attachFieldsToBody: true });
      }
      else {
        app.register(plugin);
      }

      app.route({
        method: 'POST',
        url: '/single-file-mime',
        schema: {
          body: {
            type: 'object',
            required: [
              'name',
              'avatar',
            ],
            properties: {
              name: {
                type: 'object',
                required: [
                  'value',
                ],
                properties: {
                  value: {
                    type: 'string',
                  },
                },
              },
              avatar: {
                type: 'object',
                required: [
                  'mimetype',
                  'toBuffer',
                ],
              },
            },
          },
        },
        handler: async req => ({
          data: {
            name: req.body.name.value,
            avatar: {
              mimetype: req.body.avatar.mimetype,
              mime: req.body.avatar.mime,
              ext: req.body.avatar.ext,
            },
          },
        }),
      });

      app.route({
        method: 'POST',
        url: '/single-file-memory',
        schema: {
          body: {
            type: 'object',
            required: [
              'avatar',
            ],
            properties: {
              avatar: {
                type: 'object',
                required: [
                  'mimetype',
                  'toBuffer',
                ],
              },
            },
          },
        },
        handler: async (req, res) => {
          fs.writeFileSync(imageFileCopyPath1, await req.body.avatar.toBuffer());
          res.send({});
        },
      });

      app.route({
        method: 'POST',
        url: '/single-file-stream',
        schema: {
          body: {
            type: 'object',
            required: [
              'avatar',
            ],
            properties: {
              avatar: {
                type: 'object',
                required: [
                  'mimetype',
                  'toBuffer',
                ],
              },
            },
          },
        },
        handler: async (req, res) => {
          await pump(req.body.avatar.file, fs.createWriteStream(imageFileCopyPath1));
          res.send({});
        },
      });

      app.route({
        method: 'POST',
        url: '/multiple-files-mime',
        schema: {
          body: {
            type: 'object',
            required: [
              'name',
              'avatars',
            ],
            properties: {
              name: {
                type: 'object',
                required: [
                  'value',
                ],
                properties: {
                  value: {
                    type: 'string',
                  },
                },
              },
              avatars: {
                type: 'array',
                additionalItems: false,
                minItems: 1,
                items: {
                  type: 'object',
                  required: [
                    'mimetype',
                    'toBuffer',
                  ],
                },
              },
            },
          },
        },
        handler: async req => ({
          data: {
            name: req.body.name.value,
            avatars: req.body.avatars.map(avatar => ({
              mimetype: avatar.mimetype,
              mime: avatar.mime,
              ext: avatar.ext,
            })),
          },
        }),
      });

      app.route({
        method: 'POST',
        url: '/multiple-files-memory',
        schema: {
          body: {
            type: 'object',
            required: [
              'avatars',
            ],
            properties: {
              avatars: {
                type: 'array',
                additionalItems: false,
                minItems: 1,
                items: {
                  type: 'object',
                  required: [
                    'mimetype',
                    'toBuffer',
                  ],
                },
              },
            },
          },
        },
        handler: async (req, res) => {
          fs.writeFileSync(imageFileCopyPath1, await req.body.avatars[0].toBuffer());
          fs.writeFileSync(imageFileCopyPath2, await req.body.avatars[1].toBuffer());
          res.send({});
        },
      });

      app.route({
        method: 'POST',
        url: '/multiple-files-stream',
        schema: {
          body: {
            type: 'object',
            required: [
              'avatars',
            ],
            properties: {
              avatars: {
                type: 'array',
                additionalItems: false,
                minItems: 1,
                items: {
                  type: 'object',
                  required: [
                    'mimetype',
                    'toBuffer',
                  ],
                },
              },
            },
          },
        },
        handler: async (req, res) => {
          await pump(req.body.avatars[0].file, fs.createWriteStream(imageFileCopyPath1));
          await pump(req.body.avatars[1].file, fs.createWriteStream(imageFileCopyPath2));
          res.send({});
        },
      });

      return app;
    };

    beforeEach(() => {
      removeCopiedImages();
    });

    afterEach(() => {
      removeCopiedImages();
    });

    describe('single file', () => {
      test('should not correct mimetype', async () => {
        const app = buildApp({ ignoreMimetypeCorrection: true });

        const formData = new FormData();
        formData.append('name', 'Vuong Tru');
        formData.append(
          'avatar',
          fs.createReadStream(imageFilePath),
          { contentType: 'fake' },
        );

        const response = await app.inject({
          method: 'POST',
          url: '/single-file-mime',
          headers: formData.getHeaders(),
          body: formData,
        });
        expect(response.statusCode).toEqual(200);
        expect(response.json()).toEqual({
          data: {
            name: 'Vuong Tru',
            avatar: {
              mimetype: 'fake',
            },
          },
        });
      });

      test('should correct mimetype', async () => {
        const app = buildApp();

        const formData = new FormData();
        formData.append('name', 'Vuong Tru');
        formData.append(
          'avatar',
          fs.createReadStream(imageFilePath),
          { contentType: 'fake' },
        );

        const response = await app.inject({
          method: 'POST',
          url: '/single-file-mime',
          headers: formData.getHeaders(),
          body: formData,
        });
        expect(response.statusCode).toEqual(200);
        expect(response.json()).toEqual({
          data: {
            name: 'Vuong Tru',
            avatar: {
              mimetype: 'fake',
              mime: 'image/jpeg',
              ext: 'jpg',
            },
          },
        });
      });

      test('should empty mimetype', async () => {
        const app = buildApp();

        const formData = new FormData();
        formData.append('name', 'Vuong Tru');
        formData.append('avatar', fs.createReadStream(__filename));

        const response = await app.inject({
          method: 'POST',
          url: '/single-file-mime',
          headers: formData.getHeaders(),
          body: formData,
        });
        expect(response.statusCode).toEqual(200);
        expect(response.json()).toEqual({
          data: {
            name: 'Vuong Tru',
            avatar: {
              mimetype: 'application/javascript',
              mime: '',
              ext: '',
            },
          },
        });
      });

      test('should save in-memory file to disk', async () => {
        const app = buildApp();

        const formData = new FormData();
        formData.append('name', 'Vuong Tru');
        formData.append('avatar', fs.createReadStream(imageFilePath));

        const response = await app.inject({
          method: 'POST',
          url: '/single-file-memory',
          headers: formData.getHeaders(),
          body: formData,
        });
        expect(response.statusCode).toEqual(200);
        expect(response.json()).toEqual({});

        expect(fs.statSync(imageFileCopyPath1).isFile()).toEqual(true);
        expect(fs.readFileSync(imageFileCopyPath1).length).toEqual(imageFileSize);
      });

      test('should save stream file to disk but the saved file is empty', async () => {
        const app = buildApp();

        const formData = new FormData();
        formData.append('name', 'Vuong Tru');
        formData.append('avatar', fs.createReadStream(imageFilePath));

        const response = await app.inject({
          method: 'POST',
          url: '/single-file-stream',
          headers: formData.getHeaders(),
          body: formData,
        });
        expect(response.statusCode).toEqual(200);
        expect(response.json()).toEqual({});

        expect(fs.statSync(imageFileCopyPath1).isFile()).toEqual(true);
        expect(fs.readFileSync(imageFileCopyPath1).length).toEqual(0);
      });
    });

    describe('multiple files', () => {
      test('should not correct mimetype', async () => {
        const app = buildApp({ ignoreMimetypeCorrection: true });

        const formData = new FormData();
        formData.append('name', 'Vuong Tru');
        formData.append(
          'avatars',
          fs.createReadStream(imageFilePath),
          { contentType: 'fake' },
        );
        formData.append(
          'avatars',
          fs.createReadStream(imageFilePath),
          { contentType: 'super-fake' },
        );

        const response = await app.inject({
          method: 'POST',
          url: '/multiple-files-mime',
          headers: formData.getHeaders(),
          body: formData,
        });
        expect(response.statusCode).toEqual(200);
        expect(response.json()).toEqual({
          data: {
            name: 'Vuong Tru',
            avatars: [
              { mimetype: 'fake' },
              { mimetype: 'super-fake' },
            ],
          },
        });
      });

      test('should correct mimetype', async () => {
        const app = buildApp();

        const formData = new FormData();
        formData.append('name', 'Vuong Tru');
        formData.append(
          'avatars',
          fs.createReadStream(imageFilePath),
          { contentType: 'fake' },
        );
        formData.append(
          'avatars',
          fs.createReadStream(imageFilePath),
          { contentType: 'super-fake' },
        );

        const response = await app.inject({
          method: 'POST',
          url: '/multiple-files-mime',
          headers: formData.getHeaders(),
          body: formData,
        });
        expect(response.statusCode).toEqual(200);
        expect(response.json()).toEqual({
          data: {
            name: 'Vuong Tru',
            avatars: [
              {
                mimetype: 'fake',
                mime: 'image/jpeg',
                ext: 'jpg',
              },
              {
                mimetype: 'super-fake',
                mime: 'image/jpeg',
                ext: 'jpg',
              },
            ],
          },
        });
      });

      test('should empty mimetype', async () => {
        const app = buildApp();

        const formData = new FormData();
        formData.append('name', 'Vuong Tru');
        formData.append('avatars', fs.createReadStream(__filename));
        formData.append('avatars', fs.createReadStream(__filename));

        const response = await app.inject({
          method: 'POST',
          url: '/multiple-files-mime',
          headers: formData.getHeaders(),
          body: formData,
        });
        expect(response.statusCode).toEqual(200);
        expect(response.json()).toEqual({
          data: {
            name: 'Vuong Tru',
            avatars: [
              {
                mimetype: 'application/javascript',
                mime: '',
                ext: '',
              },
              {
                mimetype: 'application/javascript',
                mime: '',
                ext: '',
              },
            ],
          },
        });
      });

      test('should save in-memory files to disk', async () => {
        const app = buildApp();

        const formData = new FormData();
        formData.append('name', 'Vuong Tru');
        formData.append('avatars', fs.createReadStream(imageFilePath));
        formData.append('avatars', fs.createReadStream(imageFilePath));

        const response = await app.inject({
          method: 'POST',
          url: '/multiple-files-memory',
          headers: formData.getHeaders(),
          body: formData,
        });
        expect(response.statusCode).toEqual(200);
        expect(response.json()).toEqual({});

        expect(fs.statSync(imageFileCopyPath1).isFile()).toEqual(true);
        expect(fs.readFileSync(imageFileCopyPath1).length).toEqual(imageFileSize);

        expect(fs.statSync(imageFileCopyPath2).isFile()).toEqual(true);
        expect(fs.readFileSync(imageFileCopyPath2).length).toEqual(imageFileSize);
      });

      test('should save stream files to disk but the saved files are empty', async () => {
        const app = buildApp();

        const formData = new FormData();
        formData.append('name', 'Vuong Tru');
        formData.append('avatars', fs.createReadStream(imageFilePath));
        formData.append('avatars', fs.createReadStream(imageFilePath));

        const response = await app.inject({
          method: 'POST',
          url: '/multiple-files-stream',
          headers: formData.getHeaders(),
          body: formData,
        });
        expect(response.statusCode).toEqual(200);
        expect(response.json()).toEqual({});

        expect(fs.statSync(imageFileCopyPath1).isFile()).toEqual(true);
        expect(fs.readFileSync(imageFileCopyPath1).length).toEqual(0);

        expect(fs.statSync(imageFileCopyPath2).isFile()).toEqual(true);
        expect(fs.readFileSync(imageFileCopyPath2).length).toEqual(0);
      });
    });
  });
});
