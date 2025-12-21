//全局常量
const CAROUSEL_INTERVAL = 5000; // 轮播图切换间隔
const TOAST_DURATION = 2000; // 提示框显示时长
const DEBOUNCE_DELAY = 300; // 搜索防抖延迟

// 全局变量
let carouselTimer = null; // 轮播图定时器
let searchDebounceTimer = null; // 搜索防抖定时器
const bookData = []; // 图书数据
let currentSortType = "default"; // 当前排序方式
let timeInterval = null; // 时间更新定时器
let countdownInterval = null; // 倒计时定时器

// DOM获取方法计数器
let domGetMethodCount = 0;

// ==================== 对象创建部分 ====================

// 方式1：构造函数创建图书对象（已添加inStock参数）
function Book(name, author, price, score, category, cover, press, intro, inStock = true) {
    this.id = "book-" + Date.now() + "-" + Math.random().toString(36).substr(2, 9); // 添加唯一ID
    this.name = name;
    this.author = author;
    this.price = price;
    this.score = score;
    this.category = category;
    this.cover = cover;
    this.press = press;
    this.intro = intro;
    this.inStock = inStock;
    this.getDiscountPrice = function () {
        return (this.price / 2).toFixed(2);
    };
}

// 方式2：对象字面量创建用户对象
const user = {
    // 属性
    isLogin: false,
    username: "",
    cart: [],
    favoriteBooks: [],
    loginHistory: [],

    // 方法：登录
    login: function (username) {
        this.isLogin = true;
        this.username = username;
        this.loginHistory.push({
            time: new Date().toLocaleString(),
            action: "login",
        });

        // 保存到localStorage
        this.saveToStorage();
        return true;
    },

    // 方法：退出登录
    logout: function () {
        this.isLogin = false;
        this.username = "";
        this.loginHistory.push({
            time: new Date().toLocaleString(),
            action: "logout",
        });
        this.saveToStorage();
    },

    // 方法：添加到购物车
    addToCart: function (book) {
        // 确保图书对象有ID
        const bookId = book.id || "cart-" + Date.now() + "-" + Math.random().toString(36).substr(2, 9);
        const existingItem = this.cart.find((item) => item.id === bookId);

        if (existingItem) {
            existingItem.quantity++;
        } else {
            // 统一数据格式
            const cartItem = {
                id: bookId,
                name: book.name,
                author: book.author,
                price: book.price,
                cover: book.cover,
                quantity: 1,
                addedTime: new Date().toLocaleString(),
                getDiscountPrice:
                    book.getDiscountPrice ||
                    function () {
                        return (this.price / 2).toFixed(2);
                    },
            };
            this.cart.push(cartItem);
        }
        this.saveToStorage();
        return this.cart.length;
    },

    // 方法：从购物车移除
    removeFromCart: function (bookId) {
        this.cart = this.cart.filter((item) => item.id.toString() !== bookId.toString());
        this.saveToStorage();
        return this.cart.length;
    },

    // 方法：获取购物车总金额
    getCartTotal: function () {
        return this.cart
            .reduce((total, item) => {
                const price = parseFloat(item.getDiscountPrice ? item.getDiscountPrice() : item.price / 2);
                return total + price * item.quantity;
            }, 0)
            .toFixed(2);
    },

    // 方法：保存到本地存储
    saveToStorage: function () {
        try {
            localStorage.setItem(
                "bookstore_user",
                JSON.stringify({
                    isLogin: this.isLogin,
                    username: this.username,
                    cart: this.cart,
                    favoriteBooks: this.favoriteBooks,
                    loginHistory: this.loginHistory,
                })
            );
        } catch (e) {
            console.error("本地存储错误:", e);
        }
    },

    // 方法：从本地存储加载
    loadFromStorage: function () {
        try {
            const savedData = localStorage.getItem("bookstore_user");
            if (savedData) {
                const data = JSON.parse(savedData);
                this.isLogin = data.isLogin || false;
                this.username = data.username || "";
                this.cart = data.cart || [];
                this.favoriteBooks = data.favoriteBooks || [];
                this.loginHistory = data.loginHistory || [];
                return true;
            }
        } catch (e) {
            console.error("加载用户数据错误:", e);
        }
        return false;
    },

    // 方法：添加收藏
    addFavorite: function (book) {
        const bookId = book.id || "fav-" + Date.now() + "-" + Math.random().toString(36).substr(2, 9);
        if (!this.favoriteBooks.find((item) => item.id === bookId)) {
            this.favoriteBooks.push({
                id: bookId,
                name: book.name,
                author: book.author,
                cover: book.cover,
                addedTime: new Date().toLocaleString(),
            });
            this.saveToStorage();
        }
    },
};

// 方式3：使用Object.create创建对象（用于创建图书分类）
const bookCategoryPrototype = {
    getCategoryInfo: function () {
        return `分类: ${this.name} (图书数量: ${this.bookCount})`;
    },
};

const createBookCategory = function (name, bookCount) {
    const category = Object.create(bookCategoryPrototype);
    category.name = name;
    category.bookCount = bookCount;
    return category;
};

// ==================== 新功能：实时时间显示 ====================
function initRealTime() {
    function updateTime() {
        const now = new Date();

        // 使用Date对象的多种方法
        const year = now.getFullYear();
        const month = String(now.getMonth() + 1).padStart(2, "0");
        const date = String(now.getDate()).padStart(2, "0");
        const hours = String(now.getHours()).padStart(2, "0");
        const minutes = String(now.getMinutes()).padStart(2, "0");
        const seconds = String(now.getSeconds()).padStart(2, "0");

        // 获取星期几
        const weekDays = ["星期日", "星期一", "星期二", "星期三", "星期四", "星期五", "星期六"];
        const weekDay = weekDays[now.getDay()];

        // 更新DOM
        const currentDateEl = document.getElementById("currentDate");
        const currentWeekEl = document.getElementById("currentWeek");
        const currentTimeEl = document.getElementById("currentTime");

        if (currentDateEl) currentDateEl.textContent = `${year}年${month}月${date}日`;
        if (currentWeekEl) currentWeekEl.textContent = weekDay;
        if (currentTimeEl) currentTimeEl.textContent = `${hours}:${minutes}:${seconds}`;
    }

    // 立即更新一次
    updateTime();

    // 每秒更新一次
    timeInterval = setInterval(updateTime, 1000);
}

// ==================== 新功能：限时抢购倒计时 ====================
function initCountdown() {
    function updateCountdown() {
        // 设置活动结束时间
        const endTime = new Date("2025-12-31 23:59:59").getTime();
        const now = new Date().getTime();
        const timeLeft = endTime - now;

        // 如果时间已过
        if (timeLeft < 0) {
            document.getElementById("countdownDays").textContent = "00";
            document.getElementById("countdownHours").textContent = "00";
            document.getElementById("countdownMinutes").textContent = "00";
            document.getElementById("countdownSeconds").textContent = "00";
            return;
        }

        // 计算天、时、分、秒
        const days = Math.floor(timeLeft / (1000 * 60 * 60 * 24));
        const hours = Math.floor((timeLeft % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
        const minutes = Math.floor((timeLeft % (1000 * 60 * 60)) / (1000 * 60));
        const seconds = Math.floor((timeLeft % (1000 * 60)) / 1000);

        // 更新DOM
        document.getElementById("countdownDays").textContent = String(days).padStart(2, "0");
        document.getElementById("countdownHours").textContent = String(hours).padStart(2, "0");
        document.getElementById("countdownMinutes").textContent = String(minutes).padStart(2, "0");
        document.getElementById("countdownSeconds").textContent = String(seconds).padStart(2, "0");
    }

    // 立即更新一次
    updateCountdown();

    // 每秒更新一次
    countdownInterval = setInterval(updateCountdown, 1000);
}

// ==================== 辅助函数：统一筛选和排序 ====================
function filterAndSortBooks(books) {
    let filteredBooks = [...books];

    // 应用库存筛选
    const inStockOnly = document.getElementById("inStockOnly");
    if (inStockOnly && inStockOnly.checked) {
        filteredBooks = filteredBooks.filter((book) => book.inStock !== false);
    }

    // 应用排序
    switch (currentSortType) {
        case "priceAsc":
            filteredBooks.sort((a, b) => a.price - b.price);
            break;
        case "priceDesc":
            filteredBooks.sort((a, b) => b.price - a.price);
            break;
        case "rating":
            filteredBooks.sort((a, b) => b.score - a.score);
            break;
        case "default":
        default:
            // 默认保持原顺序
            break;
    }

    return filteredBooks;
}

// ==================== 图书排序与筛选 ====================
function sortBooks(sortType) {
    currentSortType = sortType;

    // 获取当前搜索关键词
    const searchInput = document.getElementById("searchInput");
    let booksToSort = bookData;

    if (searchInput && searchInput.value.trim()) {
        // 如果有搜索关键词，只对搜索结果进行排序
        const keyword = searchInput.value.trim().toLowerCase();
        booksToSort = bookData.filter((book) => {
            const searchText = `${book.name} ${book.author} ${book.category} ${book.intro}`.toLowerCase();
            return searchText.includes(keyword);
        });
    }

    const sortedBooks = filterAndSortBooks(booksToSort);
    renderBookList(sortedBooks);
}

function initSortAndFilter() {
    // 绑定排序按钮事件
    const sortButtons = {
        sortPriceAsc: "priceAsc",
        sortPriceDesc: "priceDesc",
        sortRating: "rating",
    };

    Object.keys(sortButtons).forEach((btnId) => {
        const btn = document.getElementById(btnId);
        if (btn) {
            btn.addEventListener("click", () => {
                sortBooks(sortButtons[btnId]);
                showToast(`已按${btn.textContent}排序`);
            });
        }
    });

    // 绑定库存筛选事件
    const inStockCheckbox = document.getElementById("inStockOnly");
    if (inStockCheckbox) {
        inStockCheckbox.addEventListener("change", function () {
            sortBooks(currentSortType);
            showToast(this.checked ? "只显示有货图书" : "显示所有图书");
        });
    }
}

// ==================== 随机推荐完整JS逻辑 ====================
function initRandomRecommend() {
    // 随机筛选图书（和热门推荐数量一致）
    function getRandomBooks(books, count = 5) {
        // 每行5本，和热门推荐一致
        const validBooks = books.filter((book) => book.cover && book.name && book.author);
        const shuffled = [...validBooks].sort(() => 0.5 - Math.random());
        return shuffled.slice(0, Math.min(count, validBooks.length));
    }

    function renderRandomBooks() {
        const randomBooks = getRandomBooks(bookData, 5);
        const randomBookList = document.getElementById("randomBookList");
        if (!randomBookList) return;
        randomBookList.innerHTML = "";

        // 无数据提示
        if (randomBooks.length === 0) {
            randomBookList.innerHTML = `
                <div style="width: 100%; text-align: center; padding: 30px; color: #999;">
                    <i class="fa fa-book" style="font-size: 36px; margin-bottom: 10px; opacity: 0.3;"></i>
                    <p>暂无推荐图书</p>
                </div>
            `;
            return;
        }

        // 渲染卡片（和热门推荐结构完全一致）
        randomBooks.forEach((book) => {
            const bookItem = document.createElement("div");
            bookItem.className = "random-book-item";
            bookItem.innerHTML = `
                <div class="random-book-cover">
                    <img src="${book.cover}" alt="${
                book.name
            }" loading="lazy" onerror="this.src='pictures/default.jpg'" />
                    ${!book.inStock ? '<span class="out-of-stock">缺货</span>' : ""}
                </div>
                <div class="random-book-info">
                    <h4>${book.name}</h4>
                    <p class="random-book-author">${book.author}</p>
                    <p class="random-book-price">¥${book.price}</p>
                    <span class="random-book-category">${book.category}</span>
                </div>
            `;
            // 点击事件（和热门推荐一致）
            bookItem.addEventListener("click", function () {
                highlightBook(book.name);
                showToast(`查看《${book.name}》详情`);
                const targetBook = document.querySelector(`.book-item:has(.book-title:contains('${book.name}'))`);
                if (targetBook) targetBook.scrollIntoView({ behavior: "smooth" });
            });
            randomBookList.appendChild(bookItem);
        });
    }

    // 初始化+刷新按钮
    renderRandomBooks();
    const refreshBtn = document.getElementById("refreshRandom");
    if (refreshBtn) {
        refreshBtn.addEventListener("click", function () {
            const icon = this.querySelector("i");
            icon.style.transform = "rotate(360deg)";
            setTimeout(() => (icon.style.transform = "rotate(0deg)"), 300);
            renderRandomBooks();
            showToast("已刷新推荐图书");
        });
    }
}

// ==================== DOM操作验证函数 ====================
function validateDOMOperations() {
    console.log("=== DOM操作验证开始 ===");

    // 1. getElementById
    const searchInput = document.getElementById("searchInput");
    console.log("1. getElementById获取搜索框:", searchInput);
    domGetMethodCount++;

    // 2. querySelector
    const carousel = document.querySelector(".carousel");
    console.log("2. querySelector获取轮播图:", carousel);
    domGetMethodCount++;

    // 3. querySelectorAll
    const bookItems = document.querySelectorAll(".book-item");
    console.log("3. querySelectorAll获取图书项:", bookItems.length);
    domGetMethodCount++;

    // 4. getElementsByClassName
    const strengthBars = document.getElementsByClassName("strength-bar");
    console.log("4. getElementsByClassName获取强度条:", strengthBars.length);
    domGetMethodCount++;

    // 5. getElementsByTagName
    const allButtons = document.getElementsByTagName("button");
    console.log("5. getElementsByTagName获取按钮:", allButtons.length);
    domGetMethodCount++;
}

// ==================== 页面初始化函数 ====================
window.addEventListener("load", function () {
    // 显示加载动画
    const loading = document.getElementById("loading");
    if (loading) loading.classList.add("active");

    // 初始化图书数据（多种对象创建方式）
    initBookData();

    // 加载用户数据
    user.loadFromStorage();

    // 初始化各项功能
    renderBookList(bookData);
    initCarousel();
    initLogin();
    initCart();
    initBackTop();
    initSearch();
    initBookFlip();

    // 初始化新功能
    initRealTime();
    initCountdown();
    initRandomRecommend();
    initSortAndFilter();

    // DOM操作验证
    validateDOMOperations();

    // 更新登录按钮状态
    updateLoginButton();

    // 添加退出登录功能
    addLogoutOption();

    // 隐藏加载动画
    setTimeout(() => {
        if (loading) loading.classList.remove("active");
        showToast("页面加载完成！");
    }, 800);
});

// ==================== 图书数据初始化 ====================
function initBookData() {
    // 清空现有数据
    bookData.length = 0;

    // 使用构造函数创建图书对象（确保都有唯一ID和库存状态）
    const books = [
        new Book(
            "长安的荔枝",
            "马伯庸",
            45,
            8.8,
            "历史文学",
            "pictures/1.jpg",
            "湖南文艺出版社",
            "以杜牧诗句'一骑红尘妃子笑，无人知是荔枝来'为灵感，基于晚唐历史细节创作。",
            true
        ),
        new Book(
            "三体",
            "刘慈欣",
            88,
            9.4,
            "科幻小说",
            "pictures/2.jpg",
            "重庆出版社",
            "中国科幻里程碑作品，讲述地球人类文明与三体文明的碰撞、博弈与生存故事。",
            true
        ),
        new Book(
            "历史的遗憾",
            "姜半夏",
            59,
            7.9,
            "历史文学",
            "pictures/3.jpg",
            "中国纺织出版社",
            "文史结合，讲述孔子、韩非、霍去病等历史人物故事。",
            false // 缺货
        ),
        new Book(
            "月亮与六便士",
            "毛姆",
            48,
            8.8,
            "经典名著",
            "pictures/4.jpg",
            "上海译文出版社",
            "讲述证券经纪人查尔斯·思特里克兰德为追求绘画梦想，抛弃家庭远赴巴黎、塔希提岛的故事。",
            true
        ),
        new Book(
            "论语",
            "孔子及其弟子",
            36,
            9.2,
            "经典名著",
            "pictures/11.jpg",
            "中华书局",
            "儒家经典著作，集中体现孔子的政治主张、伦理思想、道德观念及教育原则。",
            true
        ),
        new Book(
            "小王子",
            "安托万·德·圣-埃克苏佩里",
            42,
            9.1,
            "经典名著",
            "pictures/12.jpg",
            "人民文学出版社",
            "讲述小王子从B-612小行星出发，在星际旅行中遇到的各种人和事，探讨爱与成长。",
            true
        ),
    ];

    // 使用对象字面量创建图书对象（确保格式统一）
    const literalBooks = [
        {
            id: "book-poyun-" + Date.now(),
            name: "破云",
            author: "淮上",
            price: 88,
            score: 9.8,
            category: "网络小说",
            cover: "pictures/poyun.jpg",
            press: "青岛出版社",
            intro: "千万金光破云而出，于尘世中贯穿天地&nbsp;&nbsp;故事围绕前恭州禁毒总队第二支队长江停和建宁市刑侦副支队长严峫展开。三年前恭州一场缉毒行动中，江停作为总指挥因判断失误导致现场连环爆炸，禁毒支队伤亡惨重，他本人也被认定 '殉职'。可三年后，江停竟从植物人状态苏醒，化名 '陆成江' 低调生活。建宁市发生五〇二剧毒冻尸案，严峫调查此案时，意外与提供协助的江停相识。随后二人又携手侦破六一九血衣绑架案、一一八乌毒凶杀案等多起离奇案件，过程中不仅挖出毒品 '蓝金' 的相关线索，还逐步揭开三年前爆炸案的真相，揪出警队内鬼，最终一步步逼近幕后大毒枭黑桃 K 及其贩毒网络，成功将犯罪团伙击破。而江停也洗刷了自身污名，以 '江教授' 的身份重新站在案发现场，守护城市正义。",
            inStock: true,
            getDiscountPrice: function () {
                return (this.price / 2).toFixed(2);
            },
        },
        {
            id: "book-lawyer-" + Date.now(),
            name: "一级律师",
            author: "木苏里",
            price: 78,
            score: 9.8,
            category: "网络小说",
            cover: "pictures/一级律师.png",
            press: "作家出版社",
            intro: "正义之下，公理不朽&nbsp&nbsp;围绕主角燕绥之与顾晏的经历展开。开篇法学院毕业典礼上，学生顾晏因不满院长燕绥之的提问，留下 '不收讼棍，建议开除' 八字，二人结下特别的师生渊源。多年后，燕绥之为调查一起爆炸事件，伪装成实习生进入南十字律所，意外成为顾晏的 '学生'。初期顾晏常以实习生手册条款和工资 '约束' 他，而在识破燕绥之的真实身份后，态度逐渐转变，开始默默关照这位昔日老师。之后两人携手处理了 '摇头翁' 等一系列复杂案件，曾经略显紧张的师生关系在合作中逐渐缓和，最终成为彼此信赖的伙伴，共同在星际间捍卫律法正义。",
            inStock: true,
            getDiscountPrice: function () {
                return (this.price / 2).toFixed(2);
            },
        },
        {
            id: Date.now() + Math.random(),
            name: "天官赐福",
            author: "墨香铜臭",
            price: 98,
            score: 9.8,
            category: "网络小说",
            cover: "pictures/天官.jpg",
            press: "作家出版社",
            intro: "天官赐福，百无禁忌&nbsp;&nbsp;小说以仙乐太子谢怜与血雨探花花城的故事为主线，不按时间顺序，分为 '过去时' 和 '现在时'。谢怜曾是风光无限的太子，十七岁飞升成仙，后因仙乐国灭国等事一贬再贬。八百年后第三次飞升，与化为鬼王的花城重逢，两人携手解决了一系列事件，最终谢怜打败白无相，花城消散一年多后归来，二人相守。",
            inStock: true,
            getDiscountPrice: function () {
                return (this.price / 2).toFixed(2);
            },
        },
    ];

    // 合并所有图书数据
    bookData.push(...books, ...literalBooks);

    // 使用Object.create创建图书分类对象
    const categories = [
        createBookCategory("童书绘本", 156),
        createBookCategory("网络小说", 289),
        createBookCategory("历史文学", 134),
        createBookCategory("科幻小说", 98),
    ];

    console.log(
        "图书分类信息:",
        categories.map((c) => c.getCategoryInfo())
    );
    console.log(`共初始化 ${bookData.length} 本图书`);
}

// ==================== 轮播图初始化 ====================
function initCarousel() {
    const carouselContainer = document.getElementById("carouselContainer");
    const prevArrow = document.getElementById("prevArrow");
    const nextArrow = document.getElementById("nextArrow");
    const indicatorsContainer = document.getElementById("carouselIndicators");

    if (!carouselContainer || !prevArrow || !nextArrow || !indicatorsContainer) {
        console.error("轮播图关键元素缺失");
        return;
    }

    const carouselItems = document.querySelectorAll(".carousel-item");
    let currentSlide = 0;
    const slideCount = carouselItems.length;

    function initIndicators() {
        indicatorsContainer.innerHTML = "";
        carouselItems.forEach((_, index) => {
            const dot = document.createElement("span");
            dot.className = "indicator-dot";
            if (index === 0) dot.classList.add("active");
            dot.addEventListener("click", () => goToSlide(index));
            indicatorsContainer.appendChild(dot);
        });
    }

    function goToSlide(index) {
        currentSlide = index;
        carouselContainer.style.transform = `translateX(-${currentSlide * 100}%)`;
        const dots = document.querySelectorAll(".indicator-dot");
        dots.forEach((dot, i) => {
            dot.classList.toggle("active", i === currentSlide);
        });
    }

    function nextSlide() {
        currentSlide = (currentSlide + 1) % slideCount;
        goToSlide(currentSlide);
    }

    function prevSlide() {
        currentSlide = (currentSlide - 1 + slideCount) % slideCount;
        goToSlide(currentSlide);
    }

    function startAutoPlay() {
        stopAutoPlay();
        carouselTimer = setInterval(nextSlide, CAROUSEL_INTERVAL);
    }

    function stopAutoPlay() {
        if (carouselTimer) {
            clearInterval(carouselTimer);
            carouselTimer = null;
        }
    }

    prevArrow.addEventListener("click", prevSlide);
    nextArrow.addEventListener("click", nextSlide);

    const carousel = document.querySelector(".carousel");
    if (carousel) {
        carousel.addEventListener("mouseenter", stopAutoPlay);
        carousel.addEventListener("mouseleave", startAutoPlay);
    }

    initIndicators();
    startAutoPlay();
}

// ==================== 登录功能初始化 ====================
function initLogin() {
    const loginBtn = document.getElementById("loginBtn");
    const loginModal = document.getElementById("loginModal");
    const modalClose = document.getElementById("modalClose");
    const modalOverlay = document.getElementById("modalOverlay");
    const loginForm = document.getElementById("loginForm");
    const codeLoginForm = document.getElementById("codeLoginForm");
    const loginTabs = document.querySelectorAll(".login-tab");

    if (!loginBtn || !loginModal || !modalClose || !modalOverlay || !loginForm || !codeLoginForm) {
        console.error("登录功能关键元素缺失");
        return;
    }

    const usernameInput = document.getElementById("use");
    const passwordInput = document.getElementById("word");
    const usernameError = document.getElementById("usernameError");
    const passwordError = document.getElementById("passwordError");
    const strengthBars = document.getElementsByClassName("strength-bar");
    const getCodeBtn = document.getElementById("getCodeBtn");
    const codePhoneInput = document.getElementById("codePhone");
    const verifyCodeInput = document.getElementById("verifyCodeInput");
    const phoneError = document.getElementById("phoneError");
    const codeError = document.getElementById("codeError");

    // 切换登录方式
    loginTabs.forEach((tab) => {
        tab.addEventListener("click", function () {
            loginTabs.forEach((t) => t.classList.remove("active"));
            this.classList.add("active");
            const type = this.dataset.type;
            if (type === "password") {
                loginForm.style.display = "block";
                codeLoginForm.style.display = "none";
            } else {
                loginForm.style.display = "none";
                codeLoginForm.style.display = "block";
            }
        });
    });

    // 打开登录弹窗
    loginBtn.addEventListener("click", function () {
        if (!user.isLogin) {
            loginModal.style.display = "block";
            document.body.style.overflow = "hidden";
        }
    });

    // 关闭登录弹窗
    function hideModal() {
        loginModal.style.display = "none";
        document.body.style.overflow = "auto";
        loginForm.reset();
        codeLoginForm.reset();

        // 清空错误提示
        [usernameError, passwordError, phoneError, codeError].forEach((el) => {
            if (el) {
                el.style.display = "none";
                el.textContent = "";
            }
        });

        // 重置输入框样式
        [usernameInput, passwordInput, codePhoneInput, verifyCodeInput].forEach((el) => {
            if (el) el.style.borderColor = "#ddd";
        });

        // 重置密码强度条
        Array.from(strengthBars).forEach((bar) => {
            bar.style.backgroundColor = "#ddd";
        });

        // 清空密码强度文本
        const strengthText = document.getElementById("strengthText");
        if (strengthText) strengthText.textContent = "";
    }

    modalClose.addEventListener("click", hideModal);
    modalOverlay.addEventListener("click", hideModal);

    // 图标点击聚焦功能
    function setupIconFocus(iconSelector, inputSelector) {
        const icon = document.querySelector(iconSelector);
        const input = document.querySelector(inputSelector);
        if (icon && input) {
            icon.addEventListener("click", function () {
                input.focus();
            });
        }
    }

    // 设置所有图标的点击聚焦功能
    setupIconFocus('label[for="use"]', "#use");
    setupIconFocus('label[for="word"]', "#word");
    setupIconFocus('label[for="codePhone"]', "#codePhone");
    setupIconFocus('label[for="verifyCodeInput"]', "#verifyCodeInput");

    // 用户名验证（邮箱/手机号）
    if (usernameInput) {
        usernameInput.addEventListener("input", function () {
            const value = this.value.trim();
            const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
            const phoneRegex = /^1[3-9]\d{9}$/;

            if (value === "") {
                usernameError.style.display = "none";
                usernameError.textContent = "";
                this.style.borderColor = "#ddd";
                this.style.boxShadow = "none";
            } else if (emailRegex.test(value)) {
                usernameError.style.display = "block";
                usernameError.textContent = "邮箱格式正确";
                usernameError.style.color = "#4CAF50";
                this.style.borderColor = "#4CAF50";
                this.style.boxShadow = "0 0 5px rgba(76, 175, 80, 0.3)";
            } else if (phoneRegex.test(value)) {
                usernameError.style.display = "block";
                usernameError.textContent = "手机号格式正确";
                usernameError.style.color = "#4CAF50";
                this.style.borderColor = "#4CAF50";
                this.style.boxShadow = "0 0 5px rgba(76, 175, 80, 0.3)";
            } else {
                usernameError.style.display = "block";
                usernameError.textContent = "请输入正确的邮箱或手机号（11位手机号）";
                usernameError.style.color = "#f44336";
                this.style.borderColor = "#f44336";
                this.style.boxShadow = "0 0 5px rgba(244, 67, 54, 0.3)";
            }
        });

        usernameInput.addEventListener("blur", function () {
            if (
                this.value.trim() &&
                usernameError.style.display === "block" &&
                (usernameError.textContent === "邮箱格式正确" || usernameError.textContent === "手机号格式正确")
            ) {
                this.style.borderColor = "#ddd";
                this.style.boxShadow = "none";
                usernameError.style.display = "none";
            }
        });
    }

    // 密码强度实时验证
    if (passwordInput) {
        passwordInput.addEventListener("input", function () {
            const value = this.value;
            let strength = 0;

            // 清除之前的错误提示
            passwordError.style.display = "none";
            passwordError.textContent = "";

            // 长度检查
            if (value.length >= 6) strength++;
            // 包含字母和数字
            if (/[a-zA-Z]/.test(value) && /\d/.test(value)) strength++;
            // 包含特殊字符
            if (/[!@#$%^&*(),.?":{}|<>]/.test(value)) strength++;

            // 更新强度条样式
            Array.from(strengthBars).forEach((bar, i) => {
                if (i < strength) {
                    bar.style.backgroundColor = strength === 1 ? "#f44336" : strength === 2 ? "#ff9800" : "#4CAF50";
                } else {
                    bar.style.backgroundColor = "#ddd";
                }
            });

            // 显示强度文字提示
            const strengthText = document.getElementById("strengthText");
            if (strengthText) {
                const strengthLabels = ["弱：请使用至少6位字符", "中：建议添加字母和数字", "强：密码安全性良好"];
                const strengthColors = ["#f44336", "#ff9800", "#4CAF50"];

                if (value.length === 0) {
                    strengthText.textContent = "";
                    strengthText.style.color = "#666";
                } else if (value.length < 6) {
                    strengthText.textContent = "密码太短，至少需要6位字符";
                    strengthText.style.color = "#f44336";
                } else {
                    strengthText.textContent = strengthLabels[strength - 1] || "弱：请使用至少6位字符";
                    strengthText.style.color = strengthColors[strength - 1] || "#f44336";
                }
            }
        });
    }

    // 密码登录表单提交
    loginForm.addEventListener("submit", function (e) {
        e.preventDefault();
        const username = usernameInput.value.trim();
        const password = passwordInput.value.trim();
        let isValid = true;

        // 用户名验证
        if (!username) {
            usernameError.style.display = "block";
            usernameError.textContent = "请输入用户名（手机号或邮箱）";
            usernameError.style.color = "#f44336";
            usernameInput.style.borderColor = "#f44336";
            isValid = false;
        } else if (!/^(\w+@\w+\.\w+)|(1[3-9]\d{9})$/.test(username)) {
            usernameError.style.display = "block";
            usernameError.textContent = "请输入正确的手机号或邮箱格式";
            usernameError.style.color = "#f44336";
            usernameInput.style.borderColor = "#f44336";
            isValid = false;
        } else {
            usernameError.style.display = "none";
            usernameInput.style.borderColor = "#4CAF50";
        }

        // 密码验证
        if (!password) {
            passwordError.style.display = "block";
            passwordError.textContent = "请输入密码";
            passwordError.style.color = "#f44336";
            passwordInput.style.borderColor = "#f44336";
            isValid = false;
        } else if (password.length < 6) {
            passwordError.style.display = "block";
            passwordError.textContent = "密码长度至少6位";
            passwordError.style.color = "#f44336";
            passwordInput.style.borderColor = "#f44336";
            isValid = false;
        } else if (!/[a-zA-Z]/.test(password) || !/\d/.test(password)) {
            passwordError.style.display = "block";
            passwordError.textContent = "密码应包含字母和数字";
            passwordError.style.color = "#f44336";
            passwordInput.style.borderColor = "#f44336";
            isValid = false;
        } else {
            passwordError.style.display = "none";
            passwordInput.style.borderColor = "#4CAF50";
        }

        // 登录成功
        if (isValid) {
            // 显示加载动画
            showLoading();

            setTimeout(() => {
                hideLoading();
                user.login(username);
                updateLoginButton();
                hideModal();
                showToast(`欢迎${username}登录书香展销平台！`);

                // 显示退出登录按钮
                const logoutBtn = document.getElementById("logoutBtn");
                if (logoutBtn) logoutBtn.style.display = "block";
            }, 1000);
        }
    });

    // 获取验证码
    if (getCodeBtn) {
        getCodeBtn.addEventListener("click", function () {
            const phone = codePhoneInput.value.trim();
            if (!/^1[3-9]\d{9}$/.test(phone)) {
                phoneError.style.display = "block";
                phoneError.textContent = "请输入正确的手机号";
                phoneError.style.color = "#f44336";
                codePhoneInput.style.borderColor = "#f44336";
                return;
            }
            phoneError.style.display = "none";
            phoneError.textContent = "";
            codePhoneInput.style.borderColor = "#ddd";

            // 倒计时
            let count = 60;
            this.disabled = true;
            const originalText = this.textContent;
            this.textContent = `重新获取(${count}s)`;

            const timer = setInterval(() => {
                count--;
                this.textContent = `重新获取(${count}s)`;
                if (count <= 0) {
                    clearInterval(timer);
                    this.disabled = false;
                    this.textContent = originalText;
                }
            }, 1000);

            showToast("验证码已发送到您的手机，请注意查收");
        });
    }

    // 验证码登录表单提交
    codeLoginForm.addEventListener("submit", function (e) {
        e.preventDefault();
        const phone = codePhoneInput.value.trim();
        const code = verifyCodeInput.value.trim();
        let isValid = true;

        // 验证手机号
        if (!phone) {
            phoneError.style.display = "block";
            phoneError.textContent = "请输入手机号";
            phoneError.style.color = "#f44336";
            codePhoneInput.style.borderColor = "#f44336";
            isValid = false;
        } else if (!/^1[3-9]\d{9}$/.test(phone)) {
            phoneError.style.display = "block";
            phoneError.textContent = "请输入正确的手机号";
            phoneError.style.color = "#f44336";
            codePhoneInput.style.borderColor = "#f44336";
            isValid = false;
        } else {
            phoneError.style.display = "none";
            phoneError.textContent = "";
            codePhoneInput.style.borderColor = "#ddd";
        }

        // 验证验证码
        if (!code) {
            codeError.style.display = "block";
            codeError.textContent = "请输入验证码";
            codeError.style.color = "#f44336";
            verifyCodeInput.style.borderColor = "#f44336";
            isValid = false;
        } else if (code.length !== 6 || isNaN(code)) {
            codeError.style.display = "block";
            codeError.textContent = "验证码必须是6位数字";
            codeError.style.color = "#f44336";
            verifyCodeInput.style.borderColor = "#f44336";
            isValid = false;
        } else {
            codeError.style.display = "none";
            codeError.textContent = "";
            verifyCodeInput.style.borderColor = "#ddd";
        }

        // 登录成功
        if (isValid) {
            showLoading();
            setTimeout(() => {
                hideLoading();
                user.login(phone);
                updateLoginButton();
                hideModal();
                showToast(`手机号 ${phone} 登录成功！`);

                // 显示退出登录按钮
                const logoutBtn = document.getElementById("logoutBtn");
                if (logoutBtn) logoutBtn.style.display = "block";
            }, 1000);
        }
    });
}

// ==================== 更新登录按钮状态 ====================
function updateLoginButton() {
    const loginBtn = document.getElementById("loginBtn");
    if (!loginBtn) return;

    if (user.isLogin) {
        loginBtn.innerHTML = `<i class="fa fa-user"></i> 欢迎 ${user.username}`;
        loginBtn.style.cursor = "default";
        loginBtn.style.pointerEvents = "none";
    } else {
        loginBtn.innerHTML = `<i class="fa fa-user"></i> 登录/注册`;
        loginBtn.style.cursor = "pointer";
        loginBtn.style.pointerEvents = "auto";
    }
}

// ==================== 添加退出登录选项 ====================
function addLogoutOption() {
    const nav = document.querySelector(".nav");
    if (!nav) return;

    // 检查是否已存在退出登录按钮
    if (document.getElementById("logoutBtn")) return;

    // 创建退出登录菜单项
    const logoutLi = document.createElement("li");
    logoutLi.id = "logoutBtn";
    logoutLi.style.display = user.isLogin ? "block" : "none";
    logoutLi.innerHTML = `
            <a href="javascript:;" style="text-decoration: none; color: inherit">
                <i class="fa fa-sign-out"></i> 退出登录
            </a>
        `;

    // 添加到导航栏
    nav.appendChild(logoutLi);

    // 绑定点击事件
    logoutLi.addEventListener("click", function () {
        if (confirm("确定要退出登录吗？")) {
            user.logout();
            updateLoginButton();
            this.style.display = "none";
            showToast("已退出登录");
        }
    });
}

// ==================== 购物车功能初始化 ====================
function initCart() {
    const cartBtn = document.getElementById("cartBtn");
    if (!cartBtn) {
        console.error("购物车按钮元素缺失");
        return;
    }

    // 购物车按钮点击事件
    cartBtn.addEventListener("click", function () {
        if (!user.isLogin) {
            showToast("请先登录！");
            document.getElementById("loginBtn").click();
            return;
        }

        if (user.cart.length === 0) {
            showToast("购物车为空，快去添加图书吧~");
            return;
        }

        // 显示购物车详情
        showCartDetail();
    });

    // 更新购物车角标
    updateCartBadge();
}

// ==================== 显示购物车详情 ====================
function showCartDetail() {
    // 创建购物车弹窗
    const cartModal = document.createElement("div");
    cartModal.className = "modal";
    cartModal.innerHTML = `
            <div class="modal-overlay" id="cartOverlay"></div>
            <div class="modal-content" style="width: 500px; max-height: 70vh;">
                <span class="modal-close" id="cartClose">&times;</span>
                <div class="cart-modal-inner" style="padding: 20px;">
                    <h3 style="color: #a70404; margin-bottom: 20px; border-bottom: 2px solid #e17108; padding-bottom: 10px;">
                        <i class="fa fa-shopping-cart"></i> 我的购物车
                    </h3>
                    <div id="cartItemsContainer" style="max-height: 300px; overflow-y: auto; margin-bottom: 20px;">
                        ${user.cart
                            .map(
                                (item) => `
                            <div class="cart-item" data-id="${item.id}" 
                                 style="display: flex; align-items: center; padding: 10px; border-bottom: 1px solid #eee;">
                                <img src="${item.cover}" alt="${item.name}" 
                                     style="width: 60px; height: 80px; object-fit: cover; margin-right: 15px; border-radius: 4px;">
                                <div style="flex: 1;">
                                    <h4 style="margin: 0 0 5px 0; color: #333;">${item.name}</h4>
                                    <p style="margin: 0 0 5px 0; color: #666; font-size: 14px;">${item.author}</p>
                                    <p style="margin: 0; color: #e17108; font-weight: bold;">
                                        单价: ¥${
                                            item.getDiscountPrice
                                                ? item.getDiscountPrice()
                                                : (item.price / 2).toFixed(2)
                                        } 
                                        x ${item.quantity}
                                    </p>
                                </div>
                                <div style="display: flex; align-items: center; gap: 10px;">
                                    <button class="cart-decrease" data-id="${item.id}" 
                                            style="width: 24px; height: 24px; border-radius: 50%; background-color: #f0f0f0; border: none; cursor: pointer;">-</button>
                                    <span style="min-width: 30px; text-align: center;">${item.quantity}</span>
                                    <button class="cart-increase" data-id="${item.id}" 
                                            style="width: 24px; height: 24px; border-radius: 50%; background-color: #f0f0f0; border: none; cursor: pointer;">+</button>
                                    <button class="cart-remove" data-id="${item.id}" 
                                            style="margin-left: 10px; padding: 5px 10px; background-color: #f44336; color: white; border: none; border-radius: 4px; cursor: pointer;">
                                        删除
                                    </button>
                                </div>
                            </div>
                        `
                            )
                            .join("")}
                    </div>
                    <div style="border-top: 2px solid #e17108; padding-top: 15px;">
                        <div style="display: flex; justify-content: space-between; margin-bottom: 15px;">
                            <span style="font-size: 16px; font-weight: bold;">总计:</span>
                            <span style="font-size: 20px; color: #a70404; font-weight: bold;">¥${user.getCartTotal()}</span>
                        </div>
                        <div style="display: flex; gap: 10px;">
                            <button id="clearCartBtn" 
                                    style="flex: 1; padding: 12px; background-color: #f0f0f0; color: #333; border: none; border-radius: 6px; cursor: pointer;">
                                清空购物车
                            </button>
                            <button id="checkoutBtn" 
                                    style="flex: 2; padding: 12px; background-color: #e17108; color: white; border: none; border-radius: 6px; cursor: pointer; font-weight: bold;">
                                去结算 (${user.cart.length}件商品)
                            </button>
                        </div>
                    </div>
                </div>
            </div>
        `;

    document.body.appendChild(cartModal);

    // 显示弹窗
    cartModal.style.display = "block";
    document.body.style.overflow = "hidden";

    // 绑定事件
    const cartOverlay = document.getElementById("cartOverlay");
    const cartClose = document.getElementById("cartClose");
    const clearCartBtn = document.getElementById("clearCartBtn");
    const checkoutBtn = document.getElementById("checkoutBtn");

    function hideCartModal() {
        cartModal.style.display = "none";
        document.body.style.overflow = "auto";
        setTimeout(() => {
            if (cartModal.parentNode) {
                cartModal.parentNode.removeChild(cartModal);
            }
        }, 300);
    }

    cartClose.addEventListener("click", hideCartModal);
    cartOverlay.addEventListener("click", hideCartModal);

    // 清空购物车
    clearCartBtn.addEventListener("click", function () {
        if (user.cart.length === 0) return;
        if (confirm("确定要清空购物车吗？")) {
            user.cart = [];
            user.saveToStorage();
            updateCartBadge();
            hideCartModal();
            showToast("购物车已清空");
        }
    });

    // 去结算
    checkoutBtn.addEventListener("click", function () {
        if (user.cart.length === 0) return;
        hideCartModal();
        showToast(`订单提交成功！总金额：¥${user.getCartTotal()}`);
        // 模拟订单处理
        setTimeout(() => {
            user.cart = [];
            user.saveToStorage();
            updateCartBadge();
        }, 1000);
    });

    // 使用事件委托绑定商品数量调整事件
    cartModal.addEventListener("click", function (e) {
        const target = e.target;

        // 处理增加数量
        if (target.classList.contains("cart-increase")) {
            const itemId = target.getAttribute("data-id");
            const item = user.cart.find((item) => item.id === itemId);
            if (item) {
                item.quantity++;
                user.saveToStorage();
                showCartDetail(); // 重新渲染
            }
        }

        // 处理减少数量
        else if (target.classList.contains("cart-decrease")) {
            const itemId = target.getAttribute("data-id");
            const itemIndex = user.cart.findIndex((item) => item.id === itemId);
            if (itemIndex !== -1) {
                if (user.cart[itemIndex].quantity > 1) {
                    user.cart[itemIndex].quantity--;
                } else {
                    user.cart.splice(itemIndex, 1);
                }
                user.saveToStorage();
                updateCartBadge();
                showCartDetail(); // 重新渲染
            }
        }

        // 处理删除商品
        else if (target.classList.contains("cart-remove")) {
            const itemId = target.getAttribute("data-id");
            user.removeFromCart(itemId);
            updateCartBadge();
            showCartDetail(); // 重新渲染
        }
    });
}

// ==================== 更新购物车角标 ====================
function updateCartBadge() {
    const badge = document.getElementById("cartBadge");
    if (badge) {
        badge.textContent = user.cart.length;
        badge.classList.toggle("show", user.cart.length > 0);
    }
}

// ==================== 返回顶部功能初始化 ====================
function initBackTop() {
    const backTop = document.querySelector(".back-top");
    if (!backTop) return;

    window.addEventListener("scroll", function () {
        backTop.style.display = window.scrollY > 300 ? "block" : "none";
    });

    backTop.addEventListener("click", function () {
        window.scrollTo({ top: 0, behavior: "smooth" });
    });
}

// ==================== 搜索功能初始化 ====================
function initSearch() {
    const searchInput = document.getElementById("searchInput");
    const searchResult = document.getElementById("searchResult");
    if (!searchInput || !searchResult) {
        console.error("搜索功能关键元素缺失");
        return;
    }

    // 搜索输入处理
    searchInput.addEventListener("input", function () {
        clearTimeout(searchDebounceTimer);
        const keyword = this.value.trim().toLowerCase();
        searchDebounceTimer = setTimeout(() => {
            if (!keyword) {
                searchResult.style.display = "none";
                // 清空关键词时，恢复所有图书
                const sortedBooks = filterAndSortBooks(bookData);
                renderBookList(sortedBooks);
                return;
            }

            // 多字段搜索（书名、作者、分类、简介）
            const matchBooks = bookData.filter((book) => {
                const searchText = `${book.name} ${book.author} ${book.category} ${book.intro}`.toLowerCase();
                return searchText.includes(keyword);
            });

            // 显示下拉搜索结果
            searchResult.innerHTML = "";
            if (matchBooks.length > 0) {
                matchBooks.forEach((book) => {
                    const item = document.createElement("div");
                    item.className = "search-result-item";
                    item.innerHTML = `
                        <img src="${book.cover}" alt="${book.name}" class="search-result-img" onerror="this.src='pictures/default.jpg'" />
                        <div>
                            <div style="font-weight: bold; color: #333;">${book.name}</div>
                            <div style="font-size: 12px; color: #666;">作者: ${book.author} | 分类: ${book.category}</div>
                            <div style="font-size: 12px; color: #e17108; margin-top: 2px;">
                                评分: ${book.score} | 价格: ¥${book.price}
                            </div>
                        </div>
                    `;
                    item.addEventListener("click", function () {
                        searchInput.value = book.name;
                        searchResult.style.display = "none";
                        // 直接渲染匹配的图书列表
                        const filteredBooks = filterAndSortBooks(matchBooks);
                        renderBookList(filteredBooks);
                        highlightBook(book.name);
                    });
                    searchResult.appendChild(item);
                });
                searchResult.style.display = "block";
            } else {
                searchResult.style.display = "none";
                renderBookList([]);
                showToast(`未找到匹配"${keyword}"的图书`);
            }
        }, DEBOUNCE_DELAY);
    });

    // 点击空白处关闭下拉框
    document.addEventListener("click", function (e) {
        if (!searchInput.contains(e.target) && !searchResult.contains(e.target)) {
            searchResult.style.display = "none";
        }
    });

    // 按下回车直接搜索
    searchInput.addEventListener("keydown", function (e) {
        if (e.key === "Enter") {
            const keyword = this.value.trim().toLowerCase();
            if (!keyword) {
                const sortedBooks = filterAndSortBooks(bookData);
                renderBookList(sortedBooks);
                return;
            }

            const matchBooks = bookData.filter((book) => {
                const searchText = `${book.name} ${book.author} ${book.category} ${book.intro}`.toLowerCase();
                return searchText.includes(keyword);
            });

            const filteredBooks = filterAndSortBooks(matchBooks);
            renderBookList(filteredBooks);
            searchResult.style.display = "none";

            if (matchBooks.length === 0) {
                showToast(`未找到匹配"${keyword}"的图书`);
            } else {
                highlightBook(keyword);
            }
        }
    });
}

// ==================== 高亮显示图书 ====================
function highlightBook(bookName) {
    const bookItems = document.querySelectorAll(".book-item");
    bookItems.forEach((item) => {
        const title = item.querySelector(".book-title") || item.querySelector(".book-front p");
        if (title && title.textContent.includes(bookName)) {
            // 临时高亮效果
            item.style.boxShadow = "0 0 0 3px rgba(225, 113, 8, 0.5)";
            item.style.transition = "box-shadow 0.3s";

            // 滚动到该元素
            item.scrollIntoView({ behavior: "smooth", block: "center" });

            // 3秒后移除高亮
            setTimeout(() => {
                item.style.boxShadow = "";
            }, 3000);
        }
    });
}

// ==================== 图书翻转功能初始化 ====================
function initBookFlip() {
    const bookList = document.getElementById("bookList");
    if (!bookList) return;

    // 使用事件委托处理翻转
    bookList.addEventListener("click", function (e) {
        const bookItem = e.target.closest(".book-item");
        if (!bookItem) return;

        // 如果点击的是按钮，不触发翻转
        if (e.target.closest(".add-cart") || e.target.closest(".buy-now") || e.target.closest(".add-favorite")) {
            return;
        }

        // 切换翻转状态
        bookItem.classList.toggle("flipped");
    });
}

// ==================== 渲染图书列表 ====================
function renderBookList(books) {
    const bookList = document.getElementById("bookList");
    if (!bookList) {
        console.error("未找到ID为bookList的元素");
        return;
    }

    bookList.innerHTML = "";

    if (books.length === 0) {
        bookList.innerHTML = `
                <div style="text-align: center; padding: 40px; color: #999; grid-column: 1 / -1;">
                    <i class="fa fa-book" style="font-size: 48px; margin-bottom: 15px; opacity: 0.3;"></i>
                    <p style="font-size: 16px;">暂无相关图书</p>
                    <button id="resetSearchBtn" style="margin-top: 15px; padding: 8px 16px; background-color: #e17108; color: white; border: none; border-radius: 4px; cursor: pointer;">
                        显示全部图书
                    </button>
                </div>
            `;

        // 绑定重置按钮事件
        const resetBtn = document.getElementById("resetSearchBtn");
        if (resetBtn) {
            resetBtn.addEventListener("click", function () {
                const sortedBooks = filterAndSortBooks(bookData);
                renderBookList(sortedBooks);
                const searchInput = document.getElementById("searchInput");
                if (searchInput) searchInput.value = "";
                const searchResult = document.getElementById("searchResult");
                if (searchResult) searchResult.style.display = "none";
            });
        }
        return;
    }

    books.forEach((book, index) => {
        const bookItem = document.createElement("div");
        bookItem.className = "book-item";
        bookItem.id = `book-${index}`;

        // 确保图书对象有必要的属性和方法
        const discountPrice = book.getDiscountPrice ? book.getDiscountPrice() : (book.price / 2).toFixed(2);

        bookItem.innerHTML = `
                <div class="book-flip-container">
                    <div class="book-front">
                        <img src="${book.cover}" alt="${book.name}" class="flip-trigger" loading="lazy" />
                        <p>《${book.name}》</p>
                        <p style="color: #e17108; font-weight: bold">五折封顶</p>
                        ${!book.inStock ? '<span class="out-of-stock">缺货</span>' : ""}
                        <p style="font-size: 12px; color: #666;">点击翻转查看详情</p>
                    </div>
                    <div class="book-back">
                        <div class="book-title">《${book.name}》</div>
                        <div class="book-info">
                            <p><strong>作者：</strong>${book.author}</p>
                            <p><strong>出版社：</strong>${book.press}</p>
                            <p><strong>评分：</strong>${book.score}/10</p>
                            <p><strong>分类：</strong>${book.category}</p>
                            <p><strong>库存：</strong>${book.inStock ? "有货" : "缺货"}</p>
                            <p><strong>简介：</strong>${book.intro}</p>
                        </div>
                        <div class="book-price">
                            定价：¥${book.price} | 活动价：¥${discountPrice}
                        </div>
                        <div class="book-ops">
                            <button class="add-cart" data-index="${index}" ${
            !book.inStock ? 'disabled style="opacity:0.5; cursor:not-allowed;"' : ""
        }>
                                <i class="fa fa-shopping-cart"></i>${book.inStock ? "加入购物车" : "已缺货"}
                            </button>
                            <button class="buy-now" data-index="${index}" ${
            !book.inStock ? 'disabled style="opacity:0.5; cursor:not-allowed;"' : ""
        }>
                                <i class="fa fa-credit-card"></i>${book.inStock ? "立即购买" : "无法购买"}
                            </button>
                            <button class="add-favorite" data-index="${index}" title="添加收藏">
                                <i class="fa fa-heart"></i>
                            </button>
                        </div>
                    </div>
                </div>
            `;
        bookList.appendChild(bookItem);
    });

    // 使用事件委托处理按钮点击
    bookList.addEventListener("click", function (e) {
        const addCartBtn = e.target.closest(".add-cart");
        const buyNowBtn = e.target.closest(".buy-now");
        const addFavoriteBtn = e.target.closest(".add-favorite");

        if (addCartBtn) {
            e.stopPropagation();
            const index = parseInt(addCartBtn.getAttribute("data-index"));
            const book = books[index];

            if (book.inStock === false) {
                showToast("该图书暂时缺货，无法加入购物车");
                return;
            }

            if (!user.isLogin) {
                showToast("请先登录！");
                document.getElementById("loginBtn").click();
                return;
            }

            const count = user.addToCart(book);
            updateCartBadge();
            showToast(`已将《${book.name}》加入购物车，当前共${count}件商品`);
        }

        if (buyNowBtn) {
            e.stopPropagation();
            const index = parseInt(buyNowBtn.getAttribute("data-index"));
            const book = books[index];

            if (book.inStock === false) {
                showToast("该图书暂时缺货，无法购买");
                return;
            }

            if (!user.isLogin) {
                showToast("请先登录！");
                document.getElementById("loginBtn").click();
                return;
            }

            const discountPrice = book.getDiscountPrice ? book.getDiscountPrice() : (book.price / 2).toFixed(2);
            if (confirm(`确认购买《${book.name}》吗？\n价格：¥${discountPrice}`)) {
                showToast(`《${book.name}》购买成功！订单已生成`);
            }
        }

        if (addFavoriteBtn) {
            e.stopPropagation();
            const index = parseInt(addFavoriteBtn.getAttribute("data-index"));
            const book = books[index];

            if (!user.isLogin) {
                showToast("请先登录！");
                document.getElementById("loginBtn").click();
                return;
            }

            user.addFavorite(book);
            addFavoriteBtn.innerHTML = '<i class="fa fa-heart" style="color: #f44336;"></i>';
            addFavoriteBtn.title = "已收藏";
            showToast(`已收藏《${book.name}》`);
        }
    });
}

// ==================== 显示提示框 ====================
function showToast(text) {
    const toast = document.getElementById("toast");
    if (!toast) return;

    toast.textContent = text;
    toast.style.display = "block";

    // 清除之前的定时器
    clearTimeout(toast.timer);

    // 自动隐藏
    toast.timer = setTimeout(() => {
        toast.style.display = "none";
    }, TOAST_DURATION);
}

// ==================== 显示/隐藏加载动画 ====================
function showLoading() {
    const loading = document.getElementById("loading");
    if (loading) loading.classList.add("active");
}

function hideLoading() {
    const loading = document.getElementById("loading");
    if (loading) loading.classList.remove("active");
}

// ==================== 页面卸载清理 ====================
window.addEventListener("beforeunload", function () {
    if (carouselTimer) clearInterval(carouselTimer);
    if (searchDebounceTimer) clearTimeout(searchDebounceTimer);
    if (timeInterval) clearInterval(timeInterval);
    if (countdownInterval) clearInterval(countdownInterval);

    // 保存用户数据
    user.saveToStorage();
});
