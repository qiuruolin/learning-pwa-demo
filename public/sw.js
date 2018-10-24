// ServiceWorker生命周期：installing->installed->activing->activated->redundant
// 当Service Worker安装（installed）完毕后，会触发install事件；而激活（activated）后，则会触发activate事件
// self是Service Worker中一个特殊的全局变量

const cacheName = 'PWA_CACHE_NAME'
const apiCacheName = 'API_CACHE_NAME'
// 缓存列表
let cacheFiles = [
    '/',
    './index.html',
    './index.js',
    './style.css',
    './img/book.png',
    './img/loading.svg'
]

self.addEventListener('install', function(e){
    console.log('[ServiceWorker] 状态： install')
    // 通过caches.open()与cache.addAll()方法将资源缓存起来
    e.waitUntil(caches.open(cacheName).then(function(cache){
        return cache.addAll(cacheFiles)
    }))
})

// 检查cacheName是否变化，更新缓存
self.addEventListener('activate', function(e){
    console.log('[ServiceWorker] 状态：activate')
    //清理旧版本
    e.waitUntil(caches.keys().then(function(keys){
        return Promise.all(keys.map(function(key){
            if(key !== cacheName){
                return caches.delete(key)
            }
        }))
    }))
    return self.clients.claim() //更新客户端
})

self.addEventListener('fetch', function(e){
    //需要缓存的xhr请求
    const cacheRequestUrls = [
        '/book?'
    ]
    console.log('现在正在请求API：' + e.request.url)
    //判断当前请求是否需要缓存
    let needCache = cacheRequestUrls.some(function(url){
        return e.request.url.indexOf(url) > -1
    })

    if(needCache){
        caches.open(apiCacheName).then(function(cache){
            return fetch(e.request).then(function(res){
                cache.put(e.request.url, res.clone())
                return res
            })
        })
    }
    else{
      // respondWith方法向浏览器返回数据, caches.match(e.request)则可以查看当前的请求是否有一份本地缓存
      e.respondWith(caches.match(e.request).then(function(cache){
          return cache || fetch(e.request)
      }).catch(function(err){
          console.log(err)
          return fetch(e.request)
      }))
    }
})

// 监听push事件 => 在浏览器中获取推送信息
self.addEventListener('push', function(e){
  var data = e.data
  if(data){
    data = data.json()
    console.log('push的数据：', data)
    self.registration.showNotification(data.text)
  }
  else{
    console.log('push没有任何数据')
  }
})