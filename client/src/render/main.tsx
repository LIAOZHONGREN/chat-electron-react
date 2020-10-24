/**
 * render 进程入口文件
 */
import React from 'react'
import ReactDom from 'react-dom'
import Home from './pages/home/Home'

(ReactDom.render || ReactDom.hydrate)(<Home />, document.getElementById('root'))
