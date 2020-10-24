import { createStore, applyMiddleware, compose, AnyAction } from 'redux'  //  引入createStore方法
import reducer, { StateType } from './reducer'
import thunk from 'redux-thunk'

const composeEnhancers = window.__REDUX_DEVTOOLS_EXTENSION_COMPOSE__ ?
    window.__REDUX_DEVTOOLS_EXTENSION_COMPOSE__({}) : compose

const enhancer = composeEnhancers(applyMiddleware(thunk))

const store = createStore<StateType>(reducer, enhancer) // 创建数据存储仓库
export default store   //暴露出去 