/*/
 * GENERATION
 * MAIN FUNCTION
/*/

import { promises } from "node:fs";
import ffmpeg, { FfprobeData, FfprobeStream } from "fluent-ffmpeg";
import utils from "../utils/utils";
import {
  M3U8Functions,
  M3U8GeneratedPaths,
  M3U8Post,
} from "../interfaces/m3u8.interface";

// ************* GENERATION ************* //

async function generateVodPlaylist(uri: string, setup: M3U8GeneratedPaths) {
  const { dirPath, outputDir, endFilePath } = setup;

  // Create destination folder...
  if (outputDir !== "") {
    await promises.mkdir(dirPath, { recursive: true });
    console.log({ message: `Created ${dirPath}` });
  }

  const response: string = await new Promise((resolve) => {
    return ffmpeg(uri)
      .outputOptions(["-codec: copy", "-hls_time 10", "-hls_playlist_type vod"])
      .on("progress", ({ percent }) => utils.logProgress(percent))
      .on("end", (e, stdout, stderr) => resolve(endFilePath))
      .on("error", (e, stdout, stderr) => utils.logError(e))
      .save(endFilePath);
  });

  return response;
}

function generatePaths(postId: string, uri: string, dirOut: string) {
  const uriSplit = uri.split("/").pop() || "";
  const splitname = uriSplit.split(".");
  const name = splitname[0];
  const fileName = `${name}.m3u8`;
  const dirBase = `../tmp/m3u8/${postId}/`;
  const outputDir = dirOut ? `${dirOut}/` : "";
  const dirPath = `${dirBase + outputDir}`;
  const endFilePath = `${dirPath + fileName}`;
  const response: M3U8GeneratedPaths = { dirPath, outputDir, endFilePath };
  return response;
}

async function getVideoDimens(uri: string): Promise<string> {
  return await new Promise((resolve) => {
    return ffmpeg.ffprobe(uri, (err: any, metadata: FfprobeData) => {
      if (err) {
        console.error(err);
        return resolve("");
      }

      const videoStream: any = metadata.streams.find(
        (stream: FfprobeStream) => stream.codec_type === "video"
      );

      if (videoStream) {
        const width: string = videoStream.width;
        const height: string = videoStream.height;
        const response: string = `${width}x${height}`;
        return resolve(response);
      } else {
        console.error("No video stream found.");
        return resolve("");
      }
    });
  });
}

function setupResolution(file: string, dimens: string) {
  const is1080p = dimens.includes("1080");
  const is720p = dimens.includes("720");

  if (is1080p) return { resolution: dimens, bandwidth: "1400000" };
  if (is720p) return { resolution: dimens, bandwidth: "800000" };

  console.log({ message: "Unknown file", body: file });
  return { resolution: undefined, bandwidth: undefined };
}

async function generateMasterPlaylist(
  id: string,
  files: Array<string>,
  baseDir: string
) {
  let masterPlaylist = "#EXTM3U\n#EXT-X-VERSION:3\n";
  await Promise.all(
    files.map(async (file: string) => {
      const dimens: string = await getVideoDimens(file);
      const { resolution, bandwidth } = setupResolution(file, dimens);

      const fileName = file.split(/[\\/]/).pop() || "";
      const postId = fileName.split(".")[0];
      const relativePath = postId + "/" + fileName;

      console.log({ baseDir, file, relativePath });
      masterPlaylist += `#EXT-X-STREAM-INF:BANDWIDTH=${bandwidth}, RESOLUTION=${resolution}\n${relativePath}\n`;
    })
  );

  // Write master playlist to file
  const masterPlaylistPath = baseDir + "/" + `${id}.m3u8`;
  await promises.writeFile(masterPlaylistPath, masterPlaylist);
  console.log({ message: `Created ${masterPlaylistPath}` });

  await utils.uploadAllFilesToCloud(baseDir);
  return masterPlaylistPath;
}

// ************* MAIN FUNCTION ************* //

async function generateVOD(file1: string, file2: string): Promise<void> {
  const post: M3U8Post = {
    id: "post_abc123",
    src: file1,
    src1080p: file1,
    src720p: file2,
  };

  const { id } = post;

  // Loop over keys from post object
  // - Get all key values containing src in the key
  // - Generate a vod playlist for each key value

  const paths: Array<string> = await Promise.all(
    Object.keys(post).map(async (key): Promise<string> => {
      if (key.includes("src") && key !== "src") {
        const fileUri: string = post[key];
        console.log({ key, fileUri });
        const fileName: string = fileUri.split("/").pop() || "";
        const name: string = fileName.split(".")[0];
        const setup: M3U8GeneratedPaths = generatePaths(id, fileUri, name);
        const srcRemoteM3u8 = await generateVodPlaylist(fileUri, setup);

        // Delete the tmp file after uploading to cloud
        return srcRemoteM3u8;
      } else return "";
    })
  );

  // Only register values that are not null
  const files: Array<string> = paths.filter((path) => path !== "");
  const dirBase = `../tmp/m3u8/${id}`;
  const masterPlaylist = await generateMasterPlaylist(id, files, dirBase);
  console.log({ masterPlaylist });

  const completedMessage = `Completed creating master playlist for post: ${id}`;
  console.log({ message: completedMessage });
  await utils.deleteTmpDirectory(dirBase);
}

const playlist: M3U8Functions = { generateVOD };
export default playlist;
