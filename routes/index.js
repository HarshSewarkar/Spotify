var express = require('express');
var router = express.Router();
var userModel = require('../models/userModel');
var songModel = require('../models/songModel');
var playlistModel = require('../models/playlistModel')
const passport = require('passport');
var multer = require('multer')
var id3 = require('node-id3')
var crypto = require('crypto')
// ======================================================(connecting to the database through the index.js)====================================
const mongoose = require('mongoose');
mongoose.connect('mongodb://0.0.0.0/MusicApp').then(() => {
  console.log('connected to server/database')
}).catch(err => {
  console.log(err)

})

// ======================================================(user authentication route) ============================================================================

const localStrategy = require('passport-local');
passport.use(new localStrategy(userModel.authenticate()));
// ======================================================(index page route) ============================================================================
router.get('/',isLoggedIn,async function(req, res, next) {
   // ==============================================================

   const userSongs = await userModel.findOne({ _id: req.user._id })
     .populate('playlist')
     .populate({
       path: 'playlist',
       populate: {
         path: 'songs',
         model: 'song'
       }
     });
   
   res.render('index', {userSongs}); 
   
});

// ======================================================(uploadMusic pape route) ============================================================================

router.get('/uploadMusic',isLoggedIn, isAdmin,function(req, res, next) {
    res.render('uploadMusic');

});

// ======================================================(user register route) ============================================================================

router.post('/register',async function(req, res, next){
  var newUser = new userModel({ //require user model for these step
    username: req.body.username,
    email: req.body.email,
  })
  userModel.register(newUser, req.body.password)
  .then(function(u){
    passport.authenticate('local')(req, res,  async function(){
      // =========( making defaault playlist for every user)==================
        const songs = await songModel.find()
        var defaultplaylist = await playlistModel.create({
          name: req.body.username,
          owner: req.user._id,
          songs: songs.map(song => song._id),
        })
  // ==============( Finding a user by id from userModel and their requirement thing)===================
     const newUser =  await userModel.findOne({
      _id:req.user._id
     })
     newUser.playlist.push(defaultplaylist._id)
     await newUser.save()
  // ==============================================================
  res.redirect('/')
   })
 })
.catch(function(e){
  res.send(e);
 })
});
// ======================================================(user auth route) ============================================================================
router.get('/auth',function(req, res, next){
res.render('register')
})
// ======================================================(user login route) ============================================================================
router.post('/login',passport.authenticate('local',{
successRedirect:'/' ,//jo bhi page dikhana ho vo dalo yaha
failureRedirect:'/auth',  //Loggin fail hone par kis page par bhejna hai
}),function(req,res,next){ })

//Middleware function / Login Authentication kai liye code

function isLoggedIn(req, res, next){
if(req.isAuthenticated()){
  return next();
}
else{
  res.redirect('/auth')  //Loggin fail hone par kis page par bhejna hai
}
}
//Middleware function / Admin Authentication kai liye code

function isAdmin(req, res, next) {
  if (req.user.isAdmin) return next()
  else return res.redirect('/')
}
// ======================================================(user loggout route) ============================================================================
router.get('/logout', (req, res, next) => {
  if (req.isAuthenticated())
    req.logout((err) => {
      if (err) res.send(err);
      else res.redirect('/');
    });
});
// ======================================================(upload songs route) ============================================================================
const storage = multer.memoryStorage()
const upload = multer({ storage: storage })


router.post('/uploadsong',isLoggedIn, isAdmin, upload.array('song') , async (req,res,next)=>{
  console.log(req.files);
  await Promise.all(req.files.map(async file=>{

    const randomName = crypto.randomBytes(20).toString('hex')
    
    const songData = id3.read(file.buffer);
    Readable.from(file.buffer).pipe(gfsBucket.openUploadStream(randomName))
    Readable.from(songData.image.imageBuffer).pipe(gfsBucketPoster.openUploadStream(randomName + 'poster'))
    
    await songModel.create({
      title:songData.title,
      artist:songData.artist,
      album:songData.album,
      size:file.size,
      poster: randomName+ 'poster',
      fileName:randomName 
      
    })
  }))
    
    res.send("hoo gaya upload")
})
// ========================================================================================================================================================
const { Readable } = require('stream'); // Import the Readable stream module
// ========================================================================================================================================================
const conn = mongoose.connection

var gfsBucket,gfsBucketPoster
conn.once('open', () => {
  gfsBucket= new mongoose.mongo.GridFSBucket(conn.db, {
    bucketName: 'audio'
  })
  gfsBucketPoster= new mongoose.mongo.GridFSBucket(conn.db, {
    bucketName: 'poster'
  })
}),
// ======================================================(play songs route) ============================================================================
router.get('/stream/:musicName', async (req, res, next) => {
  const currentSong = await songModel.findOne({
    fileName: req.params.musicName
  });

  const stream = gfsBucket.openDownloadStreamByName(req.params.musicName);

  res.set('Content-Type', 'audio/mpeg');
  res.set('Content-Length', currentSong.size + 1);
  res.set('Content-Range', `bytes 0-${currentSong.size - 1}/${currentSong.size}`);
  res.set('Content-Ranges', 'byte');
  res.status(206);

  stream.pipe(res);
});

// ======================================(to show the default song poster)===================================================================================

router.get('/photo/:poster', async (req, res, next) => {
  gfsBucketPoster.openDownloadStreamByName(req.params.poster).pipe(res)
})
// ======================================(creating the search rout to show the search page)========================================================

router.get('/search',function(req,res,next){
  res.render('search')
})
router.post('/search',async function(req,res,next){
  const searchSong = await songModel.find({
    title:{ $regex:req.body.Search }
  })
  res.json({
    songs: searchSong
  });
})
// ===========================================================================================================================================
router.post("/CreatePlst",function(req,res,next){
  
})
module.exports = router;
