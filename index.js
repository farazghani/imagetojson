const express = require('express');
const app = express();
const multer = require('multer');
const sharp = require('sharp');
const path = require('path');
const tesseract = require('tesseract.js');
const { GoogleGenerativeAI } = require("@google/generative-ai");
require('dotenv').config();

const port = 3000;

const upload = multer({ dest: 'uploads/' });
const genAI = new GoogleGenerativeAI(process.env.API_KEY);

app.use(express.static('public'));

async function preprocessImage(filePath) {
    const processedPath = `${filePath}-processed.png`; // Generate a new file name
    await sharp(filePath)
        .grayscale() // Convert to grayscale
        .resize(800, 600) // Resize for better OCR performance
        .toFile(processedPath); // Save the processed file

    return processedPath; // Return the path to the processed image
}

async function extractText(imagePath) {
    try {
        const { data: { text } } = await tesseract.recognize(imagePath, 'eng');
        return text;
    } catch (error) {
        console.error('Error during OCR:', error);
        throw new Error('Failed to extract text.');
    }
}

async function texttoJson(text, genAI) {
    const prompt = ` Convert the following menu text into a structured JSON format. Ensure the JSON includes categories, item names, descriptions, and prices:
        ${text}`;
    const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });

    const result = await model.generateContent(prompt);
    return result.response.text(); // Return summary text
}



app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'view.html'));

})

app.post('/upload', upload.single('menu'), async (req, res) => {

    try {
        const filePath = req.file.path;
        const processedfile = await preprocessImage(filePath);
        const extractedText = await extractText(processedfile);
        const respJson = await texttoJson(extractedText, genAI);
        res.status(200).send({ message: 'file processed successfully', respJson });


    } catch (error) {
        res.status(500).send({ error: error.message });
    }

});




app.listen(port, () => {
    console.log(`app listening on port ${port}`);
})