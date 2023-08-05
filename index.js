/*/
 * COMPRESS VIDEO
 * GENERATE VIDEO ON DEMAND PLAYLIST
 * GENERATE GIF
 * SPLIT MP3
 * MAIN FUNCTIONS
/*/

import path from "path";
import * as dotenv from "dotenv";
import { createWriteStream, promises } from "fs";
import ffmpeg from "fluent-ffmpeg";
dotenv.config();

// const fileUri = process.env.LOCAL_FILE_URI;
// const vodOutputDir = process.env.LOCAL_VOD_OUTPUT_DIR;

const fileUri = process.env.LOCAL_FILE_URI2;
const vodOutputDir = process.env.LOCAL_VOD_OUTPUT_DIR2;

function logProgress(p) {
  console.log({ message: `Progress: ${p.toFixed(2)}%` });
}

function logError(e) {
  console.log({ message: `Error: ${e.message}` });
}

// ************* COMPRESS VIDEO ************* //

async function compressVideo() {
  const filename = fileUri.split("/").pop();
  const splitname = filename.split(".");
  const name = splitname[0];
  const ext = splitname[1];

  const finalname = `${name}-compressed.${ext}`;
  const endFilePath = `../tmp/m3u8/${finalname}`;

  const response = await new Promise((resolve) => {
    return ffmpeg(fileUri)
      .fps(30)
      .outputOptions(["-crf 28"])
      .on("progress", ({ percent }) => logProgress(percent))
      .on("end", (e, stdout, stderr) => resolve(endFilePath))
      .on("error", (e, stdout, stderr) => logError(e))
      .save(endFilePath);
  });

  return response;
}

// ************* GENERATE VIDEO ON DEMAND PLAYLIST ************* //

async function generateVodPlaylist() {
  const filename = fileUri.split("/").pop();
  const splitname = filename.split(".");
  const name = splitname[0];

  const finalname = `${name}.m3u8`;

  const dirBase = `../tmp/m3u8/123/`;
  const outputDir = vodOutputDir ? `${vodOutputDir}/` : "";
  const outputDirPath = `${dirBase + outputDir}`;

  // Create destination folder...
  if (outputDir !== "") {
    await promises.mkdir(outputDirPath, { recursive: true });
    console.log({ message: `Created ${outputDirPath}` });
  }

  const endFilePath = `${dirBase + outputDir + finalname}`;
  const response = await new Promise((resolve) => {
    return ffmpeg(fileUri)
      .outputOptions(["-codec: copy", "-hls_time 10", "-hls_playlist_type vod"])
      .on("progress", ({ percent }) => logProgress(percent))
      .on("end", (e, stdout, stderr) => resolve(endFilePath))
      .on("error", (e, stdout, stderr) => logError(e))
      .save(endFilePath);
  });

  // Upload all files within the destination folder to cloud
  await uploadAllFilesToCloud(outputDirPath);

  // Cleanup destination folder...
  // await deleteTmpDirectory(outputDirPath);

  return response;
}

async function uploadAllFilesToCloud(dirPath) {
  const startMessage = `Uploading files to cloud...`;
  console.log({ message: startMessage });

  const entries = await promises.readdir(dirPath, { withFileTypes: true });

  // Delete all files within the destination folder
  await Promise.all(
    entries.map(async (entry) => {
      const fullPath = path.join(dirPath, entry.name);

      if (entry.isDirectory()) {
        await uploadAllFilesToCloud(fullPath);
        console.log({ message: `Rescursive Upload Path: ${fullPath}` });
      } else {
        console.log({ message: `Upload: ${fullPath}` });
      }
    })
  );

  const completedMessage = `Completed uploading files to cloud`;
  console.log({ message: completedMessage });
}

async function deleteTmpDirectory(dirPath) {
  const entries = await promises.readdir(dirPath, { withFileTypes: true });

  // Delete all files within the destination folder
  await Promise.all(
    entries.map(async (entry) => {
      const fullPath = path.join(dirPath, entry.name);

      if (entry.isDirectory()) {
        await deleteTmpDirectory(fullPath);
        const recursiveMessage = `Rescursive Delete Path: ${fullPath}`;
        console.log({ message: recursiveMessage });
      } else {
        await promises.unlink(fullPath); // If it's a file, delete it
        const deleteMessage = `Deleted ${fullPath}`;
        console.log({ message: deleteMessage });
      }
    })
  );

  // Delete the destination folder
  await promises.rmdir(dirPath);
  const finalMessage = `Removed ${dirPath}`;
  console.log({ message: finalMessage });
}

// ************* GENERATE GIF ************* //

async function generateGif() {
  const filename = fileUri.split("/").pop();
  const splitname = filename.split(".");
  const name = splitname[0];

  const finalname = `${name}-compressed.gif`;
  const endFilePath = `../tmp/m3u8/${finalname}`;

  const metadata = await new Promise((resolve) => {
    return ffmpeg(fileUri).ffprobe((err, data) => resolve(data));
  });

  const { duration } = metadata.format;
  const setDuration = duration > 5 ? "5" : `${duration}`;

  const response = await new Promise((resolve) => {
    return ffmpeg(fileUri)
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
}

// ************* SPLIT MP3 ************* //

async function createMP3() {
  const filename = fileUri.split("/").pop();
  const newfile = filename.replace(".mp4", ".mp3");
  const writeStream = createWriteStream(`../tmp/m3u8/${newfile}`);

  const response = await new Promise((resolve) => {
    return ffmpeg(fileUri)
      .inputFormat("mp4")
      .format("mp3")
      .on("progress", ({ percent }) => logProgress(percent))
      .on("end", (e, stdout, stderr) => resolve())
      .on("error", (e, stdout, stderr) => logError(e))
      .pipe(writeStream, { end: true });
  });

  return response;
}

// ************* MAIN FUNCTIONS ************* //

async function compressVideoFile() {
  const filePath = await compressVideo();
  console.log("Done", filePath);
}

async function generateVOD() {
  const filePath = await generateVodPlaylist();
  console.log("Done", filePath);
}

async function generateGifPreview() {
  const filePath = await generateGif();
  console.log("Done", filePath);
}

async function generateMp3FromVideo() {
  const filePath = await createMP3();
  console.log("Done", filePath);
}

async function run() {
  const filePath = await generateVOD();
}

run();
