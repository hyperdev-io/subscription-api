const Datastore = require('nedb');

const createDB = (filename) => {
    let db_options = {autoload: true};
    
    if (filename) {
        db_options.filename = filename;
    }

    return new Datastore(db_options);
};


module.exports.createDB = createDB;
