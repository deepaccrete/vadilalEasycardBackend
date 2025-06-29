require('dotenv').config();
const express = require('express');
const cookieParser = require('cookie-parser');
const fs = require('fs');
const path = require('path');
const morgan = require('morgan');
const winston = require('./config/winston')
const cors = require('cors');
const fetch = (...args) => import('node-fetch').then(({ default: fetch }) => fetch(...args));
// const fetch = require('node-fetch');

const SERVER_PORT = process.env.SERVER_PORT || 8001;
const app = express();

app.use(cors())
app.use(express.json());
app.use(cookieParser());

app.use(morgan('combined', { stream: winston.stream, skip: function (req, res) { return res.statusCode < 400 } }));

// Function to load routes dynamically
const loadRoutes = (dir) => {
    // console.log('Loading routes from directory :- ', dir);
    try{

        fs.readdirSync(dir).forEach((file) => {
        const filePath = path.join(dir, file);
        // console.log('Checking file :- ', filePath);

        if (fs.lstatSync(filePath).isDirectory()) {
            loadRoutes(filePath);
        } else if (file.endsWith('.js')) {
            // Import the route file
            const route = require(filePath);
            
            if (route.path && route.router) {
                // Register the route
                app.use(`/api/v1${route.path}`, route.router);
            }
        }
    });
    }catch(e){
        console.log('error in cache--------------------------------', e);
    }
    
};

// Load all routes from the 'routes' directory
loadRoutes(path.join(__dirname, 'routes'));

process.on('unhandledRejection', async (reason, promise) => {
    console.log('reason >>>>>>>>>>>>>>>>>>', reason);
    try {
        let data = {
            error: String(reason.stack),
            message: reason.message,
            errortype: "unhandled",
        };
        data = JSON.stringify(data);
        // console.log('data.................', data);
        // await fetch(`${process.env.SYNCAPIURL}/adminpanelerror/adderror`, {
        //     method: 'POST',
        //     headers: { 'Content-Type': 'application/json', 'apikey': 'cjk$202js98dxk#%!#89' },
        //     body: data,
        // });
    } catch (error) {
        winston.error(error)
    }

    if (process.env.NODE_ENV === 'production') {
        // console.log('reason++++++---------+++++++', reason);
        winston.error(reason)
        // Handle production errors
    }
});

app.use(async function (err, req, res, next) {
    try {
        let data = {
            error: String(err.stack),
            message: err.message,
            errortype: "handled",
        };
        data = JSON.stringify(data);
        // await fetch(`${process.env.SYNCAPIURL}/adminpanelerror/adderror`, {
        //     method: 'POST',
        //     headers: { 'Content-Type': 'application/json', 'apikey': 'cjk$202js98dxk#%!#89' },
        //     body: data,
        // });
    } catch (error) {
        winston.error(error)
        console.log('error >>>>>>>>>>>>>>>>>>>>', error);
    }

    if (req.xhr) {
        res.status(err.statusCode).json({ success: 0, msg: err.message });
    } else {
        // res.status(err.status || 500).render('error', { doc: err.message });
        res.status(err.statusCode || 500).json({ success: 0, msg: err.message });
    }
});

// Route for handling 404 requests (unavailable routes)
app.use(function (req, res, next) {
    res.status(404).json({ success: 0, msg: `Sorry can't find that!` });
});

app.listen(SERVER_PORT, (err) => {
    console.log('Server listening on PORT ' + SERVER_PORT);
});
