(function() {
    /**
     * 生成书籍列表卡片（dom元素）
     * @param {Object} book 书籍相关数据
     */
    function createCard(book) {
        var li = document.createElement('li');
        // var img = document.createElement('img');
        var title = document.createElement('div');
        var author = document.createElement('div');
        var desc = document.createElement('div');
        var publisher = document.createElement('span');
        var price = document.createElement('span');
        title.className = 'title';
        author.className = 'author';
        desc.className = 'desc';
        // img.src = book.image;
        title.innerText = book.title;
        author.innerText = book.author;
        publisher.innerText = book.publisher;
        price.innerText = book.price;

        book.publisher && desc.appendChild(publisher);
        book.price && desc.appendChild(price);
        // li.appendChild(img);
        li.appendChild(title);
        li.appendChild(author);
        li.appendChild(desc);

        return li;
    }

    /**
     * 根据获取的数据列表，生成书籍展示列表
     * @param {Array} list 书籍列表数据
     */
    function fillList(list) {
        list.forEach(function (book) {
            var node = createCard(book);
            document.querySelector('#js-list').appendChild(node);
        });
    }

    /**
     * 控制tip展示与显示的内容
     * @param {string | undefined} text tip的提示内容
     */
    function tip(text) {
        if (text === undefined) {
            document.querySelector('#js-tip').style = 'display: none';
        }
        else {
            document.querySelector('#js-tip').innerHTML = text;
            document.querySelector('#js-tip').style = 'display: block';
        }
    }

    /**
     * 控制loading动画的展示
     * @param {boolean | undefined} isloading 是否展示loading
     */
    function loading(isloading) {
        if (isloading) {
            tip();
            document.querySelector('#js-loading').style = 'display: block';
        }
        else {
            document.querySelector('#js-loading').style = 'display: none';
        }
    }
    
    /**
     * 根据用户输入结果
     * 使用XMLHttpRequest查询并展示数据列表
     */
    function queryBook() {
        var input = document.querySelector('#js-search-input');
        var query = input.value;
        var url = '/book?q=' + query + '&fields=id,title,image,author,publisher,price';
        if (query === '') {
            tip('请输入关键词');
            return;
        }
        document.querySelector('#js-list').innerHTML = '';
        document.querySelector('#js-thanks').style = 'display: none';
        loading(true);

        let cacheData
        var remotePromise = getApiDataRemote(url)
        getApiDataFromCache(url).then(function(data){
            if(data){
                loading(false)
                input.blur();
                fillList(data.books);
                document.querySelector('#js-thanks').style = 'display: block';
            }
            cacheData = data || {}
            return remotePromise
        }).then(function(data){
            if(data){
                if(JSON.stringify(data) !== JSON.stringify(cacheData)){
                    loading(false)
                    input.blur();
                    fillList(data.books);
                    document.querySelector('#js-thanks').style = 'display: block';
                }
            }
            else if(!cacheData.books){
                //当无网络且无cache时
                loading(false)
                tip('无结果')
            }
        })
    }

    /**
     * 监听“搜索”按钮点击事件
     */
    document.querySelector('#js-search-btn').addEventListener('click', function () {
        queryBook();
    });

    /**
     * 监听“回车”事件
     */
    window.addEventListener('keypress', function (e) {
        if (e.keyCode === 13) {
            queryBook();
        }
    });

    // 注册serviceWorker
    // if('serviceWorker' in navigator){
    //     navigator.serviceWorker.register('./sw.js').then(function(){
    //         console.log('[ServiceWorker] 注册成功')
    //     })
    // }

    //读取缓存数据
    function getApiDataFromCache(url){
        if('caches' in window){
            return caches.match(url).then(function(cache){
                if(!cache){
                    return
                }
                return cache.json()
            })
        }
        else{
            return Promise.resolve()
        }
    }
    // 获取远程数据
    function getApiDataRemote(url){
        return new Promise(function(resolve, reject){
            var xhr = new XMLHttpRequest();
        xhr.timeout = 60000;
        xhr.onreadystatechange = function () {
            var response = {};
            if (xhr.readyState === 4 && xhr.status === 200) {
                try {
                    response = JSON.parse(xhr.responseText);
                }
                catch (e) {
                    response = xhr.responseText;
                }
                resolve(response)
            }
            else if(xhr.readyState === 4){
                resolve()
            }
        };
        xhr.onabort = reject
        xhr.onerror = reject
        xhr.ontimeout = reject
        xhr.open('GET', url, true);
        xhr.send(null);
        })
    }

    //push&&notification 推送消息

    // 浏览器订阅
    // 当我们注册完Service Worker后会得到一个Registration对象，通过调用Registration对象的registration.pushManager.subscribe()方法可以发起订阅
    function registerServiceWorker(file){
        return navigator.serviceWorker.register(file)
    }
    // 发起订阅
    function subscribeUserToPush(registration, publicKey){
        var subscribeOptions = {
            userVisibleOnly: true, //推送时是否会有消息提醒
            applicationServerKey: window.urlBase64ToUint8Array(publicKey) //客户端公钥
        }
        return registration.pushManager.subscribe(subscribeOptions).then(function(pushSubscription){
            console.log('Received PushSubscription: ', JSON.stringify(pushSubscription))
            return pushSubscription
        })
    }
    //将pushSubscription信息发送给后端
    function sendSubscriptionToServer(body, url) {
        url = url || '/subscription';
        return new Promise(function (resolve, reject) {
            var xhr = new XMLHttpRequest();
            xhr.timeout = 60000;
            xhr.onreadystatechange = function () {
                var response = {};
                if (xhr.readyState === 4 && xhr.status === 200) {
                    try {
                        response = JSON.parse(xhr.responseText);
                    }
                    catch (e) {
                        response = xhr.responseText;
                    }
                    resolve(response);
                }
                else if (xhr.readyState === 4) {
                    resolve();
                }
            };
            xhr.onabort = reject;
            xhr.onerror = reject;
            xhr.ontimeout = reject;
            xhr.open('POST', url, true);
            xhr.setRequestHeader('Content-Type', 'application/json');
            xhr.send(body);
        });
    }

    if('serviceWorker' in navigator && 'PushManager' in window){
      // 可通过web-push generate-vapid-keys生成公钥和私钥
      var publicKey = 'BL3mk-XirK9R-nflzsyrm1XqQ-hNH2_VNCVzx4vEejKhUmpmfEVJSlt8PEff1LQSrh4fcv6alv9jJ860DA3quJY'

      registerServiceWorker('./sw.js').then(function(registration){
        return Promise.all([
            registration,
            askPermission() //denied granted default
        ])
      }).then(function(result){
        //   设置提醒内容
        var registration = result[0]

        document.querySelector('#js-notification-btn').addEventListener('click', function(){
            var title = "PWA DEMO"
            var options = {
                body: '一起来使用吧', //提醒的内容
                icon: '/img/icons/book-128.png', //提醒的icon
                actions: [ //提醒可以包含一些自定义操作
                    {
                        action: 'show-book',
                        title: '去看看'
                    },
                    {
                        action: 'contact-me',
                        title: '联系我'
                    }
                ],
                tag: 'pwa-demo', //相当于id
                renotify: true //是否允许重复提醒
            }
            registration.showNotification(title, options)
        })

        console.log('[ServerWorker] 注册成功')
        // 开启该客户端的消息推送订阅功能
        return subscribeUserToPush(registration, publicKey)
      }).then(function(subscription){
        const body = {subscription: subscription}
        body.uniqueid = new Date().getTime()
        console.log('uniqueid', body.uniqueid)
        // 将生成的客户端订阅信息存储在自己的服务器上
        return sendSubscriptionToServer(JSON.stringify(body))
      }).then(function(res){
        console.log(res)
      }).catch(function(err){
        console.log(err)
      })
    }

    //获取提醒权限
    function askPermission(){
        return new Promise(function(resolve, reject){
            // Notification对象上的静态方法Notification.requestPermission()来获取授权
            const permissionResult = Notification.requestPermission(function(result){
                resolve(result)
            })
            if(permissionResult){
                permissionResult.then(resolve, reject)
            }
        }).then(function(permissionResult){
            if(permissionResult !== 'granted'){
                throw new Error('we weren\'t granted permission.')
            }
        })
    }

    //通信
    if('serviceWorker' in navigator){
      navigator.serviceWorker.addEventListener('message', function(e){
        var action = e.data
        console.log(`receive post-message from sw, action is '${e.data}'`)
        switch(action){
            case 'show-book':
              location.href = 'https://book.douban.com/subject/20515024'
              break;
            case 'contact-me':
              location.href = 'mailto:1312492221@qq.com'
              break;
            default:
              document.querySelector('.panel').classList.add('show')
              break;
        }
      })
    }
})();