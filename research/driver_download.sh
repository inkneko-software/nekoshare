curl -sL https://storage.googleapis.com/chrome-for-testing-public/141.0.7390.122/linux64/chrome-linux64.zip -o chrome.zip
unzip chrome.zip

curl -sL https://storage.googleapis.com/chrome-for-testing-public/141.0.7390.122/linux64/chromedriver-linux64.zip -o driver.zip
unzip driver.zip

rm chrome.zip driver.zip

# 如果是Windows，请参考：https://googlechromelabs.github.io/chrome-for-testing/
# https://storage.googleapis.com/chrome-for-testing-public/141.0.7390.122/win64/chrome-win64.zip
# https://storage.googleapis.com/chrome-for-testing-public/141.0.7390.122/win64/chromedriver-win64.zip