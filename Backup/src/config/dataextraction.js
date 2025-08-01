const axios = require('axios');
const fs = require('fs');
const path = require('path');
const cardmodel = require("../models/card.model");

// Replace with your Gemini API Key
const GEMINI_API_KEY = 'AIzaSyCUANfBBE1DUG81RG1Oaie-85MUMpqJh6I';

module.exports = {

  extractBusinessCardInfo: async (imagedata, cardid, info) => {
    try {
      // Validate input
      if (!imagedata || !Array.isArray(imagedata) || imagedata.length === 0) {
        throw new Error('No image data provided');
      }

      const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${GEMINI_API_KEY}`;

      // Create the parts array starting with the text prompt
      const parts = [
      {
        text: `Extract the following information from the business card image(s) provided and translate ALL text to English. 
              If the business card is in any language other than English, translate the extracted information to English.
              If information is not present write null. If multiple images are provided, combine the information from all images.
              
              CRITICAL INSTRUCTIONS FOR ADDRESS EXTRACTION:
              - Read the COMPLETE address from ALL lines - addresses are often written across 2-3 lines
              - Combine all address lines into a single complete address string
              - Include street address, building names, area/locality, landmarks - everything related to location
              - Look for address components that might be separated by line breaks, commas, or spacing
              - Don't stop at the first line - capture the entire address block
              
              Other Important Instructions:
              - Translate company names, person names, addresses, and all text content to English
              - Keep phone numbers, emails, and URLs as they are
              - For addresses, provide both the original format and English translation if different
              - Pay special attention to multi-line addresses and combine them properly
              
              Output the information in JSON format as below:
              {
                "Company Name": "null",
                "Person details":[{
                                  "Name":"null",
                                  "Phone Number":"null", 
                                  "Email":"null",
                                  "Position":"null"
                                }],
                "Company Phone Number": ["null"],
                "Company Address":"null",
                "Country":"null",
                "State":"null", 
                "City":"null",
                "Pincode":"null",
                "Company Email": "null",
                "Web Address": "null",
                "Company's Work Details": "null",
                "Original Language": "null",
                "Translation Notes": "null"
              }`
      }
    ];

      // Process each image in the array
      imagedata.forEach((image, index) => {
        try {
          // Extract base64 string from data URL
          const base64String = String(image).split('base64,')[1];
          
          if (!base64String) {
            console.warn(`Image ${index + 1} does not contain valid base64 data, skipping...`);
            return;
          }

          // Add image to parts array
          parts.push({
            inline_data: {
              mime_type: 'image/jpeg',
              data: base64String
            }
          });

          console.log(`Added image ${index + 1} to processing queue`);
        } catch (imageError) {
          console.warn(`Error processing image ${index + 1}:`, imageError.message);
        }
      });

      // Check if we have at least one valid image
      if (parts.length === 1) {
        throw new Error('No valid images found after processing');
      }

      const requestBody = {
        contents: [
          {
            parts: parts
          }
        ]
      };

      console.log(`Processing ${parts.length - 1} image(s) with Gemini API...`);

      const response = await axios.post(url, requestBody, {
        headers: {
          'Content-Type': 'application/json'
        }
      });

      const result = response.data;
      const output = result.candidates?.[0]?.content?.parts?.[0]?.text;

      if (!output) {
        throw new Error('No output received from Gemini API');
      }

      // Clean and parse the JSON response
      const cleaned = output.replace(/```json\s*([\s\S]*?)\s*```/, '$1').trim();
      const json = JSON.parse(cleaned);

      console.log("-------",json);
      
      
      // Insert the extracted data
      await cardmodel.insertextracteddata(json, cardid, info);
      
      console.log(`Successfully processed ${parts.length - 1} image(s) and extracted data`);
      const newjson = await cardmodel.getcardlistsbyid(cardid);
      // console.log("==== ",newjson);
      
      return newjson.data;

    } catch (error) {
      console.error("Error in extractBusinessCardInfo:", error.response?.data || error.message);
      
      // You might want to handle different types of errors differently
      if (error.response?.status === 429) {
        console.error("Rate limit exceeded. Please try again later.");
      } else if (error.response?.status === 400) {
        console.error("Bad request. Check your image data format.");
      }
      
      throw error; // Re-throw to let calling code handle it
    }
  }
}