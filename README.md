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
        pass: ""   //我们开启POP服务生成的授权码,添加你的授权码
    }
})
```

* 如果你的Redis有设置账号密码就到common/redis.ts 添加你的账号密码
* ormconfig.json是MySql的配置文件,在此文件中修改数据库的信息
* 如果你的minio对象存储服务器不是使用默认的端口和账号密码需要修改minio/minio.ts
* 启动服务: npm run dev 或 yarn dev
