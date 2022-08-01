"use strict";

const {
  S3Client,
  PutObjectCommand,
  DeleteObjectCommand,
} = require("@aws-sdk/client-s3");

module.exports = {
  init(config) {
    const S3 = new S3Client({
      region: config.region,
      ...config,
    });

    const formatKey = (file) => {
      let prefix = config.prefix || "";
      prefix = prefix.trim() === "/" ? "" : prefix.trim(); // prefix only if not root
      const path = file.path ? `${file.path}/` : "";
      return `${prefix}${path}${file.hash}${file.ext}`;
    }

    const upload = async (file, customParams = {}) => {
      const objectPath = formatKey(file)
      const command = new PutObjectCommand(
        {
          Key: objectPath,
          Body: file.stream || Buffer.from(file.buffer, 'binary'),
          Bucket: config.params.bucket,
          ContentType: file.mime,
          ...customParams,
        }
      );

      try {
        await S3.send(command);

        if (config.baseUrl) {
          file.url = `${config.baseUrl}/${objectPath}`;
        } else {
          const endpoint = await S3.config.endpoint();
          file.url = `https://${config.params.bucket}.${endpoint.hostname}/${objectPath}`;
        }
      } catch (err) {
        console.error(`Error uploading object «${objectPath}» to S3!`);
        console.error(err);
        throw err;
      }
    }

    return {
      async upload(file, customParams = {}) {
        return upload(file, customParams)
      },
      async uploadStream(file, customParams = {}) {
        return upload(file, customParams)
      },
      async delete(file, customParams = {}) {
        const objectPath = formatKey(file)

        const command = new DeleteObjectCommand({
          Bucket: config.params.bucket,
          Key: objectPath,
          ...customParams,
        })

        try {
          await S3.send(command);
        } catch (err) {
          console.error(`Error deleting object «${objectPath}» from S3!`);
          console.error(err);
          throw err;
        }
      },
    };
  },
};
