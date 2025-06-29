const axios = require('axios');
const fs = require('fs');
const path = require('path');
const cardmodel = require("../models/card.model");

// Replace with your Gemini API Key
const GEMINI_API_KEY = 'AIzaSyCUANfBBE1DUG81RG1Oaie-85MUMpqJh6I';

module.exports = {

  extractBusinessCardInfo: async (imagedata,cardid,info) => {
    const img1base64String = String(imagedata[0]).split('base64,')[1];
    // const img2base64String = imagedata[1].split('base64,')[1];

    const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${GEMINI_API_KEY}`;

    const requestBody = {
      contents: [
        {
          parts: [
            {
              text: `Extract the following information from the business card image provided. 
                    If information is not present write null. Output the information in JSON format as below :
                    {
                      "Company Name": "null",
                      "Person details":[{
                                        "Name":"null",
                                        "Phone Number":"null",
                                        "Email":"null",
                                        "Position":"null"
                                      }],
                      "Company Phone Number": ["null"],
                      "Company Address": ["null"],
                      "Company  Email": "null",
                      "Web Address": "null",
                      "Company's Work Details": "null",
                      "GSTIN": "null"
                    }`
            },
            {
              inline_data: {
                mime_type: 'image/jpeg',
                data:img1base64String
              }
            },
            // {
            //   inline_data: {
            //     mime_type: 'image/jpeg',
            //     data: img2base64String
            //   }
            // }
          ]
        }
      ]
    };

    try {
      const response = await axios.post(url, requestBody, {
        headers: {
          'Content-Type': 'application/json'
        }
      });

      const result = response.data;
      const output = result.candidates?.[0]?.content?.parts?.[0]?.text;
      const cleaned = output.replace(/```json\s*([\s\S]*?)\s*```/, '$1').trim();
       const json = JSON.parse(cleaned);
        cardmodel.insertextracteddata(json, cardid, info);
      // console.log("Extracted Info:\n", json);

    } catch (error) {
      console.error("Error calling Gemini API:", error.response?.data || error.message);
    }
  }
}
