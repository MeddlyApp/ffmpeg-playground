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

async function generateVodPlaylist(uri, test) {
  const { dirPath, outputDir, endFilePath } = test;

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

  // Upload all files within the destination folder to cloud
  await uploadAllFilesToCloud(dirPath);

  // Cleanup destination folder...
  // await deleteTmpDirectory(dirPath);

  return response;
}

// ************* SUBFUNCTIONS ************* //

function generatePaths(postId, uri, dirOut) {
  const filename = uri.split("/").pop();
  const splitname = filename.split(".");
  const name = splitname[0];

  const fileName = `${name + `${dirOut ? "_" + dirOut : ""}`}.m3u8`;
  const dirBase = `../tmp/m3u8/${postId}/`;
  const outputDir = dirOut ? `${dirOut}/` : "";
  const dirPath = `${dirBase + outputDir}`;

  const endFilePath = `${dirBase + outputDir + fileName}`;

  const response = { dirPath, outputDir, endFilePath };
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

async function generateMasterPlaylist(files, baseDir) {
  let masterPlaylist = "#EXTM3U\n#EXT-X-VERSION:3\n";
  files.forEach((file) => {
    let resolution, bandwidth;
    //TODO: get these values dynamically or set them manually
    switch (path.basename(file)) {
      case "720p.m3u8":
        resolution = "720x1280";
        bandwidth = "800000";
        break;
      case "1080p.m3u8":
        resolution = "1080x1920";
        bandwidth = "1400000";
        break;
      default:
        console.log("Unknown file", file);
        return;
    }
    const relativePath = path.relative(baseDir, file);
    masterPlaylist += `#EXT-X-STREAM-INF:BANDWIDTH=${bandwidth},RESOLUTION=${resolution}\n${relativePath}\n`;
  });

  return masterPlaylist;
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
        const vodOutputDir = key.split("src")[1];
        const setup = generatePaths(id, fileUri, vodOutputDir);
        const srcRemoteM3u8 = await generateVodPlaylist(fileUri, setup);

        // Delete the tmp file after uploading to cloud
        await deleteTmpDirectory(setup.dirPath);
        return srcRemoteM3u8;
      } else return null;
    })
  );

  // Remove directory with name of postId
  const dirBase = `../tmp/m3u8/${id}`;
  await deleteTmpDirectory(dirBase);

  // Loop over paths: only register values that are not null
  const files = paths.filter((path) => path !== null);

  // Generate master playlist from files
  const masterPlaylist = await generateMasterPlaylist(files, dirBase);

  console.log({ files });
}

async function run() {
  const filePath = await generateVOD();
}

run();
