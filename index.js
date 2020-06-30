var express = require("express");
var bodyParser = require("body-parser");
// create DB
var MongoClient = require("mongodb").MongoClient;
var ObjectID = require("mongodb").ObjectID;
var db;
var init = () => {
    var url =
        "mongodb://localhost:27017/myvideos";
    console.log("- connecting to dabatase");
    MongoClient.connect(url, (err, _db) => {
        if (err) {
            console.log(" - unable to open connection");
            process.exit();
        } else {
            console.log(" - connection opened");
            db = _db;
        }
    });
};
init();
// create app
var app = express();
// mount middlewares
// - CORS
app.use(function (req, res, next) {
    res.header("Access-Control-Allow-Origin", "*");
    res.header("Access-Control-Allow-Methods", "OPTIONS,GET,PUT,POST,DELETE");
    res.header("Access-Control-Allow-Headers", "Content-Type");
    if (req.method == "OPTIONS") {
        res.status(200).send();
    } else {
        next();
    }
});
app.use(express.static("../MyVideosApp/www"));
app.use(bodyParser.json({ limit: "10mb" }));
app.use(function (req, res, next) {
    console.log(req.method + ":" + req.url);
    if (
        !req.url.startsWith("/myvideos") ||
        req.url === "/myvideos/sessions" ||
        (req.url === "/myvideos/users" && req.method === "POST")
    ) {
        next();
    } else if (!req.query.token) {
        res.send(401, "Token missing");
    } else {
        db.collection("users").findOne(
            { _id: ObjectID.createFromHexString(req.query.token) },
            (err, doc) => {
                if (err) res.send(500);
                else if (!doc) res.send(401, "Invalid token");
                else next();
            }
        );
    }
});

///// ALL ROUTES //////
// Login
app.post("/myvideos/sessions", function (req, res) {
    console.log("POST /myvideos/sessions");
    if (!req.body.email || !req.body.password) res.send(400, "Missing data");
    else {
        db.collection("users").findOne(
            { email: req.body.email, password: req.body.password },
            (err, doc) => {
                if (err) res.send(500);
                else if (!doc) res.send(401);
                else
                    res.send({
                        userId: doc._id.toHexString(),
                        token: doc._id.toHexString()
                    });
            }
        );
    }
});

// Users
app.get("/myvideos/users", function (req, res) {
    console.log("GET /myvideos/user/");
    db.collection("users")
        .find()
        .toArray((err, docs) => {
            if (err) res.send(500);
            else
                res.send(
                    docs.map(doc => {
                        var user = {
                            id: doc._id.toHexString(),
                            email: doc.email,
                            name: doc.name,
                            surname: doc.surname
                        };
                        return user;
                    })
                );
        });
});
app.post("/myvideos/users", function (req, res) {
    console.log("POST /myvideos/users");
    if (
        !req.body.email ||
        !req.body.password ||
        !req.body.name ||
        !req.body.surname
    )
        res.send(400, "Missing data");
    else {
        var user = {
            email: req.body.email,
            password: req.body.password,
            name: req.body.name,
            surname: req.body.surname
        };
        db.collection("users").insertOne(user, (err, result) => {
            if (err) res.send(500);
            else
                res.send({
                    id: result.insertedId.toHexString(),
                    name: user.name,
                    surname: user.surname,
                    email: user.email
                });
        });
    }
});
app.get("/myvideos/users/:userId", function (req, res) {
    console.log("GET /myvideos/users/" + req.params.userId);
    var userId = req.params.userId;
    var userId = req.params.userId;
    if (!userId) res.send(400, "Missing parameter");
    else {
        db.collection("users").findOne(
            { _id: ObjectID.createFromHexString(userId) },
            (err, doc) => {
                if (err) res.send(500);
                else if (!doc) res.send(404, "User not found");
                else {
                    var user = {
                        id: doc._id.toHexString(),
                        email: doc.email,
                        name: doc.name,
                        surname: doc.surname
                    };
                    res.send(user);
                }
            }
        );
    }
});
app.put("/myvideos/users/:userId", function (req, res) {
    console.log("PUT /myvideos/users/" + req.params.userId);
    var userId = req.params.userId;
    if (!userId) res.send(400, "Missing parameter");
    else {
        db.collection("users").findOne(
            { _id: ObjectID.createFromHexString(userId) },
            (err, doc) => {
                if (err) res.send(500);
                else if (!doc) res.send(404, "User not found");
                else {
                    var user = {
                        id: doc._id.toHexString(),
                        name: req.body.name || doc.name,
                        surname: req.body.surname || doc.surname,
                        email: req.body.email || doc.email,
                        password: req.body.password || doc.password
                    };
                    db.collection("users").updateOne(
                        { _id: ObjectID.createFromHexString(userId) },
                        { $set: user },
                        (err, doc) => {
                            if (err) res.send(500, err);
                            else res.send(user);
                        }
                    );
                }
            }
        );
    }
});
app.delete("/myvideos/users/:userId", function (req, res) {
    console.log("DELETE /myvideos/users/" + req.params.userId);
    var userId = req.params.userId;
    if (!userId) res.send(400, "Missing parameter");
    else {
        db.collection("users").deleteOne(
            { _id: ObjectID.createFromHexString(userId) },
            (err, result) => {
                if (err) res.send(500, err);
                else res.send(204);
            }
        );
    }
});

// videos
app.get("/myvideos/users/:userId/videos", function (req, res) {
    console.log("GET /myvideos/user/" + req.params.userId + "/videos");
    var userId = req.params.userId;
    if (!userId) res.send(400, "Missing parameter");
    else {
        db.collection("users").findOne(
            { _id: ObjectID.createFromHexString(userId) },
            (err, doc) => {
                if (err) res.send(500);
                else if (!doc) res.send(404, "User not found");
                else {
                    db.collection("videos")
                        .find({ creator: ObjectID.createFromHexString(userId) })
                        .toArray((err, docs) => {
                            if (err) res.send(500, err);
                            else
                                res.send(
                                    docs.map(doc => {
                                        var video = {
                                            id: doc._id.toHexString(),
                                            type: doc.type,
                                            url: doc.url,
                                            title: doc.title,
                                            description: doc.description,
                                            date: doc.date,
                                            tags: doc.tags,
                                            width: doc.width,
                                            height: doc.height,
                                            thumbnail: doc.thumbnail
                                        };
                                        return video;
                                    })
                                );
                        });
                }
            }
        );
    }
});
app.post("/myvideos/users/:userId/videos", function (req, res) {
    console.log("POST /myvideos/user/" + req.params.userId + "/videos");
    var userId = req.params.userId;
    if (!userId) res.send(400, "Missing parameter");
    else {
        db.collection("users").findOne(
            { _id: ObjectID.createFromHexString(userId) },
            (err, doc) => {
                if (err) res.send(500);
                else if (!doc) res.send(404, "User not found");
                else {
                    var video = {
                        creator: ObjectID.createFromHexString(userId),
                        type: req.body.type,
                        url: req.body.url,
                        title: req.body.title,
                        date: Date.now()
                    };
                    if (req.body.description) video.description = req.body.description;
                    if (req.body.thumbnail) video.thumbnail = req.body.thumbnail;
                    if (req.body.tags) video.tags = req.body.tags;
                    if (req.body.width) video.width = req.body.width;
                    if (req.body.height) video.height = req.body.height;
                    db.collection("videos").insertOne(video, (err, result) => {
                        if (err) res.send(500);
                        else
                            res.send({
                                id: result.insertedId.toHexString(),
                                ...video
                            });
                    });
                }
            }
        );
    }
});

app.get("/myvideos/users/:userId/videos/:videoId", function (req, res) {
    console.log(
        "GET /myvideos/users/" + req.params.userId + "/videos/" + req.params.videoId
    );
    var userId = req.params.userId;
    var videoId = req.params.videoId;
    if (!userId || !videoId) res.send(400, "Missing parameter");
    else {
        db.collection("users").findOne(
            { _id: ObjectID.createFromHexString(userId) },
            (err, doc) => {
                if (err) res.send(500);
                else if (!doc) res.send(404, "User not found");
                else {
                    db.collection("videos").findOne(
                        { _id: ObjectID.createFromHexString(videoId) },
                        (err, doc) => {
                            if (err) res.send(500);
                            else if (!doc) res.send(404, "Video not found");
                            else res.send(doc);
                        }
                    );
                }
            }
        );
    }
});

app.put("/myvideos/users/:userId/videos/:videoId", function (req, res) {
    console.log(
        "PUT /myvideos/users/" + req.params.userId + "/videos/" + req.params.videoId
    );
    var userId = req.params.userId;
    var videoId = req.params.videoId;
    if (!userId || !videoId) res.send(400, "Missing parameter");
    else {
        db.collection("users").findOne(
            { _id: ObjectID.createFromHexString(userId) },
            (err, doc) => {
                if (err) res.send(500);
                else if (!doc) res.send(404, "User not found");
                else {
                    db.collection("videos").findOne(
                        { _id: ObjectID.createFromHexString(videoId) },
                        (err, doc) => {
                            if (err) res.send(500);
                            else if (!doc) res.send(404, "Video not found");
                            else {
                                let video = {
                                    id: videoId,
                                    creator: ObjectID.createFromHexString(userId)
                                };
                                if (req.body.type) video.type = req.body.type;
                                if (req.body.url) video.url = req.body.url;
                                if (req.body.title) video.title = req.body.title;
                                if (req.body.description)
                                    video.description = req.body.description;
                                if (req.body.tags) video.tags = req.body.tags;
                                if (req.body.width) video.width = req.body.width;
                                if (req.body.height) video.height = req.body.height;
                                db.collection("videos").updateOne(
                                    {
                                        _id: ObjectID.createFromHexString(videoId)
                                    },
                                    { $set: video },
                                    (err, doc) => {
                                        if (err) res.send(500, err);
                                        else res.send(video);
                                    }
                                );
                            }
                        }
                    );
                }
            }
        );
    }
});

app.delete("/myvideos/users/:userId/videos/:videoId", function (req, res) {
    console.log(
        "DELETE /myvideos/users/" + req.params.userId + "/videos/" + req.params.videoId
    );
    var userId = req.params.userId;
    var videoId = req.params.videoId;
    if (!userId || !videoId) res.send(400, "Missing parameter");
    else {
        db.collection("users").findOne(
            { _id: ObjectID.createFromHexString(userId) },
            (err, doc) => {
                if (err) res.send(500);
                else if (!doc) res.send(404, "User not found");
                else {
                    db.collection("videos").deleteOne(
                        { _id: ObjectID.createFromHexString(videoId) },
                        (err, doc) => {
                            if (err) res.send(500);
                            else res.send(204);
                        }
                    );
                }
            }
        );
    }
});

// playlists
app.get("/myvideos/users/:userId/playlists", function (req, res) {
    console.log("GET /myvideos/user/" + req.params.userId + "/playlists");
    var userId = req.params.userId;
    if (!userId) res.send(400, "Missing parameter");
    else {
        db.collection("users").findOne(
            { _id: ObjectID.createFromHexString(userId) },
            (err, doc) => {
                if (err) res.send(500);
                else if (!doc) res.send(404, "User not found");
                else {
                    db.collection("playlists")
                        .find({ creator: ObjectID.createFromHexString(userId) })
                        .toArray((err, docs) => {
                            if (err) res.send(500, err);
                            else
                                res.send(
                                    docs.map(doc => {
                                        var playlist = {
                                            id: doc._id.toHexString(),
                                            title: doc.title,
                                            description: doc.description,
                                            date: doc.date,
                                            thumbnail: doc.thumbnail,
                                            count: doc.videos.length
                                        };
                                        return playlist;
                                    })
                                );
                        });
                }
            }
        );
    }
});

app.post("/myvideos/users/:userId/playlists", function (req, res) {
    console.log("POST /myvideos/user/" + req.params.userId + "/playlists");
    var userId = req.params.userId;
    if (!userId) res.send(400, "Missing parameter");
    else {
        db.collection("users").findOne(
            { _id: ObjectID.createFromHexString(userId) },
            (err, doc) => {
                if (err) res.send(500);
                else if (!doc) res.send(404, "User not found");
                else {
                    var playlist = {
                        creator: ObjectID.createFromHexString(userId),
                        id: String(Date.now()),
                        title: req.body.title,
                        description: req.body.description,
                        date: Date.now(),
                        videos: []
                    };
                    if (req.body.thumbnail) playlist.thumbnail = req.body.thumbnail;
                    db.collection("playlists").insertOne(playlist, (err, result) => {
                        if (err) res.send(500);
                        else
                            res.send({
                                id: result.insertedId.toHexString(),
                                ...playlist
                            });
                    });
                }
            }
        );
    }
});

app.get("/myvideos/users/:userId/playlists/:playlistId", function (req, res) {
    console.log(
        "GET /myvideos/users/" +
        req.params.userId +
        "/playlists/" +
        req.params.playlistId
    );
    var userId = req.params.userId;
    var playlistId = req.params.playlistId;
    if (!userId || !playlistId) res.send(400, "Missing parameter");
    else {
        db.collection("users").findOne(
            { _id: ObjectID.createFromHexString(userId) },
            (err, doc) => {
                if (err) res.send(500);
                else if (!doc) res.send(404, "User not found");
                else {
                    db.collection("playlists").findOne(
                        { _id: ObjectID.createFromHexString(playlistId) },
                        (err, doc) => {
                            if (err) res.send(500);
                            else if (!doc) res.send(404, "Playlist not found");
                            else res.send(doc);
                        }
                    );
                }
            }
        );
    }
});

app.put("/myvideos/users/:userId/playlists/:playlistId", function (req, res) {
    console.log(
        "PUT /myvideos/users/" +
        req.params.userId +
        "/playlists/" +
        req.params.playlistId
    );
    var userId = req.params.userId;
    var playlistId = req.params.playlistId;
    if (!userId || !playlistId) res.send(400, "Missing parameter");
    else {
        db.collection("users").findOne(
            { _id: ObjectID.createFromHexString(userId) },
            (err, doc) => {
                if (err) res.send(500);
                else if (!doc) res.send(404, "User not found");
                else {
                    db.collection("playlists").findOne(
                        { _id: ObjectID.createFromHexString(playlistId) },
                        (err, doc) => {
                            if (err) res.send(500);
                            else if (!doc) res.send(404, "Playlist not found");
                            else {
                                var playlist = {
                                    id: playlistId,
                                    creator: ObjectID.createFromHexString(userId),
                                    date: doc.date
                                };
                                if (req.body.title) playlist.title = req.body.title;
                                if (req.body.description)
                                    playlist.description = req.body.description;
                                if (req.body.thumbnail) playlist.thumbnail = req.body.thumbnail;

                                db.collection("playlists").updateOne(
                                    {
                                        _id: ObjectID.createFromHexString(playlistId)
                                    },
                                    { $set: playlist },
                                    (err, doc) => {
                                        if (err) res.send(500, err);
                                        else res.send(playlist);
                                    }
                                );
                            }
                        }
                    );
                }
            }
        );
    }
});

app.delete("/myvideos/users/:userId/playlists/:playlistId", function (req, res) {
    console.log(
        "DELETE /myvideos/users/" +
        req.params.userId +
        "/playlists/" +
        req.params.playlistId
    );
    var userId = req.params.userId;
    var playlistId = req.params.playlistId;
    if (!userId || !playlistId) res.send(400, "Missing parameter");
    else {
        db.collection("users").findOne(
            { _id: ObjectID.createFromHexString(userId) },
            (err, doc) => {
                if (err) res.send(500);
                else if (!doc) res.send(404, "User not found");
                else {
                    db.collection("playlists").deleteOne(
                        { _id: ObjectID.createFromHexString(playlistId) },
                        (err, doc) => {
                            if (err) res.send(500);
                            else if (!doc) res.send(404, "Playlist not found");
                            else res.send(204);
                        }
                    );
                }
            }
        );
    }
});

// Playlist Videos
app.post("/myvideos/users/:userId/playlists/:playlistId/videos", function (req, res) {
    console.log(
        "POST /myvideos/users/" +
        req.params.userId +
        "/playlists/" +
        req.params.playlistId +
        "/videos"
    );
    var userId = req.params.userId;
    var playlistId = req.params.playlistId;
    if (!userId || !playlistId) res.send(400, "Missing parameter");
    else {
        db.collection("users").findOne(
            { _id: ObjectID.createFromHexString(userId) },
            (err, doc) => {
                if (err) res.send(500);
                else if (!doc) res.send(404, "User not found");
                else {
                    db.collection("playlists").findOne(
                        { _id: ObjectID.createFromHexString(playlistId) },
                        (err, doc) => {
                            if (err) res.send(500);
                            else if (!doc) res.send(404, "Playlist not found");
                            else {
                                let video = {
                                    id: req.body.id,
                                    type: req.body.type
                                };
                                db.collection("playlists").update(
                                    { _id: ObjectID.createFromHexString(playlistId) },
                                    { $push: { videos: video } },
                                    (err, doc) => {
                                        if (err) res.send(500, err);
                                        else res.send(204);
                                    }
                                );
                            }
                        }
                    );
                }
            }
        );
    }
});

app.put("/myvideos/users/:userId/playlists/:playlistId/videos", function (req, res) {
    console.log(
        "PUT /myvideos/users/" +
        req.params.userId +
        "/playlists/" +
        req.params.playlistId +
        "/videos"
    );
    var userId = req.params.userId;
    var playlistId = req.params.playlistId;
    if (!userId || !playlistId) res.send(400, "Missing parameter");
    else {
        db.collection("users").findOne(
            { _id: ObjectID.createFromHexString(userId) },
            (err, doc) => {
                if (err) res.send(500);
                else if (!doc) res.send(404, "User not found");
                else {
                    db.collection("playlists").findOne(
                        { _id: ObjectID.createFromHexString(playlistId) },
                        (err, doc) => {
                            if (err) res.send(500);
                            else if (!doc) res.send(404, "Playlist not found");
                            else {
                                let videos = [];
                                req.body.videos.forEach(video => {
                                    videos.push({
                                        id: video.id,
                                        type: video.type
                                    });
                                });
                                db.collection("playlists").update(
                                    { _id: ObjectID.createFromHexString(playlistId) },
                                    { $set: { videos: videos } },
                                    (err, doc) => {
                                        if (err) res.send(500, err);
                                        else res.send(204);
                                    }
                                );
                            }
                        }
                    );
                }
            }
        );
    }
});

app.get("/myvideos/users/:userId/playlists/:playlistId/videos", function (req, res) {
    console.log(
        "GET /myvideos/users/" +
        req.params.userId +
        "/playlists/" +
        req.params.playlistId +
        "/videos"
    );
    var userId = req.params.userId;
    var playlistId = req.params.playlistId;
    if (!userId || !playlistId) res.send(400, "Missing parameter");
    else {
        db.collection("users").findOne(
            { _id: ObjectID.createFromHexString(userId) },
            (err, doc) => {
                if (err) res.send(500);
                else if (!doc) res.send(404, "User not found");
                else {
                    db.collection("playlists").findOne(
                        { _id: ObjectID.createFromHexString(playlistId) },
                        (err, playlist) => {
                            if (err) res.send(500);
                            else if (!playlist) res.send(404, "Playlist not found");
                            else {
                                db.collection("videos")
                                    .find({ creator: ObjectID.createFromHexString(userId) })
                                    .toArray((err, docVideos) => {
                                        if (err) res.send(500, err);
                                        else {
                                            let videos = docVideos.map(doc => {
                                                var video = {
                                                    id: doc._id.toHexString(),
                                                    type: doc.type,
                                                    url: doc.url,
                                                    title: doc.title,
                                                    description: doc.description,
                                                    date: doc.date,
                                                    tags: doc.tags,
                                                    width: doc.width,
                                                    height: doc.height,
                                                    thumbnail: doc.thumbnail
                                                };
                                                return video;
                                            });
                                            let fullVideos = [];
                                            playlist.videos.forEach(pVideo => {
                                                if (pVideo.type === "local") {
                                                    var index = videos.findIndex(
                                                        localVideo =>
                                                            localVideo.id === pVideo.id
                                                    );
                                                    console.log(index);
                                                    if (index !== -1) fullVideos.push(videos[index]);
                                                } else {
                                                    fullVideos.push(pVideo);
                                                }
                                            });
                                            res.send(fullVideos);
                                        }
                                    });
                            }
                        }
                    );
                }
            }
        );
    }
});

app.delete("/myvideos/users/:userId/playlists/:playlistId/videos/:videoId", function (
    req,
    res
) {
    console.log(
        "GET /myvideos/users/" +
        req.params.userId +
        "/playlists/" +
        req.params.playlistId +
        "/videos/" +
        req.params.videoId
    );
    var userId = req.params.userId;
    var playlistId = req.params.playlistId;
    var videoId = req.params.videoId;
    if (!userId || !playlistId || !videoId) res.send(400, "Missing parameter");
    else {
        db.collection("users").findOne(
            { _id: ObjectID.createFromHexString(userId) },
            (err, doc) => {
                if (err) res.send(500);
                else if (!doc) res.send(404, "User not found");
                else {
                    db.collection("playlists").findOne(
                        { _id: ObjectID.createFromHexString(playlistId) },
                        (err, doc) => {
                            if (err) res.send(500);
                            else if (!doc) res.send(404, "Playlist not found");
                            else {
                                let videos = [];
                                doc.videos.forEach(video => {
                                    if (video.id !== videoId) {
                                        videos.push({
                                            id: ObjectID.createFromHexString(video.id),
                                            type: video.type
                                        });
                                    }
                                });
                                db.collection("playlists").update(
                                    { _id: ObjectID.createFromHexString(playlistId) },
                                    { $set: { videos: videos } },
                                    (err, doc) => {
                                        if (err) res.send(500, err);
                                        else res.send(204);
                                    }
                                );
                            }
                        }
                    );
                }
            }
        );
    }
});

app.listen(8080);
console.log("HTTP server running");