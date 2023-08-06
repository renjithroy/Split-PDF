// Import required modules and libraries
const path = require('path');
const express = require('express');
const cors = require('cors');
const multer = require('multer');
const { PDFDocument, rgb } = require('pdf-lib');
const fs = require('fs'); // fs module to work with the file system

const app = express();

// Middleware setup

// Enable CORS to interact with frontend
app.use(cors());

// Parse JSON data in the request body
app.use(express.json());

// Parse URL-encoded data in the request body
app.use(express.urlencoded({ extended: true }));

// Multer setup

// Define the destination and filename for storing uploaded files
const storage = multer.diskStorage({
    destination: (req, file, cb) => {
        cb(null, "./uploads/") //specify the upload path of the file
    },
    filename: (req, file, cb) => {
        cb(null, Date.now() + "-" + file.originalname)
    },
});

// Filter function to accept only PDF files for upload
const pdfFileFilter = (req, file, cb) => {
    if (file.mimetype === 'application/pdf') {
        cb(null, true); // Accept the file
    } else {
        cb(new Error('Only PDF files are allowed!'), false); // Reject the file
    }
};

// Configure multer with the storage and file filter
const uploadStorage = multer({
    storage: storage,
    fileFilter: pdfFileFilter,
});

// Routes

// Route to handle PDF upload and modification
app.post('/api/upload', uploadStorage.single('pdfFile'), async (req, res) => {
    
    // Check if a file was uploaded
    if (!req.file) {
        return res.status(400).json({ error: 'No file uploaded' });
    }

    // Read the uploaded PDF file into a buffer
    const pdfBuffer = await fs.promises.readFile(req.file.path);

    // Load the PDF document using pdf-lib
    const pdfDoc = await PDFDocument.load(pdfBuffer);

    // Extract the selectedPages parameter from the query string
    const { selectedPages } = req.query;
    // console.log("Selected Pages:", selectedPages);

    // Create a new PDF document to store the modified pages
    const newPdfDoc = await PDFDocument.create();

    // Copy the selected pages from the original PDF to the new document
    const copiedPages = await newPdfDoc.copyPages(pdfDoc, selectedPages.map(page => page - 1)); // [ 1, 2, 5] || Adjust index here
    copiedPages.forEach(page => newPdfDoc.addPage(page));

    // Generate a unique filename for the modified PDF based on the current timestamp
    const timestamp = new Date().getTime();
    const fileName = `modified_${timestamp}.pdf`;
    const outputPath = path.join('./uploads/', fileName);

    // Save the modified PDF document as bytes
    const pdfBytes = await newPdfDoc.save();

    // Write the bytes to the output file
    fs.writeFileSync(outputPath, pdfBytes);

    // Send the modified PDF as a downloadable file to the client
    res.download(outputPath, fileName, (err) => {
        if (err) {
            console.error("Error sending the file:", err);
            return res.status(500).json({ error: 'Failed to download the file' });
        }
    });

});

// Route to fetch PDF files using its name
app.get('/api/:filename', (req, res) => {

    const filename = req.params.filename;
    const directoryPath = path.dirname(__filename); // /Users/renjithroy/Documents/PDF Extractor/backend
    const filePath = path.join(directoryPath, 'uploads', filename); // /Users/renjithroy/Documents/PDF Extractor/backend/uploads/modified_1691329323065.pdf

    // Check if the file exists using fs.existsSync()
    if (!fs.existsSync(filePath)) {
        // If the file does not exist, send a 404 Not Found response with an error message
        return res.status(404).json({ message: 'Requested file not found on the server' });
    }

    // If the file exists, send it to the client using res.sendFile()
    res.sendFile(filePath);
});

// Start the server and listen on port 5000
app.listen(5000, () => {
    console.log("Server is up and running on port 5000");
});
