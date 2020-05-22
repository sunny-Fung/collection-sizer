var fs = require("fs");
var axios = require("axios");
var { homeLink, needComment } = require("./config");

// 评论数组
let commentArray = [];

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
      if (needComment) {
        const concurrency = 2;
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
      output(json2csv(list, 1), homeLink[i].name);
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
