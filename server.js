require("dotenv").config();
const mongoose = require("mongoose");
const express = require("express");
const axios = require("axios");
const cors = require("cors");
const { v7: uuidv7 } = require("uuid");

const app = express()

app.use(express.json())
app.use(cors());
 
mongoose.connect(process.env.MONGO_URI)
.then(() => console.log("MongoDB connected"))
.catch(err => console.log(err));





const profileSchema = new mongoose.Schema({
    id: String,
    name: String,
    gender: String,
    gender_probability: Number,
    sample_size: Number,
    age: Number,
    age_group: String,
    country_id: String,
    country_probability: Number,
    created_at: String
});

const Profile = mongoose.model("Profile", profileSchema)


app.get("/api/classify", async (req, res) => {
    try {
        const { name } = req.query;

        if (!name || name.trim() === "") {
            return res.status(400).json({
                status: "error",
                message: "Missing or empty name parameter"
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

app.post("/api/profiles", async (req, res) => {
    try {
        const {name} = req.body;

        if(!name){
            return res.status(400).json({
                status: "error",
                message: "Missing or empty name"
            })
        }

         if (typeof name !== "string") {
            return res.status(422).json({
                status: "error",
                message: "Invalid type"
            });
        }

        const existing = await Profile.findOne({ 
    name: { $regex: new RegExp(`^${name}$`, 'i') }
});

        if(existing){
            return res.status(201).json({
                status: "success",
                message: "Profile already exists",
                data: existing
            })
        }

        const [genderRes, ageRes, countryRes] = await Promise.all([
            axios.get(`https://api.genderize.io?name=${name}`),
            axios.get(`https://api.agify.io?name=${name}`),
            axios.get(`https://api.nationalize.io?name=${name}`)
        ]);

        const genderData = genderRes.data;
        const ageData = ageRes.data;
        const countryData = countryRes.data;

        if (!genderData.gender || genderData.count === 0) {
    return res.status(502).json({
        status: "error",
        message: "Genderize returned an invalid response"
    });
}

if (!ageData.age && ageData.age !== 0) {  // age could be 0
    return res.status(502).json({
        status: "error",
        message: "Agify returned an invalid response"
    });
}

if (!countryData.country || countryData.country.length === 0) {
    return res.status(502).json({
        status: "error",
        message: "Nationalize returned an invalid response"
    });
}

        const topCountry = countryData.country.sort((a, b) => b.probability - a.probability)[0];
        
        let age_group;
        if(ageData.age <=12) age_group = "child";
        else if (ageData.age <=19) age_group = "teenager";
        else if(ageData.age <=59) age_group = "adult";
        else age_group = "senior";


        const newProfile = new Profile({
            id: uuidv7(),
            name,
            gender: genderData.gender,
            gender_probability: genderData.probability,
            sample_size: genderData.count,
            age: ageData.age,
            age_group,
            country_id: topCountry.country_id,
            country_probability: topCountry.probability,
            created_at: new Date().toISOString()
        });

        await newProfile.save();

        return res.status(201).json({
            status: "success",
            data: newProfile
        })

        


    } catch (error) {
        return res.status(500).json({
            status: "error",
            message: "Something went wrong"
        });
        
    }
});

app.get("/api/profiles", async (req, res) => {
    try {
        const { gender, country_id, age_group } = req.query;
        
        let filter = {};
        
        if (gender) {
            filter.gender = { $regex: new RegExp(`^${gender}$`, 'i') };
        }
        
        if (country_id) {
            filter.country_id = { $regex: new RegExp(`^${country_id}$`, 'i') };
        }
        
        if (age_group) {
            filter.age_group = { $regex: new RegExp(`^${age_group}$`, 'i') };
        }
        
        const profiles = await Profile.find(filter);
        
        
        const formattedProfiles = profiles.map(p => ({
            id: p.id,
            name: p.name,
            gender: p.gender,
            age: p.age,
            age_group: p.age_group,
            country_id: p.country_id
        }));
        
        return res.status(200).json({
            status: "success",
            count: formattedProfiles.length,
            data: formattedProfiles
        });
        
    } catch (error) {
        return res.status(500).json({
            status: "error",
            message: "Something went wrong"
        });
    }
});

app.get("/api/profiles/:id", async (req, res) => {
    const profile = await Profile.findOne({ id: req.params.id });

    if (!profile) {
        return res.status(404).json({
            status: "error",
            message: "Profile not found"
        });
    }

    res.json({
        status: "success",
        data: profile
    });
});


app.delete("/api/profiles/:id", async (req, res) => {
    const profile = await Profile.findOneAndDelete({ id: req.params.id });
    
    if (!profile) {
        return res.status(404).json({
            status: "error",
            message: "Profile not found"
        });
    }
    
    res.status(204).send();
});

const PORT = process.env.PORT || 9000

app.listen(PORT, () => {
    console.log(`Server is running on http://localhost:${PORT}`)
})