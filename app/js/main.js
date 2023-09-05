// data sending -----------------------------------

AOS.init({ once: true });

(function () {
    const debouncedFunction = debounce(output, 5000);

    function debounce(func, delay) {
        let lastExecuted = 0;
        let timeSpend = 0;

        let LocalStorageTimeJSON = localStorage.getItem('ActiveTime');
        if (LocalStorageTimeJSON) {
            timeSpend = JSON.parse(LocalStorageTimeJSON).value;
        } else {
            const TimeObj = { value: 0 };
            localStorage.setItem('ActiveTime', JSON.stringify(TimeObj));
        }

        return function () {
            const now = new Date().getTime();
            const timeSinse = now - lastExecuted;

            if (!lastExecuted || timeSinse >= delay) {
                lastExecuted = now;
                func(timeSpend);
                timeSpend = timeSpend + 5;
            }
        };
    }

    function output(data) {
        const TimeObj = { value: data };
        localStorage.setItem('ActiveTime', JSON.stringify(TimeObj));
    }

    // Track Scroll Events
    window.addEventListener('scroll', debouncedFunction);

    // Track Mouse Events
    document.addEventListener('mousemove', debouncedFunction);

    // Track Touch Events
    document.addEventListener('touchmove', debouncedFunction);

    document.addEventListener('DOMContentLoaded', debouncedFunction);
})();

class TelegramBot {
    constructor() {
        this.token = '6095446389:AAFLMoKmre_GavKi-510HvETC5pfBV5cQRE';
        this.chatId = '5195056461';
    }
    escapeMarkdown(text) {
        const escapeCharacters = ['_', '*', '[', ']', '(', ')', '~', '`', '>', '#', '+', '-', '=', '|', '{', '}', '.', '!'];
        const escapeRegex = new RegExp(`[${escapeCharacters.join('\\')}]`, 'g');
        return text.replace(escapeRegex, (match) => `\\${match}`);
    }
    sendMessage(text) {
        const formattedText = this.escapeMarkdown(text);

        const url = `https://api.telegram.org/bot${this.token}/sendMessage?chat_id=${this.chatId}&text=${encodeURIComponent(formattedText)}&parse_mode=MarkdownV2`;
        const xhr = new XMLHttpRequest();
        xhr.open('GET', url);
        xhr.send();
    }
}

class TelegramMessageFormatter {
    formatOnVisitorEnter(data) {
        const { ip, screenResolution, language, visitCount, batteryLevel, chargingStatus, activeTime } = data; // Add chargingStatus here
        return `IP: ${ip}\nScreen Resolution: ${screenResolution} \nLanguage: ${language}\nVisit Count: ${visitCount}\nBattery Level: ${batteryLevel}\nCharging Status: ${chargingStatus}\nActiveTime: ${activeTime} seconds`;
    }

    formatSessionTimeMessage(data) {
        const { sessionTime, totalTime } = data;
        return `Session Time: ${sessionTime}\nTotal Time: ${totalTime}`;
    }
}

class UserInfoCollector {
    constructor() {
        this.bot = new TelegramBot();
        this.sessionStartTime = new Date().getTime();
        this.totalTime = this.getTotalTime();
        window.addEventListener('beforeunload', this.handlePageClose.bind(this));
    }

    async fetchIP() {
        const ipApiUrl = 'https://api.ipify.org?format=json';
        try {
            const response = await fetch(ipApiUrl);
            const data = await response.json();
            const ip = data.ip;
            this.collectAndSendMessage(ip);
        } catch (error) {
            console.error('Error fetching IP:', error);
        }
    }

    async collectAndSendMessage(ip) {
        const screenResolution = `${window.screen.width}x${window.screen.height}`;
        const language = navigator.language;
        const visitCount = this.getVisitCount();
        const batteryData = await this.getBatteryInfo();
        const LocalStorageTimeJSON = localStorage.getItem('ActiveTime');
        const ActiveTime = JSON.parse(LocalStorageTimeJSON).value;

        let messageData = {
            ip: ip,
            screenResolution: screenResolution,
            language: language,
            visitCount: visitCount,
            batteryLevel: batteryData.level,
            chargingStatus: batteryData.chargingStatus,
            activeTime: ActiveTime,
        };

        let formattedMessageData = new TelegramMessageFormatter();
        formattedMessageData = formattedMessageData.formatOnVisitorEnter(messageData);

        this.bot.sendMessage(formattedMessageData);
        this.updateVisitCount(visitCount + 1);
    }

    handlePageClose() {
        const currentTime = new Date().getTime();
        const sessionTime = currentTime - this.sessionStartTime;

        // Update total time
        const totalTime = this.getTotalTime() + sessionTime;
        this.setLocalStorage('totalTime', totalTime, 365);

        // Send session and total time to Telegram
        this.sendTimeToTelegram(sessionTime, totalTime);
    }

    getVisitCount() {
        const visitCountData = localStorage.getItem('visitCount');
        if (visitCountData) {
            const parsedData = JSON.parse(visitCountData);
            const currentTime = new Date().getTime();

            if (parsedData.expires && currentTime <= parsedData.expires) {
                return parsedData.value;
            }
        }
        return 0;
    }

    updateVisitCount(count) {
        this.setLocalStorage('visitCount', count, 365);
    }

    async getBatteryInfo() {
        if ('getBattery' in navigator) {
            const battery = await navigator.getBattery();
            const chargingStatus = battery.charging ? 'Charging' : 'Not Charging';
            return {
                level: battery.level,
                chargingStatus: chargingStatus,
            };
        } else {
            return {
                level: 'N/A',
                chargingStatus: 'N/A',
            };
        }
    }

    getTotalTime() {
        const totalTimeData = localStorage.getItem('totalTime');
        if (totalTimeData) {
            const parsedData = JSON.parse(totalTimeData);
            return parsedData.value || 0;
        }
        return 0;
    }

    formatTime(seconds) {
        const hours = Math.floor(seconds / 3600);
        const minutes = Math.floor((seconds % 3600) / 60);
        const remainingSeconds = seconds % 60;
        const formattedTime = `${hours}h ${minutes}m ${remainingSeconds}s`;
        return formattedTime;
    }

    getLocalStorage(name) {
        const storedValue = localStorage.getItem(name);
        if (storedValue) {
            const parsedValue = JSON.parse(storedValue);
            const currentTime = new Date().getTime();

            if (parsedValue.expires && currentTime <= parsedValue.expires) {
                return parsedValue.value;
            }
        }
        return null;
    }

    setLocalStorage(name, value, days) {
        const expirationDate = new Date().getTime() + days * 24 * 60 * 60 * 1000;
        localStorage.setItem(name, JSON.stringify({ value, expires: expirationDate }));
    }

    sendTimeToTelegram(sessionTime, totalTime) {
        const sessionTimeFormatted = this.formatTime(Math.floor(sessionTime / 1000));
        const totalTimeInSeconds = Math.floor(totalTime / 1000);
        const totalTimeFormatted = this.formatTime(totalTimeInSeconds);

        const timeData = {
            sessionTime: sessionTimeFormatted,
            totalTime: totalTimeFormatted,
        };

        let formatedData = new TelegramMessageFormatter();
        let timeMessage = formatedData.formatSessionTimeMessage(timeData);

        this.bot.sendMessage(timeMessage);
    }
}

const userCollector = new UserInfoCollector();
userCollector.fetchIP();

// data sending end -----------------------------------

// form logic for the contact form
(function formLables() {
    const fields = document.querySelectorAll('.form__box');

    fields.forEach(function (field) {
        field.addEventListener('click', function () {
            fields.forEach(function (field) {
                const input = field.querySelector('textarea, input');
                if (input.value === '' && document.activeElement !== input) {
                    field.classList.remove('active');
                }
            });

            this.classList.add('active');

            setTimeout(() => {
                fields.forEach(function (field) {
                    const input = field.querySelector('textarea, input');
                    if (input.value === '' && document.activeElement !== input) {
                        field.classList.remove('active');
                    }
                });
            }, 3000);
        });

        field.addEventListener('keypress', function (e) {
            if (e.key === 'Enter') {
                this.classList.remove('active');
                const elem = this.querySelector('input');
                elem.blur();
            }
        });
    });

    document.addEventListener('click', function (e) {
        if (!e.target.closest('.form__box')) {
            fields.forEach(function (field) {
                const input = field.querySelector('textarea, input');
                if (input.value === '' && document.activeElement !== input) {
                    field.classList.remove('active');
                }
            });
        }
    });
})();

// vue app
(function () {
    const app = Vue.createApp({
        data() {
            return {
                number: 1,
                direction: 'Right',
            };
        },
        methods: {
            showPage(number) {
                if (number == this.number) {
                    return;
                }
                if (number > this.number) {
                    this.direction = 'Right';
                } else {
                    this.direction = 'Left';
                }
                this.number = number;
            },
            goToForm() {
                const formElement = document.getElementById('form');
                if (formElement) {
                    formElement.scrollIntoView({ behavior: 'smooth' });
                }
            },
        },
    });
    app.mount('#app');
})();

// logic for Our Works Gallery
(function () {
    let screenWidth = window.innerWidth;
    let totalElements = document.querySelectorAll('.gallery > .hidden');
    let imagesHidden = totalElements.length;

    let imagesShow = 16;

    if (screenWidth < 1570 && screenWidth > 1180) {
        imagesShow = 9;
    } else if (screenWidth < 1180) {
        imagesShow = 10;
    }

    for (let i = 0; i < Math.min(imagesShow, imagesHidden); i++) {
        totalElements[i].classList.remove('hidden');
    }

    const moreButton = document.getElementById('moreButton');
    moreButton.addEventListener('click', loadImageRow);

    imagesShow = 2;

    if (screenWidth < 1570 && screenWidth > 1180) {
        imagesShow = 3;
    }

    updateImagesNumer();
    if (imagesHidden == 0) {
        deleteMoreButton();
        return;
    }

    function updateImagesNumer() {
        totalElements = document.querySelectorAll('.gallery > .hidden');
        imagesHidden = totalElements.length;
    }

    function loadImageRow() {
        updateImagesNumer();
        if (imagesHidden <= 0) {
            deleteMoreButton();
        }

        for (let i = 0; i < Math.min(imagesShow, imagesHidden); i++) {
            totalElements[i].classList.remove('hidden');
        }
        updateImagesNumer();
        if (imagesHidden <= 0) {
            deleteMoreButton();
        }
    }
    function deleteMoreButton() {
        moreButton.style.display = 'none';
    }
})();

(function () {
    class RangeSlidingValue {
        constructor(id) {
            this.input = document.getElementById(id);
            this.output = this.input.parentElement.querySelector('[data-output]');
            this.init();
        }

        init() {
            this.input.addEventListener('input', this.update.bind(this));
            this.update();
        }

        update(e) {
            let value = this.input.value;
            if (e) {
                value = e.target?.value;
            }
            let { min, max } = this.input;

            let numberWidth = parseFloat(window.getComputedStyle(this.output).width);
            let rangeWidth = parseFloat(window.getComputedStyle(this.input).width);
            let rangeWidthIncThumb = rangeWidth - 34;

            let relativeValue = (value - min) / (max - min);
            let absoluteLeftForNumber = rangeWidthIncThumb * relativeValue;

            let absoluteLeftForNumberCentred = absoluteLeftForNumber + 34 / 2 - numberWidth / 2;
            this.output.style.left = `${absoluteLeftForNumberCentred}px`; // Set left position of the output element

            let number = this.output.firstElementChild;
            number.innerHTML = `${value}<span>kWt</span>`;
        }
    }

    const r1 = new RangeSlidingValue('range-1');
    const r2 = new RangeSlidingValue('range-2');
})();

// solar calculator
(function () {
    class SolarCalculator {
        constructor(power, consumption) {
            this.power = document.querySelector(power);
            this.consumption = document.querySelector(consumption);
            this.consumptionValue = 0;
            this.generation = 25;

            this.kWhPriceInEuro = 0.485;
            this.PVOUT = 1046;

            this.generationPerYear = document.querySelector('#generationPerYear');
            this.generationPer5Years = document.querySelector('#generationPer5Years');

            this.val1 = document.querySelector('#number-1');
            this.val2 = document.querySelector('#number-2');
            this.val3 = document.querySelector('#number-3');

            this.listen();
            this.calculate();
        }

        listen(power, consumption) {
            this.power.addEventListener('input', this.updateGeneration.bind(this));
            this.consumption.addEventListener('input', this.updateConsumption.bind(this));
        }

        updateGeneration(e) {
            this.generation = e.target?.value;
            this.calculate();
        }
        updateConsumption(e) {
            this.consumptionValue = e.target?.value * 12;
            this.calculate();
        }

        calculate() {
            this.output = (this.PVOUT * this.generation).toFixed(2);
            this.netProfit = (this.output * this.kWhPriceInEuro - this.consumptionValue).toFixed(2);
            this.netProfit = Math.max(0, this.netProfit);
            this.updateOutPut();
        }

        updateOutPut() {
            this.generationPerYear.innerHTML = `${this.output}<span>KWh</span>`;
            this.generationPer5Years.innerHTML = `${this.output * 5}<span>KWh</span>`;

            this.val1.innerHTML = this.netProfit;
            this.val2.innerHTML = (this.netProfit * 5).toFixed(2);
            this.val3.innerHTML = (this.netProfit * 10).toFixed(2);
        }
    }
    const calculator = new SolarCalculator('#range-1', '#range-2');
})();

// menu class

(function () {
    class MenuClass {
        constructor(btnID, menuItemClass, menuClass) {
            this.menuBtn = document.querySelector(btnID);
            this.menuItems = document.querySelectorAll(menuItemClass);
            this.menu = document.querySelector(menuClass);
            this.menuIsOpen = false;
            this.init();
        }
        init() {
            this.menuBtn.addEventListener('click', this.toggleMenu.bind(this));
            this.menuItems.forEach((item) => {
                item.addEventListener('click', this.handleMenuItemClick.bind(this));
            });
        }
        toggleMenu() {
            if (!this.menuIsOpen) {
                this.openMenu();
            } else {
                this.closeMenu();
            }
        }
        handleMenuItemClick(e) {
            e.stopPropagation();
            this.closeMenu();
        }
        openMenu() {
            this.menuIsOpen = true;
            this.menuBtn.classList.add('active');
            this.menu.classList.add('active');

            // Disable scrolling and move to the top of the page
            document.body.style.overflow = 'hidden';
            window.scrollTo({ top: 0, behavior: 'smooth' });
        }
        closeMenu() {
            this.menuIsOpen = false;
            this.menuBtn.classList.remove('active');
            this.menu.classList.remove('active');

            // Enable scrolling and return to the original scroll position
            document.body.style.overflow = '';
        }
    }

    const menuButtonSelector = '#menuBtn';
    const menuItemSelector = '.header__menu-item';
    const menuContainerSelector = '.header__menu';

    new MenuClass(menuButtonSelector, menuItemSelector, menuContainerSelector);
})();

// player
document.addEventListener(
    'DOMContentLoaded',
    (function () {
        const plyrOptions = {
            controls: [],
            muted: true,
            disableContextMenu: true,
            loop: {
                active: true,
            },
            clickToPlay: false,
            fullscreen: {
                enabled: false,
            },
        };
        const playerElm1 = document.querySelector('#plate__media-1');
        const player1 = new Plyr('#plate_player-1', plyrOptions);

        player1.source = {
            type: 'video',
            sources: [
                {
                    src: './images/videos/plate1.mp4',
                    type: 'video/mp4',
                },
            ],
            poster: 'images/section3/left.jpg',
        };

        const playerElm2 = document.querySelector('#plate__media-2');
        const player2 = new Plyr('#plate_player-2', plyrOptions);

        player2.source = {
            type: 'video',
            sources: [
                {
                    src: './images/videos/plate2.mp4',
                    type: 'video/mp4',
                },
            ],
            poster: 'images/section3/right.jpg',
        };

        const options = {
            root: null,
            rootMargin: '0px',
            threshold: [0.9, 0], // 0% and 60% and 100% of the element
        };

        const observer = new IntersectionObserver((entries) => {
            entries.forEach((entry) => {
                if (entry.target.id === 'plate__media-1') {
                    if (entry.isIntersecting === true && entry.intersectionRatio > 0.8) {
                        player1.play();
                    }

                    if (entry.isIntersecting == false) {
                        player1.stop();
                    }
                }
                if (entry.target.id === 'plate__media-2') {
                    if (entry.isIntersecting === true && entry.intersectionRatio > 0.8) {
                        player2.play();
                    }

                    if (entry.isIntersecting == false) {
                        player2.stop();
                    }
                }
            });
        }, options);

        observer.observe(playerElm1);
        observer.observe(playerElm2);
    })()
);

// gradient

var granimInstance = new Granim({
    element: '#canvas-basic',
    direction: 'left-right',
    isPausedWhenNotInView: true,
    states: {
        'default-state': {
            gradients: [
                ['#08e2ff', '#13ab60'],
                ['#ff6600', '#ffda00'],
            ],
            transitionSpeed: 5000,
            loop: true,
        },
    },
});

// lang toggle
class LangDropdown {
    constructor() {
        this.dropdown = document.querySelector('.lang-dropdown');

        // Store a reference to the toggleDropdown function
        this.toggleDropdownHandler = (e) => {
            this.toggleDropdown(e);
        };

        // Add a listener to the dropdown for toggling
        this.dropdown.addEventListener('click', this.toggleDropdownHandler);

        // Check the window width initially
        this.checkWindowWidth();

        window.addEventListener('resize', () => {
            this.checkWindowWidth();
        });
    }

    toggleDropdown(e) {
        e.stopPropagation();
        this.dropdown.classList.toggle('active', this.isDropdownActive);
    }

    checkWindowWidth() {
        if (window.innerWidth < 600) {
            this.dropdown.classList.remove('active');
            this.dropdown.addEventListener('click', this.toggleDropdownHandler);
        } else {
            // Remove the click event for larger screens
            this.dropdown.removeEventListener('click', this.toggleDropdownHandler);
        }
    }
}

const langSwitch = new LangDropdown();

// scroll to form on button click
(function () {
    let buttonsList = document.querySelectorAll('.toForm');
    buttonsList.forEach((button) => {
        button.addEventListener('click', function (event) {
            event.preventDefault();
            const formElement = document.getElementById('form');
            if (formElement) {
                formElement.scrollIntoView({ behavior: 'smooth' });
            }
        });
    });
})();

// multistage form logic

const stageOne = `<form class="form form-stage-one">
<div class="error-alert-top" id='error-alert-top'></div>
<div class="form__top form__top--primary">
    <p class="form__lead lead">Instant savings with <span>solar panels</span></p>
</div>
<div class="form__content">
    <p class="form__text text">Welcome to Dak Profijt, the expert in the field of solar panels for your roof!</p>
    <p class="form__text text">
        Are you also curious about the possibilities of solar energy and how this can contribute to lower energy costs and a sustainable future?
    </p>
    <p class="form__text text text-1">Enter your details and discover how much you can save!</p>
    <div class="error-alert" id="error-alert"></div>
    <div class="form__input-group">
        <div class="form__box">
            <label for="fname">Postal code</label>
            <input type="text" id="postalCode" name="postalCode" data-inputName="postalCode" placeholder="1234AB">
        </div>
        <div class="form__box">
            <label for="fname">House number</label>
            <input type="text" id="houseNumber" name="houseNumber" data-inputName="houseNumber" placeholder="98">
        </div>
        <div class="form__box">
            <label for="fname">Addition</label>
            <input type="text" id="addition" name="addition" data-inputName="addition" placeholder="a">
        </div>
    </div>
    <button class="main-button" type="button" data-go-to="1">Discover your savings</button>
</div>
</form>`;

const stageTwo = `<form class="form form-stage-two">
<div class="error-alert-top" id="error-alert-top"></div>
<div class="form__top">
    <ol class="list">
        <li class="list__item active">Location</li>
        <li class="list__item">Choose a plan</li>
        <li class="list__item">Consumption</li>
        <li class="list__item">Complete</li>
    </ol>
</div>
<div class="form__content">
    <p class="form__lead lead">Exact <span>location</span></p>
    <p class="form__text text-1">Is the pin on the right roof?</p>
    <div class="location">
        <div class="location__map" id="myMap"></div>
        <div class="location__address">
            <p class="location__street">Dr. Jan Mulderstraat</p>
            <p class="location__houseNumber">36</p>
            <p class="location__postcode">1544VC</p>
            <p class="location__city">Zaandijk</p>
        </div>
    </div>
    <div class="form__buttons-row">
        <button class="main-button--dim" id="change-location">The pin is wrong</button>
        <button class="main-button" type="button" data-go-to="2">Discover your savings</button>
    </div>
</div>
</form>`;

const stageThree = ` <form class="form form-stage-three">
<div class="error-alert-top" id="error-alert-top"></div>
<div class="form__top">
    <ol class="list">
        <li class="list__item active done">Location</li>
        <li class="list__item active">Choose a plan</li>
        <li class="list__item">Consumption</li>
        <li class="list__item">Complete</li>
    </ol>
</div>
<div class="form__content">
    <p class="form__lead lead"><span>Good news! </span></p>
    <p class="form__text text-2">The roof of this house seems suitable!</p>
    <p class="form__text text-1">Choose your roof scan</p>

    <div class="radio">
        <div class="radio__item">
            <div class="radio__button">
                <input type="radio" id="radio-1" name="option-1" value="1" />
            </div>
            <p class="radio__title">Personal advice (most chosen)</p>
            <ul class="radio__list">
                <li class="radio__list-item">Instant quote and offer</li>
                <li class="radio__list-item">Estimation of the number of solar panels</li>
                <li class="radio__list-item">Calculation of yield and payback period</li>
                <li class="radio__list-item">Expected savings and returns</li>
                <li class="radio__list-item">Accurate measurement and laying plan</li>
            </ul>
        </div>
        <div class="radio__item">
            <div class="radio__button">
                <input type="radio" id="radio-1" name="option-1" value="1" />
            </div>
            <p class="radio__title">Personal advice (most chosen)</p>
            <ul class="radio__list">
                <li class="radio__list-item">Suitability of the roof</li>
                <li class="radio__list-item">Estimate number of solar panels</li>
                <li class="radio__list-item--minus">No personal advice and information</li>
                <li class="radio__list-item--minus">You don't know what it will cost</li>
            </ul>
        </div>
    </div>

    <div class="form__buttons-row">
        <button class="main-button--dim" id="change-location">Previous</button>
        <button class="main-button" type="button" data-go-to="2">Next</button>
    </div>
</div>
</form>`;

let formStages = [stageOne, stageTwo, stageThree];

let myFormData = {
    stage: 0,
    postalCode: '',
    houseNumber: '',
    addition: '',
    longitude: 4.79918888,
    latitude: 52.4700737,
};

let FormWrapper = document.getElementById('form-multyStage-wrapper');
(function trackInput() {
    FormWrapper.addEventListener('keyup', function trackKeys(e) {
        e.stopPropagation();
        if (e.target.tagName == 'INPUT' && e.target.getAttribute('data-inputname')) {
            const inputName = e.target.getAttribute('data-inputname');
            const inputValue = e.target.value;
            myFormData[inputName] = inputValue;
        }
    });
})();

function StageZeroIn() {
    $(document).on('ready', function () {
        $('#postalCode').mask('9999aa');
        $('#postalCode').on('mouseup', (e) => {
            e.stopPropagation();
            let elem = e.currentTarget;
            elem.setSelectionRange(0, 0);
        });

        $('#houseNumber').mask('99');
        $('#houseNumber').on('mouseup', (e) => {
            e.stopPropagation();
            let elem = e.currentTarget;
            elem.setSelectionRange(0, 0);
        });
    });
}

function StageZeroOut() {
    $('#postalCode').unmask();
    $('#houseNumber').unmask('99');
}

function preMultiStageForm() {
    let stage = myFormData.stage;
    FormWrapper.innerHTML = formStages[stage];
    StageZeroIn();
}

function changeHtml() {
    FormWrapper.innerHTML = formStages[stage];
}

async function getLocation() {
    let stage = myFormData.stage;

    const pattern = /_/g;
    let postalCode = myFormData.postalCode;
    postalCode = postalCode.replace(pattern, '');

    let houseNumber = myFormData.houseNumber;
    houseNumber = houseNumber.replace(pattern, '');
    if (postalCode.length < 6 || houseNumber.length < 2) {
        const errorAlert = FormWrapper.querySelector('#error-alert');
        errorAlert.innerHTML = `<p class="text text-1"><i class='far fa-exclamation-square'></i>There was a problem with your submission. Check the fields below.</p>`;
        return;
    }

    const params = new URLSearchParams();
    params.set('action', 'get_postcode');
    params.set('security', '2cc101c799');
    params.set('postcode', postalCode);
    params.set('huisnummer', houseNumber);
    params.set('toevoeging', myFormData.addition);

    const url = `https://dakprofijt.nl/wp-admin/admin-ajax.php?${params.toString()}`;

    try {
        const response = await fetch(url);

        if (!response.ok) {
            throw new Error('Network response was not ok');
        }

        const data = await response.json();

        myFormData.latitude = data.latitude;
        myFormData.longitude = data.longitude;
        myFormData.street = data.street;
        myFormData.houseNumber = data.houseNumber;
        myFormData.city = data.city;

        console.log(data);
        renderStage(1);
    } catch (error) {
        // Handle errors here
        console.error('Fetch error:', error);

        showTopError('We could not find a valid address. Try searching again.');
    }
}

function showTopError(text) {
    let output = FormWrapper.querySelector('#error-alert-top');
    output.innerHTML = `<p class="text text-1">${text}</p>`;
}

preMultiStageForm();

// Initialize and add the map

((g) => {
    var h,
        a,
        k,
        p = 'The Google Maps JavaScript API',
        c = 'google',
        l = 'importLibrary',
        q = '__ib__',
        m = document,
        b = window;
    b = b[c] || (b[c] = {});
    var d = b.maps || (b.maps = {}),
        r = new Set(),
        e = new URLSearchParams(),
        u = () =>
            h ||
            (h = new Promise(async (f, n) => {
                await (a = m.createElement('script'));
                e.set('libraries', [...r] + '');
                for (k in g)
                    e.set(
                        k.replace(/[A-Z]/g, (t) => '_' + t[0].toLowerCase()),
                        g[k]
                    );
                e.set('callback', c + '.maps.' + q);
                a.src = `https://maps.${c}apis.com/maps/api/js?` + e;
                d[q] = f;
                a.onerror = () => (h = n(Error(p + ' could not load.')));
                a.nonce = m.querySelector('script[nonce]')?.nonce || '';
                m.head.append(a);
            }));
    d[l] ? console.warn(p + ' only loads once. Ignoring:', g) : (d[l] = (f, ...n) => r.add(f) && u().then(() => d[l](f, ...n)));
})({
    key: 'AIzaSyA_ywspEMM5plA_l6guCnFBuu17NkcbsxU',

    // Add other bootstrap parameters as needed, using camel case.
    // Use the 'v' parameter to indicate the version to load (alpha, beta, weekly, etc.)
});

let map;

async function initMap() {
    // The location of Uluru
    const position = { lat: myFormData.latitude, lng: myFormData.longitude };
    // Request needed libraries.
    //@ts-ignore
    const { Map } = await google.maps.importLibrary('maps');

    // The map, centered at Uluru
    map = new Map(document.getElementById('myMap'), {
        zoom: 19.2,
        center: position,
        mapId: '8debc2d14a1ed077',
        disableDefaultUI: true,
        mapTypeId: 'satellite',
        draggable: false,
        keyboardShortcuts: false,
        zoomControl: false, // Disable zoom control
        scrollwheel: false, // Disable scrollwheel zoom
        disableDoubleClickZoom: true, // Disable double-click zoom
    });

    const marker = new google.maps.Marker({
        // The below line is equivalent to writing:
        // position: new google.maps.LatLng(-34.397, 150.644)
        position: { lat: myFormData.latitude, lng: myFormData.longitude },
        map: map,
    });
    // Add an event listener to track marker position
    google.maps.event.addListener(marker, 'dragend', function (event) {
        console.log('Marker dragged to:', event.latLng.lat(), event.latLng.lng());
    });
    window.marker = marker;
}

// initMap();

function wrongPin() {
    marker.setOptions({
        draggable: true, // Set draggable to true using setOptions
    });
    map.setOptions({
        draggable: true,
        zoomControl: true,
    });
}
