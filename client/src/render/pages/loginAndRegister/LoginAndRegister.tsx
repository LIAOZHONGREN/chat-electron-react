import React, { useState, useEffect, useRef } from 'react';
import ReactDom from 'react-dom'
import { Loading, MyCountDown } from '../../components/components'
import { Button, Radio, Cascader, Tooltip, message, Spin } from 'antd'
import areaData from '../../static/json/地区信息.json'
import Mtils from 'mtils'
import { User, GenderEnum } from '../../net/model'
import { RegisterService, LoginService, GetVerificationCodeService, VerificationCodeService } from '../../net/net'
import { TrimAll } from '../../common/tools'
import { CloseWindow, MinWindow } from '../../common/electronTool'
import '../../static/scss/main.scss'
import './loginAndRegister.scss'
import { ipcRenderer } from 'electron';
import Test from '../test/Test'
import TextCanvas from '../test/TextCanvas'

export interface ILoginAndRegisterProps {
}

export default function LoginAndRegister(props: ILoginAndRegisterProps) {

    const [loading, setloading] = useState<boolean>(false)
    const [isLogin, setisLogin] = useState<boolean>(true)//用于判断是在登录还是注册
    const [user, setUser] = useState<User>({ identity: '', name: '', password: '' })//用于登录的user
    const [user2, setUser2] = useState<User>({ identity: '', name: '', password: '', gender: GenderEnum.unisex, area: '' })//用于注册的user
    const [password2, setpassword2] = useState<string>('')
    const [verificationCode, setverificationCode] = useState<string>('')//验证码
    const [isGetCode, setisGetCode] = useState<true>(false)//是否在获取验证码 用于控制不可以频繁的获取
    const [loginMethod, setloginMethod] = useState<'密码' | '验证码'>('密码')

    const openLogin = useRef<HTMLDivElement>()

    //获取验证码 操作后验证码发送到用户邮箱
    function getVerificationCode() {

        if (isGetCode) {
            message.warning('两次请求获取验证码需要间隔60秒!')
            return
        }

        if ((user2.identity && Mtils.validation.isEmail(user2.identity)) || (isLogin && user.name)) {
            setisGetCode(true)
            let user_ = user.name ? { ...user } : { ...user2 }
            GetVerificationCodeService(user_)
            return
        }

        message.warning(isLogin ? '输入用户名或邮箱后再获取验证码!' : '输入邮箱后再获取验证码!')
    }

    function inputOnChange(u: User) {

        let user_ = isLogin ? { ...user } : { ...user2 }
        Object.keys(u).forEach(k => { user_[k] = u[k] })
        isLogin ? setUser(user_) : setUser2(user_)

    }

    function eMailVerify(): boolean {
        if (!user2.identity) {
            message.warning('邮箱不可为空!')
            return false
        }

        if (user2.identity.length !== TrimAll(user2.identity).length) {
            message.warning('邮箱不可有空格!')
            return false
        }

        if (!Mtils.validation.isEmail(user2.identity)) {
            message.warning('邮箱格式错误')
            return false
        }

        return true
    }

    function usernameVerify(): boolean {

        let user_ = isLogin ? { ...user } : { ...user2 }

        if (user_.name.length !== TrimAll(user_.name).length) {
            message.warning('用户名不可有空格!')
            return false
        }

        if (isLogin) {
            if (Mtils.validation.isEmail(user_.name)) user_.identity = user_.name
            setUser(user_)
        }

        if (!user_.name) {
            message.warning('用户名不可为空!')
            return false
        }
        return true
    }

    function passwordVerify(): boolean {
        let user_ = isLogin ? { ...user } : { ...user2 }

        if (!user_.password) {
            message.warning('密码不可为空!')
            return false
        }

        if (user_.password.length !== TrimAll(user_.password).length) {
            message.warning('密码不可有空格!')
            return false
        }

        if (user_.password.length < 8 && !isLogin) {
            message.warning('密码长度不可小于8!')
            return false
        }

        if (password2 !== '' && user_.password !== password2) {
            message.warning('两次输入的密码不同!')
            return false
        }
        return true
    }
    //验证确认密码
    function passwordVerify2(): boolean {
        if (password2 === '') {
            message.warning('确认密码不可为空!')
            return false
        }
        if (user2.password !== password2) {
            message.warning('两次输入的密码不同!')
            return false
        }
        return true
    }

    //判断是否取消上次的验证码验证
    function validationVerify() {
        if (verificationCode === '') {
            message.warning('验证码不可为空!')
            return false
        }
        return true
    }

    function login() {
        let ok: boolean
        ok = usernameVerify() ? true : false
        loginMethod === '密码' ? (passwordVerify() ? true : ok = false) : (validationVerify() ? true : ok = false)

        const loginS = () => {
            LoginService({ ...user }, (res2, err) => {
                setloading(false)
                if (err || res2.err) {

                    message.error(res2?.err ? res2.err : '登录发生错误!')
                    return
                }
                localStorage.setItem('me', JSON.stringify(res2.data))
                ipcRenderer.send('login-success')
            })
        }

        if (ok) {
            setloading(true)
            if (loginMethod === '验证码') { user.password = `验证码${verificationCode}` }
            loginS()
        }
    }

    function register() {
        let ok = true
        if (!eMailVerify()) ok = false
        if (!usernameVerify()) ok = false
        if (!passwordVerify()) ok = false
        if (!passwordVerify2()) ok = false
        if (!validationVerify()) ok = false
        if (ok) {
            setloading(true)
            VerificationCodeService({ name: user2.name, identity: user2.identity }, verificationCode, (res, err) => {
                if (err || res.err) {
                    setloading(false)
                    message.warning(res?.err ? res.err : '注册发生错误!')
                    return
                }
                RegisterService({ ...user2 }, (res2, err) => {
                    setloading(false)
                    if (err || res2.err) {
                        message.error(res2?.err ? res2.err : '注册发生错误!')
                        return
                    }
                    localStorage.setItem('me', JSON.stringify(res2.data))
                    ipcRenderer.send('login-success')
                })
            })
        }

    }

    //监听发生登录或注册的切换 发生切换把验证码的验证状态设置为未验证 把所有状态还原到初始状态
    useEffect(() => {
        setverificationCode('')
        setUser({ identity: '', name: '', password: '' })
        setUser2({ identity: '', name: '', password: '', gender: GenderEnum.unisex, area: '' })
        setpassword2('')
        setisGetCode(false)
        return () => { }
    }, [isLogin])

    return (
        <div className='loginAndRegister'>
            <div className='loginAndRegister-nav' style={{ position: 'absolute', top: '0', left: '0', width: '100%', height: '15px', zIndex: '999' }}>
                <div className='close-but' onClick={CloseWindow}>
                    <img width={15} src={require('../../static/svg/关闭.svg').default} />
                </div>
                <div className='narrow-but' onClick={MinWindow}>
                    <img width={15} src={require('../../static/svg/最小化.svg').default} />
                </div>
            </div>
            <div className='bg'></div>
            <Loading text={isLogin ? 'login' : 'register'} size={16} color='#d3f261' loading={loading} />
            <input type='radio' id='open-register' name="switch" />
            <input type='radio' id='open-login' name="switch" ref={openLogin} />
            <div className='partition'></div>

            <div className='login'>
                <h1>登录</h1>
                <div className='input-form'>
                    <input spellCheck='false' type='text' id='username' value={user.name} onChange={e => { inputOnChange({ name: e.target.value }) }} onBlur={usernameVerify} placeholder='Username' />
                    <label htmlFor='username'></label>
                    <div className='icon'><img width={25} src={require('../../static/svg/user.svg').default} /></div>
                </div>

                {
                    loginMethod === '密码' ? (
                        <div className='input-form'>
                            <input spellCheck='false' type='password' id='password' value={user.password} onChange={e => { inputOnChange({ password: e.target.value }) }} onBlur={passwordVerify} placeholder='Password' />
                            <label htmlFor='password'></label>
                            <div className='icon'><img width={25} src={require('../../static/svg/password.svg').default} /></div>
                        </div>
                    ) : (
                            <div className='input-form weri-code'>
                                <input spellCheck='false' type='text' id='verification-code' value={verificationCode} onChange={e => { setverificationCode(e.target.value) }} onBlur={() => { isLogin ? validationVerify() : null }} placeholder='verification Code' />
                                <label htmlFor='verification-code'></label>
                                <div className='icon'><img width={25} src={require('../../static/svg/验证码.svg').default} /></div>
                                {
                                    !isGetCode || !isLogin ? (
                                        <Tooltip title="发送验证码到邮箱" color={'#69c0ff'}>
                                            <div className='icon2' onClick={getVerificationCode}><img width={25} src={require('../../static/svg/获取验证码.svg').default} /></div>
                                        </Tooltip>
                                    ) : <div className='icon2' onClick={getVerificationCode}> <MyCountDown size='small' second={60} onComplete={() => { setisGetCode(false) }} /></div>
                                }
                            </div>
                        )
                }
                <div className='submit' onClick={login}><img width={25} src={require('../../static/svg/发送.svg').default} /></div>
                <div className='login-method'><span onClick={() => { setloginMethod(loginMethod === '密码' ? '验证码' : '密码') }}>{`${loginMethod === '密码' ? '验证码' : '密码'}登录`}</span></div>
            </div>

            <div className='register'>
                <label id='but-close' htmlFor='open-login' onClick={() => { setisLogin(true) }}></label>
                <label id='but-open' htmlFor='open-register' onClick={() => { setisLogin(false) }}></label>
                <div className='register-entry'>
                    <h1>注册</h1>
                    <div className='input-form'>
                        <input spellCheck='false' type='text' id='email' value={user2.identity} onChange={e => { inputOnChange({ identity: e.target.value }) }} onBlur={eMailVerify} placeholder='E-Mail' />
                        <label htmlFor='email'></label>
                        <div className='icon'><img width={25} src={require('../../static/svg/邮箱.svg').default} /></div>
                    </div>
                    <div className='input-form'>
                        <input spellCheck='false' type='text' id='username_' value={user2.name} onChange={e => { inputOnChange({ name: e.target.value }) }} onBlur={usernameVerify} placeholder='Username' />
                        <label htmlFor='username_'></label>
                        <div className='icon'><img width={25} src={require('../../static/svg/user.svg').default} /></div>
                    </div>
                    <div className='input-form' >
                        <input spellCheck='false' type='password' id='password_' value={user2.password} onChange={e => { inputOnChange({ password: e.target.value }) }} onBlur={passwordVerify} placeholder='Password' />
                        <label htmlFor='password_'></label>
                        <div className='icon'><img width={25} src={require('../../static/svg/password.svg').default} /></div>
                    </div>
                    <div className='input-form'>
                        <input spellCheck='false' type='password' id='confirm-password' value={password2} onChange={e => { setpassword2(e.target.value) }} onBlur={passwordVerify2} placeholder='Confirm Password' />
                        <label htmlFor='confirm-password'></label>
                        <div className='icon'><img width={25} src={require('../../static/svg/确认密码.svg').default} /></div>
                    </div>
                    <div className='input-form'>
                        <div className='content'>
                            <Radio.Group onChange={e => { inputOnChange({ gender: e.target.value }) }} value={user2.gender}>
                                <Radio value={GenderEnum.girl} style={{ position: 'relative', width: 'auto', height: 'auto' }}><img width={25} src={require('../../static/svg/girl.svg').default} /></Radio>
                                <Radio value={GenderEnum.boy} style={{ position: 'relative', width: 'auto', height: 'auto' }}><img width={25} src={require('../../static/svg/boy.svg').default} /></Radio>
                            </Radio.Group>
                        </div>
                        <div className='icon'><img width={25} src={require('../../static/svg/gender.svg').default} /></div>
                    </div>
                    <div className='input-form'>
                        <div className='content'><Cascader bordered={false} placeholder='请选择地区信息' size='middle' options={areaData} onChange={value => { inputOnChange({ area: value.length > 0 ? value.join('  ') : '' }) }} /></div>
                        <div className='icon'><img width={25} src={require('../../static/svg/地区.svg').default} /></div>
                    </div>
                    <div className='input-form weri-code'>
                        <input spellCheck='false' type='text' id='verification-code_' value={verificationCode} onChange={e => { setverificationCode(e.target.value) }} onBlur={() => { !isLogin ? validationVerify() : null }} placeholder='verification Code' />
                        <label htmlFor='verification-code_'></label>
                        <div className='icon'><img width={25} src={require('../../static/svg/验证码.svg').default} /></div>
                        {
                            !isGetCode || isLogin ? (
                                <Tooltip title="发送验证码到邮箱" color={'lime'}>
                                    <div className='icon2' onClick={getVerificationCode}><img width={25} src={require('../../static/svg/获取验证码.svg').default} /></div>
                                </Tooltip>
                            ) : <div className='icon2' onClick={getVerificationCode}><MyCountDown size='small' second={60} onComplete={() => { setisGetCode(false) }} /></div>
                        }
                    </div>
                    <div className='submit' onClick={register}><img width={25} src={require('../../static/svg/发送.svg').default} /></div>
                </div>
            </div>
        </div>
    );
}

(ReactDom.render || ReactDom.hydrate)(<LoginAndRegister />, document.getElementById('root'))