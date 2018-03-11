var mongodb = require("mongodb")

/**
 * Policy for converting 'node' String param to nodeId ObjectId object
 */
module.exports = function(req, res, next) {



  if (!req.session.path){
    req.session.path = []
  }
  if (req.params.node && mongodb.ObjectId.isValid(req.params.node)){
    req.options.nodeId = new mongodb.ObjectId(req.params.node)
  }
  if (req.body && req.body.node && mongodb.ObjectId.isValid(req.body.node)){
    req.options.nodeId = new mongodb.ObjectId(req.body.node)
  }

  getFullPath(req.options.nodeId , [] , function(err , path){
    req.options.path = path.reverse()
    next()
  })

};


function getFullPath(id , res , cbk) {
  if (!id){
    return cbk(null , res)
  }
  db.collection("fs.files").findOne({_id : id} ,function(err , file){
    if (err){return cbk(err)}
    res.push({filename : file.filename , _id : file._id})
    if (!file.metadata.parent){
      cbk(null , res)
    }else{
      getFullPath(file.metadata.parent , res , cbk)
    }
  })
}


