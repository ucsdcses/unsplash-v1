import multer, { memoryStorage } from "multer";
import express from "express";
import bodyParser from 'body-parser';
import { Storage } from "@google-cloud/storage";
import dotenv from 'dotenv';

dotenv.config();

// configure dotenv so as to fetch environment variables from the .env file
const googleCloudStorage = new Storage({
  projectId: process.env.GCLOUD_STORAGE_PROJECT,
  keyFilename: process.env.GCLOUD_KEY_FILE // this keyfile should be .gitignored
});

const app = express(); // start a server
app.use(bodyParser.urlencoded({ extended: true }));
app.use(express.static(__dirname + '/public'));

// Multer is required to upload files from the client side and make it available in req.files
const m = multer({
  storage: memoryStorage(),
  limits: {
    fileSize: 4 * 1024 * 1024 // no larger than 4mb
  }
});

// A bucket is like a folder (directory to store files/images)
const bucket = googleCloudStorage.bucket(process.env.GCLOUD_STORAGE_BUCKET);

// Helper function to retrieve the image url of a file uploaded to google cloud storage
function getPublicUrl(bucket, blob) {
  // template string syntax equivalent: printf ("https://storage.googleapis.com/%s/%s" bucket.name, blob.name)
  return `https://storage.googleapis.com/${bucket.name}/${blob.name}`;
}


app.get('/', function (req, res) {
  res.sendFile(__dirname + '/public/html/index.html');
});

app.get('/upload', function (req, res) {
  res.sendFile(__dirname + '/public/html/upload.html');
});

/**
 * @api /photos
 * @get
 * @response [String] array of public urls to images stored in the bucket
 * @description Get all the photos stored in the bucket of the google cloud storage and send the public urls of these images as a response
 */
app.get('/photos', async function (req, res) {
  // Lists files in the bucket present in the google cloud bucket
  try {
    const [files] = await googleCloudStorage.bucket(process.env.GCLOUD_STORAGE_BUCKET).getFiles();

    if (files == null) {  // check if the returned files are valid
      res.status(400).send([]);
    }

    let imgUrls = []
    // loop through the files to get file names
    for (let file of files) {
      imgUrls.push(getPublicUrl(bucket, file));
    }

    // send these imgUrls over to the browser as a response
    res.status(200).send(imgUrls);
  } catch (err) {
    console.log('Error: ', err);
    res.send(404).send("Error: Could not fetch photos from google cloud storage");  // not found error
  }
});

/**
 * @api /upload
 * @post 
 * @response [String] List containing the url of the file just <uploaded></uploaded>
 * @description Post a file from the client to node.js and then store it in cloud storage and send the url back to the client
 */
app.post("/upload", m.single("file"), function (req, res, next) {
  // the file is available in req.file
  console.debug('File uploaded by user: ', req.file);

  if (!req.file) {
    res.status(400).send("No file uploaded.");  // 400 is an error code. Link: https://www.restapitutorial.com/httpstatuscodes.html
    return;
  }

  // Create a new blob in the bucket and upload the file data.
  const blob = bucket.file(req.file.originalname);    // originalname is a property available through the user upload itself

  // Make sure to set the contentType metadata for the browser to be able
  // to render the image instead of downloading the file (default behavior)
  // Reference Link: https://cloud.google.com/nodejs/getting-started/using-cloud-storage#upload_to_cloud_storage
  const blobStream = blob.createWriteStream({
    metadata: {
      contentType: req.file.mimetype // https://stackoverflow.com/questions/3828352/what-is-a-mime-type
    }
  });

  blobStream.on("error", err => { // event handler for when an error occurs
    next(err);
    return;
  });

  blobStream.on("finish", () => {
    // The public URL can be used to directly access the file via HTTP.
    const publicUrl = getPublicUrl(bucket, blob);

    // Make the image public to the web (since we'll be displaying it in browser)
    blob.makePublic().then(() => {
      console.log(`File successfully uploaded to: ${publicUrl}`);
      res.redirect('/');  // redirect to the home page upon successful upload
    });

  });

  blobStream.end(req.file.buffer);  // end the stream
});

const PORT = process.env.PORT || 8080;
app.listen(PORT, () => {
  console.log(`App listening on port ${PORT}`);
  console.log("Press Ctrl+C to quit.");
});
