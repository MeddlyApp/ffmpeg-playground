/*/ 
 * LOGGING FUNCTIONS
 * UTILITY FUNCTIONS
 * 
/*/

import path from "path";
import { promises } from "node:fs";

// ************* LOGGING FUNCTIONS ************* //

function logProgress(p) {
  if (p) console.log({ message: `Progress: ${p.toFixed(2)}%` });
  else console.log({ message: "No progress..." });
}

function logError(e) {
  if (e && e.message) console.log({ message: `Error: ${e.message}` });
  else console.log({ error: e });
}

// ************* UTILITY FUNCTIONS ************* //

async function deleteTmpDirectory(dirPath) {
  const entries = await promises.readdir(dirPath, { withFileTypes: true });
  // Delete all files within the destination folder
  await Promise.all(
    entries.map(async (entry) => {
      const fullPath = `${entry.path + "/" + entry.name}`;

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

  await promises.rmdir(dirPath);
  const finalMessage = `Completed Deleting Dir: ${dirPath}`;
  console.log({ message: finalMessage });
}

async function uploadAllFilesToCloud(dirPath) {
  const startMessage = `Uploading files to cloud...`;
  console.log({ message: startMessage });

  const entries = await promises.readdir(dirPath, {
    withFileTypes: true,
  });

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

const utils = {
  logProgress,
  logError,
  deleteTmpDirectory,
  uploadAllFilesToCloud,
};

export default utils;
