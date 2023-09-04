/*/
 * METADATA
 * COMPRESS VIDEO
 * GENERATE VIDEO ON DEMAND PLAYLIST
 * CREATE MP3 FROM MP4
 * GENERATE GIF
 * RUN
/*/

import path from "path";
import * as dotenv from "dotenv";
import { createWriteStream, promises } from "fs";
import { exec } from "child_process";
import ffmpeg from "fluent-ffmpeg";
dotenv.config();

function logProgress(p) {
  if (p) console.log({ message: `Progress: ${p.toFixed(2)}%` });
}

function logError(e) {
  if (e && e.message) console.log({ message: `Error: ${e.message}` });
  else console.log({ error: e });
}

// ************* METADATA ************* //

async function getFileMetadata(uri) {
  const metadata = await new Promise((resolve) => {
    return ffmpeg(uri).ffprobe((err, data) => resolve(data));
  });

  const stream1 = metadata?.streams[0];
  const stream2 = metadata?.streams[1];
  console.log({ uri, stream1, stream2, metadata });
}

// ************* COMPRESS VIDEO ************* //

async function compressVideo(uri) {
  const filename = uri.split("/").pop();
  const splitname = filename.split(".");
  const name = splitname[0];

  const finalname = `${name}-compressed.mp4`;
  const endFilePath = `../tmp/${finalname}`;

  const response = await new Promise((resolve) => {
    return ffmpeg(uri)
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

async function generateVodPlaylist(uri, vodOutputDir) {
  const filename = uri.split("/").pop();
  const splitname = filename.split(".");
  const name = splitname[0];

  const finalname = `${name}.m3u8`;

  const dirBase = `../tmp/m3u8/postId/`;
  const outputDir = vodOutputDir ? `${vodOutputDir}/` : "";
  const outputDirPath = `${dirBase + outputDir}`;

  // Create destination folder...
  if (outputDir !== "") {
    await promises.mkdir(outputDirPath, { recursive: true });
    console.log({ message: `Created ${outputDirPath}` });
  }

  const endFilePath = `${dirBase + outputDir + finalname}`;
  const response = await new Promise((resolve) => {
    return ffmpeg(uri)
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

async function generateGif(uri) {
  const filename = uri.split("/").pop();
  const splitname = filename.split(".");
  const name = splitname[0];

  const finalname = `${name}-compressed.gif`;
  const endFilePath = `../tmp/${finalname}`;

  const metadata = await new Promise((resolve) => {
    return ffmpeg(uri).ffprobe((err, data) => resolve(data));
  });

  const { duration } = metadata.format;
  const setDuration = duration > 5 ? "5" : `${duration}`;

  const response = await new Promise((resolve) => {
    return ffmpeg(uri)
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

// ************* CREATE MP3 FROM MP4 ************* //

async function generateMP3FromMp4(uri) {
  const videoMetadata = await new Promise((resolve) => {
    return ffmpeg(uri).ffprobe((err, data) => resolve(data));
  });

  const sourceDuration = videoMetadata.format.duration;
  const sourceAudioStream = videoMetadata?.streams.find(
    (stream) => stream.codec_type === "audio"
  );

  const { start_time, duration } = sourceAudioStream;
  // const offset = sourceDuration - duration; // should equal start_time
  const filename = uri.split("/").pop();
  const spaceFilename = filename.replace(".mp4", "-delay.mp3");

  const delayPath = `../tmp/${spaceFilename}`;

  // If delay is less than one tenth of a second, don't add silence
  const shouldAddSilence = start_time > 0.1;
  if (shouldAddSilence) {
    // 1. Generate Silence
    await new Promise((resolve) => {
      const command = `ffmpeg -f lavfi -i anullsrc=r=44100:cl=mono -t ${start_time} -q:a 9 -acodec libmp3lame ${delayPath}`;
      return exec(command, (error, stdout, stderr) => {
        if (error) {
          console.error(`exec error: ${error}`);
          return resolve(null);
        }
        return resolve(null);
      });
    });

    // get metadata of new silence file
    const silenceMetadata = await new Promise((resolve) => {
      return ffmpeg(delayPath).ffprobe((err, data) => resolve(data));
    });

    console.log({ start_time, sourceAudioStream, silenceMetadata });
  }

  // 2. Generate Main Audio File
  const newfile = filename.replace(
    ".mp4",
    shouldAddSilence ? "-primary.mp3" : ".mp3"
  );
  const primaryAudioPath = `../tmp/${newfile}`;
  const mainWriteStream = createWriteStream(primaryAudioPath);

  await new Promise((resolve) => {
    return ffmpeg(uri)
      .inputFormat("mp4")
      .audioCodec("libmp3lame")
      .format("mp3")
      .on("progress", ({ percent }) => logProgress(percent))
      .on("end", (e, stdout, stderr) => resolve(stdout))
      .on("error", (e, stdout, stderr) => logError(e))
      .pipe(mainWriteStream, { end: true });
  });

  if (shouldAddSilence) {
    // 3. Combine Silence and Main Audio File
    const filesToMerge = [delayPath, primaryAudioPath];

    const finalPath = `../tmp/${filename.replace(".mp4", ".mp3")}`;
    await new Promise((resolve) => {
      ffmpeg()
        .input(`concat:${filesToMerge.join("|")}`)
        .output(finalPath)
        .on("progress", ({ percent }) => logProgress(percent))
        .on("end", (e, stdout, stderr) => resolve(stdout))
        .on("error", (e, stdout, stderr) => logError(e))
        .run();
    });
  }

  // 4. Cleanup - Delete Silence and Main Audio File

  if (shouldAddSilence) {
    await promises.unlink(delayPath);
    await promises.unlink(primaryAudioPath);
  }

  return;
}

// ************* RUN ************* //

async function run() {
  const file1 = process.env.LOCAL_FILE_URI;
  const file2 = process.env.LOCAL_FILE_URI2;
  const vodOutputDir = process.env.LOCAL_VOD_OUTPUT_DIR;

  const value = file1;

  await getFileMetadata(value); // Works
  // await compressVideo(value); // Works
  // await generateVodPlaylist(value, vodOutputDir); // Broken
  // await generateMP3FromMp4(value); // Works
  // await generateGif(value); // Works

  console.log("Done");
}

run();
