const fp = require('fastify-plugin');
const fastifyMultipart = require('fastify-multipart');
const FileType = require('file-type');

const plugin = fp(async fastify => {
  const correctMimetypeFileField = async value => {
    if (value && typeof value.toBuffer === 'function') {
      const buffer = await value.toBuffer();
      const fileTypeResult = await FileType.fromBuffer(buffer);
      const mimetype = (fileTypeResult ? fileTypeResult.mime : '');
      const ext = (fileTypeResult ? fileTypeResult.ext : '');

      Object.assign(value, {
        mimetype,
        ext,
      });
    }
  };

  const correctMimetypeFileFields = async values => {
    for (let i = 0; i < values.length; i += 1) {
      // eslint-disable-next-line no-await-in-loop
      await correctMimetypeFileField(values[i]);
    }
  };

  const correctMimetypeFileFieldsFromRequestBody = async req => {
    const { body } = req;
    if (body) {
      const values = Object.values(body);
      for (let i = 0; i < values.length; i += 1) {
        const value = values[i];

        // eslint-disable-next-line no-await-in-loop
        await (
          Array.isArray(value)
            ? correctMimetypeFileFields
            : correctMimetypeFileField
        )(value);
      }
    }
  };

  fastify.register(fastifyMultipart, {
    attachFieldsToBody: true,
  });

  fastify.addHook('preValidation', correctMimetypeFileFieldsFromRequestBody);
});

module.exports = plugin;
