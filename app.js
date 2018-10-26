const util      = require('./util');
const http      = require('http');
const Koa       = require('koa');
const serve     = require('koa-static');
const Router    = require('koa-router');
const koaBody   = require('koa-body');
const webpush   = require('web-push');

const port = process.env.PORT || 8085;
const app = new Koa();
const router = new Router();

/**
 * 根据关键词获取图书信息
 */
router.get('/book', async (ctx, next) => {
    let query = ctx.request.query;
    let {q, fields} = query;
    let url = `https://api.douban.com/v2/book/search?q=${q}&fields=${fields}&count=10`;
    let res = await util.get(url);
    ctx.response.body = res;
});

/* ===================== */
/* 使用web-push进行消息推送 */
/* ===================== */
const options = {
    // proxy: 'http://localhost:1087' // 使用FCM（Chrome）需要配置代理
};


// const vapidKeys = webpush.generateVAPIDKeys()

/**
 * VAPID值
 */
const vapidKeys = {
    publicKey: 'BL3mk-XirK9R-nflzsyrm1XqQ-hNH2_VNCVzx4vEejKhUmpmfEVJSlt8PEff1LQSrh4fcv6alv9jJ860DA3quJY',
    privateKey: '5Yf1krEN_4wN2MOoXOd6KPmH1lX85T9UNRn4uV1MuCI'
};

// 设置web-push的VAPID值
webpush.setVapidDetails(
    'mailto:1312492221@qq.com',
    vapidKeys.publicKey,
    vapidKeys.privateKey
);

/**
 * 提交subscription信息，并保存
 */
//koa-body用来处理body
router.post('/subscription', koaBody(), async ctx => {
    let body = ctx.request.body;
    await util.saveRecord(body);
    ctx.response.body = {
        status: 0
    };
});


/**
 * 向push service推送信息
 * @param {*} subscription 
 * @param {*} data
 */
function pushMessage(subscription, data = {}) {
    webpush.sendNotification(subscription, data, options).then(data => {
        console.log('push service的相应数据:', JSON.stringify(data));
        return;
    }).catch(err => {
        // 判断状态码，440和410表示失效
        if (err.statusCode === 410 || err.statusCode === 404) {
            return util.remove(subscription);
        }
        else {
            console.log(subscription);
            console.log(err);
        }
    })
}

/**
 * 消息推送API，可以在管理后台进行调用
 * 本例子中，可以直接post一个请求来查看效果
 */
// 将消息推送至Push Service
router.post('/push', koaBody(), async ctx => {
    let {uniqueid, payload} = ctx.request.body;
    let list = uniqueid ? await util.find({uniqueid}) : await util.findAll();
    let status = list.length > 0 ? 0 : -1;

    for (let i = 0; i < list.length; i++) {
        let subscription = list[i].subscription;
        pushMessage(subscription, JSON.stringify(payload));
    }

    ctx.response.body = {
        status
    };
});
/* ===================== */

app.use(router.routes());
app.use(serve(__dirname + '/public'));
app.listen(port, () => {
    console.log(`listen on port: ${port}`);
});