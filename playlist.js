/*/
 * GENERATE VIDEO ON DEMAND PLAYLIST
 * SUBFUNCTIONS
 * MAIN FUNCTIONS
/*/

import path from "path";
import * as dotenv from "dotenv";
import { promises } from "fs";
import ffmpeg from "fluent-ffmpeg";
dotenv.config();

function logProgress(progress) {
  if (progress) {
    console.log({ message: `Progress: ${progress.toFixed(2)}%` });
  } else {
    console.log({ message: "No progress..." });
  }
}

function logError(e) {
  console.log({ message: `Error: ${e.message}` });
}

// ************* GENERATE VIDEO ON DEMAND PLAYLIST ************* //

async function generateVodPlaylist(uri, setup) {
  const { dirPath, outputDir, endFilePath } = setup;

  // Create destination folder...
  if (outputDir !== "") {
    await promises.mkdir(dirPath, { recursive: true });
    console.log({ message: `Created ${dirPath}` });
  }

  const response = await new Promise((resolve) => {
    return ffmpeg(uri)
      .outputOptions(["-codec: copy", "-hls_time 10", "-hls_playlist_type vod"])
      .on("progress", ({ percent }) => logProgress(percent))
      .on("end", (e, stdout, stderr) => resolve(endFilePath))
      .on("error", (e, stdout, stderr) => logError(e))
      .save(endFilePath);
  });

  await uploadAllFilesToCloud(dirPath);
  return response;
}

// ************* SUBFUNCTIONS ************* //

function generatePaths(postId, uri, dirOut) {
  const uriSplit = uri.split("/").pop();
  const splitname = uriSplit.split(".");
  const name = splitname[0];
  const fileName = `${name}.m3u8`;
  const dirBase = `../tmp/m3u8/${postId}/`;
  const outputDir = dirOut ? `${dirOut}/` : "";
  const dirPath = `${dirBase + outputDir}`;
  const endFilePath = `${dirPath + fileName}`;
  const response = { dirPath, outputDir, endFilePath };
  return response;
}

async function getVideoDimens(uri) {
  return await new Promise((resolve) => {
    return ffmpeg.ffprobe(uri, (err, metadata) => {
      if (err) {
        console.error(err);
        return resolve(null);
      }

      const videoStream = metadata.streams.find(
        (stream) => stream.codec_type === "video"
      );

      if (videoStream) {
        const width = videoStream.width;
        const height = videoStream.height;
        const response = `${width}x${height}`;
        return resolve(response);
      } else {
        console.error("No video stream found.");
        return resolve(null);
      }
    });
  });
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
  const finalMessage = `Completed Deleting Dir: ${dirPath}`;
  console.log({ message: finalMessage });
}

function setupResolution(file, dimens) {
  const is1080p = dimens.includes("1080");
  const is720p = dimens.includes("720");

  if (is1080p) {
    return { resolution: dimens, bandwidth: "1400000" };
  }

  if (is720p) {
    return { resolution: dimens, bandwidth: "800000" };
  }

  console.log({ message: "Unknown file", body: file });
  return { resolution: undefined, bandwidth: undefined };
}

async function generateMasterPlaylist(id, files, baseDir) {
  let masterPlaylist = "#EXTM3U\n#EXT-X-VERSION:3\n";
  await Promise.all(
    files.map(async (file) => {
      const dimens = await getVideoDimens(file);
      const { resolution, bandwidth } = setupResolution(file, dimens);
      const relativePath = path.relative(baseDir, file);
      masterPlaylist += `#EXT-X-STREAM-INF:BANDWIDTH=${bandwidth}, RESOLUTION=${resolution}\n${relativePath}\n`;
    })
  );

  // Write master playlist to file
  const masterPlaylistPath = path.join(baseDir, `${id}.m3u8`);
  await promises.writeFile(masterPlaylistPath, masterPlaylist);
  console.log({ message: `Created ${masterPlaylistPath}` });
  return masterPlaylistPath;
}

// ************* MAIN FUNCTIONS ************* //

async function generateVOD() {
  const { LOCAL_FILE_URI, LOCAL_FILE_URI2 } = process.env;

  const post = {
    id: "post_abc123",
    src: LOCAL_FILE_URI,
    src1080p: LOCAL_FILE_URI,
    src720p: LOCAL_FILE_URI2,
  };

  const { id } = post;

  // Loop over keys from post object
  // - Get all key values containing src in the key
  // - Generate a vod playlist for each key value

  const paths = await Promise.all(
    Object.keys(post).map(async (key) => {
      if (key.includes("src") && key !== "src") {
        const fileUri = post[key];
        const fileName = fileUri.split("/").pop();
        const name = fileName.split(".")[0];
        // console.warn({ name });
        // const vodOutputDir = key.split("src")[1];
        const setup = generatePaths(id, fileUri, name);
        const srcRemoteM3u8 = await generateVodPlaylist(fileUri, setup);
        // Delete the tmp file after uploading to cloud
        return srcRemoteM3u8;
      } else return null;
    })
  );

  // Loop over paths: only register values that are not null
  const files = paths.filter((path) => path !== null);

  const dirBase = `../tmp/m3u8/${id}`;
  const masterPlaylist = await generateMasterPlaylist(id, files, dirBase);

  // Upload masterPlaylist to cloud
  console.log({ masterPlaylist });

  // Cleanup...
  await deleteTmpDirectory(dirBase);

  const completedMessage = `Completed create master playlist for post: ${id}`;
  console.log({ message: completedMessage });
}

async function run() {
  const filePath = await generateVOD();
}

run();
