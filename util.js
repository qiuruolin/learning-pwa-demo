const request   = require('request');
const Datastore = require('nedb')
const db = new Datastore()

module.exports.get = function (url, opt = {}) {
    return new Promise((r, j) => {
        request.get(url, opt, (err, res, body) => {
            if (err) {
                j(err);
                return;
            }
            r(body);
        });
    });
};

module.exports.post = function (url, opt = {}) {
    return new Promise((r, j) => {
        request.post(url, opt, (err, res, body) => {
            if (err) {
                j(err);
                return;
            }
            r(body);
        });
    });
};

//nedb不需要部署安装，可以将数据存储在内存中
module.exports.saveRecord = function(obj){
    let {uniqueid, subscription} = obj
    return new Promise((resolve, reject) => {
        db.findOne({'subscription.endpoint': subscription.endpoint}, (err, res) => {
            if(err){
                reject(err)
                return
            }
            if(res){
                console.log('已存在')
                res.uniqueid = uniqueid
                db.update({subscription}, res, {}, err => {
                    if(err){
                        reject(err)
                        return
                    }
                    console.log('更新完毕')
                    resolve(obj)
                })
                return
            }
            db.insert(obj, (err, item) => {
                if(err){
                    reject(err)
                    return
                }
                console.log('存储完毕')
                resolve(obj)
            })
        })
    })
}

module.exports.findAll = function(){
    return new Promise((resolve, reject) => {
        db.find({}, (err, list) => {
            if(err){
                reject(err)
                return
            }
            resolve(list)
        })
    })
}

module.exports.find = function(query){
    return new Promise((resolve, reject) => {
        db.find(query, (err, list) => {
            if(err){
                reject(err)
                return
            }
            resolve(list)
        })
    })
}

module.exports.remove = function(obj){
    return new Promise((resolve, reject) => {
        db.remove(obj, {multi: true}, (err, num) => {
            if(err){
                reject(err)
                return
            }
            resolve(num)
        })
    })
}