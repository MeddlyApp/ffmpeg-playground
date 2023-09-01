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
import { exec } from "child_process";
import ffmpeg from "fluent-ffmpeg";
dotenv.config();

// const fileUri = process.env.LOCAL_FILE_URI;
// const vodOutputDir = process.env.LOCAL_VOD_OUTPUT_DIR;

const fileUri = process.env.LOCAL_FILE_URI;
const fileUri2 = process.env.LOCAL_FILE_URI2;
const vodOutputDir = process.env.LOCAL_VOD_OUTPUT_DIR;

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

  const finalname = `${name}-compressed2.${ext}`;
  const endFilePath = `../tmp/${finalname}`;

  const response = await new Promise((resolve) => {
    // .audioCodec("libmp3lame")
    return ffmpeg(fileUri)
      .videoCodec("libx264")
      .format("mp4")
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
  const value = fileUri2;

  const videoMetadata = await new Promise((resolve) => {
    return ffmpeg(value).ffprobe((err, data) => resolve(data));
  });

  const videoDuration = videoMetadata.format.duration;
  const audioStream = videoMetadata?.streams.find(
    (stream) => stream.codec_type === "audio"
  );

  const { start_time, duration } = audioStream;
  // const offset = videoDuration - duration; // should equal start_time
  const filename = value.split("/").pop();
  const spaceFile = filename.replace(".mp4", "-empty.mp3");

  const delayPath = `../tmp/${spaceFile}`;

  // 1. Generate Silence
  await new Promise((resolve) => {
    const command = `ffmpeg -f lavfi -i anullsrc=r=44100:cl=mono -t ${start_time} -q:a 9 -acodec libmp3lame ${delayPath}`;
    return exec(command, (error, stdout, stderr) => {
      if (error) {
        console.error(`exec error: ${error}`);
        return resolve(null);
      }
      console.log(`stdout: ${stdout}`);
      console.error(`stderr: ${stderr}`);
      return resolve(null);
    });
  });

  // 2. Generate Main Audio File
  const newfile = filename.replace(".mp4", ".mp3");
  const primaryPath = `../tmp/${newfile}`;
  const mainWriteStream = createWriteStream(primaryPath);

  await new Promise((resolve) => {
    return ffmpeg(value)
      .inputFormat("mp4")
      .audioCodec("libmp3lame")
      .format("mp3")
      .on("progress", ({ percent }) => logProgress(percent))
      .on("end", (e, stdout, stderr) => resolve(stdout))
      .on("error", (e, stdout, stderr) => logError(e))
      .pipe(mainWriteStream, { end: true });
  });

  // delayPath + primaryPath

  //const newAudioMetadata = await new Promise((resolve) => {
  //  return ffmpeg(primaryPath).ffprobe((err, data) => resolve(data));
  //});

  //const silenceDuration = videoDuration - newAudioMetadata?.format?.duration;

  //return { newAudioMetadata, silenceDuration };
  return;
}

// ************* MAIN FUNCTIONS ************* //

async function getFileMetadata(fileUri1) {
  // const fileUri1 = process.env.LOCAL_FILE_URI;
  const fileUri2 = process.env.LOCAL_FILE_URI2;

  //const metadata1 = await new Promise((resolve) => {
  //  return ffmpeg(fileUri1).ffprobe((err, data) => resolve(data));
  //});

  const metadata2 = await new Promise((resolve) => {
    return ffmpeg(fileUri2).ffprobe((err, data) => resolve(data));
  });

  console.log({ stream1: metadata2.streams[0], stream2: metadata2.streams[1] });
}

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

async function run(cd) {
  // const res = await compressVideo();
  // console.log({ res });
  await generateMp3FromVideo();
  // return await getFileMetadata();
}

run();
