/** @format */

import cookie from './cookie'

const website = {
	site_name: 'ImgTools',
	access_token_key: 'access_token',
	device_id_key: 'x-device-id',
	referral_key: 'ref_code',
	auth_header: 'Authorization',
	locale_key: 'NEXT_LOCALE',
	locales: ['en'],
	cdn_host: 'https://files.soulfun.ai',
	cdn_host_r2: 'https://soulfun-files.relaxops.cc',
	apple_app_down_url: 'https://apps.apple.com/app/apple-store/id6474281790',
	ios_download_enabled: false,
	android_download_enabled: false,
	android_app_down_url: 'https://play.google.com/store/apps/details',
	waifu_files_url: 'https://waifu-files.faceplay.me/cdn-cgi/image',
	apk_app_down_url_dev:
		'https://files.soulfun.ai/apk%2Fsoulfun-v1.5.10%2B24-arm64-v8a-dev-release.apk',
	apk_app_down_url_prod: 'https://files.soulfun.ai/apk/soulfun-prod-v1.7.1-2028.apk',
}

const FORM_URLENCODED = 'application/x-www-form-urlencoded; charset=UTF-8'
const LOCALE_KEY = 'locale'

function compose_headers(headers, isFormData) {
	const isBrowser = typeof document !== 'undefined'
	const baseHeaders = new Headers()
	baseHeaders.append('X-Request-With', 'XMLHttpRequest')

	const cookieText = isBrowser ? document.cookie : headers?.cookie
	const token = cookie.get(website.access_token_key, cookieText || '')
	if (token) {
		baseHeaders.append(website.auth_header, token)
	}
	const deviceId =
		cookie.get(website.device_id_key, cookieText) || '303e63a1-a46c-45f6-b7f0-50c4c0d14485'

	if (deviceId) {
		baseHeaders.append(website.device_id_key, deviceId)
	}

	const locale = cookie.get(website.locale_key, cookieText || '')
	baseHeaders.append('Accept-Language', locale || 'en')

	if (headers) {
		for (const key in headers) {
			if (key !== 'cookie') {
				baseHeaders.set(key, headers[key])
			}
		}
	}

	if (!isFormData) {
		if (!baseHeaders.get('Content-Type')) {
			baseHeaders.set('Content-Type', FORM_URLENCODED)
		}
	}

	return baseHeaders
}

function compose_url(url, basePath = '') {
	return url?.startsWith('http') ? url : basePath + url
}

function appendQuery(url, query) {
	const sp = url.includes('?') ? '&' : '?'
	return `${url}${sp}${query}`
}

const generator = (method = 'GET', basePath = 'https://gateway.img-tools.app/web') => {
	console.log(basePath)
	/**
	 * url 最好不要带参数，GET 也使用 params
	 */
	const request = async (url: string, params = {}, headers = {}, otherOptions = null) => {
		const isFormData = typeof FormData !== 'undefined' && params instanceof FormData
		const customHeaders = compose_headers(headers, isFormData)
		let locale = ''
		if (typeof window !== 'undefined') {
			locale = customHeaders.get('Accept-Language') ?? ''
			customHeaders.delete('Accept-Language')
		}
		// 第三方
		if (url.startsWith('http')) {
			customHeaders.delete(website.auth_header)
		}

		const options: any = {
			method: method,
			headers: customHeaders,
			// fetch请求接口偶先使用缓存，禁用缓存
			cache: 'no-store',
		}

		// 个别请求不能带?
		if (method === 'GET') {
			const qString = qs.stringify({ [LOCALE_KEY]: locale, ...params })
			url = `${url}${qString ? '?' + qString : ''}`
		} else {
			// aws forbid this
			// Query String Parameters not allowed on POST requests.
			if (!url.includes('amazonaws.com')) {
				url = appendQuery(url, `${LOCALE_KEY}=${locale}`)
			}

			if (isFormData) {
				options.body = params
			} else {
				// 后台对象只允许点，数组中括号
				options.body = options?.headers?.get('Content-Type')?.includes('json')
					? JSON.stringify(params)
					: qs.stringify(params, { allowDots: true })
			}
		}

		let json,
			err,
			response = new Response()
		try {
			response = await fetch(compose_url(url, basePath), options)
			if (response.ok) {
				if (response.status === 200) {
					if (otherOptions?.blob) {
						json = response
						return json
					}
					json = await response.json()
					const { errorCode: code, errorMsg: message = 'Request error', success } = json
					// success 判断更简单，方便 mock
					if (!success) {
						err = { message, code, statusText: response.statusText }
					}
					// aws upload file will return 204 No content
				} else if (response.status == 204) {
					json = {
						success: true,
					}
				}
			} else {
				const { errorCode, errorMsg, data } = await response.json()
				if (response.status === 400 && errorCode === 2) {
					err = {
						message:
							errorMsg + ':' + (data || []).map(i => i.field + ' ' + i.defaultMessage).join(','),
						code: response.status,
					}
				} else {
					err = {
						message: response.statusText || 'Request error',
						code: response.status,
					}
				}
			}
		} catch (error) {
			err = {
				message: error.message,
				code: response?.status || 0,
				statusText: response?.statusText || 'Network error',
			}
		}

		if (err) {
			if (err.code === 401) {
				if (
					typeof window !== 'undefined' &&
					location.pathname !== '/' &&
					location.pathname !== '/ai-chat/conversations'
				) {
					location.href = '/' //登录态丢失默认跳转到首页，防止登录才能访问的页面保留
				}
				// 打开登录弹窗
				globalThis.handleAuth?.() //打开登录弹窗
			}
			return Promise.reject(err)
		}

		// 直接返回全部 json，有些场景需要 data 之外的数据
		return json
	}

	return request
}

export const get = generator()

export const post = generator('POST')

export const put = generator('PUT')

export const del = generator('DELETE')

export const pat = generator('PATCH')

export const createInstance = (apiUrl?: string) => {
	return {
		get: apiUrl ? generator('GET', apiUrl) : get,
		post: apiUrl ? generator('POST', apiUrl) : post,
		put: apiUrl ? generator('PUT', apiUrl) : put,
		del: apiUrl ? generator('DELETE', apiUrl) : del,
		pat: apiUrl ? generator('PATCH', apiUrl) : pat,
	}
}
