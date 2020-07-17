// Up主主页链接转换获取主页信息链接的示例
module.exports.homeLink = [
  /********** 
  name是生成主页视频内容数据的csv文件名
  原链接是Up主主页链接 比如完美日记 https://space.bilibili.com/352049471?from=search&seid=6466074992285173149
  url是Up主主页链接截取"bilibili.com/"到"？"之间的数字 复制到${数字}里 https://api.bilibili.com/x/space/arc/search?mid=${数字}&pn=1&ps=1
  ************/
  // {
  //   name: "完美日记",
  //   url:
  //     "https://api.bilibili.com/x/space/arc/search?mid=352049471&pn=1&ps=100",
  // },
  // {
  //   name: "橘朵judydoll",
  //   url:
  //     "https://api.bilibili.com/x/space/arc/search?mid=431658583&pn=1&ps=100",
  // },
  // {
  //   name: "创尔美",
  //   url:
  //     "https://api.bilibili.com/x/space/arc/search?mid=306765333&pn=1&ps=100",
  // },
  {
    name: "膜法世家官方账号",
    url:
      "https://api.bilibili.com/x/space/arc/search?mid=276861076&pn=1&ps=100",
  },
  // {
  //   name: "诗佩妮SPENNY",
  //   url:
  //     "https://api.bilibili.com/x/space/arc/search?mid=477955873&pn=1&ps=100",
  // },
];

// 需要视频下面的评论内容吗？默认需要，不需要请改为false
module.exports.needComment = false;

// 同一时间请求的评论链接数
module.exports.concurrency = 2;

/******  未填坑: 二楼三楼的评论
评论：https://api.bilibili.com/x/v2/reply?pn=1&type=1&oid=${aid}&sort=2&_=${Date.now()}

二级评论：https://api.bilibili.com/x/v2/reply/reply?pn=1&type=1&oid=${aid}&ps=100&root=${rpid}&_=${Date.now()}

*******/
