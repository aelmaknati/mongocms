/**
 * CMSController
 *
 * @description :: Server-side logic for managing cms
 * @help        :: See http://sailsjs.org/#!/documentation/concepts/Controllers
 */

var mongodb = require('mongodb');
var fs = require('fs');

module.exports = {

  login : function(req , res){
    if(req.body.login == "mongocms" && req.body.password == "thuvd6552Xf"){
      req.session.authenticated = true
      res.redirect("/cms")
    }else{
      res.redirect("/login")
    }
  },

  /**
   * List files in a node
   * @requestparam node (URL param)  : Id of the node
   *                            This param is automatically converted to mongo ObjectID type in req.options.nodeID
   * @requestparam keyword (URL query param) (optional) : Search keyword
   */
  listFiles : function(req , res){
    db.collection("fs.files").findOne({_id : req.options.nodeId} ,function(err, parentDir) {
      if (err) return res.negotiate(err);
      if(req.options.nodeId && !parentDir){
        res.redirect("/cms")
      }
      var match = {}
      if(req.query.keyword){
        var keyword = req.query.keyword.replace(/[-\/\\^$*+?.()|[\]{}]/g, '\\$&')
        match = {"filename": new RegExp("[^/]*"+keyword+"[^/]*\.[a-z0-9]*" , "g")}
      }else{
        match = { "metadata.parent": req.options.nodeId}
      }
      if(!parentDir || parentDir.contentType == "dir") {
        var cursor = db.collection("fs.files").aggregate([
          {$match: match },
          {$sort: {"uploadDate": -1}},
          {
            $group: {
              _id: "$filename",
              versions: {$push: "$$ROOT"},
              contentType: {$first: "$contentType"}
            }
          },
          {$sort: {"contentType": -1, _id: 1}},
        ])

        var files = []
        cursor.forEach(function (val) {
          files.push(val)
        }, function () {
          res.view("list", {files: files})
        })
      }else{
        var readstream = gfs.createReadStream({
          _id: parentDir._id
        });
        readstream.on('error', function (err) {
          return res.negotiate(err)
        });
        readstream.pipe(res);
      }
    })

  },
  /**
   * Add a file into a node (createw a new version if file already exists)
   * @requestparam file (body param)  : File content
   * @requestparam node (URL param)  : Id of the node
   *                                   This param is automatically converted to mongo ObjectID type in req.options.nodeID
   */
  addFile : function(req , res){
    req.file('file').upload(function (err, filesUploaded) {
      if (err) return res.negotiate(err)
      var r = req.options.nodeId ? req.options.nodeId : ""
      if(filesUploaded.length == 0){
        req.session.flash = {error:   "No file uploaded"}
        return res.redirect("/cms/" + r);
      }
      var filename = filesUploaded[0].filename
      req.options.path.forEach(function(p){
        filename=p.filename+"/"+filename
      })
      filename="/"+filename
      db.collection("fs.files").find({filename : filename}).sort({"uploadDate" : -1}).limit(1).toArray(function (err , existingFiles) {
        if (err) return res.negotiate(err)
        if (existingFiles.length == 1 && existingFiles[0].metadata.checkout ){
          req.session.flash = {error:  "Cannot overwrite checked out files"}
          return res.redirect("/cms/" + r);
        }
        var writestream = gfs.createWriteStream({filename: filename, metadata: {parent: req.options.nodeId}});
        var stream = fs.createReadStream(filesUploaded[0].fd).pipe(writestream);
        stream.on('finish', function () {
          return res.redirect("/cms/" + r);
        });
      });
    });
  },
  /**
   * Add a directory into a node
   * @requestparam name (body param)  : Directory name (must be unique in the current directory)
   * @requestparam node (URL param)  : Id of the node
   *                                   This param is automatically converted to mongo ObjectID type in req.options.nodeID
   *
   */
  addDir : function(req , res){
    var r = req.options.nodeId ? req.options.nodeId : ""
    var name = req.body.name;
    if (!name || name.trim() == "" ){
      req.session.flash = {error:  "Directory name is empty"}
      return res.redirect("/cms/" + r);
    }
    db.collection("fs.files").findOne({filename : name.trim() , contentType : "dir" , "metadata.parent" : req.options.nodeId} , function(err , existingDir){
      if (err) return res.negotiate(err)
      if (existingDir){
        req.session.flash = {error:  "Directory already exists"}
        return res.redirect("/cms/" + r);
      }
      db.collection("fs.files").insertOne({filename : name.trim() , contentType : "dir" , metadata : {parent : req.options.nodeId} , uploadDate : new Date()} , function(err ){
        if (err) return res.negotiate(err)
        return res.redirect("/cms/"+r);
      })
    })

  },
  /**
   * Remove a node
   * @requestparam node (URL param)  : Id of the node to remove
   *                                   This param is automatically converted to mongo ObjectID type in req.options.nodeID
   * @requestparam versions (URL query param) : Versions to remove (all|last)
   */
  deleteFile : function(req , res){
    var versions = req.query.versions;
    function deleteRecursivly (id , filename , cbk){
      db.collection("fs.files").find({"metadata.parent" : id}).toArray(function (err , files) {
        if (err) return res.negotiate(err)
        var next = function(i , cbk) {
          if (i == files.length){
            var filter = versions == "last" ? {"_id" : id} : {"filename" : filename}
            gfs.remove(filter, function (err) {
              return cbk(err)
            })
          }else {
            deleteRecursivly(files[i]._id, files[i].filename, function () {
              var filter = versions == "last" ? {"_id" : files[i]._id} : {"filename" : files[i].filename}
              gfs.remove(filter, function (err) {
                next(i + 1, cbk)
              })
            })
          }
        }
        next(0 , cbk);
      })
    }
    db.collection("fs.files").findOne({_id : req.options.nodeId}, function (err , file) {
      if (err) return res.negotiate(err)
      var parent = file.metadata.parent ? file.metadata.parent : ""
      if (file.metadata.checkout ){
        req.session.flash = {error:  "Cannot overwrite checked out files"}
        return res.redirect("/cms/" + parent);
      }
      deleteRecursivly(req.options.nodeId , file.filename,function(err){
        if (err) return res.negotiate(err)
        return res.redirect("/cms/"+parent);
      })
    })
  },
  /**
   * Checkout a node
   * @requestparam node (URL param)  : Id of the node to checkout
   *                                   This param is automatically converted to mongo ObjectID type in req.options.nodeID
   */
  checkoutFile : function(req , res){
    db.collection("fs.files").findOne({_id : req.options.nodeId}, function (err , file) {
      var parent = file.metadata.parent ? file.metadata.parent : ""
      db.collection("fs.files").updateOne({_id : req.options.nodeId} , {$set : {"metadata.checkout" : true}}, function (err ) {
        if (err) return res.negotiate(err)
        return res.redirect("/cms/"+parent);
      });
    })

  },
  /**
   * Checkin a node
   * @requestparam node (URL param)  : Id of the node to checkin
   *                                   This param is automatically converted to mongo ObjectID type in req.options.nodeID
   */
  checkinFile : function(req , res){
    db.collection("fs.files").findOne({_id : req.options.nodeId}, function (err , file) {
      var parent = file.metadata.parent ? file.metadata.parent : ""
      db.collection("fs.files").updateOne({_id : req.options.nodeId} , {$set : {"metadata.checkout" : false}}, function (err ) {
        if (err) return res.negotiate(err)
        return res.redirect("/cms/"+parent);
      });
    })

  },


};

