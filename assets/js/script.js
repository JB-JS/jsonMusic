// 전역 변수들 설정
window.dd = console.log.bind(console);
window.LS = localStorage;


// 전역 함수들 설정
var matchOperatorsRe = /[|\\{}()[\]^$+*?.]/g;

function escape(str) {
	if (typeof str !== 'string') {
		throw new TypeError('Expected a string');
	}

	return str.replace(matchOperatorsRe, '\\$&');
};

// 프로토타입 함수 설정
Array.prototype.find = function(id) {
	return this.filter(el => el.id == id)[0];
}

// 카트 에 관한 객체
const Cart = {

	init() {

		Cart.hook();
		Cart.refreshSum();
		Cart.refreshCart();
	},

	hook() {

		$(document)
			.on('click', '.produ-cost .btn-xs', Cart.add)
			.on('input', '.albumqty input', Cart.refreshCnt)
			.on('click', '#myModal > div > div > div.modal-body > table > tbody > tr button', Cart.drop)
			.on('click', '#myModal > div > div > div.modal-footer > button.btn.btn-primary', Cart.payment)
	},

	add() {

		const id = this.dataset.id;
		const data = Music.datas.find(id);

		data.cnt++;

		Cart.refreshSum();
		Cart.refreshCart();
		Cart.refreshButton(id);
	},

	drop() {

		if (confirm('정말 삭제 하시겠습니까?')) {
			const id = this.dataset.id;
			const data = Music.datas.find(id);
			data.cnt = 0;
			Cart.refreshSum();
			Cart.refreshCart();
			Cart.refreshButton(id);
		}
	},

	payment() {

		const datas = Music.datas.filter(el => el.cnt > 0);

		if (datas.length == 0)
			return alert('상품을 1개이상 선택해주세요.');
		
		alert('결제가 완료되었습니다.')

		for (let data of datas) {
			data.cnt = 0;
			Cart.refreshButton(data.id);
		}

		Cart.refreshSum();
		Cart.refreshCart();

		$('.close').click();
	},

	refreshButton(id) {

		$(`.produ-cost button[data-id=${id}] span`).text(`${Music.datas.find(id).buttonText}`)
	},

	refreshCnt() {

		const id = this.dataset.id;
		const data = Music.datas.find(id);

		if (this.value < 1) {
			this.value = 1;
			alert('수량은 1이상 입력가능합니다')
		}

		this.value = Math.round(this.value);


		data.cnt = this.value;
		$(`.pricesum[data-id=${data.id}]`).text(`￦ ${data.sum.toLocaleString()}`)

		Cart.refreshButton(id);
		Cart.refreshSum();
	},

	refreshSum() {

		let cnt = 0;
		let sum = 0;

		const datas = Music.datas.filter(el => el.cnt > 0);

		for (let data of datas) {
			cnt += +data.cnt;
			sum += +data.price * data.cnt;
		}

		$('button[data-target=#myModal]').html(`
			<i class="fa fa-shopping-cart"></i> 쇼핑카트 <strong>${cnt}</strong> 개 금액 ￦ ${sum.toLocaleString()}원</a>
		`)
		$('.totalprice span').text(`￦${sum.toLocaleString()}`);
	},

	refreshCart() {

		const datas = Music.datas.filter(el => el.cnt > 0);

		let html = ''

		for (let data of datas)
			html += `
				<tr>
				    <td class="albuminfo">
				        <img src="images/${data.albumJaketImage}">
				        <div class="info">
				            <h4>${data.albumName}</h4>
				            <span>
				                <i class="fa fa-microphone"> 아티스트</i> 
				                <p>${data.artist}</p>
				            </span>
				            <span>
				                <i class="fa  fa-calendar"> 발매일</i> 
				                <p>${data.release}</p>
				            </span>
				        </div>
				    </td>
				    <td class="albumprice">
				        ￦ ${(+data.price).toLocaleString()}
				    </td>
				    <td class="albumqty">
				        <input type="number" class="form-control" value="${data.cnt}" data-id="${data.id}">
				    </td>
				    <td class="pricesum" data-id='${data.id}'>
				        ￦ ${data.sum.toLocaleString()}
				    </td>
				    <td>
				        <button class="btn btn-default" data-id="${data.id}">
				            <i class="fa fa-trash-o"></i> 삭제
				        </button>
				    </td>
				</tr>
			`

		$('.table tbody').html(html);
	}
}

// 앨범 과 카테고리 에 관한 객체
const Music = {

	page: 1,
	datas: null,
	category: null,
	searchData: null,

	async init() {

		Music.datas = await Music.load();
		Music.category = LS.category ? LS.category : 'ALL';
		Music.refreshCategory();
		Music.refreshActive();
		Music.refreshContent();
		Music.hook();
	},

	hook() {

		$(document)
			.on('click', '#main-menu > li a', Music.active)
			.on('keydown', '.search .form-control', Music.search)
			.on('click', '.search .btn-default', Music.search)

		window.onbeforeunload = Music.save;

		window.onscroll = Music.scroll;
	},

	scroll() {

		if (Math.ceil($(window).scrollTop()) >= $(document).height() - $(window).height()) {
			Music.page++;
			Music.refreshContent();
		}
	},

	save() {

		LS.music = JSON.stringify(Music.datas);
		LS.category = Music.category;
	},

	async load() {

		let result = [];
		let datas = LS.music ? JSON.parse(LS.music) : (await $.getJSON('music_data.json')).data;

		for (let data of datas)
			result.push({
				...data,
				id: result.length + 1,
				cnt: data.cnt || 0,
				price: data.price.includes('원') ? data.price.replace('원', '').trim() : data.price,
				get buttonText() {
					return this.cnt > 0 ? `추가하기 (${this.cnt}개)` : '쇼핑카트담기';
				},
				get sum() {
					return this.cnt * this.price;
				}
			});

		return result;
	},

	active() {
		
		$('.active-menu').removeClass('active-menu');

		$(this).addClass('active-menu')
		Music.category = $(this).text().trim();

		Music.searchData = '';
		Music.refreshContent(); 
	},

	refreshActive() {

		$('.active-menu').removeClass('active-menu');

		$.each($('#main-menu a'), (ix, el) => {
			if ($(el).text().trim() == Music.category)
				$(el).addClass('active-menu');
		})

		Music.searchData = '';
		Music.page = 1;
		Music.refreshContent(); 
	},

	search(e) {


		if (e.key == 'Enter' || e.type == 'click') {
			if (!$('.input-group .form-control').val()) return alert('검색어를 입력해주세요.');
			Music.searchData = $('.input-group .form-control').val();
			Music.page = 1;
			Music.refreshContent();
		}
	},

	refreshCategory() {

		$('#main-menu > li').last().remove();

		new Set(Music.datas.map((el) => el.category)).forEach((el) => {
			$('#main-menu').append(`
				<li>
				    <a href="#"><i class="fa fa-youtube-play fa-2x"></i> <span>${el}</span></a>
				</li>
			`)
		});

	},

	refreshContent() {

		let html = ''

		$('h2').text(Music.category);

		for (let data of Music.content)
			html += `
				<div class="col-md-2 col-sm-2 col-xs-2 product-grid">
				    <div class="product-items">
				            <div class="project-eff">
				                <img class="img-responsive" src="images/${data.albumJaketImage}" alt="Time for the moon night">
				            </div>
				        <div class="produ-cost">
				            <h5>${data.albumName}</h5>
				            <span>
				                <i class="fa fa-microphone"> 아티스트</i> 
				                <p>${data.artist}</p>
				            </span>
				            <span>
				                <i class="fa  fa-calendar"> 발매일</i> 
				                 
				                <p>${data.release}</p>
				            </span>
				            <span>
				                <i class="fa fa-money"> 가격</i>
				                <p>￦${(+data.price).toLocaleString()}</p>
				            </span>
				            <span class="shopbtn">
				                <button class="btn btn-default btn-xs" data-id="${data.id}">
				                    <i class="fa fa-shopping-cart"></i> <span style="display: inline">${data.buttonText}</span>
				                </button>
				            </span>
				        </div>
				    </div>
				</div>
			`

		$('.contents').html(html || '<h1 style="color: red;">검색된 앨범이 없습니다</h1>');
	},

	get content() {

		let datas = Music.datas.map(x => Object.assign({}, x));
		let end = 12 * Music.page;

		if (Music.category != 'ALL') {
			datas = datas.filter(el => el.category == Music.category);
		}


		if (Music.searchData) {

			const reg = new RegExp(escape(Music.searchData), 'g');
			const mark = '<mark style="color: red;">'+Music.searchData+'</mark>'

			datas = datas.filter(el => {
				if (el.albumName.includes(Music.searchData) || el.artist.includes(Music.searchData)) {
					el.albumName = el.albumName.replace(reg, mark);
					el.artist = el.artist.replace(reg, mark);
					return 1;
				}
			})
		}

		datas.sort((a,b) => b.release.localeCompare(a.release));

		datas = datas.slice(0, end);

		return datas;
	}
}

// 윈도우가 로드된후 실행
window.onload = async () => {
	$.ajax({cache: false})
	await Music.init();
	Cart.init();
	$('.navbar-brand').css({
		position: 'fixed'
	})
	$('#main-menu').css({
		position: 'fixed'
	})

}
