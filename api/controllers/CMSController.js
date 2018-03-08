/**
 * CMSController
 *
 * @description :: Server-side logic for managing cms
 * @help        :: See http://sailsjs.org/#!/documentation/concepts/Controllers
 */

var mongodb = require('mongodb');
var Grid = require('gridfs-stream');
var fs = require('fs');

module.exports = {

  listFiles : function(req , res){
    File.find({}).exec(function(err , files){
      if (err) return res.negotiate(err);
      res.view("list" , {files : files})
    })

  },
  addFile : function(req , res){
    req.file('file').upload(function (err, filesUploaded) {
      if (err) return res.negotiate(err)
      mongodb.MongoClient.connect("mongodb://localhost:27017/mongocms" ,function(err, db) {
        if (err) return res.negotiate(err)
        var gfs = Grid(db, mongodb);
        var writestream = gfs.createWriteStream({filename: filesUploaded[0].filename });
        fs.createReadStream(filesUploaded[0].fd).pipe(writestream);
        return res.redirect("/");
      });
    });
  },
  checkoutFile : function(req , res){

  },
  checkinFile : function(req , res){

  }






};

