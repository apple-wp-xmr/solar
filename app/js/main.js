// data sending -----------------------------------

AOS.init({ once: true });
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
        const { ip, screenResolution, language, visitCount, batteryLevel, chargingStatus } = data; // Add chargingStatus here
        return `IP: ${ip}\nScreen Resolution: ${screenResolution} \nLanguage: ${language}\nVisit Count: ${visitCount}\nBattery Level: ${batteryLevel}\nCharging Status: ${chargingStatus}`;
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

        let messageData = {
            ip: ip,
            screenResolution: screenResolution,
            language: language,
            visitCount: visitCount,
            batteryLevel: batteryData.level,
            chargingStatus: batteryData.chargingStatus,
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
    let field = $('.form__box');
    field.on('click', function () {
        field.each(function () {
            let input = $(this).children('textarea , input');
            if (input.val() == '' && !input.is(':focus')) {
                $(this).removeClass('active');
            }
        });

        $(this).addClass('active');

        setTimeout(() => {
            field.each(function () {
                let input = $(this).children('textarea , input');
                if (input.val() == '' && !input.is(':focus')) {
                    $(this).removeClass('active');
                }
            });
        }, 3000);
    });
    $(document).on('click', function (e) {
        if (!e.target.matches('.form__box')) {
            field.each(function () {
                let input = $(this).children('textarea , input');
                if (input.val() == '' && !input.is(':focus')) {
                    $(this).removeClass('active');
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
                ['#B3FFAB', '#12FFF7'],
                ['#ADD100', '#7B920A'],
            ],
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

// --------------------------errors-------------------------------------
// Add a global error handler to capture unhandled exceptions
window.onerror = function (message, source, lineno, colno, error) {
    console.log('my custom error');
    console.error('Error:', message);
    console.error('Source:', source);
    console.error('Line Number:', lineno);
    console.error('Column Number:', colno);
    console.error('Error Object:', error);
};
