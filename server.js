const express = require("express");
const axios = require("axios");
const cors = require("cors");

const app = express()

app.use(express.json())
app.use(cors());


app.get("/api/classify", async (req, res) => {
    try {
        const { name } = req.query;

        if (!name || name.trim() === "") {
            return res.status(400).json({
                status: "error",
                message: "Missing or empty name parameter"
            });
        }

        if (typeof name !== "string") {
            return res.status(422).json({
                status: "error",
                message: "name is not a string",
            });
        }

        const response = await axios.get( `https://api.genderize.io?name=${name}`)
        const data = response.data

        if (!data.gender || data.count === 0) {
            return res.status(400).json({
                status: "error",
                message: "No prediction available for the provided name",
            });
        }
        
        const probability = data.probability;
        const sample_size = data.count;

        const is_confident = probability >= 0.7 && sample_size >= 100;

        const processed_at = new Date().toISOString();

        return res.status(200).json({
            status: "success",
            data: {
                name: data.name,
                gender: data.gender,
                probability,
                sample_size,
                is_confident,
                processed_at,
            }
        })
    } catch (error) {
       if (error.response) {
            // Genderize API returned an error status
            return res.status(502).json({
                status: "error",
                message: "Upstream service error"
            });
        } else if (error.request) {
            // No response from Genderize (network error)
            return res.status(502).json({
                status: "error",
                message: "Upstream service unavailable"
            });
        
    } else {
        return res.status(500).json({
                status: "error",
                message: "Something went wrong"
            });
        }

    }
})


const PORT = process.env.PORT || 9000;

app.listen(PORT, () => {
    console.log(`Server is running on http://localhost:${PORT}`)
})