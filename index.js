/*/
 * COMPRESS VIDEO
 * GENERATE GIF
 * SPLIT MP3
 * MAIN FUNCTIONS
/*/

import * as dotenv from "dotenv";
import { createWriteStream } from "fs";
import ffmpeg from "fluent-ffmpeg";
dotenv.config();

const remoteFileUrl = process.env.REMOTE_FILE_URL;

const logProgress = (p) => console.log(`Progress: ${p.toFixed(2)}%`);
const logError = (e) => console.log(`Error:` + e.message);

// ************* COMPRESS VIDEO ************* //

const compressVideo = async (path) => {
  const filename = remoteFileUrl.split("/").pop();
  const splitname = filename.split(".");
  const name = splitname[0];
  const ext = splitname[1];

  const finalname = `${name}-compressed.${ext}`;
  const endFilePath = `./files/output/${finalname}`;

  const response = await new Promise((resolve) => {
    return ffmpeg(path)
      .fps(30)
      .outputOptions(["-crf 28"])
      .on("progress", ({ percent }) => logProgress(percent))
      .on("end", (e, stdout, stderr) => resolve(endFilePath))
      .on("error", (e, stdout, stderr) => logError(e))
      .save(endFilePath);
  });

  return response;
};

// ************* GENERATE GIF ************* //

const generateGif = async (path) => {
  const filename = remoteFileUrl.split("/").pop();
  const splitname = filename.split(".");
  const name = splitname[0];

  const finalname = `${name}-compressed.gif`;
  const endFilePath = `./files/output/${finalname}`;

  const metadata = await new Promise((resolve) => {
    return ffmpeg(path).ffprobe((err, data) => resolve(data));
  });

  const { duration } = metadata.format;
  const setDuration = duration > 5 ? "5" : `${duration}`;

  const response = await new Promise((resolve) => {
    return ffmpeg(path)
      .setStartTime("00:00:00")
      .setDuration(setDuration)
      .fps(3)
      .complexFilter(["scale=iw/4:ih/4"])
      .on("progress", ({ percent }) => logProgress(percent))
      .on("end", (e, stdout, stderr) => resolve(endFilePath))
      .on("error", (e, stdout, stderr) => logError(e))
      .save(endFilePath);
  });

  return response;
};

// ************* SPLIT MP3 ************* //

const createMP3 = async (path) => {
  const filename = path.split("/").pop();
  const newfile = filename.replace(".mp4", ".mp3");
  const writeStream = createWriteStream(`./files/output/${newfile}`);

  const response = await new Promise((resolve) => {
    return ffmpeg(path)
      .inputFormat("mp4")
      .format("mp3")
      .on("progress", ({ percent }) => logProgress(percent))
      .on("end", (e, stdout, stderr) => resolve())
      .on("error", (e, stdout, stderr) => logError(e))
      .pipe(writeStream, { end: true });
  });

  return response;
};

// ************* MAIN FUNCTIONS ************* //

const compressVideoFile = async () => {
  const filePath = await compressVideo(remoteFileUrl);
  console.log("Done", filePath);
};

const generateGifPreview = async () => {
  const filePath = await generateGif(remoteFileUrl);
  console.log("Done", filePath);
};

const generateMp3FromVideo = async () => {
  const filePath = await createMP3(remoteFileUrl);
  console.log("Done", filePath);
};

const run = async () => {
  return "Ran";
};

run();
