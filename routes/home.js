const { Router } = require('express')
const passport = require('passport')
const { google } = require('googleapis')
const KEYS = require('../configs/keys')
var http = require('http');
var fs = require('fs');
const fetch = require('node-fetch');
const fileType = require('file-type');
var mime = require('mime-types');
var requestify = require('requestify');

const router = Router()

router.get('/', function(req, res) {
    res.render('home.html', { 'title': 'Application Home' })
})

router.get('/dashboard', function(req, res) {

    // if not user
    if (typeof req.user == "undefined") res.redirect('/auth/login/google')
    else {

        let parseData = {
            title: 'DASHBOARD',
            googleid: req.user._id,
            name: req.user.name,
            avatar: req.user.pic_url,
            email: req.user.email
        }

        // if redirect with google drive response
        if (req.query.file !== undefined) {

            // successfully upload
            if (req.query.file == "upload") parseData.file = "uploaded"
            else if (req.query.file == "notupload") parseData.file = "notuploaded"
        }

        res.render('dashboard.html', parseData)
    }
})

router.post('/upload', function(req, res) {

    // not auth
    if (!req.user) res.redirect('/auth/login/google')
    else {
        // auth user

        // config google drive with client token
        const oauth2Client = new google.auth.OAuth2()
        oauth2Client.setCredentials({
            'access_token': req.user.accessToken
        });

        const drive = google.drive({
            version: 'v3',
            auth: oauth2Client
        });

        // d = req.files.file_upload;
        // console.log(d)
        var url1 = req.body.url1;
        console.log(url1);
        var dest = url1.substring(url1.lastIndexOf('/') + 1);


        function download(url1, dest, callback) {
            var file = fs.createWriteStream(dest);
            var request = http.get(url1, function(response) {
                response.pipe(file);

                file.on('finish', function() {
                    file.close(callback); // close() is async, call callback after close completes.
                });
                file.on('error', function(err) {
                    fs.unlink(dest); // Delete the file async. (But we don't check the result)
                    if (callback)
                        callback(err.message);
                });
            });

        };
        download(url1, dest, function(err) {
            if (err) {
                console.error(err);
            } else {
                console.log("Download complete");
                filename = dest;
                mimetype = mime.lookup(dest);
                // filename='abc';

                const driveResponse = drive.files.create({
                    requestBody: {
                        name: filename,
                        mimeType: mimetype
                    },
                    media: {
                        mimeType: mimetype,
                        body: fs.createReadStream(dest)
                    }
                });

                driveResponse.then(data => {

                    if (data.status == 200) res.redirect('/dashboard?file=upload') // success
                    else res.redirect('/dashboard?file=notupload') // unsuccess

                }).catch(err => { throw new Error(err) })

            }
        });
    }
})



module.exports = router