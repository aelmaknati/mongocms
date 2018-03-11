# MongoCMS

## Description
This prototype has been developed in order to demonstrate MongoDB & GridFS capabilities as a CMS. This prototype includes following technical components :

*   [MongoDB](https://www.mongodb.com/) : NoSQL document oriented database used as CMS repository
*   [GridFS](https://docs.mongodb.com/manual/core/gridfs/) : MongoDB feature used for storing binary data
*   [NodeJS](https://nodejs.org) : Javascript event oriented platform
*   [SailsJS](https://sailsjs.com/) : NodeJS MVC framework used for implementing the back-end
*   [Bootstrap](https://getbootstrap.com/docs/3.3/) : HTML & CSS framework used for implementing the front-end

This prototype implements following features :

*   Directory browsing
*   Directory creation
*   File uploading
*   File versioning (based on file name and creation date)
*   Check-in & checkout
*   File (last version) and directory deletion
*   Basic search based on file name

For more information about this prototype, please contact [abdellatif.elmaknati@amplexor.com](mailto:abdellatif.elmaknati@amplexor.com)


## Requirements

*   MongoDB (v3.2 or later)
*   NodeJS  (v6.11 or later)

## Install

Run following command at project root directory (package.json level)
```sh
npm install
```

## Run

Run following command at project root directory (app.js level)
```sh
node app.js
```

## Test
Open your favorite browser at following URL : http://localhost:1337/cms
