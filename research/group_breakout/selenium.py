from selenium import webdriver
from selenium.webdriver.chrome.service import Service
from selenium.webdriver.chrome.options import Options
from selenium.webdriver.common.by import By
import time
from utils.log import LoggerFactory
log = LoggerFactory.get_logger(__name__)
from utils.log import LoggerFactory
log = LoggerFactory.get_logger(__name__)

class ChromeDriverSingleton:
    _instance = None

    def __new__(cls):
        if cls._instance is None:
            cls._instance = super(ChromeDriverSingleton, cls).__new__(cls)
            cls._instance.__init_broswer()
        return cls._instance

    def __init_broswer(self):
        opts = Options()
        opts.add_argument("--headless=new")  # 需要无头时启用
        opts.binary_location = "chrome-linux64/chrome"
        # opts.add_experimental_option("detach", True)
        opts.add_argument("--disable-dev-shm-usage")
        opts.add_argument("--disable-gpu")
        opts.add_argument("--no-sandbox")
        opts.add_argument("--disable-extensions")
        opts.add_argument("--disable-blink-features=AutomationControlled")
        opts.add_argument(
            "--user-agent=Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36"
        )
        opts.add_experimental_option(
            "excludeSwitches", ["enable-automation", "enable-logging"]
        )
        opts.add_experimental_option("useAutomationExtension", False)
        opts.add_argument("--auto-open-devtools-for-tabs")
        opts.add_argument("--disable-blink-features=AutomationControlled")
        opts.add_experimental_option("excludeSwitches", ["enable-automation"])
        opts.add_argument("--window-size=1360,768")
        opts.add_experimental_option("useAutomationExtension", False)

        driver = webdriver.Chrome(
            service=Service(executable_path="chromedriver-linux64/chromedriver"),
            options=opts,
        )
        driver.execute_script(
            "Object.defineProperty(navigator, 'webdriver', {get: () => undefined})"
        )
        driver.execute_script(
            "Object.defineProperty(navigator, 'plugins', {get: () => [1, 2, 3]})"
        )
        driver.execute_script(
            "Object.defineProperty(navigator, 'languages', {get: () => ['zh-CN', 'zh', 'en']})"
        )
        self.driver = driver

    def get(self, url: str, raw_js=False):
        if self.driver == None:
            self.start()
        self.driver.get(url)
        source = self.driver.page_source
        log.debug(url, "\n", source)
        if "Nginx forbidden" in source:
            log.info(source)
            raise Exception("Nginx forbidden")
        # time.sleep(1)
        if raw_js:
            source = self.driver.find_element(By.TAG_NAME, "pre").text
        return source

    def stop(self):
        self.driver.quit()
        self.driver = None

    def start(self):
        self.__init_broswer()
def _selenium_get(url: str, raw_js=False) -> str:
    return ChromeDriverSingleton().get(url, raw_js=raw_js)

