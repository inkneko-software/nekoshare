rm -r hsjday/*

curl 'https://data.tdx.com.cn/vipdoc/hsjday.zip' \
  -H 'Accept: text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8,application/signed-exchange;v=b3;q=0.7' \
  -H 'Accept-Language: zh-CN,zh;q=0.9,en-US;q=0.8,en;q=0.7' \
  -H 'Cache-Control: no-cache' \
  -H 'Connection: keep-alive' \
  -b 'Hm_lvt_5c4c948b141e4d66943a8430c3d600d0=1759719172,1760447840,1761063719; Hm_lpvt_5c4c948b141e4d66943a8430c3d600d0=1761063719; HMACCOUNT=8362A35A6CBFA231' \
  -H 'DNT: 1' \
  -H 'Pragma: no-cache' \
  -H 'Referer: https://www.tdx.com.cn/article/vipdata.html' \
  -H 'Sec-Fetch-Dest: document' \
  -H 'Sec-Fetch-Mode: navigate' \
  -H 'Sec-Fetch-Site: same-site' \
  -H 'Sec-Fetch-User: ?1' \
  -H 'Upgrade-Insecure-Requests: 1' \
  -H 'User-Agent: Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/140.0.0.0 Safari/537.36' \
  -H 'sec-ch-ua: "Chromium";v="140", "Not=A?Brand";v="24", "Google Chrome";v="140"' \
  -H 'sec-ch-ua-mobile: ?0' \
  -H 'sec-ch-ua-platform: "Linux"' -o hsjday.zip
cd hsjday/
unzip ../hsjday.zip
cd ../
rm hsjday.zip
