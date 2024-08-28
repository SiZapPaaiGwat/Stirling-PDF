/** @format */

import { signIn, initApp } from './utils/firebase'
import { post } from './utils/request'
;(function () {
	const user = localStorage.getItem('user')
	const a = document.querySelector('#login')

	if (user) {
		console.log(user)
		a.textContent = 'Logout'
		a.addEventListener('click', e => {
			e.preventDefault()
			localStorage.removeItem('user')
			location.reload()
		})
	} else {
		a.textContent = 'Login'
		a.addEventListener('click', async e => {
			e.preventDefault()
			const data = await signIn()
			if (data) {
				localStorage.setItem('user', JSON.stringify(data))
				location.reload()
			}
		})
	}

	// @ts-ignore
	window.consumeCredits = async bizType => {
		await post('/users/me/equities', {
			bizType,
		})
	}

	document.querySelectorAll('[data-biz-type]').forEach(element => {
		element.addEventListener('click', async () => {
			// @ts-ignore
			consumeCredits(element.dataset.bizType)
		})
	})
})()
