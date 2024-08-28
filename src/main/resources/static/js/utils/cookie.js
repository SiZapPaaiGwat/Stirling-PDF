/** @format */

function get(key, cookie = '') {
	const reg = new RegExp(key + '=([^;]*)')
	if (typeof document !== 'undefined' && !cookie) {
		cookie = document.cookie
	}
	try {
		return cookie.match(reg)?.[1] ?? ''
	} catch (e) {
		return ''
	}
}

function set(key, value, expires) {
	let exp = ''
	if (expires) {
		exp = new Date(new Date().getTime() + expires).toUTCString()
	} else {
		exp = 'Session'
	}
	document.cookie = key + '=' + value + ';path=/; expires=' + exp
}

function del(key) {
	const expires = new Date()
	expires.setTime(expires.getTime() - 1000)
	document.cookie = key + '=xxx;path=/;expires=' + expires.toUTCString()
}

const cookie = {
	set,
	get,
	del,
}

export default cookie
