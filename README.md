# chat-electron-react
一个使用socket.io和Electron实现的实时聊天应用


# server部署说明:
  * 安装Redis
  * 安装MySql
  * 下载Minio: (https://min.io/) 官网有使用说明
  * 修改common/sendVerificationCode.ts:
  ```
  const transporter = nodeMailer.createTransport({
    host: "smtp.qq.com", //邮件发送的域名，我们这里使用的是QQ的服务
    port: 587,    // SMTP端口号
    secure: false,   //secure:true for port 465, secure:false for port 587
    auth: {
        user: fromMailer,  //邮件发送方的邮箱
        pass: ""   //开启POP服务生成的授权码,添加你的授权码
    }
})
```
* 如果你的Redis有设置账号密码就到common/redis.ts 添加你的账号密码
* ormconfig.json是MySql的配置文件,在此文件中修改数据库的信息
* 如果你的minio对象存储服务器不是使用默认的端口和账号密码需要修改minio/minio.ts
* 启动服务: npm run dev 或 yarn dev

- - -
# client启动说明:
 * 项目使用了ffi-napi,它需要编译c代码,所以需要安装:
    * npm i -g node-gyp
    * npm i -g --production windows-build-tools(需要管理员权限) 
 * 启动客户端:npm run start 或 yarn start
  
# 实现的功能:
 * 私聊
 * 群聊
 * 发送表情(字符表情)
 * 发送文件,下载文件
 * 音乐播放器
 * 视频播放器
 * 发送语音
 * 语音聊天,视频聊天(效果很不完美,技术有限解决不了)(webRtc实现)
 * 截图(截取屏幕是通过调用golang编写的dll实现,截图编辑使用了fabric.js)  

#项目演示图片:
<img alt="注册" src="./demoPicture/注册.png"/>
<img alt="登录" src="./demoPicture/登录.jpg"/>
<img alt="聊天界面1" src="./demoPicture/聊天界面1.png"/>
<img alt="聊天界面2" src="./demoPicture/聊天界面2.png"/>
<img alt="聊天界面3" src="./demoPicture/聊天界面3.png"/>
<img alt="聊天界面4" src="./demoPicture/聊天界面4.png"/>
<img alt="电话拨打" src="./demoPicture/电话拨打.png"/>
<img alt="视频拨打" src="./demoPicture/视频拨打.png"/>
<img alt="截图" src="./demoPicture/截图.png"/>
<img alt="好友详情" src="./demoPicture/好友详情.png"/>
<img alt="群聊详情" src="./demoPicture/群聊详情.png"/>
<img alt="创建群聊" src="./demoPicture/创建群聊.png"/>
<img alt="修改群名" src="./demoPicture/修改群名.png"/>
<img alt="退出群聊" src="./demoPicture/退出群聊.png"/>
<img alt="踢出群聊" src="./demoPicture/踢出群聊.png"/>
<img alt="头像设置1" src="./demoPicture/头像设置1.png"/>
<img alt="头像设置2" src="./demoPicture/头像设置2.png"/>
<img alt="音乐播放" src="./demoPicture/音乐播放.jpg"/>
<img alt="视频播放" src="./demoPicture/视频播放.png"/>
  
 # 代码并不完美,请多见谅
