/*/
 * CREATE MP3 FROM MP4
 * RUN
/*/

import * as dotenv from "dotenv";
import { createWriteStream, promises } from "node:fs";
import { exec } from "child_process";
import ffmpeg from "fluent-ffmpeg";
import utils from "./utils/utils.js";
dotenv.config();

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
    console.log({ message: "Generate Silent Audio File" });
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
      .on("progress", ({ percent }) => utils.logProgress(percent))
      .on("end", (e, stdout, stderr) => resolve(stdout))
      .on("error", (e, stdout, stderr) => utils.logError(e))
      .pipe(mainWriteStream, { end: true });
  });

  if (shouldAddSilence) {
    console.log({ message: "Combine Silence With Audio File" });
    // 3. Combine Silence and Main Audio File
    const filesToMerge = [delayPath, primaryAudioPath];

    const finalPath = `../tmp/${filename.replace(".mp4", ".mp3")}`;
    await new Promise((resolve) => {
      ffmpeg()
        .input(`concat:${filesToMerge.join("|")}`)
        .output(finalPath)
        .on("progress", ({ percent }) => utils.logProgress(percent))
        .on("end", (e, stdout, stderr) => resolve(stdout))
        .on("error", (e, stdout, stderr) => utils.logError(e))
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
  const value = file1;

  await generateMP3FromMp4(value);

  console.log("Done");
}

run();
