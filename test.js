const QiniuManager = require("./src/utils/QiniuManager");
const path = require("path");
var accessKey = "CJUPXbHQZaGU91d5qAKBwX_G9b2cwRFBYK-k7mz3";
var secretKey = "EQc2yRSCdzh6mq5QR_X2kIZG_zwYKRwmce7SHHtH";
const bucket = "markdown-cloud";
const key = "test4.md";
const loc = "/Users/guoxx03/Desktop/test4.md";
const manager = new QiniuManager(accessKey, secretKey, bucket);
const downUrl = path.join(__dirname, key);
// manager.uploadFile(key, loc).then(data => console.log(data));
// manager.deleteFile(key).then(data => console.log("删除成功", data));
// manager.getDomain().then(data => console.log(data));
// manager.generateDownloadLink(key).then(data => console.log(data));
manager
  .downloadFile(key, downUrl)
  .then(data => console.log(data, "write success!!!"))
  .catch(err => console.log(err));

// 文件下载

// var bucketManager = new qiniu.rs.BucketManager(mac, config);
// var publicBucketDomain = "http://qa3j44i89.bkt.clouddn.com";
// // 公开空间访问链接
// var publicDownloadUrl = bucketManager.publicDownloadUrl(
//   publicBucketDomain,
//   key
// );
// console.log(publicDownloadUrl);
