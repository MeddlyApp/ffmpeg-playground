/*/
 * 
 * SPLIT MP3 & UPLOAD
 * MAIN FUNCTIONS
/*/

import * as dotenv from "dotenv";
import fs, { createReadStream } from "fs";
import ffmpeg from "fluent-ffmpeg";
import { S3Client } from "@aws-sdk/client-s3";
import { Upload } from "@aws-sdk/lib-storage";
import { PassThrough } from "stream";
dotenv.config();

const remoteFileUrl = process.env.REMOTE_FILE_URL;
const newRemoteFileUrl = process.env.REMOTE_FILE_OUTPUT;

const localFileUrl = process.env.LOCAL_FILE_URL;
const newLocalFileUrl = process.env.LOCAL_FILE_OUTPUT;

// ************* SPLIT MP3 & UPLOAD ************* //

const createMP3 = async (url) => {
  const filename = remoteFileUrl.split("/").pop();
  const newfile = filename.replace(".mp4", ".mp3");
  const writeStream = fs.createWriteStream(`./files/output/${newfile}`);

  const response = await new Promise((resolve) => {
    return ffmpeg(url)
      .inputFormat("mp4")
      .format("mp3")
      .on("progress", (x) =>
        console.log(`Progress ${x.percent ? x.percent : 0}% done`)
      )
      .on("end", (e, stdout, stderr) => resolve())
      .on("error", (e, stdout, stderr) => console.log("Error: " + e.message))
      .pipe(writeStream);
  });

  return response;
};

const uploadFileToS3 = async (filePath) => {
  const audioFileName = newRemoteFileUrl.split("/").pop();
  const file = { path: filePath, originalname: audioFileName };

  const credentials = {
    AWS_ACCESS_KEY_ID: process.env.AWS_ACCESS_KEY_ID,
    AWS_SECRET_ACCESS_KEY: process.env.AWS_SECRET_ACCESS_KEY,
    AWS_REGION: process.env.AWS_REGION,
    AWS_BUCKET_NAME: process.env.AWS_BUCKET_NAME,
    AWS_DESTINATION_PATH: process.env.AWS_DESTINATION_PATH,
  };

  const fileName = file.originalname;

  // Format as a stream, not a normal file
  const formattedFile = createReadStream(file.path);
  const uploadParams = {
    Body: formattedFile.pipe(new PassThrough()), // Pass the stream as the body...
    Bucket: credentials.AWS_BUCKET_NAME,
    Key: `${credentials.AWS_DESTINATION_PATH}/${fileName}`,
  };

  const s3Config = {
    region: credentials.AWS_REGION,
    credentials: {
      accessKeyId: credentials.AWS_ACCESS_KEY_ID,
      secretAccessKey: credentials.AWS_SECRET_ACCESS_KEY,
    },
  };
  const s3Credentials = new S3Client(s3Config);

  try {
    const minPartSize = 1024 * 1024 * 20;
    const parallelUploads3 = new Upload({
      client: s3Credentials,
      params: uploadParams,
      queueSize: 4,
      partSize: minPartSize,
      leavePartsOnError: false,
    });

    parallelUploads3.on("httpUploadProgress", (progress) => {
      if (progress && progress.loaded && progress.total && progress.part) {
        const { part, loaded, total } = progress;
        const percentage = ((loaded / total) * 100).toFixed(2);
        console.log(`Upload Progress: (${part})  ${percentage}%`);
      }
    });

    const data = await parallelUploads3.done();
    if (data.Location) {
      const splitLocationURL = data.Location.split(".com");
      const finalURL = `${process.env.AWS_CDN_URL}${splitLocationURL[1]}`;
      console.log("FINAL:", finalURL);

      return { data };
    }
  } catch (e) {
    console.log("Upload Error:", e);
    return e;
  }
};

// ************* MAIN FUNCTIONS ************* //

const createMp3AndUploadToAWS = async () => {
  await createMP3(remoteFileUrl);
  await uploadFileToS3(newRemoteFileUrl);
  console.log("Done");
};

const run = async () => {
  await createMp3AndUploadToAWS();
};

run();
