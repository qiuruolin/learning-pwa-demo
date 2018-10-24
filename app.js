const util = require('./util');
const http = require('http');
const Koa = require('koa');
const serve = require('koa-static');
const Router = require('koa-router');
const koaBody = require('koa-body')
const webpush = require('web-push')

const port = process.env.PORT || 8085;
const app = new Koa();
const router = new Router();

// web-push 的相关配置
const options = {
    proxy: 'http://localhost:1087' //使用Chrome需要配置代理
}
const vapidKeys = webpush.generateVAPIDKeys()

webpush.setVapidDetails(
    'mailto:1312492221@qq.com',
    vapidKeys.publicKey,
    vapidKeys.privateKey
)

router.get('/book', async (ctx, next) => {
    let query = ctx.request.query;
    let {q, fields} = query;
    let url = `https://api.douban.com/v2/book/search?q=${q}&fields=${fields}&count=10`;
    let res = await get(url);
    ctx.response.body = res;
});

//消息订阅
// koa-body用来处理body
router.post('/subscription', koaBody(), async ctx => {
    let body = ctx.request.body
    // saveRecord存储信息
    await util.saveRecord(body)
    ctx.response.body = {
        status: 0
    }
})

// 消息推送
router.post('/push', koaBody(), async ctx => {
    let {uniqueid, payload} = ctx.request.body
    let list = uniqueid ? await util.find({uniqueid}) : await util.findAll()
    let status = list.length > 0 ? 0 : -1

    for(let i = 0; i < list.length; i++){
        let subscription = list[i].subscription
        // 向push service发送请求
        pushMessage(subscription, JSON.stringify(payload))
    }

    ctx.response.body = {
        status
    }
})

function pushMessage(subscription, data={}){
    webpush.sendNotification(subscription, data, options).then(data => {
        console.log('push service的相应数据：', JSON.stringify(data))
        return
    }).catch(err => {
        // 440和410表示失效
        if(err.statusCode === 410 || err.statusCode === 440){
            return util.remove(subscription)
        }
        else{
            console.log(subscription)
            console.log(err)
        }
    })
}

app.use(router.routes());
app.use(serve(__dirname + '/public'));
app.listen(port, () => {
    console.log(`listen on port: ${port}`);
});