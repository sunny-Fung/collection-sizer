var fs = require("fs");
var axios = require("axios");
var { homeLink, needComment, concurrency } = require("./config");

// 评论数组
let commentArray = [];
// 全部信息数组
let BVInfoArray = [];

for (let i = 0; i < homeLink.length; i++) {
  axios
    .get(homeLink[i].url)
    .then(async function (res) {
      let list = res.data.data.list.vlist;
      list = list.map((item) => {
        let { comment, play, title, created, length, pic, aid, bvid } = item;
        created = dateFormat(Number(`${created}000`));
        bvid = `https://www.bilibili.com/video/${bvid}`;
        return { created, length, play, comment, title, pic, aid, bvid };
      });
      const data = Object.assign(list);
      // 获取视频评论点赞等信息
      const gap = 2000;
      for (let i = 0, j = data.length; i < j; i += concurrency) {
        await Promise.all(
          data.slice(i, i + concurrency).map(async (item) => {
            let oo = await getBVInfo(item.aid, item.bvid);
            item = {
              ...item,
              view: oo.view,
              danmaku: oo.danmaku,
              reply: oo.reply,
              favorite: oo.favorite,
              coin: oo.coin,
              share: oo.share,
              like: oo.like,
            };
            BVInfoArray.push(item);
          })
        );
        await sleep(gap);
      }
      if (needComment) {
        const gap = 1000;
        for (let i = 0, j = data.length; i < j; i += concurrency) {
          await Promise.all(
            data.slice(i, i + concurrency).map(async (item) => {
              const pages = await getCommentPages(
                `https://api.bilibili.com/x/v2/reply?pn=1&type=1&oid=${
                  item.aid
                }&sort=2&_=${Date.now()}`
              );
              for (let page = 1; page < pages; page++) {
                commentArray.push(await getComment(page, item.aid));
              }
              await output(
                json2csv(commentArray.flat(), 0),
                `${item.title}的评论`
              );
            })
          );
          await sleep(gap);
        }
      }
      output(json2csv(BVInfoArray, 1), homeLink[i].name);
    })
    .catch(function (error) {
      console.log(error);
    });
}

function sleep(time) {
  return new Promise((resolved) => setTimeout(resolved, time));
}

function dateFormat(time) {
  const year = new Date(time).getFullYear();
  let month = new Date(time).getMonth() + 1;
  let day = new Date(time).getDate();
  return `${year}/${month}/${day}`;
}

function getComment(page, aid) {
  let list = [];
  return new Promise((resolved) => {
    axios
      .get(
        `https://api.bilibili.com/x/v2/reply?pn=${page}&type=1&oid=${aid}&sort=2&_=${Date.now()}`
      )
      .then(function (res) {
        const replies = res.data.data.replies;
        for (let i = 0; i < replies.length; i++) {
          const comment = {
            uname: replies[i].member.uname,
            sex: replies[i].member.sex,
            message: replies[i].content.message,
          };
          list.push(comment);
        }
        resolved(list);
      })
      .catch(function (error) {
        console.log(error);
      });
  });
}

function getBVInfo(aid, bvid) {
  return new Promise((resolved) => {
    axios
      .get(`https://api.bilibili.com/x/web-interface/archive/stat?aid=${aid}`, {
        headers: {
          Referer: bvid,
          "user-agent":
            "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/83.0.4103.116 Safari/537.36",
          origin: "https://www.bilibili.com",
        },
      })
      .then(function (res) {
        resolved(res.data.data);
      })
      .catch(function (error) {
        console.log(error);
      });
  });
}

function getCommentPages(url) {
  return new Promise((resolved) => {
    axios
      .get(url)
      .then(function (res) {
        resolved(pageCount(res.data.data.page.count, res.data.data.page.size));
      })
      .catch(function (error) {
        console.log(error);
      });
  });
}

function pageCount(count, size) {
  let x = count / size;
  return Math.ceil(x);
}

function json2csv(source, type) {
  if (!Array.isArray(source)) {
    throw new TypeError("类型必须为json数组");
  }

  // 表头
  const headers = [];
  // 数据体
  const data = [];
  // 表头对应的index
  const headerIndexMap = {};

  for (const item of source) {
    const list = [];

    for (const key of Object.keys(item)) {
      if (type) {
        const oldKey = {
          created: "发布时间",
          length: "视频时长",
          play: "播放量",
          comment: "评论数",
          title: "标题",
          pic: "封面图片",
          aid: "视频编号",
          bvid: "视频地址",
          view: "播放數",
          danmaku: "彈幕數",
          reply: "評論數量",
          favorite: "收藏數",
          coin: "投幣數",
          share: "分享數",
          like: "點贊數",
        };
        if (oldKey[key]) {
          const newKey = oldKey[key];
          item[newKey] = item[key];
          delete item[key];
        }
      } else {
        const oldKey = {
          uname: "用户昵称",
          sex: "性别",
          message: "一楼评论内容",
        };
        if (oldKey[key]) {
          const newKey = oldKey[key];
          item[newKey] = item[key];
          delete item[key];
        }
      }
    }

    for (const key of Object.keys(item)) {
      if (!headers.includes(key)) {
        headerIndexMap[key] = headers.push(key) - 1;
      }
    }

    for (const key of Object.keys(headerIndexMap)) {
      list[headerIndexMap[key]] = item.hasOwnProperty(key)
        ? JSON.stringify(item[key])
        : "";
    }

    data.push(list.join(","));
  }

  return [headers.join(","), ...data].join("\n");
}

function output(data, name) {
  fs.access(`./${name}.csv`, fs.constants.F_OK, (err) => {
    if (!err) {
      fs.unlink(`./${name}.csv`, (err) => {
        if (err) throw err;
        console.log("文件已被删除");
        fs.writeFileSync(`./${name}.csv`, data, "utf8");
      });
    }
    console.log(`./${name}.csv ${err ? "不存在" : "存在"}`);
  });
  fs.writeFileSync(`./${name}.csv`, data, "utf8");
}
